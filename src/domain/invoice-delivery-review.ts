// A staff review can supply unavailable legacy date provenance. It does not
// infer a PDF date, authorize another send, or replace the accepted attachment.
import { and, eq, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { invoice, mailDelivery, message, proposal, request } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import { executionFacts } from "./approval-execution";
import { audit } from "./audit";
import { addDays, isIsoDate } from "./dates";
import { acceptedDeliveryReceipt, deliveryPayload } from "./mail-delivery";

export type InvoiceDateReview = { checkedOriginalInvoice: boolean; issuedOn: string; dueOn: string; note: string; journalId: string; payloadHash: string; pdfSha256: string };
export async function invoiceDateReviewContext(ctx: Ctx, proposalId: string) {
  const p = await ctx.db.query.proposal.findFirst({ where: and(eq(proposal.id, proposalId), eq(proposal.firmId, ctx.firmId)) });
  if (!p || p.kind !== "send_message" || p.status !== "recovery") return null;
  const m = await ctx.db.query.message.findFirst({ where: and(eq(message.id, p.payload.messageId as string), eq(message.firmId, ctx.firmId)) });
  const req = p.requestId ? await ctx.db.query.request.findFirst({ where: and(eq(request.id, p.requestId), eq(request.firmId, ctx.firmId)) }) : null;
  const id = p.payload.invoiceId as string | undefined ?? req?.invoiceId;
  if (!id || (m?.intake as { attachInvoiceId?: string } | null)?.attachInvoiceId !== id) return null;
  const inv = await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.id, id), eq(invoice.firmId, ctx.firmId)) });
  if (!inv || inv.status !== "draft") return null;
  // A fresh "handled elsewhere" card still refers to the old accepted delivery.
  const rows = await ctx.db.select({ delivery: mailDelivery }).from(mailDelivery).innerJoin(message, and(eq(message.firmId, ctx.firmId), eq(mailDelivery.sourceKey, sql`'message:' || ${message.id}`)))
    .where(and(eq(mailDelivery.firmId, ctx.firmId), sql`${message.intake}->>'attachInvoiceId' = ${id}`));
  const candidates = rows.map(r => r.delivery).filter(d => d.status !== "prepared");
  if (candidates.length !== 1) return null; // multiple historic attempts need a separate correction review
  const journal = candidates[0];
  const mail = deliveryPayload(ctx, journal); // verifies the encrypted payload digest
  const pdfs = mail.attachments?.filter(a => a.mime === "application/pdf" && a.filename === `${inv.number}.pdf`) ?? [];
  if (pdfs.length !== 1) return null;
  const pdf = pdfs[0];
  const hasDates = !!JSON.parse(ctx.crypto.decrypt(journal.payload)).invoiceDates;
  return { journal, invoice: inv, pdf, hasDates, pdfSha256: Crypto.sha256(pdf.content) };
}

export async function reviewLegacyInvoiceDates(ctx: Ctx, proposalId: string, input: InvoiceDateReview) {
  if (!input.checkedOriginalInvoice || !input.note.trim()) throw new Error("Check the original delivered invoice PDF and add a verification note");
  const context = await invoiceDateReviewContext(ctx, proposalId);
  if (!context || context.hasDates) throw new Error("Legacy invoice date review is not available for this action");
  const { journal, invoice: inv, pdfSha256 } = context;
  if (journal.id !== input.journalId || journal.payloadHash !== input.payloadHash || pdfSha256 !== input.pdfSha256) throw new Error("The original invoice review changed; reload and review the exact PDF again");
  if (!isIsoDate(input.issuedOn) || !isIsoDate(input.dueOn) || addDays(input.issuedOn, inv.termsDays) !== input.dueOn) throw new Error("The reviewed issue and due dates must match the invoice credit terms");
  // Positive evidence only. Unknown acceptance cannot become a fresh delivery.
  const receipt = await acceptedDeliveryReceipt(ctx, journal);
  if (!receipt?.providerMessageId) throw new Error("Invoice delivery remains uncertain; confirm the original acceptance before reviewing its dates");
  await ctx.db.transaction(async db => {
    const tx = { ...ctx, db: db as unknown as Ctx["db"] };
    await db.execute(sql`select id from proposal where id = ${proposalId} and firm_id = ${ctx.firmId} for update`);
    await db.execute(sql`select id from invoice where id = ${inv.id} and firm_id = ${ctx.firmId} for update`);
    const p = await db.query.proposal.findFirst({ where: and(eq(proposal.id, proposalId), eq(proposal.firmId, ctx.firmId)) });
    if (!p || p.factsHash !== await executionFacts(tx, p)) throw new Error("The task or invoice facts changed; a fresh review is required");
    const current = await invoiceDateReviewContext(tx, proposalId);
    if (!current || current.hasDates || current.journal.id !== input.journalId || current.journal.payloadHash !== input.payloadHash || current.pdfSha256 !== input.pdfSha256 || current.invoice.termsDays !== inv.termsDays) throw new Error("The original invoice review changed; reload before completing it");
    const saved = JSON.parse(ctx.crypto.decrypt(current.journal.payload));
    const invoiceDates = { invoiceId: inv.id, issuedOn: input.issuedOn, dueOn: input.dueOn, pdfSha256 };
    const plain = JSON.stringify({ ...saved, invoiceDates });
    const [updated] = await db.update(mailDelivery).set({ payload: ctx.crypto.encrypt(plain), payloadHash: Crypto.sha256(plain), status: "sent", result: receipt, error: null })
      .where(and(eq(mailDelivery.id, journal.id), eq(mailDelivery.firmId, ctx.firmId), eq(mailDelivery.payloadHash, input.payloadHash))).returning();
    if (!updated) throw new Error("The original invoice review changed; reload before completing it");
    await audit(tx, "invoice.delivery.dates_reviewed", "invoice", inv.id, { ...invoiceDates, journalId: journal.id, previousPayloadHash: input.payloadHash, payloadHash: updated.payloadHash, note: input.note.trim(), proposalId });
  });
}
