// Invoices: one per request, a line per task fee plus statutory disbursements.
import { and, asc, eq, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { contact, firm, invoice, invoiceLine, mailDelivery, message, proposal, request as requestT } from "@/db/schema";
import { getPlaybook } from "./playbooks";
import { tasksForRequest } from "./engine";
import { addDays, isIsoDate } from "./dates";
import { audit } from "./audit";
import { deliveryConfirmedUnsent } from "./mail-delivery";

export class InvoiceError extends Error {}

/** An approved PDF becomes immutable at the network boundary, even if local issue
 * bookkeeping has not finished. Read-only absence proof plus a closed operation
 * permits correction; a generic mailbox-check closure cannot erase acceptance. */
export async function assertInvoiceDraftEditable(ctx: Ctx, invoiceId: string) {
  const attempts = await ctx.db.select({ delivery: mailDelivery, status: proposal.status }).from(mailDelivery)
    .innerJoin(message, and(eq(message.firmId, ctx.firmId), eq(mailDelivery.sourceKey, sql`'message:' || ${message.id}`)))
    .leftJoin(proposal, and(eq(proposal.id, message.proposalId), eq(proposal.firmId, ctx.firmId)))
    .where(and(eq(mailDelivery.firmId, ctx.firmId), sql`${message.intake}->>'attachInvoiceId' = ${invoiceId}`));
  for (const attempt of attempts) {
    if (attempt.status === "processing" || attempt.status === "recovery" || !await deliveryConfirmedUnsent(ctx, attempt.delivery)) {
      throw new InvoiceError("The approved invoice may have been delivered. Recover or review that delivery before changing billing; an accepted invoice needs a separate correction.");
    }
  }
}

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
  const req = await ctx.db.query.request.findFirst({ where: and(eq(requestT.id, requestId), eq(requestT.firmId, ctx.firmId)) });
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
  const totalCents = all.reduce((sum, line) => sum + line.amountCents, 0);
  if (all.some(line => !Number.isSafeInteger(line.amountCents) || line.amountCents < 0) || !Number.isSafeInteger(totalCents)) {
    throw new InvoiceError("Invoice lines and total must be nonnegative safe integer cents; adjust the quote before continuing");
  }
  const terms = cl?.paymentTermsDays ?? 0;
  const bc = await billingContact(ctx, req.clientId);
  const [inv] = await ctx.db.insert(invoice).values({
    id: ctx.ids.next("inv"), firmId: ctx.firmId, clientId: req.clientId, requestId, number: await nextInvoiceNumber(ctx),
    status: "draft", termsDays: terms, totalCents, billingContactId: bc?.id ?? null,
    createdAt: ctx.clock.now(),
  }).returning();
  await ctx.db.insert(invoiceLine).values(all.map((l, i) => ({ id: ctx.ids.next("inl"), firmId: ctx.firmId, invoiceId: inv.id, ...l, sort: i })));
  await ctx.db.update(requestT).set({ invoiceId: inv.id }).where(eq(requestT.id, requestId));
  await audit(ctx, "invoice.create", "invoice", inv.id, { number: inv.number, total: inv.totalCents }, "system");
  return inv;
}

export async function invoiceWithLines(ctx: Ctx, invoiceId: string) {
  const inv = await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.id, invoiceId), eq(invoice.firmId, ctx.firmId)) });
  if (!inv) throw new InvoiceError("Invoice not found");
  const lines = await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId, invoiceId)).orderBy(asc(invoiceLine.sort));
  return { ...inv, lines };
}

export async function recalcTotal(ctx: Ctx, invoiceId: string) {
  return withInvoiceLock(ctx, invoiceId, txCtx => recalcTotalAtomic(txCtx, invoiceId));
}

async function recalcTotalAtomic(ctx: Ctx, invoiceId: string) {
  const { lines } = await invoiceWithLines(ctx, invoiceId);
  const total = lines.reduce((s, l) => s + l.amountCents, 0);
  if (!Number.isSafeInteger(total) || total < 0) throw new InvoiceError("Invoice total must be safe integer cents");
  await ctx.db.update(invoice).set({ totalCents: total }).where(eq(invoice.id, invoiceId));
  return total;
}

/** Marks an invoice sent: sets issue and due dates from the terms. */
async function withInvoiceLock<T>(ctx: Ctx, invoiceId: string, work: (ctx: Ctx) => Promise<T>): Promise<T> {
  return ctx.db.transaction(async db => {
    await db.execute(sql`select id from invoice where id = ${invoiceId} and firm_id = ${ctx.firmId} for update`);
    return work({ ...ctx, db: db as unknown as Ctx["db"] });
  });
}

