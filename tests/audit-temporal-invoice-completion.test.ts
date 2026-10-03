// Necessary D01 closure consumers: actual mailbox-check/fresh-review staff path.
import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { goodDraft } from "./agent-fixtures";
import { startManualRequest } from "@/domain/manual";
import { approveProposal, getProposal, resolveInterruptedProposal } from "@/domain/proposals";
import { invoiceForRequest } from "@/domain/outbound";
import { invoiceWithLines } from "@/domain/invoices";
import { deliveryPayload } from "@/domain/mail-delivery";
import { mailDelivery } from "@/db/schema";
import { Crypto } from "@/lib/crypto";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx({ now: "2026-12-31T15:59:59Z" });
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); ctx.llm.on("draft", goodDraft);
});
async function acceptedLostAck() {
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }], confirm: true });
  const inv = (await invoiceForRequest(ctx, r.requestId))!;
  const transport = ctx.mail.send.bind(ctx.mail);
  ctx.mail.send = async mail => { await transport(mail); throw new Error("Fake accepted Dec31 invoice, lost acknowledgement"); };
  await expect(approveProposal(ctx, r.proposalId!)).rejects.toThrow(/delivery needs review/i);
  ctx.mail.send = transport; ctx.clock.set("2027-01-01T03:00:00Z");
  const p = await getProposal(ctx, r.proposalId!);
  const journal = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.sourceKey, `message:${p.payload.messageId}`) }))!;
  const hash = Crypto.sha256(deliveryPayload(ctx, journal).attachments![0].content);
  return { r, inv, journal, hash };
}
async function unchangedDelivery(f: Awaited<ReturnType<typeof acceptedLostAck>>) {
  const journal = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.id, f.journal.id) }))!;
  expect(Crypto.sha256(deliveryPayload(ctx, journal).attachments![0].content)).toBe(f.hash);
  expect(ctx.mail.sent()).toHaveLength(1);
}
it("A10-D01 closure: mailbox-checked fresh staff completion retains accepted PDF dates rather than the later completion day", async () => {
  const f = await acceptedLostAck();
  const fresh = (await resolveInterruptedProposal(ctx, f.r.proposalId!, { checkedMailbox: true, note: "Checked Sent: the original invoice PDF was delivered; mark sending complete without another email" }))!;
  await approveProposal(ctx, fresh.id, { edits: { completedOutside: "on", note: "Confirmed the original invoice PDF in Sent" } });
  await unchangedDelivery(f);
  const current = await invoiceWithLines(ctx, f.inv.id);
  expect.soft(current.issuedOn).toBe("2026-12-31"); expect.soft(current.dueOn).toBe("2027-01-30");
});
it("A10-D01 closure: a generic checked-mailbox completion cannot invent dates for an accepted legacy PDF without provenance", async () => {
  const f = await acceptedLostAck();
  const legacy = JSON.parse(ctx.crypto.decrypt(f.journal.payload)); delete legacy.invoiceDates;
  const plain = JSON.stringify(legacy);
  await ctx.db.update(mailDelivery).set({ payload: ctx.crypto.encrypt(plain), payloadHash: Crypto.sha256(plain) }).where(eq(mailDelivery.id, f.journal.id));
  const fresh = (await resolveInterruptedProposal(ctx, f.r.proposalId!, { checkedMailbox: true, note: "Generic mailbox check; original PDF received, its financial dates have not been reviewed" }))!;
  await approveProposal(ctx, fresh.id, { edits: { completedOutside: "on", note: "Generic mailbox check" } }).catch(e => expect(String(e)).toMatch(/date|review|invoice/i));
  await unchangedDelivery(f);
  const current = await invoiceWithLines(ctx, f.inv.id);
  expect.soft(current.status).toBe("draft"); expect.soft(current.issuedOn).toBeNull(); expect.soft(current.dueOn).toBeNull();
});
it("control: invoice-ID, invalid dates, PDF hash and credit-term inconsistencies require review without resend before valid recovery", async () => {
  const f = await acceptedLostAck();
  const saved = JSON.parse(ctx.crypto.decrypt(f.journal.payload));
  expect(saved.invoiceDates).toBeTruthy();
  for (const patch of [{ invoiceId: "foreign-invoice" }, { issuedOn: "2027-02-29" }, { pdfSha256: "wrong-pdf-hash" }, { dueOn: "2027-01-31" }]) {
    const plain = JSON.stringify({ ...saved, invoiceDates: { ...saved.invoiceDates, ...patch } });
    await ctx.db.update(mailDelivery).set({ payload: ctx.crypto.encrypt(plain), payloadHash: Crypto.sha256(plain) }).where(eq(mailDelivery.id, f.journal.id));
    await expect(approveProposal(ctx, f.r.proposalId!)).rejects.toThrow(/date|review|terms/i);
    expect((await invoiceWithLines(ctx, f.inv.id)).issuedOn).toBeNull();
    await unchangedDelivery(f);
  }
  await ctx.db.update(mailDelivery).set({ payload: f.journal.payload, payloadHash: f.journal.payloadHash }).where(eq(mailDelivery.id, f.journal.id));
  await approveProposal(ctx, f.r.proposalId!);
  expect((await invoiceWithLines(ctx, f.inv.id)).issuedOn).toBe("2026-12-31"); await unchangedDelivery(f);
}, 120_000);
