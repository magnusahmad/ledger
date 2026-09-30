// Work outside Harbourline. Off-platform steps can be added to any running task (with an
// owner, due date, who it waits on, a follow-up date and proof when done), and a task can be
// put on hold while it waits on someone. Both show on Today with their follow-up dates.
import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { client as clientT, document, task as taskT, taskAction } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import { advance, getTask, logEvent } from "./engine";

export class OffPlatformError extends Error {}
export type WaitingOn = "us" | "client" | "third_party";

const isDate = (d?: string | null) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);

async function openTask(ctx: Ctx, taskId: string) {
  const t = await getTask(ctx, taskId).catch(() => null);
  if (!t || t.firmId !== ctx.firmId) throw new OffPlatformError("Task not found");
  if (t.status !== "open") throw new OffPlatformError("This task is closed");
  return t;
}

export async function addOffPlatformStep(ctx: Ctx, taskId: string, s: { title: string; waitingOn: WaitingOn; ownerId?: string | null; partyId?: string | null; dueDate?: string | null; followUpOn?: string | null; beforeStep?: number | null }) {
  const t = await openTask(ctx, taskId);
  if (!s.title.trim()) throw new OffPlatformError("Say what needs doing");
  if (s.beforeStep != null && (s.beforeStep < 0 || s.beforeStep >= t._steps.length)) throw new OffPlatformError("Choose a step of this task");
  const [row] = await ctx.db.insert(taskAction).values({
    id: ctx.ids.next("act"), firmId: ctx.firmId, taskId, title: s.title.trim(), waitingOn: s.waitingOn, ownerId: s.ownerId ?? (s.waitingOn === "us" ? ctx.userId : null),
    partyId: s.partyId ?? null, dueDate: isDate(s.dueDate) ? s.dueDate : null, followUpOn: isDate(s.followUpOn) ? s.followUpOn : null,
    beforeStep: s.beforeStep ?? null, createdAt: ctx.clock.now(),
  }).returning();
  const before = s.beforeStep != null ? ` (before “${t._steps[s.beforeStep].label}”)` : "";
  await logEvent(ctx, taskId, "action.added", `Off-platform step added: ${row.title}${before}`, { actionId: row.id }, ctx.userId);
  return row;
}

/** Proof is required: a note, a reference (e.g. a Stamp Office or court number) or a document. */
export async function completeOffPlatformStep(ctx: Ctx, actionId: string, proof: { note?: string | null; reference?: string | null; file?: { filename: string; mime: string; content: Buffer } | null }) {
  const a = await ctx.db.query.taskAction.findFirst({ where: and(eq(taskAction.id, actionId), eq(taskAction.firmId, ctx.firmId)) });
  if (!a || a.status !== "open") throw new OffPlatformError("This step is already closed");
  const t = await openTask(ctx, a.taskId);
  const note = proof.note?.trim() || null;
  const reference = proof.reference?.trim() || null;
  let documentId: string | null = null;
  if (proof.file?.content.length) {
    documentId = ctx.ids.next("doc");
    const key = `proof/${t.clientId}/${documentId}-${proof.file.filename.replace(/[^\w.\-]/g, "_")}`;
    await ctx.storage.put(key, proof.file.content);
    await ctx.db.insert(document).values({ id: documentId, firmId: ctx.firmId, clientId: t.clientId, taskId: t.id, kind: "proof", title: proof.file.filename, storageKey: key, mime: proof.file.mime, sha256: Crypto.sha256(proof.file.content), source: "upload", createdAt: ctx.clock.now() });
  }
  if (!note && !reference && !documentId) throw new OffPlatformError("Add proof: a note, a reference or a document");
  const [row] = await ctx.db.update(taskAction).set({ status: "done", proofNote: note, proofReference: reference, proofDocumentId: documentId, completedBy: ctx.userId, completedAt: ctx.clock.now() }).where(eq(taskAction.id, actionId)).returning();
  await logEvent(ctx, t.id, "action.done", `Done outside Harbourline: ${a.title}${reference ? ` (ref ${reference})` : ""}`, { actionId, documentId }, ctx.userId);
  await advance(ctx, t.id);
  return row;
}

export async function cancelOffPlatformStep(ctx: Ctx, actionId: string, reason: string) {
  const a = await ctx.db.query.taskAction.findFirst({ where: and(eq(taskAction.id, actionId), eq(taskAction.firmId, ctx.firmId)) });
  if (!a || a.status !== "open") throw new OffPlatformError("This step is already closed");
  await ctx.db.update(taskAction).set({ status: "cancelled", completedBy: ctx.userId, completedAt: ctx.clock.now() }).where(eq(taskAction.id, actionId));
  await logEvent(ctx, a.taskId, "action.cancelled", `Off-platform step dropped: ${a.title}${reason ? ` (${reason})` : ""}`, { actionId }, ctx.userId);
  await advance(ctx, a.taskId);
}