export async function markInvoiceSent(ctx: Ctx, invoiceId: string, approvedDates?: { issuedOn: string; dueOn: string }) {
  return withInvoiceLock(ctx, invoiceId, txCtx => markInvoiceSentAtomic(txCtx, invoiceId, approvedDates));
}

async function markInvoiceSentAtomic(ctx: Ctx, invoiceId: string, approvedDates?: { issuedOn: string; dueOn: string }) {
  const inv = await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.id, invoiceId), eq(invoice.firmId, ctx.firmId)) });
  if (!inv || inv.status !== "draft") return inv;
  const issued = approvedDates?.issuedOn ?? ctx.clock.today();
  if (approvedDates && (!isIsoDate(issued) || !isIsoDate(approvedDates.dueOn) || approvedDates.dueOn !== addDays(issued, inv.termsDays))) throw new InvoiceError("Invoice delivery dates need review: the captured payment terms no longer match");
  const [row] = await ctx.db.update(invoice).set({ status: inv.totalCents === 0 ? "paid" : "sent", issuedOn: issued, dueOn: addDays(issued, inv.termsDays) }).where(eq(invoice.id, invoiceId)).returning();
  await audit(ctx, "invoice.sent", "invoice", invoiceId, { number: inv.number });
  return row;
}

export async function voidInvoice(ctx: Ctx, invoiceId: string, reason: string) {
  return withInvoiceLock(ctx, invoiceId, txCtx => voidInvoiceAtomic(txCtx, invoiceId, reason));
}

async function voidInvoiceAtomic(ctx: Ctx, invoiceId: string, reason: string) {
  const inv = await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.id, invoiceId), eq(invoice.firmId, ctx.firmId)) });
  if (!inv) throw new InvoiceError("Invoice not found");
  if (inv.paidCents > 0) throw new InvoiceError("A paid or part-paid invoice can't be voided; issue a credit note instead");
  if (inv.status === "draft") await assertInvoiceDraftEditable(ctx, inv.id);
  await ctx.db.update(invoice).set({ status: "void" }).where(eq(invoice.id, invoiceId));
  await audit(ctx, "invoice.void", "invoice", invoiceId, { reason });
}

/** Staff can set a custom number on a draft; it never consumes the auto sequence. */
export async function setInvoiceNumber(ctx: Ctx, invoiceId: string, number: string) {
  return withInvoiceLock(ctx, invoiceId, txCtx => setInvoiceNumberAtomic(txCtx, invoiceId, number));
}

async function setInvoiceNumberAtomic(ctx: Ctx, invoiceId: string, number: string) {
  const n = number.trim();
  if (/[\u0000-\u001f\u007f]/.test(number)) throw new InvoiceError("Invoice number cannot contain control characters");
  if (!n) throw new InvoiceError("Invoice number can't be blank");
  const inv = await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.id, invoiceId), eq(invoice.firmId, ctx.firmId)) });
  if (!inv) throw new InvoiceError("Invoice not found");
  if (inv.status !== "draft") throw new InvoiceError("The number can't change once the invoice has been sent; revise it instead");
  await assertInvoiceDraftEditable(ctx, invoiceId);
  const clash = await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.firmId, ctx.firmId), eq(invoice.number, n)) });
  if (clash && clash.id !== invoiceId) throw new InvoiceError(`Invoice number ${n} is already used`);
  await ctx.db.update(invoice).set({ number: n, numberIsCustom: true }).where(eq(invoice.id, invoiceId));
  await audit(ctx, "invoice.renumber", "invoice", invoiceId, { from: inv.number, to: n });
}

export async function setLineAmount(ctx: Ctx, lineId: string, amountCents: number) {
  const own = await ctx.db.query.invoiceLine.findFirst({ where: and(eq(invoiceLine.id, lineId), eq(invoiceLine.firmId, ctx.firmId)) });
  if (!own) throw new InvoiceError("Line not found");
  return withInvoiceLock(ctx, own.invoiceId, txCtx => setLineAmountAtomic(txCtx, lineId, amountCents));
}

