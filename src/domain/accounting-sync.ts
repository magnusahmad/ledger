// Deterministic Xero sync jobs (DECISIONS.md #28). Idempotent: an invoice is looked up by
// number before creating, so a retried job never creates a duplicate.
import { and, asc, eq } from "drizzle-orm";
import { client, invoice, invoiceLine, payment } from "@/db/schema";
import { onJob, onJobError } from "./jobs";

onJob("xero.sync_invoice", async (ctx, { invoiceId }) => {
  const inv = (await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.id, invoiceId as string), eq(invoice.firmId, ctx.firmId)) }))!;
  if (!inv) throw new Error("Invoice not found in this firm");
  if (inv.xeroInvoiceId) return;
  try {
    let xeroId = await ctx.accounting.findInvoiceByNumber(inv.number);
    if (!xeroId) {
      const cl = (await ctx.db.query.client.findFirst({ where: eq(client.id, inv.clientId) }))!;
      const bc = inv.billingContactId ? await ctx.db.query.contact.findFirst({ where: (c, { eq }) => eq(c.id, inv.billingContactId!) }) : null;
      const contactId = await ctx.accounting.upsertContact(cl.nameEn, bc?.email);
      const lines = await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId, inv.id)).orderBy(asc(invoiceLine.sort));
      xeroId = await ctx.accounting.createInvoice({
        contactName: cl.nameEn, contactEmail: bc?.email, number: inv.number, issuedOn: inv.issuedOn ?? ctx.clock.today(), dueOn: inv.dueOn ?? ctx.clock.today(), currency: inv.currency,
        lines: lines.map((l) => ({ description: l.description, amountCents: l.amountCents, accountCode: ctx.config.XERO_SALES_ACCOUNT_CODE })),
      }, contactId);
    }
    await ctx.db.update(invoice).set({ xeroInvoiceId: xeroId, xeroStatus: "synced", xeroError: null }).where(and(eq(invoice.id, inv.id), eq(invoice.firmId, ctx.firmId)));
  } catch (e) {
    await ctx.db.update(invoice).set({ xeroStatus: "error", xeroError: (e as Error).message.slice(0, 500) }).where(and(eq(invoice.id, inv.id), eq(invoice.firmId, ctx.firmId)));
    throw e;
  }
});

onJob("xero.sync_payment", async (ctx, { paymentId }) => {
  const pay = (await ctx.db.query.payment.findFirst({ where: and(eq(payment.id, paymentId as string), eq(payment.firmId, ctx.firmId)) }))!;
  if (!pay) throw new Error("Payment not found in this firm");
  if (pay.xeroPaymentId) return;
  const inv = (await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.id, pay.invoiceId), eq(invoice.firmId, ctx.firmId)) }))!;
  if (!inv) throw new Error("Invoice not found in this firm");
  if (!inv.xeroInvoiceId) throw new Error(`Invoice ${inv.number} is not in Xero yet; retrying after the invoice syncs`);
  try {
    const id = await ctx.accounting.createPayment({ idempotencyKey: `harbourline:${ctx.firmId}:${pay.id}`, invoiceId: inv.xeroInvoiceId, amountCents: pay.amountCents, date: pay.receivedOn, reference: inv.number });
    await ctx.db.update(payment).set({ xeroPaymentId: id, xeroStatus: "synced" }).where(and(eq(payment.id, pay.id), eq(payment.firmId, ctx.firmId)));
  } catch (e) {
    await ctx.db.update(payment).set({ xeroStatus: "error" }).where(and(eq(payment.id, pay.id), eq(payment.firmId, ctx.firmId)));
    throw e;
  }
});

onJob("xero.void_invoice", async () => {
  // Voiding in Xero needs the direct API; recorded for staff to void by hand until then.
});

// Operational failure evidence survives rollback of partial business effects.
onJobError("xero.sync_invoice", async (ctx, { invoiceId }, e) => {
  await ctx.db.update(invoice).set({ xeroStatus: "error", xeroError: e.message.slice(0, 500) }).where(and(eq(invoice.id, invoiceId as string), eq(invoice.firmId, ctx.firmId)));
});
onJobError("xero.sync_payment", async (ctx, { paymentId }) => {
  await ctx.db.update(payment).set({ xeroStatus: "error" }).where(and(eq(payment.id, paymentId as string), eq(payment.firmId, ctx.firmId)));
});
