// No extreme image is decoded by this test. A decoder tripwire intercepts the
// existing full-raster API only for the explicit dangerous metadata corpus.
import { expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import { makeCtx, resetDb } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { createRequest, startTask, getTask } from "@/domain/engine";
import { createPerson, getPersonProtected } from "@/domain/records";
import { portalUpload } from "@/domain/portal";
import { document, taskEvent } from "@/db/schema";
import { Crypto } from "@/lib/crypto";

function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const value of bytes) { crc ^= value; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
function metadataPng(width: number, height: number) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.from([0, 255, 255, 255, 255]))), chunk("IEND", Buffer.alloc(0))]);
}

it("extreme or zero PNG dimensions abstain before full raster allocation, retaining original evidence and no trusted fields while a bounded 4096px image remains usable", async () => {
  await resetDb();
  const ctx = makeCtx(); await seedDemo(ctx);
  ctx.llm.set("extract", { fields: [{ key: "idNo", value: "A123456(7)", quote: "Fictional scripted invented value" }], documents: [], conflicts: [] });
  const original = PDFDocument.prototype.embedPng;
  let dangerousDecoderEntries = 0;
  const spy = vi.spyOn(PDFDocument.prototype, "embedPng").mockImplementation(async function(this: PDFDocument, content) {
    const bytes = typeof content === "string" ? Buffer.from(content.split(",").at(-1)!, "base64") : content instanceof ArrayBuffer ? Buffer.from(new Uint8Array(content)) : Buffer.from(content);
    if (bytes.length >= 33 && bytes.subarray(12, 16).toString() === "IHDR") {
      const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
      if (width === 0 || height === 0 || width * height > 16_777_216) {
        dangerousDecoderEntries++;
        throw new Error("AUDIT_TRIPWIRE_FULL_RASTER_DECODER_ENTERED");
      }
    }
    return original.call(this, content);
  });
  try {
    for (const [width, height] of [[65535, 65535], [0, 1024]]) {
      const content = metadataPng(width, height);
      expect(content.length).toBeLessThan(100);
      // The header has a real CRC: rejection must not depend on a random prefix.
      expect(content.readUInt32BE(29)).toBe(crc32(content.subarray(12, 29)));
      const p = await createPerson(ctx, { nameEn: "WONG Bounded Image Fixture" });
      const r = await createRequest(ctx, { clientId: "cli_c1" });
      const t = await startTask(ctx, { requestId: r.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p.id });
      const before = await getPersonProtected(ctx, p.id);
      let error: unknown;
      try { await portalUpload(ctx, r.uploadToken, { taskId: t.id, key: "idCopy", filename: `fictional-header-${width}x${height}.png`, mime: "image/png", content }); } catch (e) { error = e; }
      expect.soft(error, "original upload must remain usable for staff despite unsafe extraction dimensions").toBeUndefined();
      expect.soft(dangerousDecoderEntries, "metadata policy must run before full raster allocation").toBe(0);
      expect.soft(await getPersonProtected(ctx, p.id)).toEqual(before);
      expect.soft(ctx.llm.callsFor("extract")).toHaveLength(0);
      const d = (await ctx.db.select().from(document)).find(row => row.taskId === t.id && row.source === "upload");
      expect.soft(d).toMatchObject({ sha256: Crypto.sha256(content) });
      if (d?.storageKey) expect((await ctx.storage.get(d.storageKey)).equals(content)).toBe(true);
      expect.soft((await getTask(ctx, t.id)).checklist.find(e => e.key === "idNo")?.status).toBe("needed");
      expect.soft(await ctx.db.select().from(taskEvent)).toContainEqual(expect.objectContaining({ taskId: t.id, kind: "extract.failed" }));
    }
    // 4096×256 is only 1,048,576 pixels. No giant positive allocation is needed.
    ctx.llm.set("extract", { fields: [], documents: [], conflicts: [] });
    const p = await createPerson(ctx, { nameEn: "WONG Useful Image Fixture" });
    const r = await createRequest(ctx, { clientId: "cli_c1" });
    const t = await startTask(ctx, { requestId: r.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p.id });
    const content = await readFile("tests/fixtures/upload-corpus/bounded-wide4096.png");
    await portalUpload(ctx, r.uploadToken, { taskId: t.id, key: "idCopy", filename: "useful-4096.png", mime: "image/png", content });
    const d = (await ctx.db.select().from(document)).find(row => row.taskId === t.id && row.source === "upload")!;
    expect((await ctx.storage.get(d.storageKey!)).equals(content)).toBe(true);
    expect(ctx.llm.callsFor("extract")).toHaveLength(1);
    expect(ctx.mail.sent()).toHaveLength(0); expect(ctx.accounting.calls).toHaveLength(0);
  } finally { spy.mockRestore(); }
});
