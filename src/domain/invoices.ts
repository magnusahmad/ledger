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

/** Staff can set a custom number on a draft; it never consumes the auto sequence. */
export async function setInvoiceNumber(ctx: Ctx, invoiceId: string, number: string) {
  const n = number.trim();
  if (!n) throw new InvoiceError("Invoice number can't be blank");
  const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, invoiceId) });
  if (!inv) throw new InvoiceError("Invoice not found");
  if (inv.status !== "draft") throw new InvoiceError("The number can't change once the invoice has been sent; revise it instead");
  const clash = await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.firmId, ctx.firmId), eq(invoice.number, n)) });
  if (clash && clash.id !== invoiceId) throw new InvoiceError(`Invoice number ${n} is already used`);
  await ctx.db.update(invoice).set({ number: n, numberIsCustom: true }).where(eq(invoice.id, invoiceId));
  await audit(ctx, "invoice.renumber", "invoice", invoiceId, { from: inv.number, to: n });
}

export async function setLineAmount(ctx: Ctx, lineId: string, amountCents: number) {
  const line = await ctx.db.query.invoiceLine.findFirst({ where: eq(invoiceLine.id, lineId) });
  if (!line) throw new InvoiceError("Line not found");
  const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, line.invoiceId) });
  if (inv?.status !== "draft") throw new InvoiceError("Prices can't change once the invoice has been sent; revise it instead");
  if (!Number.isFinite(amountCents) || amountCents < 0) throw new InvoiceError("Amount must be zero or more");
  await ctx.db.update(invoiceLine).set({ amountCents: Math.round(amountCents) }).where(eq(invoiceLine.id, lineId));
  return recalcTotal(ctx, line.invoiceId);
}

export type RevisionLine = { description: string; amountCents: number; kind: "fee" | "disbursement"; taskId?: string | null };

/** Revising a sent invoice is explicit, logged and approved (DECISIONS.md #8). */
export async function proposeRevision(ctx: Ctx, invoiceId: string, r: { reason: string; lines: RevisionLine[] }) {
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
  const old = await invoiceWithLines(ctx, invoiceId);
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
