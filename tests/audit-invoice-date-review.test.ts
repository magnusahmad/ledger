import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { goodDraft } from "./agent-fixtures";
import { startManualRequest } from "@/domain/manual";
import { approveProposal, getProposal, resumeApprovedProposal, resolveInterruptedProposal } from "@/domain/proposals";
import { invoiceForRequest } from "@/domain/outbound";
import { invoiceWithLines } from "@/domain/invoices";
import { deliveryPayload } from "@/domain/mail-delivery";
import { auditLog, mailDelivery } from "@/db/schema";
import type { Ctx } from "@/lib/ctx";
import { Crypto } from "@/lib/crypto";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx({ now: "2026-12-31T15:59:59Z" }); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); ctx.llm.on("draft", goodDraft); });
type Review = { checkedOriginalInvoice: boolean; issuedOn: string; dueOn: string; note: string; journalId: string; payloadHash: string; pdfSha256: string };
// Existing public recovery entrypoint; baseline ignores the proposed reviewed dates,
// so this reaches its real missing-provenance error rather than an absent export.
const resume = resumeApprovedProposal as (ctx: TestCtx, id: string, reviewedDates: Review) => Promise<unknown>;
async function legacy() {
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }], confirm: true });
  const inv = (await invoiceForRequest(ctx, r.requestId))!; const send = ctx.mail.send.bind(ctx.mail);
  ctx.mail.send = async m => { await send(m); throw new Error("Accepted original PDF; response lost"); };
  await expect(approveProposal(ctx, r.proposalId!)).rejects.toThrow(/delivery needs review/i);
  ctx.mail.send = send; ctx.clock.set("2027-01-01T03:00:00Z");
  const p = await getProposal(ctx, r.proposalId!);
  const row = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.sourceKey, `message:${p.payload.messageId}`) }))!;
  const saved = JSON.parse(ctx.crypto.decrypt(row.payload)); delete saved.invoiceDates; const plain = JSON.stringify(saved);
  await ctx.db.update(mailDelivery).set({ payload: ctx.crypto.encrypt(plain), payloadHash: Crypto.sha256(plain) }).where(eq(mailDelivery.id, row.id));
  const bytes = deliveryPayload(ctx, { ...row, payload: ctx.crypto.encrypt(plain), payloadHash: Crypto.sha256(plain) }).attachments![0].content;
  const input: Review = { checkedOriginalInvoice: true, issuedOn: "2026-12-31", dueOn: "2027-01-30", note: "Viewed the exact originally delivered PDF and verified its issue and due dates", journalId: row.id, payloadHash: Crypto.sha256(plain), pdfSha256: Crypto.sha256(bytes) };
  return { r, inv, row, bytes, input };
}
it("a human review of the exact accepted legacy PDF completes original dated bookkeeping without replacing bytes or resending", async () => {
  const f = await legacy();
  let resendCalls = 0; const send = ctx.mail.send.bind(ctx.mail); ctx.mail.send = async m => { resendCalls++; return send(m); };
  const docCount = await ctx.db.query.document.findMany();
  await resume(ctx, f.r.proposalId!, f.input);
  const current = await invoiceWithLines(ctx, f.inv.id);
  expect(current.issuedOn).toBe("2026-12-31"); expect(current.dueOn).toBe("2027-01-30"); expect((await getProposal(ctx, f.r.proposalId!)).status).toBe("approved");
  expect(ctx.mail.sent()).toHaveLength(1); expect(resendCalls).toBe(0);
  expect(await ctx.db.query.document.findMany()).toEqual(docCount);
  const journal = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.id, f.row.id) }))!;
  expect(deliveryPayload(ctx, journal).attachments![0].content.equals(f.bytes)).toBe(true);
  expect(journal.correlationId).toBe(f.row.correlationId);
  const logs = await ctx.db.select().from(auditLog).where(eq(auditLog.action, "invoice.delivery.dates_reviewed"));
  expect(logs).toHaveLength(1); expect(logs[0].actor).toBe(ctx.userId); expect(logs[0].data).toMatchObject({ issuedOn: f.input.issuedOn, dueOn: f.input.dueOn, pdfSha256: f.input.pdfSha256, note: f.input.note });
}, 120_000);
it("legacy date review rejects unchecked, invalid, stale and foreign submissions atomically before a valid owner review", async () => {
  const f = await legacy();
  const before = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.id, f.row.id) }))!;
  const originalCard = await getProposal(ctx, f.r.proposalId!);
  for (const patch of [{ checkedOriginalInvoice: false }, { note: " " }, { issuedOn: "2027-02-29" }, { dueOn: "2027-01-31" }, { payloadHash: "stale" }, { pdfSha256: "different-pdf" }, { journalId: "foreign-journal" }]) {
    await expect(resume(ctx, f.r.proposalId!, { ...f.input, ...patch })).rejects.toThrow();
    const retained = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.id, f.row.id) }))!;
    expect(retained.payload).toBe(before.payload); expect(retained.payloadHash).toBe(before.payloadHash);
    expect(retained.status).toBe(before.status); expect(retained.result).toEqual(before.result);
    expect(await getProposal(ctx, f.r.proposalId!)).toEqual(originalCard);
    expect((await invoiceWithLines(ctx, f.inv.id)).issuedOn).toBeNull(); expect(ctx.mail.sent()).toHaveLength(1);
  }
  await expect(resume({ ...ctx, firmId: "firm_other" }, f.r.proposalId!, f.input)).rejects.toThrow();
  const reconcile = ctx.mail.reconcileDelivery.bind(ctx.mail);
  (ctx as Ctx).mail.reconcileDelivery = async () => ({ status: "unknown" });
  await expect(resume(ctx, f.r.proposalId!, f.input)).rejects.toThrow(/uncertain|acceptance/i);
  expect((await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.id, f.row.id) }))!.payload).toBe(before.payload);
  ctx.mail.reconcileDelivery = reconcile;
  await resume(ctx, f.r.proposalId!, f.input);
  expect((await invoiceWithLines(ctx, f.inv.id)).issuedOn).toBe("2026-12-31"); expect(ctx.mail.sent()).toHaveLength(1);
}, 120_000);

