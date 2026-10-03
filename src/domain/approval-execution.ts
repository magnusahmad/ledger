import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { invoice, invoiceLine, proposal, request, task, message, mailDelivery, bankTransaction } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import { operationalNow } from "@/lib/clock";
import { approvalState } from "./approval-state";
import type { ApproveOpts, Proposal } from "./proposals";
import { completedSigningProof, type SigningDocumentSnapshot } from "./signing-pack";
import { currentStep, getTask, outstanding } from "./engine";
import { invitedSignatureRecipients } from "./chase-state";

export type ApprovedInput = { opts: ApproveOpts; payload: Proposal["payload"]; sourceMessage?: { toAddrs: string[]; subject: string | null; text: string | null }; mailboxReplyIds?: string[]; signingDocuments?: SigningDocumentSnapshot[]; signingCompletionFactsHash?: string };
export function readApprovedInput(ctx: Ctx, p: Proposal): ApprovedInput | null {
  return p.approvedInput ? JSON.parse(ctx.crypto.decrypt(p.approvedInput)) : null;
}
export function taskIds(p: Proposal) {
  return [...new Set([p.taskId, ...(p.payload.taskIds as string[] ?? []), (p.payload.markStep as { taskId?: string } | undefined)?.taskId].filter((x): x is string => !!x))].sort();
}
export async function mailboxReplyIds(ctx: Ctx, conversationId: string) {
  const rows = await ctx.db.select({ id: message.id }).from(message).where(and(eq(message.firmId, ctx.firmId), eq(message.conversationId, conversationId), eq(message.direction, "out"), eq(message.status, "sent"), eq(message.viaMailbox, true))).orderBy(asc(message.id));
  return rows.map(row => row.id);
}
export async function executionFacts(ctx: Ctx, p: Proposal, omitSigningProgress = false) {
  const ids = taskIds(p);
  const tasks = await Promise.all(ids.map(id => approvalState(ctx, id, omitSigningProgress)));
  const reqId = p.requestId ?? p.payload.requestId as string | undefined;
  const req = reqId ? await ctx.db.query.request.findFirst({ where: and(eq(request.id, reqId), eq(request.firmId, ctx.firmId)) }) : null;
  const invId = p.payload.invoiceId as string | undefined ?? req?.invoiceId;
  const inv = invId ? await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.id, invId), eq(invoice.firmId, ctx.firmId)) }) : null;
  const lines = inv ? await ctx.db.select().from(invoiceLine).where(and(eq(invoiceLine.invoiceId, inv.id), eq(invoiceLine.firmId, ctx.firmId))).orderBy(asc(invoiceLine.id)) : [];
  return Crypto.sha256(JSON.stringify({ tasks, invoice: inv ? { number: inv.number, status: inv.status, totalCents: inv.totalCents, paidCents: inv.paidCents, currency: inv.currency, termsDays: inv.termsDays, dueOn: inv.dueOn, lines } : null }));
}
export async function fenceExecution(ctx: Ctx, p: Proposal, owner: string) {
  await ctx.db.execute(sql`select id from proposal where id = ${p.id} and firm_id = ${ctx.firmId} for update`);
  const current = await ctx.db.query.proposal.findFirst({ where: and(eq(proposal.id, p.id), eq(proposal.firmId, ctx.firmId)) });
  if (current?.executionToken !== owner || current.status !== "processing" || !current.leaseUntil || current.leaseUntil <= operationalNow(ctx.clock)) throw new Error("Approval ownership expired or the task was cancelled; check and resume the approved action");
  const ids = taskIds(p);
  const reqId = p.requestId ?? p.payload.requestId as string | undefined;
  const req = reqId ? await ctx.db.query.request.findFirst({ where: and(eq(request.id, reqId), eq(request.firmId, ctx.firmId)) }) : null;
  const invId = p.payload.invoiceId as string | undefined ?? req?.invoiceId;
  // The payment handler and automatic bank matcher lock the money source first;
  // do not acquire its invoice here and then invert that order in the handler.
  if (p.kind === "match_payment" && p.payload.bankTransactionId) await ctx.db.select().from(bankTransaction).where(and(eq(bankTransaction.id, p.payload.bankTransactionId as string), eq(bankTransaction.firmId, ctx.firmId))).for("update");
  if (invId) await ctx.db.select().from(invoice).where(and(eq(invoice.id, invId), eq(invoice.firmId, ctx.firmId))).for("update");
  if (ids.length) await ctx.db.select().from(task).where(and(eq(task.firmId, ctx.firmId), inArray(task.id, ids))).orderBy(asc(task.id)).for("update");
  if (p.kind === "send_message" && p.payload.purpose === "chase" && p.taskId) {
    const accepted = await ctx.db.query.mailDelivery.findFirst({ where: and(eq(mailDelivery.firmId, ctx.firmId), eq(mailDelivery.sourceKey, `message:${p.payload.messageId}`), eq(mailDelivery.status, "sent")) });
    const t = await getTask(ctx, p.taskId);
    const step = currentStep(t);
    if (!accepted?.result?.providerMessageId && (t.holdReason || !(step?.kind === "collect" && outstanding(t).length > 0 || step?.kind === "sign" && (await invitedSignatureRecipients(ctx, t.id)).length > 0))) throw new Error("This chase is obsolete or on hold: no current information or invited signatures are outstanding");
  }
  const saved = readApprovedInput(ctx, current);
  if (current.factsHash !== await executionFacts(ctx, p)) {
    // A recipient may finish the already accepted pack before its invitation
    // handler acknowledges it. This permits only original local acknowledgement,
    // never a network replay or changed/withdrawn signing pack.
    if (p.kind !== "send_signing" || !saved?.signingCompletionFactsHash || saved.signingCompletionFactsHash !== await executionFacts(ctx, p, true) || !await completedSigningProof(ctx, p, saved)) throw new Error("The task or invoice facts changed after approval; a fresh review is required");
  }
  if (saved?.sourceMessage && p.payload.messageId) {
    const m = await ctx.db.query.message.findFirst({ where: and(eq(message.id, p.payload.messageId as string), eq(message.firmId, ctx.firmId)) });
    const edits = saved.opts.edits ?? {};
    const approvedTo = typeof edits.to === "string" ? edits.to.split(/[,;\s]+/).filter(Boolean) : edits.to ?? saved.sourceMessage.toAddrs;
    const permitted = (current: unknown, original: unknown, approved: unknown) => JSON.stringify(current) === JSON.stringify(original) || JSON.stringify(current) === JSON.stringify(approved);
    if (!m || !permitted(m.text, saved.sourceMessage.text, edits.text ?? saved.sourceMessage.text) || !permitted(m.subject, saved.sourceMessage.subject, edits.subject ?? saved.sourceMessage.subject) || !permitted(m.toAddrs, saved.sourceMessage.toAddrs, approvedTo)) throw new Error("The draft changed after approval; delivery needs review before a fresh preview");
    const accepted = await ctx.db.query.mailDelivery.findFirst({ where: and(eq(mailDelivery.firmId, ctx.firmId), eq(mailDelivery.sourceKey, `message:${m.id}`), eq(mailDelivery.status, "sent")) });
    // A later manual reply cannot undo a confirmed delivery. Finish its original
    // local effects; a reply observed before acceptance instead requires fresh review.
    if (!accepted?.result?.providerMessageId && JSON.stringify(saved.mailboxReplyIds ?? []) !== JSON.stringify(await mailboxReplyIds(ctx, m.conversationId))) throw new Error("A mailbox reply was recorded after approval; review the current thread before sending");
  }
}
