// Deterministic Xero sync jobs (DECISIONS.md #28). Idempotent: an invoice is looked up by
// number before creating, so a retried job never creates a duplicate.
import { asc, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { client, invoice, invoiceLine, payment } from "@/db/schema";
import { onJob } from "./jobs";

onJob("xero.sync_invoice", async (ctx, { invoiceId }) => {
  const inv = (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, invoiceId as string) }))!;
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
    await ctx.db.update(invoice).set({ xeroInvoiceId: xeroId, xeroStatus: "synced", xeroError: null }).where(eq(invoice.id, inv.id));
  } catch (e) {
    await ctx.db.update(invoice).set({ xeroStatus: "error", xeroError: (e as Error).message.slice(0, 500) }).where(eq(invoice.id, inv.id));
    throw e;
  }
});

onJob("xero.sync_payment", async (ctx, { paymentId }) => {
  const pay = (await ctx.db.query.payment.findFirst({ where: eq(payment.id, paymentId as string) }))!;
  if (pay.xeroPaymentId) return;
  const inv = (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, pay.invoiceId) }))!;
  if (!inv.xeroInvoiceId) throw new Error(`Invoice ${inv.number} is not in Xero yet; retrying after the invoice syncs`);
  try {
    const id = await ctx.accounting.createPayment({ invoiceId: inv.xeroInvoiceId, amountCents: pay.amountCents, date: pay.receivedOn, reference: inv.number });
    await ctx.db.update(payment).set({ xeroPaymentId: id, xeroStatus: "synced" }).where(eq(payment.id, pay.id));
  } catch (e) {
    await ctx.db.update(payment).set({ xeroStatus: "error" }).where(eq(payment.id, pay.id));
    throw e;
  }
});

onJob("xero.void_invoice", async () => {
  // Voiding in Xero needs the direct API; recorded for staff to void by hand until then.
});
