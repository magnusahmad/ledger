// Invoices: one per request, a line per task fee plus statutory disbursements.
import { and, asc, eq, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { contact, firm, invoice, invoiceLine, request as requestT } from "@/db/schema";
import { getPlaybook } from "./playbooks";
import { tasksForRequest } from "./engine";
import { addDays } from "./dates";
import { audit } from "./audit";

export class InvoiceError extends Error {}

export async function nextInvoiceNumber(ctx: Ctx): Promise<string> {
  const year = ctx.clock.today().slice(0, 4);
  // Allocate atomically, skipping numbers already used as custom numbers.
  for (;;) {
    const [f] = await ctx.db.update(firm).set({ invoiceSeq: sql`${firm.invoiceSeq} + 1` }).where(eq(firm.id, ctx.firmId)).returning();
    const n = `${f.invoicePrefix}${year}-${String(f.invoiceSeq).padStart(4, "0")}`;
    const clash = await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.firmId, ctx.firmId), eq(invoice.number, n)) });
    if (!clash) return n;
  }
}

export async function billingContact(ctx: Ctx, clientId: string) {
  const cs = await ctx.db.select().from(contact).where(and(eq(contact.firmId, ctx.firmId), eq(contact.clientId, clientId)));
  return cs.find((c) => c.isBilling) ?? cs.find((c) => c.isInstructing) ?? cs[0] ?? null;
}

export async function createInvoiceForRequest(ctx: Ctx, requestId: string) {
  const req = await ctx.db.query.request.findFirst({ where: eq(requestT.id, requestId) });
  if (!req) throw new InvoiceError("Request not found");
  const cl = await ctx.db.query.client.findFirst({ where: (t, { eq }) => eq(t.id, req.clientId) });
  const tasks = (await tasksForRequest(ctx, requestId)).filter((t) => t.status !== "cancelled");
  const lines: { taskId: string | null; description: string; amountCents: number; kind: "fee" | "disbursement" }[] = [];
  const disb: typeof lines = [];
  for (const t of tasks) {
    const pb = await getPlaybook(ctx, t.playbookId, t.playbookVersion);
    const plan = t.params.plan as { title: string; feeHkd: number } | undefined;
    const fee = plan ? Math.round(plan.feeHkd * 100) : pb.feeCents;
    if (fee > 0) lines.push({ taskId: t.id, description: plan ? plan.title : t.title, amountCents: fee, kind: "fee" });
    for (const s of pb.statutoryFees ?? []) disb.push({ taskId: t.id, description: s.description, amountCents: s.amountCents, kind: "disbursement" });
  }
  const all = [...lines, ...disb];
  if (all.length === 0) return null;
  const terms = cl?.paymentTermsDays ?? 0;
  const bc = await billingContact(ctx, req.clientId);
  const [inv] = await ctx.db.insert(invoice).values({
    id: ctx.ids.next("inv"), firmId: ctx.firmId, clientId: req.clientId, requestId, number: await nextInvoiceNumber(ctx),
    status: "draft", termsDays: terms, totalCents: all.reduce((s, l) => s + l.amountCents, 0), billingContactId: bc?.id ?? null,
    createdAt: ctx.clock.now(),
  }).returning();
  await ctx.db.insert(invoiceLine).values(all.map((l, i) => ({ id: ctx.ids.next("inl"), firmId: ctx.firmId, invoiceId: inv.id, ...l, sort: i })));
  await ctx.db.update(requestT).set({ invoiceId: inv.id }).where(eq(requestT.id, requestId));
  await audit(ctx, "invoice.create", "invoice", inv.id, { number: inv.number, total: inv.totalCents }, "system");
  return inv;
}

export async function invoiceWithLines(ctx: Ctx, invoiceId: string) {
  const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, invoiceId) });
  if (!inv) throw new InvoiceError("Invoice not found");
  const lines = await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId, invoiceId)).orderBy(asc(invoiceLine.sort));
  return { ...inv, lines };
}

export async function recalcTotal(ctx: Ctx, invoiceId: string) {
  const lines = await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId, invoiceId));
  const total = lines.reduce((s, l) => s + l.amountCents, 0);
  await ctx.db.update(invoice).set({ totalCents: total }).where(eq(invoice.id, invoiceId));
  return total;
}

/** Marks an invoice sent: sets issue and due dates from the terms. */
export async function markInvoiceSent(ctx: Ctx, invoiceId: string) {
  const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, invoiceId) });
  if (!inv || inv.status !== "draft") return inv;
  const issued = ctx.clock.today();
  const [row] = await ctx.db.update(invoice).set({ status: "sent", issuedOn: issued, dueOn: addDays(issued, inv.termsDays) }).where(eq(invoice.id, invoiceId)).returning();
  await audit(ctx, "invoice.sent", "invoice", invoiceId, { number: inv.number });
  return row;
}

export async function voidInvoice(ctx: Ctx, invoiceId: string, reason: string) {
  const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, invoiceId) });
  if (!inv) throw new InvoiceError("Invoice not found");
  if (inv.paidCents > 0) throw new InvoiceError("A paid or part-paid invoice can't be voided; issue a credit note instead");
  await ctx.db.update(invoice).set({ status: "void" }).where(eq(invoice.id, invoiceId));
  await audit(ctx, "invoice.void", "invoice", invoiceId, { reason });
}
