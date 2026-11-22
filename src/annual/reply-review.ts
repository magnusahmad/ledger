// Staff review of what the model read in a client's reply (annual pilot brief, "Reply" and "AI accuracy
// and oversight"; DECISIONS.md #56 and #64). Each point is accepted, edited or rejected one at a time
// by a person who has opened the email; there is no "accept all". The charges answer is always
// entered by staff, with the model's reading beside it. Every edit, rejection and addition is a
// defect, recorded with the model's output and the final value. An accepted change is kept as a
// dated record of what changed and holds filing until staff settle it: either the records are updated
// and the return is prepared again, or it doesn't affect this return (with a reason). An emailed
// signed scan is noted; the case still waits for the paper original.
import { readFileSync } from "node:fs";
import path from "node:path";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { aiDefect, arCase, arCaseEvent, arMail, arReply, arReplyItem, type ReplyItemKind } from "@/db/schema";
import type { PlaybookDef } from "@/domain/playbook-types";
import { buildAnnualReturn, type AnnualDeps } from "./service";
import { REPLY_TASK, VALUE_SCHEMA, type ChangeType } from "./reply-types";

type Reply = typeof arReply.$inferSelect;
type Item = typeof arReplyItem.$inferSelect;
const KEPT = ["accepted", "edited", "added"] as const;

async function loadReply(ctx: Ctx, id: string): Promise<Reply> {
  const r = await ctx.db.query.arReply.findFirst({ where: and(eq(arReply.id, id), eq(arReply.firmId, ctx.firmId)) });
  if (!r) throw new Error("Reply not found");
  return r;
}
async function loadItem(ctx: Ctx, id: string): Promise<{ item: Item; reply: Reply }> {
  const item = await ctx.db.query.arReplyItem.findFirst({ where: and(eq(arReplyItem.id, id), eq(arReplyItem.firmId, ctx.firmId)) });
  if (!item) throw new Error("Item not found");
  return { item, reply: await loadReply(ctx, item.replyId) };
}
function mustHaveOpened(ctx: Ctx, r: Reply) {
  if (!r.opens[ctx.userId]) throw new Error("Open the email before deciding anything from it");
  if (r.reviewedAt) throw new Error("This reply has already been reviewed");
}
const event = (ctx: Ctx, caseId: string, kind: string, detail: Record<string, unknown>) =>
  ctx.db.insert(arCaseEvent).values({ id: ctx.ids.next("arce"), firmId: ctx.firmId, caseId, at: ctx.clock.now(), userId: ctx.userId, kind, detail });
const defect = (ctx: Ctx, kind: "edited" | "rejected" | "missed", reply: Reply, itemId: string, modelOutput: Record<string, unknown> | null, finalValue: Record<string, unknown> | null) =>
  ctx.db.insert(aiDefect).values({ id: ctx.ids.next("aid"), firmId: ctx.firmId, task: REPLY_TASK, kind, inputRef: reply.mailId, itemId, caseId: reply.caseId, modelOutput, finalValue, model: reply.model, promptVersion: reply.promptVersion, by: ctx.userId, at: ctx.clock.now() });
const tx = <T>(ctx: Ctx, f: (c: Ctx) => Promise<T>) => ctx.db.transaction((db) => f({ ...ctx, db: db as unknown as Ctx["db"] }));

/** Records that this person opened the source email. Nothing from it can be decided before this. */
export async function openSource(ctx: Ctx, replyId: string) {
  const r = await loadReply(ctx, replyId);
  if (r.opens[ctx.userId]) return;
  await ctx.db.update(arReply).set({ opens: { ...r.opens, [ctx.userId]: ctx.clock.now().toISOString() } }).where(eq(arReply.id, r.id));
}

export type Decision = { action: "accept" } | { action: "reject" } | { action: "edit"; value: Record<string, unknown> };