it("inconsistent captured credit dates block before a previously unaccepted invoice can reach the provider", async () => {
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }], confirm: true });
  const send = ctx.mail.send.bind(ctx.mail);
  ctx.mail.send = async () => { throw new Error("Authoritative fake rejection before acceptance"); };
  await expect(approveProposal(ctx, r.proposalId!)).rejects.toThrow(/delivery needs review/i);
  const p = await getProposal(ctx, r.proposalId!);
  const row = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.sourceKey, `message:${p.payload.messageId}`) }))!;
  const saved = JSON.parse(ctx.crypto.decrypt(row.payload)); saved.invoiceDates.dueOn = "2027-01-31";
  const plain = JSON.stringify(saved); await ctx.db.update(mailDelivery).set({ payload: ctx.crypto.encrypt(plain), payloadHash: Crypto.sha256(plain) }).where(eq(mailDelivery.id, row.id));
  let calls = 0; ctx.mail.send = async m => { calls++; return send(m); };
  await expect(approveProposal(ctx, r.proposalId!)).rejects.toThrow(/date|review|terms/i);
  expect(calls).toBe(0); expect(ctx.mail.sent()).toHaveLength(0);
}, 120_000);

it("reviewed dates remain usable after mailbox closure and the fresh handled-elsewhere card rejects missing legacy provenance", async () => {
  const f = await legacy();
  const fresh = (await resolveInterruptedProposal(ctx, f.r.proposalId!, { checkedMailbox: true, note: "Confirmed original delivered PDF; its dates need explicit review" }))!;
  await expect(approveProposal(ctx, fresh.id, { edits: { completedOutside: "on", note: "Complete original delivery, no new email" } })).rejects.toThrow(/date|review/i);
  await resume(ctx, fresh.id, f.input);
  expect((await getProposal(ctx, fresh.id)).status).toBe("approved");
  expect((await invoiceWithLines(ctx, f.inv.id)).issuedOn).toBe("2026-12-31"); expect(ctx.mail.sent()).toHaveLength(1);
  const journal = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.id, f.row.id) }))!;
  expect(deliveryPayload(ctx, journal).attachments![0].content.equals(f.bytes)).toBe(true);
}, 120_000);
