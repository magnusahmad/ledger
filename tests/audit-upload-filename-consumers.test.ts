// Same reported storage-key filename class through two other real MVP consumers.
import { beforeEach, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { logMailItem } from "@/domain/mail-items";
import { ingestMessage } from "@/domain/inbound";
import { DiskStorage } from "@/integrations/storage";
import { attachment, conversation, document, mailItem, message, person, proposal, task, appointment, invoice, request } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });
async function snapshot() {
  return { attachments: await ctx.db.select().from(attachment), conversations: await ctx.db.select().from(conversation), documents: await ctx.db.select().from(document), mailItems: await ctx.db.select().from(mailItem), messages: await ctx.db.select().from(message), people: await ctx.db.select().from(person), proposals: await ctx.db.select().from(proposal), tasks: await ctx.db.select().from(task), appointments: await ctx.db.select().from(appointment), invoices: await ctx.db.select().from(invoice), requests: await ctx.db.select().from(request) };
}
function assertActionable(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  expect.soft(text).toMatch(/filename|attachment|file.*long|scan.*long/i);
  expect.soft(text).not.toMatch(/ENAMETOOLONG/);
}
it("staff scanned mail with an ordinary 255-byte filename preserves evidence and a human-gated notice or rejects actionably without stranded work", async () => {
  const root = await mkdtemp(join(tmpdir(), "clerk-mail-filename-"));
  const storage = new DiskStorage(root);
  const filename = `香港身份證-${"x".repeat(235)}.jpg`;
  const content = await readFile("tests/fixtures/upload-corpus/readable-scan.jpg");
  ctx.llm.set("mail", { clientId: "cli_c1", addressee: "Kowloon Bay Trading Limited", sender: "Fictional postal sender", summaryEn: "Fictional company letter scan", urgency: "normal", actionNeeded: null, enforcement: null });
  ctx.llm.set("draft", goodDraft);
  try {
    expect(Buffer.byteLength(filename)).toBe(255);
    await writeFile(join(root, filename), content); // establishes valid source filename on this disk
    const before = await snapshot();
    let error: unknown;
    let result: Awaited<ReturnType<typeof logMailItem>> | undefined;
    try { result = await logMailItem({ ...ctx, storage }, { filename, mime: "image/jpeg", content, receivedOn: "2026-10-03" }); } catch (e) { error = e; }
    if (error) { assertActionable(error); expect(await snapshot()).toEqual(before); }
    else {
      expect(result).toBeDefined();
      const d = (await ctx.db.select().from(document)).find(row => row.id === result!.documentId)!;
      expect(d).toMatchObject({ source: "scan", mime: "image/jpeg", sha256: Crypto.sha256(content), kind: "mail_item" });
      expect((await storage.get(d.storageKey!)).equals(content)).toBe(true);
      const p = (await ctx.db.select().from(proposal)).find(row => row.id === result!.proposalId);
      expect(p).toMatchObject({ kind: "send_message", status: "pending" });
      expect(await ctx.db.select().from(person)).toEqual(before.people);
      expect(await ctx.db.select().from(appointment)).toEqual(before.appointments);
      expect(await ctx.db.select().from(invoice)).toEqual(before.invoices);
    }
    expect(ctx.mail.sent()).toHaveLength(0); expect(ctx.accounting.calls).toHaveLength(0);
  } finally { await rm(root, { recursive: true, force: true }); }
});
it("an overlong declared email attachment filename is safely stored or actionably rejected atomically without stranding a partial incoming message", async () => {
  const root = await mkdtemp(join(tmpdir(), "clerk-inbound-filename-"));
  const storage = new DiskStorage(root);
  const content = await readFile("tests/fixtures/upload-corpus/readable-scan.jpg");
  const filename = `${"附件繁體简体-".repeat(40)}.jpg`;
  const before = await snapshot();
  try {
    let error: unknown;
    let result: Awaited<ReturnType<typeof ingestMessage>> | undefined;
    try { result = await ingestMessage({ ...ctx, storage }, { clientId: "cli_c1", channel: "email", provider: "fake", providerMessageId: "fictional-long-attachment", from: { email: "director@kbtrading.example", name: "Fictional director" }, to: [ctx.mail.address], cc: [], subject: "Fictional multi-file email", text: "Please retain both fictional scans for staff.", receivedAt: ctx.clock.now(), attachments: [{ filename: "first.jpg", mime: "image/jpeg", content }, { filename, mime: "image/jpeg", content }] }); } catch (e) { error = e; }
    if (error) { assertActionable(error); expect(await snapshot()).toEqual(before); }
    else {
      const a = (await ctx.db.select().from(attachment)).filter(row => row.messageId === result!.id);
      expect(a.map(row => row.filename)).toEqual(["first.jpg", filename]);
      for (const row of a) {
        const d = (await ctx.db.select().from(document)).find(d => d.id === row.documentId)!;
        expect(d.sha256).toBe(Crypto.sha256(content));
        expect((await storage.get(d.storageKey!)).equals(content)).toBe(true);
      }
      const after = await snapshot();
      expect(after.people).toEqual(before.people); expect(after.appointments).toEqual(before.appointments);
      expect(after.tasks).toEqual(before.tasks); expect(after.invoices).toEqual(before.invoices);
      expect(after.proposals).toEqual(before.proposals); expect(after.requests).toEqual(before.requests);
    }
    expect(ctx.llm.calls).toHaveLength(0); expect(ctx.mail.sent()).toHaveLength(0); expect(ctx.accounting.calls).toHaveLength(0);
  } finally { await rm(root, { recursive: true, force: true }); }
});