/** Accept, edit or reject one proposed change, signed paper or document. Charges go through answerCharges. */
export async function decideItem(ctx: Ctx, itemId: string, d: Decision) {
  const { item, reply } = await loadItem(ctx, itemId);
  mustHaveOpened(ctx, reply);
  if (item.kind === "charges") throw new Error("Enter the charges answer yourself; it can't be accepted with one click");
  if (item.status !== "proposed") throw new Error("This has already been decided");
  const final = d.action === "edit" ? staffValue(item.kind, d.value) : d.action === "accept" ? strip(item.proposed!) : null;
  await tx(ctx, async (c) => {
    await c.db.update(arReplyItem).set({ status: d.action === "accept" ? "accepted" : d.action === "edit" ? "edited" : "rejected", final, decidedBy: ctx.userId, decidedAt: ctx.clock.now() }).where(eq(arReplyItem.id, item.id));
    if (d.action !== "accept") await defect(c, d.action === "edit" ? "edited" : "rejected", reply, item.id, item.proposed, final);
    if (final && item.kind === "signed_papers") await event(c, reply.caseId, "signed_scan_noted", { itemId: item.id, mailId: reply.mailId });
  });
}
/** A value staff typed, checked; the first problem is given in plain words (a date needs its year). */
function staffValue(kind: ReplyItemKind, v: Record<string, unknown>): Record<string, unknown> {
  const p = VALUE_SCHEMA[kind].safeParse(v);
  if (!p.success) throw new Error(p.error.issues[0].code === "custom" ? p.error.issues[0].message : "Fill in what changed");
  return p.data as Record<string, unknown>;
}
const strip = (v: Record<string, unknown>) => { const { quoteFound: _q, ...rest } = v; void _q; return rest; };

async function storeCharges(ctx: Ctx, caseId: string, itemId: string, v: { answer: "none" | "has_charges"; details: string | null }) {
  await ctx.db.update(arCase).set({ chargesAnswer: { ...v, itemId, by: ctx.userId, at: ctx.clock.now().toISOString() }, updatedAt: ctx.clock.now() }).where(and(eq(arCase.id, caseId), eq(arCase.firmId, ctx.firmId)));
}
function chargesValue(o: { answer: string; details?: string | null }) {
  if (!["none", "has_charges", "not_answered"].includes(o.answer)) throw new Error("Choose the charges answer");
  const details = o.details?.trim() || null;
  if (o.answer === "has_charges" && !details) throw new Error("Say what the mortgage or charge is");
  return { answer: o.answer as "none" | "has_charges" | "not_answered", details: o.answer === "has_charges" ? details : null };
}

/** Staff enter the Part 9 answer themselves. Differing from the model's reading is a defect. */
export async function answerCharges(ctx: Ctx, itemId: string, o: { answer: string; details?: string | null }) {
  const { item, reply } = await loadItem(ctx, itemId);
  mustHaveOpened(ctx, reply);
  if (item.kind !== "charges") throw new Error("This isn't the charges answer");
  if (item.status !== "proposed") throw new Error("This has already been decided");
  const v = chargesValue(o);
  const model = (item.proposed as { answer: string }).answer;
  const same = model === v.answer;
  await tx(ctx, async (c) => {
    await c.db.update(arReplyItem).set({ status: same ? "accepted" : "edited", final: v, decidedBy: ctx.userId, decidedAt: ctx.clock.now() }).where(eq(arReplyItem.id, item.id));
    if (!same) await defect(c, model === "not_answered" ? "missed" : "edited", reply, item.id, item.proposed, v);
    if (v.answer !== "not_answered") await storeCharges(c, reply.caseId, item.id, { answer: v.answer, details: v.details });
  });
}

/** Something in the email that the model didn't report. A "missed" defect, unless the reading failed. */
export async function addMissed(ctx: Ctx, replyId: string, o: { kind: ReplyItemKind; value: Record<string, unknown> }) {
  const reply = await loadReply(ctx, replyId);
  mustHaveOpened(ctx, reply);
  let value: Record<string, unknown>;
  if (o.kind === "charges") {
    const has = await ctx.db.query.arReplyItem.findFirst({ where: and(eq(arReplyItem.replyId, reply.id), eq(arReplyItem.kind, "charges")) });
    if (has) throw new Error("The charges answer is already on this reply");
    const v = chargesValue(o.value as { answer: string; details?: string | null });
    if (v.answer === "not_answered") throw new Error("Choose the charges answer");
    value = v;
  } else value = staffValue(o.kind, o.value);
  const id = ctx.ids.next("ari");
  await tx(ctx, async (c) => {
    await c.db.insert(arReplyItem).values({ id, firmId: ctx.firmId, replyId: reply.id, caseId: reply.caseId, mailId: reply.mailId, kind: o.kind, origin: "staff", proposed: null, final: value, status: "added", decidedBy: ctx.userId, decidedAt: ctx.clock.now() });
    if (reply.status === "read") await defect(c, "missed", reply, id, null, value);
    if (o.kind === "charges") await storeCharges(c, reply.caseId, id, value as { answer: "none" | "has_charges"; details: string | null });
    if (o.kind === "signed_papers") await event(c, reply.caseId, "signed_scan_noted", { itemId: id, mailId: reply.mailId });
  });
  return id;
}

