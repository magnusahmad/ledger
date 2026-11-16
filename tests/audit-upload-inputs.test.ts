import { beforeEach, expect, it } from "vitest";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { createPerson, getPersonProtected } from "@/domain/records";
import { createRequest, startTask, getTask } from "@/domain/engine";
import { portalSubmit, portalUpload, PortalError } from "@/domain/portal";
import { document, person, task, taskEvent, proposal, appointment, invoice } from "@/db/schema";
import { DiskStorage } from "@/integrations/storage";
import { Crypto } from "@/lib/crypto";

let ctx: TestCtx;
const emptyExtraction = { fields: [], documents: [], conflicts: [] };
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); ctx.llm.set("extract", emptyExtraction); });
async function setup() {
  const p = await createPerson(ctx, { nameEn: "WONG Upload Fixture", nameZh: "黃上載測試" });
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p.id });
  return { p, req, t };
}
async function state() {
  return { documents: await ctx.db.select().from(document), people: await ctx.db.select().from(person), tasks: await ctx.db.select().from(task), events: await ctx.db.select().from(taskEvent), proposals: await ctx.db.select().from(proposal), appointments: await ctx.db.select().from(appointment), invoices: await ctx.db.select().from(invoice) };
}
async function bytes(name: string) { return readFile(`tests/fixtures/upload-corpus/${name}`); }
async function assertRetained(content: Buffer) {
  const rows = (await ctx.db.select().from(document)).filter(row => row.source === "upload");
  expect(rows).toHaveLength(1);
  expect(rows[0].sha256).toBe(Crypto.sha256(content));
  expect(rows[0].storageKey).toBeTruthy();
  expect((await ctx.storage.get(rows[0].storageKey!)).equals(content)).toBe(true);
  expect(ctx.mail.sent()).toHaveLength(0);
  expect(ctx.accounting.calls).toHaveLength(0);
}
for (const [filename, mime] of [["small-scan.jpg", "image/jpeg"], ["small-scan.webp", "image/webp"]]) {
  it(`unreadable small ${mime} scans abstain like PNG, preserve the upload and never trust invented identity fields`, async () => {
    const { p, req, t } = await setup();
    ctx.llm.set("extract", { fields: [{ key: "idNo", value: "A123456(7)", quote: "A123456(7)" }], documents: [], conflicts: [] });
    const content = await bytes(filename);
    await portalUpload(ctx, req.uploadToken, { taskId: t.id, key: "idCopy", filename, mime, content });
    expect((await getPersonProtected(ctx, p.id)).idNumber).toBeNull();
    expect(ctx.llm.callsFor("extract")).toHaveLength(0);
    expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "idNo")?.status).toBe("needed");
    expect(await ctx.db.select().from(taskEvent)).toContainEqual(expect.objectContaining({ kind: "extract.failed" }));
    await assertRetained(content);
  });
}
it("a small PNG scan preserves original bytes and offers staff fallback without extracted person changes", async () => {
  const { p, req, t } = await setup();
  const content = await readFile("eval/fixtures/fictional-poor.png");
  await portalUpload(ctx, req.uploadToken, { taskId: t.id, key: "idCopy", filename: "模糊身份證.png", mime: "image/png", content });
  expect((await getPersonProtected(ctx, p.id)).idNumber).toBeNull();
  expect(ctx.llm.callsFor("extract")).toHaveLength(0);
  expect(await ctx.db.select().from(taskEvent)).toContainEqual(expect.objectContaining({ kind: "extract.failed" }));
  await assertRetained(content);
});
it("corrupt and mislabelled PNG submissions fail actionably or retain originals for staff, never expose parser failures or mutate people", async () => {
  const corpus = [Buffer.from("not an image"), (await bytes("readable-scan.jpg")).subarray(0, 100), await bytes("readable-scan.jpg"), Buffer.from("<svg><script>not executable</script></svg>"), Buffer.from("%PDF-1.7\ntruncated")];
  for (const [i, content] of corpus.entries()) {
    const { p, req, t } = await setup();
    const before = await state();
    let error: unknown;
    try { await portalUpload(ctx, req.uploadToken, { taskId: t.id, key: "idCopy", filename: `fictional-${i}.png`, mime: "image/png", content }); } catch (e) { error = e; }
    if (error) {
      expect.soft(error).toBeInstanceOf(PortalError);
      expect.soft(error instanceof Error ? error.message : String(error)).toMatch(/image|file|format|corrupt|clearer|read/i);
      expect.soft(await state()).toEqual(before);
    } else {
      expect.soft(await ctx.db.select().from(taskEvent)).toContainEqual(expect.objectContaining({ kind: "extract.failed", taskId: t.id }));
    }
    expect.soft((await getPersonProtected(ctx, p.id)).idNumber).toBeNull();
  }
  expect(ctx.mail.sent()).toHaveLength(0);
});
for (const [filename, mime] of [["readable-scan.jpg", "image/jpeg"], ["readable-scan.webp", "image/webp"], ["rotated-scan.png", "image/png"], ["multipage-scan.pdf", "application/pdf"], ["bounded-dimensions.png", "image/png"]]) {
  it(`a bounded valid ${filename} retains exact bytes and applies only explicitly requested extraction fields`, async () => {
    const { p, req, t } = await setup();
    ctx.llm.set("extract", { fields: [{ key: "idNo", value: "B123456(8)", quote: "Fictional scripted requested value" }, { key: "unrequestedField", value: "must not apply", quote: "instruction-like content" }], documents: [], conflicts: [] });
    const content = await bytes(filename);
    await portalUpload(ctx, req.uploadToken, { taskId: t.id, key: "idCopy", filename, mime, content });
    expect((await getPersonProtected(ctx, p.id)).idNumber).toBe("B123456(8)");
    expect(ctx.llm.callsFor("extract")).toHaveLength(1);
    await assertRetained(content);
  });
}
it("a rejected mixed typed and multi-file submission rolls back all database changes while exposing unreferenced object writes separately", async () => {
  const { req, t } = await setup();
  const before = await state();
  const content = await bytes("readable-scan.jpg");
  const storedBefore = ctx.storage.files.size;
  const put = ctx.storage.put.bind(ctx.storage);
  let writes = 0;
  ctx.storage.put = async (key, value) => { if (++writes === 2) throw new Error("fictional storage adapter interruption"); await put(key, value); };
  await expect(portalSubmit(ctx, req.uploadToken, { fields: [{ taskId: t.id, key: "corrAddr", value: "香港觀塘道418號1201室" }], files: [{ taskId: t.id, key: "selfie", filename: "selfie.jpg", mime: "image/jpeg", content }, { taskId: t.id, key: "idCopy", filename: "id.jpg", mime: "image/jpeg", content }] })).rejects.toThrow("fictional storage adapter interruption");
  expect(await state()).toEqual(before);
  expect(ctx.storage.files.size).toBe(storedBefore + 1); // external puts are not PostgreSQL rollback
  expect((await ctx.db.select().from(document)).filter(row => row.source === "upload")).toHaveLength(0);
  expect(ctx.mail.sent()).toHaveLength(0);
});
it("the existing 15 MB boundary is inclusive and the first excess byte rejects before database or storage writes", async () => {
  const { req, t } = await setup();
  const jpeg = await bytes("readable-scan.jpg");
  const content = Buffer.concat([jpeg, Buffer.alloc(15 * 1024 * 1024 - jpeg.length)]);
  const before = await state();
  const storedBefore = ctx.storage.files.size;
  await expect(portalUpload(ctx, req.uploadToken, { taskId: t.id, key: "selfie", filename: "over.jpg", mime: "image/jpeg", content: Buffer.alloc(content.length + 1) })).rejects.toThrow(/15 MB/);
  expect(await state()).toEqual(before); expect(ctx.storage.files.size).toBe(storedBefore);
  await portalUpload(ctx, req.uploadToken, { taskId: t.id, key: "selfie", filename: "limit.jpg", mime: "image/jpeg", content });
  await assertRetained(content);
});
it("a long Chinese upload filename remains usable with the actual disk adapter and preserves display title and exact bytes", async () => {
  const { req, t } = await setup();
  const root = await mkdtemp(join(tmpdir(), "clerk-upload-audit-"));
  const disk = new DiskStorage(root);
  const content = await bytes("readable-scan.jpg");
  const filename = `香港身份證-${"x".repeat(235)}.jpg`; // 255 UTF-8 bytes, valid ordinary filesystem input
  try {
    await writeFile(join(root, filename), content); // prove original filename is usable on the same filesystem
    await portalUpload({ ...ctx, storage: disk }, req.uploadToken, { taskId: t.id, key: "idCopy", filename, mime: "image/jpeg", content });
    const rows = (await ctx.db.select().from(document)).filter(row => row.source === "upload");
    expect(rows).toHaveLength(1); expect(rows[0].title).toBe(filename);
    expect(rows[0].storageKey).toBeTruthy();
    expect((await disk.get(rows[0].storageKey!)).equals(content)).toBe(true);
  } finally { await rm(root, { recursive: true, force: true }); }
});
it("seeded malformed byte probes are retained or actionably rejected without business mutations or outbound delivery", async () => {
  let seed = 0x8a17c0de;
  const next = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
  for (let sample = 0; sample < 12; sample++) {
    const { req, t, p } = await setup();
    const content = Buffer.from(Array.from({ length: 8 + next() % 120 }, () => next() & 255));
    const mime = ["image/png", "image/jpeg", "application/pdf"][sample % 3];
    ctx.llm.set("extract", emptyExtraction);
    const beforePerson = await getPersonProtected(ctx, p.id);
    let error: unknown;
    try { await portalUpload(ctx, req.uploadToken, { taskId: t.id, key: "idCopy", filename: `種子測試-${sample}`, mime, content }); } catch (e) { error = e; }
    if (error) expect.soft(error).toBeInstanceOf(PortalError);
    expect.soft(await getPersonProtected(ctx, p.id)).toEqual(beforePerson);
    expect.soft(ctx.mail.sent()).toHaveLength(0);
  }
});
it("a real three-page fictional PDF control includes every page rather than silently flattening the fixture", async () => {
  expect((await PDFDocument.load(await bytes("multipage-scan.pdf"))).getPageCount()).toBe(3);
});
it("a direct empty upload cannot create a received document or mutate protected data", async () => {
  const { req, t } = await setup();
  const before = await state();
  const storedBefore = ctx.storage.files.size;
  let error: unknown;
  try { await portalUpload(ctx, req.uploadToken, { taskId: t.id, key: "idCopy", filename: "empty.jpg", mime: "image/jpeg", content: Buffer.alloc(0) }); } catch (e) { error = e; }
  if (error) expect(error).toBeInstanceOf(PortalError);
  expect(await state()).toEqual(before);
  expect(ctx.storage.files.size).toBe(storedBefore);
  expect(ctx.mail.sent()).toHaveLength(0);
});
it("an empty file in a normal combined submission remains blank while its valid typed detail is saved", async () => {
  const { req, t } = await setup();
  const beforeDocs = await ctx.db.select().from(document);
  const storedBefore = ctx.storage.files.size;
  const value = "香港測試地址".repeat(128);
  expect(await portalSubmit(ctx, req.uploadToken, { fields: [{ taskId: t.id, key: "corrAddr", value }], files: [{ taskId: t.id, key: "idCopy", filename: "empty.jpg", mime: "image/jpeg", content: Buffer.alloc(0) }] })).toEqual({ saved: 1 });
  expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "corrAddr")?.value).toBe(value);
  expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "idCopy")?.status).toBe("needed");
  expect(await ctx.db.select().from(document)).toEqual(beforeDocs);
  expect(ctx.storage.files.size).toBe(storedBefore);
  expect(ctx.mail.sent()).toHaveLength(0);
});
