// The approval gate. Anything client-facing, register-affecting or invoice-affecting after
// sending is a proposal; nothing happens until a human approves it (AGENTS.md).
import { and, asc, desc, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { proposal, stepTiming, type ProposalKind } from "@/db/schema";
import { audit } from "./audit";

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
    eq(proposal.firmId, ctx.firmId), eq(proposal.status, "pending"),
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

export async function approveProposal(ctx: Ctx, id: string, opts: ApproveOpts = {}) {
  const p = await getProposal(ctx, id);
  if (p.status !== "pending") throw new ProposalError(`Proposal is already ${p.status}`);
  const h = handlers.get(p.kind);
  if (!h) throw new ProposalError(`No approval handler for ${p.kind}`);
  // Claim first so a double click can't run the handler twice.
  const claimed = await ctx.db.update(proposal).set({ status: "approved", decidedAt: ctx.clock.now(), decidedBy: ctx.userId })
    .where(and(eq(proposal.id, id), eq(proposal.status, "pending"))).returning();
  if (claimed.length === 0) throw new ProposalError("Proposal was decided by someone else");
  try {
    await h(ctx, p, opts);
  } catch (e) {
    await ctx.db.update(proposal).set({ status: "pending", decidedAt: null, decidedBy: null }).where(eq(proposal.id, id));
    throw e;
  }
  await audit(ctx, `proposal.approve.${p.kind}`, "proposal", id, { edits: opts.edits ?? null });
  if (opts.shownAt) {
    const now = ctx.clock.now();
    await ctx.db.insert(stepTiming).values({
      id: ctx.ids.next("tim"), firmId: ctx.firmId, taskId: p.taskId, proposalId: id, activity: `approve_${p.kind}`,
      shownAt: opts.shownAt, actedAt: now, seconds: Math.max(0, Math.round((now.getTime() - opts.shownAt.getTime()) / 1000)), editChars: opts.editChars ?? 0,
    });
  }
  return getProposal(ctx, id);
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