/** Staff confirm there is nothing else in the email. Needed for every reply, including "no changes". */
export async function finishReview(ctx: Ctx, replyId: string) {
  const reply = await loadReply(ctx, replyId);
  mustHaveOpened(ctx, reply);
  const items = await ctx.db.select().from(arReplyItem).where(eq(arReplyItem.replyId, reply.id));
  const open = items.filter((i) => i.status === "proposed").length;
  if (open) throw new Error(`${open === 1 ? "One point is" : `${open} points are`} still undecided`);
  const count = (s: Item["status"]) => items.filter((i) => i.status === s).length;
  await tx(ctx, async (c) => {
    await c.db.update(arReply).set({ reviewedBy: ctx.userId, reviewedAt: ctx.clock.now() }).where(eq(arReply.id, reply.id));
    await event(c, reply.caseId, "reply_reviewed", { replyId: reply.id, mailId: reply.mailId, accepted: count("accepted"), edited: count("edited"), rejected: count("rejected"), added: count("added") });
  });
}

/** Replies on a case that still need a person, oldest first. */
export async function repliesToReview(ctx: Ctx, caseId: string) {
  return ctx.db.select({ reply: arReply, mail: arMail }).from(arReply)
    .innerJoin(arMail, and(eq(arMail.id, arReply.mailId), eq(arMail.firmId, arReply.firmId)))
    .where(and(eq(arReply.firmId, ctx.firmId), eq(arReply.caseId, caseId), isNull(arReply.reviewedAt))).orderBy(asc(arMail.receivedAt));
}

export async function replyForReview(ctx: Ctx, replyId: string) {
  const reply = await loadReply(ctx, replyId);
  const mail = (await ctx.db.query.arMail.findFirst({ where: and(eq(arMail.id, reply.mailId), eq(arMail.firmId, ctx.firmId)) }))!;
  const order = ["charges", "change", "signed_papers", "document"];
  const items = (await ctx.db.select().from(arReplyItem).where(eq(arReplyItem.replyId, reply.id)).orderBy(asc(arReplyItem.createdAt), asc(arReplyItem.id)))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)); // what could change the return comes first
  return { reply, mail, items };
}

/** Changes staff accepted that still hold filing. */
export async function openChanges(ctx: Ctx, caseId: string) {
  return ctx.db.select().from(arReplyItem)
    .where(and(eq(arReplyItem.firmId, ctx.firmId), eq(arReplyItem.caseId, caseId), eq(arReplyItem.kind, "change"), inArray(arReplyItem.status, [...KEPT]), isNull(arReplyItem.resolution)))
    .orderBy(asc(arReplyItem.decidedAt));
}

/** The change is real but this return is right as it stands (for example, effective after the made-up date). */
export async function settleChange(ctx: Ctx, itemId: string, o: { reason: string }) {
  const { item } = await loadItem(ctx, itemId);
  if (item.kind !== "change" || !KEPT.includes(item.status as (typeof KEPT)[number])) throw new Error("Only an accepted change can be settled");
  if (item.resolution) throw new Error("This change has already been settled");
  const reason = o.reason.trim();
  if (!reason) throw new Error("Give the reason it doesn't affect this return");
  await tx(ctx, async (c) => {
    await c.db.update(arReplyItem).set({ resolution: { kind: "not_affecting", reason, by: ctx.userId, at: ctx.clock.now().toISOString() } }).where(eq(arReplyItem.id, item.id));
    await event(c, item.caseId, "change_settled", { itemId: item.id, resolution: "not_affecting" });
  });
}

const REDO_FROM = ["prepared", "payment_confirmed", "draft_ready", "sent", "signed_received"];
const fmtCopy = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Hong_Kong", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

/**
 * After staff update the records for the changes the client reported: the return is prepared again
 * and the case goes back to be sent for signature. Clerk's own form is refilled from the records copy,
 * which must be newer than the changes (the records source says when it was taken); with useCsaForm, staff have
 * redone the form in CSA themselves. Payment already confirmed stays confirmed.
 */