export async function putOnHold(ctx: Ctx, taskId: string, h: { reason: string; waitingOn: WaitingOn; partyId?: string | null; followUpOn: string }) {
  await openTask(ctx, taskId);
  if (!h.reason.trim()) throw new OffPlatformError("Give a reason for the hold");
  if (!isDate(h.followUpOn)) throw new OffPlatformError("Set a follow-up date");
  await ctx.db.update(taskT).set({ holdReason: h.reason.trim(), holdWaitingOn: h.waitingOn, holdPartyId: h.partyId ?? null, holdSince: ctx.clock.today(), holdFollowUpOn: h.followUpOn }).where(eq(taskT.id, taskId));
  await logEvent(ctx, taskId, "hold.on", `On hold: ${h.reason.trim()}`, { followUpOn: h.followUpOn }, ctx.userId);
}

export async function releaseHold(ctx: Ctx, taskId: string, note?: string) {
  const t = await openTask(ctx, taskId);
  if (!t.holdReason) return t;
  await ctx.db.update(taskT).set({ holdReason: null, holdWaitingOn: null, holdPartyId: null, holdSince: null, holdFollowUpOn: null }).where(eq(taskT.id, taskId));
  await logEvent(ctx, taskId, "hold.off", `Hold released${note?.trim() ? `: ${note.trim()}` : ""}`, {}, ctx.userId);
  return advance(ctx, taskId);
}

/** Staff chased the third party or client; record it and set the next check. */
export async function followedUp(ctx: Ctx, o: { kind: "step" | "hold"; id: string; nextFollowUpOn: string; note?: string }) {
  if (!isDate(o.nextFollowUpOn)) throw new OffPlatformError("Set the next follow-up date");
  if (o.kind === "hold") {
    await openTask(ctx, o.id);
    await ctx.db.update(taskT).set({ holdFollowUpOn: o.nextFollowUpOn }).where(eq(taskT.id, o.id));
    await logEvent(ctx, o.id, "hold.followed_up", `Followed up${o.note?.trim() ? `: ${o.note.trim()}` : ""}. Next check ${o.nextFollowUpOn}`, {}, ctx.userId);
    return;
  }
  const a = await ctx.db.query.taskAction.findFirst({ where: and(eq(taskAction.id, o.id), eq(taskAction.firmId, ctx.firmId)) });
  if (!a || a.status !== "open") throw new OffPlatformError("This step is already closed");
  await ctx.db.update(taskAction).set({ followUpOn: o.nextFollowUpOn }).where(eq(taskAction.id, o.id));
  await logEvent(ctx, a.taskId, "action.followed_up", `Followed up on “${a.title}”${o.note?.trim() ? `: ${o.note.trim()}` : ""}. Next check ${o.nextFollowUpOn}`, { actionId: a.id }, ctx.userId);
}

export type OutsideRow = {
  kind: "step" | "hold"; id: string; taskId: string; taskTitle: string; clientId: string; clientName: string;
  title: string; waitingOn: WaitingOn; partyId: string | null; dueDate: string | null; followUpOn: string | null; followUpDue: boolean;
};

/** Everything happening outside the platform: open off-platform steps and held tasks. Due follow-ups first. */
export async function outsideWork(ctx: Ctx, opts: { taskId?: string } = {}): Promise<OutsideRow[]> {
  const today = ctx.clock.today();
  const steps = await ctx.db.select({ a: taskAction, t: taskT, c: clientT }).from(taskAction)
    .innerJoin(taskT, eq(taskT.id, taskAction.taskId)).innerJoin(clientT, eq(clientT.id, taskT.clientId))
    .where(and(eq(taskAction.firmId, ctx.firmId), eq(taskAction.status, "open"), eq(taskT.status, "open"), opts.taskId ? eq(taskT.id, opts.taskId) : undefined)).orderBy(asc(taskAction.createdAt));
  const holds = await ctx.db.select({ t: taskT, c: clientT }).from(taskT).innerJoin(clientT, eq(clientT.id, taskT.clientId))
    .where(and(eq(taskT.firmId, ctx.firmId), eq(taskT.status, "open"), isNotNull(taskT.holdReason), opts.taskId ? eq(taskT.id, opts.taskId) : undefined));
  const due = (d: string | null) => !!d && d <= today;
  const rows: OutsideRow[] = [
    ...steps.map(({ a, t, c }) => ({ kind: "step" as const, id: a.id, taskId: t.id, taskTitle: t.title, clientId: c.id, clientName: c.nameEn, title: a.title, waitingOn: a.waitingOn, partyId: a.partyId, dueDate: a.dueDate, followUpOn: a.followUpOn, followUpDue: due(a.followUpOn) || due(a.dueDate) })),
    ...holds.map(({ t, c }) => ({ kind: "hold" as const, id: t.id, taskId: t.id, taskTitle: t.title, clientId: c.id, clientName: c.nameEn, title: t.holdReason!, waitingOn: t.holdWaitingOn ?? "third_party", partyId: t.holdPartyId, dueDate: null, followUpOn: t.holdFollowUpOn, followUpDue: due(t.holdFollowUpOn) })),
  ];
  const key = (r: OutsideRow) => `${r.followUpDue ? 0 : 1}${r.followUpOn ?? r.dueDate ?? "9999"}`;
  return rows.sort((a, b) => key(a).localeCompare(key(b)));
}
