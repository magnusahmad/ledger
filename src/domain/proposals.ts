// The approval gate. Anything client-facing, register-affecting or invoice-affecting after
// sending is a proposal; nothing happens until a human approves it (AGENTS.md).
import { and, asc, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { document, mailDelivery, message, proposal, signEnvelope, stepTiming, type ProposalKind } from "@/db/schema";
import { audit } from "./audit";
import { reviewLegacyInvoiceDates, type InvoiceDateReview } from "./invoice-delivery-review";
import { InvoiceDateReviewRequired, reconcileMessageReceipt } from "./mail-delivery";
import { randomUUID } from "node:crypto";
import { operationalNow } from "@/lib/clock";
import { executionFacts, fenceExecution, mailboxReplyIds, readApprovedInput, type ApprovedInput } from "./approval-execution";
import { StaleApproval, expireApproval } from "./approval-state";
import { getTask, stepData } from "./engine";
import type { SignatureField } from "./signing-pack";

export type Proposal = typeof proposal.$inferSelect;
export type ApproveOpts = { edits?: Record<string, unknown>; shownAt?: Date | null; editChars?: number };
type Handler = (ctx: Ctx, p: Proposal, opts: ApproveOpts) => Promise<void>;

const handlers = new Map<ProposalKind, Handler>();
const rejectHandlers = new Map<ProposalKind, Handler>();
export function onApprove(kind: ProposalKind, h: Handler) { handlers.set(kind, h); }
export function onReject(kind: ProposalKind, h: Handler) { rejectHandlers.set(kind, h); }

export class ProposalError extends Error {}

export async function createProposal(ctx: Ctx, p: {
  kind: ProposalKind; title: string; summary?: string | null; clientId?: string | null; taskId?: string | null;
  requestId?: string | null; payload?: Record<string, unknown>;
}) {
  const [row] = await ctx.db.insert(proposal).values({
    id: ctx.ids.next("prp"), firmId: ctx.firmId, kind: p.kind, title: p.title, summary: p.summary ?? null,
    clientId: p.clientId ?? null, taskId: p.taskId ?? null, requestId: p.requestId ?? null, payload: p.payload ?? {},
    createdAt: ctx.clock.now(),
  }).returning();
  return row;
}

export async function pendingProposals(ctx: Ctx, filter: { clientId?: string; taskId?: string; kind?: ProposalKind } = {}) {
  return ctx.db.select().from(proposal).where(and(
    eq(proposal.firmId, ctx.firmId), inArray(proposal.status, ["pending", "processing", "recovery"]),
    filter.clientId ? eq(proposal.clientId, filter.clientId) : undefined,
    filter.taskId ? eq(proposal.taskId, filter.taskId) : undefined,
    filter.kind ? eq(proposal.kind, filter.kind) : undefined,
  )).orderBy(asc(proposal.createdAt), asc(proposal.id));
}

export async function recentProposals(ctx: Ctx, limit = 50) {
  return ctx.db.select().from(proposal).where(eq(proposal.firmId, ctx.firmId)).orderBy(desc(proposal.createdAt)).limit(limit);
}

export async function getProposal(ctx: Ctx, id: string) {
  const p = await ctx.db.query.proposal.findFirst({ where: and(eq(proposal.id, id), eq(proposal.firmId, ctx.firmId)) });
  if (!p) throw new ProposalError("Proposal not found");
  return p;
}

const APPROVAL_LEASE_MS = 5 * 60_000;
const EXTERNAL = new Set<ProposalKind>(["send_message", "send_signing"]);

/** Make abandoned work visible; discovery never resends an uncertain delivery. */
export async function recoverApprovals(ctx: Ctx) {
  return ctx.db.update(proposal).set({ status: "recovery", executionToken: null, leaseUntil: null, recoveryError: "Interrupted approved action. Check and resume; delivery may need review." })
    .where(and(eq(proposal.firmId, ctx.firmId), eq(proposal.status, "processing"), or(isNull(proposal.leaseUntil), lte(proposal.leaseUntil, operationalNow(ctx.clock))))).returning();
}

export async function resumeApprovedProposal(ctx: Ctx, id: string, invoiceDateReview?: InvoiceDateReview) {
  if (invoiceDateReview) await reviewLegacyInvoiceDates(ctx, id, invoiceDateReview);
  return approveProposal(ctx, id);
}

export async function approveProposal(ctx: Ctx, id: string, opts: ApproveOpts = {}) {
  const actedAt = ctx.clock.now();
  await recoverApprovals(ctx);
  const p = await getProposal(ctx, id);
  if (p.status !== "pending" && p.status !== "recovery") throw new ProposalError(`Proposal is already ${p.status}`);
  const h = handlers.get(p.kind);
  if (!h) throw new ProposalError(`No approval handler for ${p.kind}`);
  const recovering = p.status === "recovery";
  if (recovering && p.kind === "send_message" && p.payload.messageId) await reconcileMessageReceipt(ctx, p.payload.messageId as string);
  const saved = recovering ? readApprovedInput(ctx, p) : null;
  if (recovering && !saved) throw new ProposalError("Approved inputs are unavailable; a fresh staff review is required");
  const source = p.payload.messageId ? await ctx.db.query.message.findFirst({ where: and(eq(message.id, p.payload.messageId as string), eq(message.firmId, ctx.firmId)) }) : null;
  const envelope = !saved && p.kind === "send_signing" ? await ctx.db.query.signEnvelope.findFirst({ where: and(eq(signEnvelope.id, p.payload.envelopeId as string), eq(signEnvelope.firmId, ctx.firmId)) }) : null;
  const signingTask = envelope ? await getTask(ctx, envelope.taskId) : null;
  const fields = signingTask ? stepData(signingTask, signingTask._steps.findIndex(s => s.kind === "generate")).signatureFields as { id: string; fields: SignatureField[] }[] | undefined : undefined;
  const signingRows = envelope?.documentIds.length ? await ctx.db.select().from(document).where(and(eq(document.firmId, ctx.firmId), eq(document.taskId, envelope.taskId), inArray(document.id, envelope.documentIds))).orderBy(asc(document.id)) : undefined;
  const signingDocuments = signingRows?.map(({ id, title, sha256, storageKey, clientId, taskId, personId, kind, language }) => ({ id, title, sha256, storageKey, clientId, taskId, personId, kind, language, fields: fields?.find(g => g.id === id)?.fields ?? [] }));
  const captured: ApprovedInput = saved ?? { opts, payload: p.payload, ...(source ? { sourceMessage: { toAddrs: source.toAddrs, subject: source.subject, text: source.text }, mailboxReplyIds: await mailboxReplyIds(ctx, source.conversationId) } : {}), ...(signingDocuments ? { signingDocuments, signingCompletionFactsHash: await executionFacts(ctx, p, true) } : {}) };
  const useOpts = { ...captured.opts, shownAt: captured.opts.shownAt ? new Date(captured.opts.shownAt) : null };
  const owner = randomUUID();
  const [claimed] = await ctx.db.update(proposal).set({ status: "processing", executionToken: owner, leaseUntil: new Date(operationalNow(ctx.clock).getTime() + APPROVAL_LEASE_MS),
    approvedInput: p.approvedInput ?? ctx.crypto.encrypt(JSON.stringify(captured)), factsHash: p.factsHash ?? await executionFacts(ctx, p),
    decidedAt: p.decidedAt ?? ctx.clock.now(), decidedBy: p.decidedBy ?? ctx.userId, recoveryError: null })
    .where(and(eq(proposal.id, id), eq(proposal.firmId, ctx.firmId), eq(proposal.status, p.status))).returning();
  if (!claimed) throw new ProposalError("Proposal was claimed by another worker");
  const approved = { ...claimed, payload: captured.payload };
  const executionCtx: Ctx = { ...ctx, assertExecution: txCtx => fenceExecution(txCtx, approved, owner), completeExecution: txCtx => finish(txCtx) };
  const finish = async (txCtx: Ctx) => {
    await txCtx.db.update(proposal).set({ status: "approved", executionToken: null, leaseUntil: null, recoveryError: null })
      .where(and(eq(proposal.id, id), eq(proposal.firmId, ctx.firmId), eq(proposal.executionToken, owner), eq(proposal.status, "processing")));
    await audit(txCtx, `proposal.approve.${p.kind}`, "proposal", id, { edits: useOpts.edits ?? null });
    if (useOpts.shownAt) await txCtx.db.insert(stepTiming).values({ id: ctx.ids.next("tim"), firmId: ctx.firmId, taskId: p.taskId, proposalId: id, activity: `approve_${p.kind}`,
      shownAt: useOpts.shownAt, actedAt, seconds: Math.max(0, Math.round((actedAt.getTime() - useOpts.shownAt.getTime()) / 1000)), editChars: useOpts.editChars ?? 0 });
  };
  try {
    if (EXTERNAL.has(p.kind) && useOpts.edits?.completedOutside !== "on") {
      await ctx.db.transaction(async db => fenceExecution({ ...executionCtx, db: db as unknown as Ctx["db"] }, approved, owner));
      await h(executionCtx, approved, useOpts);
      await ctx.db.transaction(async db => {
        const txCtx = { ...executionCtx, db: db as unknown as Ctx["db"] };
        await db.execute(sql`select id from proposal where id = ${id} and firm_id = ${ctx.firmId} for update`);
        const current = await getProposal(txCtx, id);
        if (current.status === "approved") return;
        if (current.executionToken !== owner || current.status !== "processing") throw new ProposalError("Approval ownership changed before completion");
        await finish(txCtx);
      });
    } else {
      await ctx.db.transaction(async db => {
        const txCtx = { ...executionCtx, db: db as unknown as Ctx["db"], deferApprovalInvalidation: true };
        await fenceExecution(txCtx, approved, owner);
        await h(txCtx, approved, useOpts);
        await finish(txCtx);
      });
    }
  } catch (e) {
    if (e instanceof StaleApproval) await expireApproval(ctx, e.taskId, e.proposalId);
    const attempted = EXTERNAL.has(p.kind) ? await ctx.db.query.mailDelivery.findFirst({ where: and(eq(mailDelivery.firmId, ctx.firmId), p.kind === "send_message" ? eq(mailDelivery.sourceKey, `message:${p.payload.messageId}`) : sql`${mailDelivery.sourceKey} like ${`signer:${p.payload.envelopeId}:%`}`) }) : null;
    const needsRecovery = !!attempted || recovering || e instanceof InvoiceDateReviewRequired;
    await ctx.db.update(proposal).set({ status: needsRecovery ? "recovery" : "pending", executionToken: null, leaseUntil: null, recoveryError: (e as Error).message.slice(0, 1000),
      ...(!needsRecovery ? { approvedInput: null, factsHash: null, decidedAt: null, decidedBy: null } : {}) })
      .where(and(eq(proposal.id, id), eq(proposal.firmId, ctx.firmId), eq(proposal.status, "processing"), eq(proposal.executionToken, owner)));
    throw e;
  }
  return getProposal(ctx, id);
}

/** Staff may close an uncertain action only after checking the mailbox. Its delivery
 * journal remains evidence, and the replacement still requires fresh human approval. */
export async function resolveInterruptedProposal(ctx: Ctx, id: string, input: { checkedMailbox: boolean; note: string }) {
  if (!input.checkedMailbox || !input.note.trim()) throw new ProposalError("Check the mailbox and record what you found before closing this action");
  await recoverApprovals(ctx);
  return ctx.db.transaction(async db => {
    const txCtx = { ...ctx, db: db as unknown as Ctx["db"] };
    await db.execute(sql`select id from proposal where id = ${id} and firm_id = ${ctx.firmId} for update`);
    const p = await getProposal(txCtx, id);
    if (p.status !== "recovery") throw new ProposalError("Only an interrupted action awaiting recovery can be closed");
    await db.update(proposal).set({ status: "superseded", executionToken: null, leaseUntil: null, recoveryError: `Closed after mailbox check: ${input.note.trim()}`, decidedAt: ctx.clock.now() }).where(eq(proposal.id, id));
    await audit(txCtx, "proposal.recovery.close", "proposal", id, { note: input.note.trim(), previousDeliveryMayHaveOccurred: true });
    if (p.kind === "send_message") {
      const m = await db.query.message.findFirst({ where: and(eq(message.id, p.payload.messageId as string), eq(message.firmId, ctx.firmId)) });
      if (!m) throw new ProposalError("Message not found");
      const [copy] = await db.insert(message).values({ ...m, id: ctx.ids.next("msg"), status: "draft", error: null, proposalId: null, providerMessageId: null, rfcMessageId: null, at: ctx.clock.now() }).returning();
      const fresh = await createProposal(txCtx, { kind: p.kind, title: `Fresh review: ${p.title}`, clientId: p.clientId, taskId: p.taskId, requestId: p.requestId,
        summary: `The earlier delivery may already have occurred. Staff checked the mailbox: ${input.note.trim()}. Review current wording and facts before sending again.`, payload: { ...p.payload, messageId: copy.id, recoveryFrom: p.id } });
      await db.update(message).set({ proposalId: fresh.id }).where(eq(message.id, copy.id));
      return fresh;
    }
    if (p.taskId) {
      if (p.kind === "send_signing") await db.update(signEnvelope).set({ status: "voided" }).where(and(eq(signEnvelope.firmId, ctx.firmId), eq(signEnvelope.id, p.payload.envelopeId as string), eq(signEnvelope.status, "draft")));
      await expireApproval(txCtx, p.taskId, p.id);
      return null;
    }
    return createProposal(txCtx, { kind: p.kind, title: `Fresh review: ${p.title}`, summary: input.note.trim(), clientId: p.clientId, requestId: p.requestId, payload: { ...p.payload, recoveryFrom: p.id } });
  });
}

export async function rejectProposal(ctx: Ctx, id: string, reason = "") {
  const p = await getProposal(ctx, id);
  if (p.status !== "pending") throw new ProposalError(`Proposal is already ${p.status}`);
  await ctx.db.update(proposal).set({ status: "rejected", decidedAt: ctx.clock.now(), decidedBy: ctx.userId }).where(eq(proposal.id, id));
  const h = rejectHandlers.get(p.kind);
  if (h) await h(ctx, p, {});
  await audit(ctx, `proposal.reject.${p.kind}`, "proposal", id, { reason });
}

export async function supersede(ctx: Ctx, filter: { taskId?: string; kind: ProposalKind }) {
  const rows = await pendingProposals(ctx, filter);
  for (const r of rows) await ctx.db.update(proposal).set({ status: "superseded", decidedAt: ctx.clock.now() }).where(eq(proposal.id, r.id));
  return rows.length;
}

/** Rough character edit count between the draft and what was sent (for time-saved stats). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length * b.length > 4_000_000) return Math.abs(a.length - b.length) + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