async function setLineAmountAtomic(ctx: Ctx, lineId: string, amountCents: number) {
  const line = await ctx.db.query.invoiceLine.findFirst({ where: and(eq(invoiceLine.id, lineId), eq(invoiceLine.firmId, ctx.firmId)) });
  if (!line) throw new InvoiceError("Line not found");
  const inv = await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.id, line.invoiceId), eq(invoice.firmId, ctx.firmId)) });
  if (inv?.status !== "draft") throw new InvoiceError("Prices can't change once the invoice has been sent; revise it instead");
  await assertInvoiceDraftEditable(ctx, inv.id);
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) throw new InvoiceError("Amount must be zero or more");
  await ctx.db.update(invoiceLine).set({ amountCents }).where(eq(invoiceLine.id, lineId));
  return recalcTotal(ctx, line.invoiceId);
}

export type RevisionLine = { description: string; amountCents: number; kind: "fee" | "disbursement"; taskId?: string | null };

/** Revising a sent invoice is explicit, logged and approved (DECISIONS.md #8). */
function validateRevision(r: { reason: string; lines: RevisionLine[] }) {
  const total = r.lines.reduce((n, l) => n + l.amountCents, 0);
  if (!r.reason.trim() || !r.lines.length || !Number.isSafeInteger(total) || total <= 0 || r.lines.some(l => !l.description.trim() || !Number.isSafeInteger(l.amountCents) || l.amountCents < 0 || !["fee", "disbursement"].includes(l.kind))) throw new InvoiceError("Revision needs a reason, descriptions and valid nonnegative integer cent amounts with a positive total");
}

export async function proposeRevision(ctx: Ctx, invoiceId: string, r: { reason: string; lines: RevisionLine[] }) {
  validateRevision(r);
  const inv = await invoiceWithLines(ctx, invoiceId);
  if (inv.status === "draft") throw new InvoiceError("Edit a draft directly");
  if (inv.status === "void") throw new InvoiceError("Invoice is void");
  const { createProposal } = await import("./proposals");
  const total = r.lines.reduce((s, l) => s + l.amountCents, 0);
  return createProposal(ctx, {
    kind: "revise_invoice", title: `Revise invoice ${inv.number}`, summary: `${r.reason}. New total ${total / 100}.`,
    clientId: inv.clientId, requestId: inv.requestId, payload: { invoiceId, reason: r.reason, lines: r.lines },
  });
}

export async function applyRevision(ctx: Ctx, invoiceId: string, r: { reason: string; lines: RevisionLine[] }) {
  validateRevision(r);
  return ctx.db.transaction(async db => {
    await db.execute(sql`select id from invoice where id = ${invoiceId} and firm_id = ${ctx.firmId} for update`);
    return applyRevisionAtomic({ ...ctx, db: db as unknown as Ctx["db"] }, invoiceId, r);
  });
}

async function applyRevisionAtomic(ctx: Ctx, invoiceId: string, r: { reason: string; lines: RevisionLine[] }) {
  const old = await invoiceWithLines(ctx, invoiceId);
  if (!["sent", "part_paid"].includes(old.status)) throw new InvoiceError("Invoice is no longer available for revision");
  if (old.paidCents > 0) throw new InvoiceError("Part-paid invoices are revised with a credit note (not built yet)");
  const version = old.version + 1;
  const base = old.number.replace(/-R\d+$/, "");
  const [nw] = await ctx.db.insert(invoice).values({
    id: ctx.ids.next("inv"), firmId: ctx.firmId, clientId: old.clientId, requestId: old.requestId, number: `${base}-R${version}`,
    numberIsCustom: old.numberIsCustom, status: old.status === "draft" ? "draft" : "sent", issuedOn: ctx.clock.today(),
    dueOn: addDays(ctx.clock.today(), old.termsDays), termsDays: old.termsDays, currency: old.currency,
    totalCents: r.lines.reduce((s, l) => s + l.amountCents, 0), billingContactId: old.billingContactId, version, supersedesId: old.id, createdAt: ctx.clock.now(),
  }).returning();
  await ctx.db.insert(invoiceLine).values(r.lines.map((l, i) => ({ id: ctx.ids.next("inl"), firmId: ctx.firmId, invoiceId: nw.id, taskId: l.taskId ?? null, description: l.description, amountCents: l.amountCents, kind: l.kind, sort: i })));
  await ctx.db.update(invoice).set({ status: "void" }).where(eq(invoice.id, old.id));
  if (old.requestId) await ctx.db.update(requestT).set({ invoiceId: nw.id }).where(eq(requestT.id, old.requestId));
  await audit(ctx, "invoice.revise", "invoice", nw.id, { supersedes: old.number, reason: r.reason });
  return nw;
}
