// Costs that come up after a request was invoiced: late fees, fines, court fees or stamp duty
// paid on the client's behalf. A draft invoice takes the line directly; an invoice the client
// already has is never rewritten, so the cost goes on an additional invoice drafted for approval.
import { and, desc, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { conversation, invoice, invoiceLine, message, request as requestT } from "@/db/schema";
import { getTask, logEvent } from "./engine";
import { billingContact, nextInvoiceNumber, recalcTotal } from "./invoices";
import { createProposal } from "./proposals";
import { composeReply, emptyFacts } from "./inbound";
import { money } from "./labels";
import { audit } from "./audit";

export class CostError extends Error {}

export async function addCost(ctx: Ctx, taskId: string, c: { description: string; amountCents: number; kind: "disbursement" | "fee" }) {
  if (!c.description.trim()) throw new CostError("Describe the cost");
  if (!Number.isFinite(c.amountCents) || c.amountCents <= 0) throw new CostError("Enter an amount above zero");
  const t = await getTask(ctx, taskId);
  if (t.firmId !== ctx.firmId) throw new CostError("Task not found");
  const req = t.requestId ? await ctx.db.query.request.findFirst({ where: eq(requestT.id, t.requestId) }) : null;
  const primary = req?.invoiceId ? await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, req.invoiceId) }) : null;
  const line = { taskId, description: c.description.trim(), amountCents: Math.round(c.amountCents), kind: c.kind };

  if (primary?.status === "draft") {
    const n = (await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId, primary.id))).length;
    await ctx.db.insert(invoiceLine).values({ id: ctx.ids.next("inl"), firmId: ctx.firmId, invoiceId: primary.id, ...line, sort: n });
    await recalcTotal(ctx, primary.id);
    await logEvent(ctx, taskId, "cost.added", `Cost added to ${primary.number}: ${line.description}, ${money(line.amountCents)}`, { invoiceId: primary.id }, ctx.userId);
    return { invoiceId: primary.id, additional: false, proposalId: null as string | null };
  }

  const cl = (await ctx.db.query.client.findFirst({ where: (x, { eq }) => eq(x.id, t.clientId) }))!;
  const bc = await billingContact(ctx, t.clientId);
  const [inv] = await ctx.db.insert(invoice).values({
    id: ctx.ids.next("inv"), firmId: ctx.firmId, clientId: t.clientId, requestId: t.requestId, number: await nextInvoiceNumber(ctx),
    status: "draft", termsDays: cl.paymentTermsDays, totalCents: line.amountCents, billingContactId: bc?.id ?? null, createdAt: ctx.clock.now(),
  }).returning();
  await ctx.db.insert(invoiceLine).values({ id: ctx.ids.next("inl"), firmId: ctx.firmId, invoiceId: inv.id, ...line, sort: 0 });
  await audit(ctx, "invoice.create", "invoice", inv.id, { number: inv.number, total: inv.totalCents, additionalTo: primary?.number ?? null }, ctx.userId);
  await logEvent(ctx, taskId, "cost.added", `Additional invoice ${inv.number}: ${line.description}, ${money(line.amountCents)}`, { invoiceId: inv.id }, ctx.userId);

  // Draft the covering email in the client's thread for approval.
  const convId = req?.conversationId ?? (await ctx.db.select().from(conversation).where(and(eq(conversation.clientId, t.clientId), eq(conversation.firmId, ctx.firmId))).orderBy(desc(conversation.lastMessageAt)).limit(1))[0]?.id
    ?? (await ctx.db.insert(conversation).values({ id: ctx.ids.next("cnv"), firmId: ctx.firmId, clientId: t.clientId, channel: "email", subject: `Invoice ${inv.number}`, counterpartyEmail: bc?.email ?? null, lastMessageAt: ctx.clock.now(), createdAt: ctx.clock.now() }).returning())[0].id;
  const lang = bc?.language ?? cl.messageLang;
  const draft = await composeReply(ctx, { clientId: t.clientId, conversationId: convId, inReplyTo: null, facts: { ...emptyFacts(lang), context: "costs" }, requestId: t.requestId, invoiceId: inv.id, to: bc?.email ? [bc.email] : undefined, purpose: "Additional invoice for costs paid on the client's behalf", subject: `Invoice ${inv.number}: costs paid on your behalf` });
  const p = await createProposal(ctx, {
    kind: "send_message", title: `Send additional invoice ${inv.number} to ${bc?.name ?? cl.nameEn}`, summary: `${line.description}: ${money(line.amountCents)}`,
    clientId: t.clientId, requestId: t.requestId, taskId, payload: { messageId: draft.id, requestId: t.requestId, invoiceId: inv.id, taskIds: [], draftSource: draft.source, purpose: "costs" },
  });
  await ctx.db.update(message).set({ proposalId: p.id }).where(eq(message.id, draft.id));
  return { invoiceId: inv.id, additional: true, proposalId: p.id as string | null };
}