export async function prepareAgain(ctx: Ctx, deps: AnnualDeps, caseId: string, o: { useCsaForm?: boolean } = {}):
  Promise<{ ok: true; filedPath: string | null; charges: string } | { ok: false; reason: string }> {
  const c = await ctx.db.query.arCase.findFirst({ where: and(eq(arCase.id, caseId), eq(arCase.firmId, ctx.firmId)) });
  if (!c) throw new Error("Case not found");
  if (!REDO_FROM.includes(c.stage)) return { ok: false, reason: `The return can't be prepared again at "${c.stage}"` };
  const open = await openChanges(ctx, caseId);
  if (!open.length) return { ok: false, reason: "No reported change is waiting on this case" };
  const charges = c.chargesAnswer?.answer === "none" ? "Nil" : "";
  let built: { filedPath: string | null; documentId: string | null } = { filedPath: null, documentId: null };
  if (!o.useCsaForm) {
    const newest = Math.max(...open.map((i) => i.decidedAt!.getTime()));
    const asAt = await deps.records.asAt(ctx);
    if (!asAt || asAt.getTime() <= newest)
      return { ok: false, reason: `The records copy is from ${asAt ? fmtCopy(asAt) : "before the first import"}, before this change was accepted. Update the records, then prepare again after the next copy.` };
    const r = await buildAnnualReturn(ctx, deps, caseId, { charges });
    if (!r.ok) return r;
    built = r;
  }
  const at = ctx.clock.now();
  await tx(ctx, async (t) => {
    await t.db.update(arCase).set({
      stage: c.paymentConfirmedAt ? "payment_confirmed" : "prepared", formSource: o.useCsaForm ? "csa" : "generated", formDocumentId: built.documentId,
      formCompare: null, updatedAt: at,
    }).where(eq(arCase.id, c.id));
    await t.db.update(arReplyItem).set({ resolution: { kind: "prepared_again", by: ctx.userId, at: at.toISOString() } }).where(inArray(arReplyItem.id, open.map((i) => i.id)));
    await event(t, c.id, "prepared_again", { changes: open.map((i) => i.id), formSource: o.useCsaForm ? "csa" : "generated", fromStage: c.stage });
  });
  return { ok: true, filedPath: built.filedPath, charges };
}

type ChangeMap = { changes: Record<string, { label: string; playbookId: string | null }> };
let changeMap: ChangeMap | null = null;
const changes = () => (changeMap ??= JSON.parse(readFileSync(path.join(process.cwd(), "seed", "annual", "reply-changes.json"), "utf8")) as ChangeMap).changes;
export const changeLabel = (t: string) => changes()[t]?.label ?? "Other change";

/** The separate filing a kind of change usually needs: the form comes from the playbook, never from code. */
export function changeFiling(changeType: ChangeType | string, playbooks: PlaybookDef[]): { playbookId: string; form: string; name: string } | null {
  const id = changes()[changeType]?.playbookId;
  if (!id) return null;
  const pb = playbooks.filter((p) => p.id === id).sort((a, b) => b.version - a.version)[0];
  if (!pb) return null;
  const name = (pb as unknown as { name: { en?: string } | string }).name;
  return { playbookId: id, form: String(pb.forms), name: typeof name === "string" ? name : name.en ?? id };
}

/** Whether the task's record allows leaving shadow mode (brief: "When a task can leave shadow mode").
 *  One entry per reviewed reply, oldest first. Decided on this record only, never on the model's own view. */
export function shadowRecord(replies: { proposals: number; changed: number; missed: number }[]) {
  const missedInLast30 = replies.slice(-30).reduce((n, r) => n + r.missed, 0);
  const proposals = replies.reduce((n, r) => n + r.proposals, 0);
  const changedRate = proposals ? replies.reduce((n, r) => n + r.changed, 0) / proposals : 0;
  return { items: replies.length, missedInLast30, changedRate, canLeave: replies.length >= 30 && missedInLast30 === 0 && changedRate < 0.1 };
}

/** The reply reader's record so far, from reviewed replies the model did read. */
export async function replyShadowRecord(ctx: Ctx) {
  const replies = await ctx.db.select().from(arReply).where(and(eq(arReply.firmId, ctx.firmId), eq(arReply.status, "read"))).orderBy(asc(arReply.reviewedAt));
  const reviewed = replies.filter((r) => r.reviewedAt);
  const items = await ctx.db.select().from(arReplyItem).where(eq(arReplyItem.firmId, ctx.firmId));
  const defects = await ctx.db.select().from(aiDefect).where(and(eq(aiDefect.firmId, ctx.firmId), eq(aiDefect.task, REPLY_TASK)));
  return shadowRecord(reviewed.map((r) => ({
    proposals: items.filter((i) => i.replyId === r.id && i.origin === "model").length,
    changed: defects.filter((d) => d.inputRef === r.mailId && d.kind !== "missed").length,
    missed: defects.filter((d) => d.inputRef === r.mailId && d.kind === "missed").length,
  })));
}
