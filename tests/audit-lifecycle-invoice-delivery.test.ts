// Area3 invoice immutability spans provider acceptance and local issue bookkeeping.
// Fake accepts the actual approved PDF then loses its response, not a mocked DB state.
import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft, action, intake, review } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { startManualRequest } from "@/domain/manual";
import { approveProposal, getProposal, pendingProposals, resolveInterruptedProposal } from "@/domain/proposals";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { invoiceForRequest } from "@/domain/outbound";
import { invoiceWithLines, setLineAmount } from "@/domain/invoices";
import { invoiceContentFingerprint } from "@/domain/delivery-evidence";
import { deliveryPayload } from "@/domain/mail-delivery";
import { mailDelivery } from "@/db/schema";
import { Crypto } from "@/lib/crypto";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx(); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft); ctx.llm.on("review", review({ items: [] }));
});
async function attemptedInvoice(accepted: boolean) {
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }, { playbookId: "hk.changeParticulars", person: { personId: "per_p1" } }], confirm: true });
  const p = await getProposal(ctx, r.proposalId!);
  const inv = await invoiceForRequest(ctx, r.requestId);
  const snapshot = await invoiceWithLines(ctx, inv!.id);
  const transport = ctx.mail.send.bind(ctx.mail);
  ctx.mail.send = async outbound => { if (accepted) await transport(outbound); throw new Error(accepted ? "Provider accepted invoice PDF; response lost" : "Provider never accepted or sent this invoice"); };
  await expect(approveProposal(ctx, p.id)).rejects.toThrow(/delivery needs review/i);
  ctx.mail.send = transport;
  expect(ctx.mail.sent()).toHaveLength(accepted ? 1 : 0);
  expect((await getProposal(ctx, p.id)).status).toBe("recovery");
  const journal = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.sourceKey, `message:${p.payload.messageId}`) }))!;
  const pdf = deliveryPayload(ctx, journal).attachments![0];
  expect(pdf.filename).toBe(`${snapshot.number}.pdf`); expect(pdf.content.subarray(0,4).toString()).toBe("%PDF");
  const proof = await ctx.mail.reconcileDelivery(journal.correlationId);
  expect(proof.status).toBe(accepted ? "accepted" : "not_sent");
  return { r, p, snapshot, journal, hash: Crypto.sha256(pdf.content) };
}
async function assertImmutable(f: Awaited<ReturnType<typeof attemptedInvoice>>) {
  const current = await invoiceWithLines(ctx, f.snapshot.id);
  expect(invoiceContentFingerprint(current), "invoice records now differ from the PDF accepted by the provider").toBe(invoiceContentFingerprint(f.snapshot));
  const journal = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.id, f.journal.id) }))!;
  expect(Crypto.sha256(deliveryPayload(ctx, journal).attachments![0].content)).toBe(f.hash);
  expect(ctx.mail.sent()).toHaveLength(1);
}
async function amendment(f: Awaited<ReturnType<typeof attemptedInvoice>>, kind: "cancel_request" | "change_request") {
  ctx.llm.set("intake", intake({ actions: [action({ type: kind, taskId: f.r.taskIds[0], description: kind === "cancel_request" ? "Cancel office service" : "Also prepare annual return" })] }));
  if (kind === "change_request") ctx.llm.set("review", review({ items: [], playbookFit: "add", suggestedPlaybookId: "hk.annualReturn", summary: "Additional priced work" }));
  const m = await ingestMessage(ctx, { channel: "email", provider: "fake", providerMessageId: `amend-${kind}`, from: { email: "director@kbtrading.example", name: "CHAN Tai Man" }, to: [ctx.mail.address], cc: [], subject: "Changed instructions", text: "Please change the request", receivedAt: ctx.clock.now(), attachments: [] });
  await processInbound(ctx, m.id);
  const p = (await pendingProposals(ctx)).find(p => p.kind === (kind === "cancel_request" ? "cancel_task" : "change_request"))!;
  expect(p).toBeTruthy();
  await approveProposal(ctx, p.id).catch(e => expect(String(e)).toMatch(/deliver|chang|issue|sent|review|approv|recover/i));
}

it("L-B06: price edits cannot rewrite an invoice whose approved PDF was accepted before a lost response", async () => {
  const f = await attemptedInvoice(true);
  await setLineAmount(ctx, f.snapshot.lines[0].id, f.snapshot.lines[0].amountCents + 32100).catch(e => expect(String(e)).toMatch(/deliver|issue|sent|approv|review|recover/i));
  await assertImmutable(f);
});
it("L-B06: sibling cancellation cannot rewrite an accepted invoice still awaiting local issue recovery", async () => {
  const f = await attemptedInvoice(true); await amendment(f, "cancel_request"); await assertImmutable(f);
});
it("L-B06: added scope cannot append charges to an accepted invoice still awaiting local issue recovery", async () => {
  const f = await attemptedInvoice(true); await amendment(f, "change_request"); await assertImmutable(f);
});
it("control: confirmed non-delivery closed after a mailbox check leaves an editable draft for fresh human review", async () => {
  const f = await attemptedInvoice(false);
  const fresh = await resolveInterruptedProposal(ctx, f.p.id, { checkedMailbox: true, note: "The fake provider positively confirms this invoice was not sent; prepare corrected quote for review" });
  expect(fresh).toBeTruthy();
  await setLineAmount(ctx, f.snapshot.lines[0].id, f.snapshot.lines[0].amountCents + 32100);
  expect((await invoiceWithLines(ctx, f.snapshot.id)).totalCents).toBe(f.snapshot.totalCents + 32100);
  expect(ctx.mail.sent()).toHaveLength(0);
  expect((await getProposal(ctx, fresh!.id)).status).toBe("pending");
});

it("L-B06: closing an accepted-delivery recovery card does not release the original invoice for price edits", async () => {
  const f = await attemptedInvoice(true);
  // A generic mailbox check closes the operation, not the accepted financial history.
  await resolveInterruptedProposal(ctx, f.p.id, { checkedMailbox: true, note: "Checked the mailbox; close this interrupted action and prepare a fresh human review" }).catch(e => expect(String(e)).toMatch(/deliver|accept|sent|review|recover|issue/i));
  await setLineAmount(ctx, f.snapshot.lines[0].id, f.snapshot.lines[0].amountCents + 32100).catch(e => expect(String(e)).toMatch(/deliver|accept|issue|sent|approv|review|recover/i));
  await assertImmutable(f);
});
