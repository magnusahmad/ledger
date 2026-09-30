// The task engine: deterministic step progression over playbook data.
// Understanding what the client means is the agent layer's job (src/agent); this module
// only decides what happens next given the task's state.
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import {
  businessRegistration, cddRecord, client as clientT, invoice, person as personT, request as requestT,
  task as taskT, taskEvent, proposal, signEnvelope, type ChecklistEntry,
} from "@/db/schema";
import type { PlaybookDef, StepDef, StepKind } from "./playbook-types";
import { getPlaybook } from "./playbooks";
import { addDays, addMonths, isIsoDate } from "./dates";
import { financialYearEnds } from "./fye-periods";

export type Task = typeof taskT.$inferSelect & { checklist: (ChecklistEntry & { optional?: boolean })[]; _steps?: StepDef[] };
export type Extracted = Record<string, { value: string; source?: string | null; confidence?: number | null; documentId?: string | null }>;

// ---------- Step entry hooks (registered by documents, signing, screening, messaging modules) ----------
export type StepHook = (ctx: Ctx, task: Task, step: StepDef, index: number, pb: PlaybookDef) => Promise<void>;
const enterHooks = new Map<StepKind, StepHook[]>();
export function onEnterStep(kind: StepKind, hook: StepHook) {
  const list = enterHooks.get(kind) ?? [];
  list.push(hook);
  enterHooks.set(kind, list);
}
export function clearStepHooks() { enterHooks.clear(); }

// ---------- Requests ----------
export async function createRequest(ctx: Ctx, r: { clientId: string; summary?: string; conversationId?: string | null; sourceMessageId?: string | null }) {
  const [row] = await ctx.db.insert(requestT).values({
    id: ctx.ids.next("req"), firmId: ctx.firmId, clientId: r.clientId, summary: r.summary ?? null,
    conversationId: r.conversationId ?? null, sourceMessageId: r.sourceMessageId ?? null, uploadToken: ctx.ids.token(),
    createdAt: ctx.clock.now(),
  }).returning();
  return row;
}

export async function getRequest(ctx: Ctx, id: string) {
  const r = await ctx.db.query.request.findFirst({ where: and(eq(requestT.id, id), eq(requestT.firmId, ctx.firmId)) });
  if (!r) throw new Error(`Request ${id} not found`);
  return r;
}

// ---------- Events ----------
export async function logEvent(ctx: Ctx, taskId: string, kind: string, summary: string, data: Record<string, unknown> = {}, actor = "system") {
  await ctx.db.insert(taskEvent).values({ id: ctx.ids.next("evt"), firmId: ctx.firmId, taskId, kind, summary, data, actor, at: ctx.clock.now() });
}

export async function taskEvents(ctx: Ctx, taskId: string) {
  return ctx.db.select().from(taskEvent).where(and(eq(taskEvent.firmId, ctx.firmId), eq(taskEvent.taskId, taskId))).orderBy(asc(taskEvent.at), asc(taskEvent.id));
}

// ---------- Checklist ----------
export async function hasCurrentCdd(ctx: Ctx, personId: string) {
  const today = ctx.clock.today();
  const rows = await ctx.db.select().from(cddRecord).where(and(eq(cddRecord.firmId, ctx.firmId), eq(cddRecord.personId, personId)));
  const current = rows.filter((r) => r.verifiedOn <= today && r.reviewDueOn >= today).sort((a, b) => b.reviewDueOn.localeCompare(a.reviewDueOn))[0];
  return current ?? null;
}

async function personPrefill(ctx: Ctx, personId: string): Promise<Record<string, string | null>> {
  const p = await ctx.db.query.person.findFirst({ where: eq(personT.id, personId) });
  if (!p) return {};
  return {
    fullName: p.nameEn || null,
    chiName: p.nameZh || null,
    idNo: p.idNumberEnc ? "On file" : null,
    resAddr: p.residentialAddressEnc ? "On file" : null,
    corrAddr: p.correspondenceAddress || null,
    contactInfo: [p.email, p.phone].filter(Boolean).join(" / ") || null,
  };
}

export async function buildChecklist(ctx: Ctx, pb: PlaybookDef, opts: { clientId: string; personId?: string | null; extracted?: Extracted }) {
  const cl = await ctx.db.query.client.findFirst({ where: eq(clientT.id, opts.clientId) });
  const cdd = opts.personId ? await hasCurrentCdd(ctx, opts.personId) : null;
  const prefill = opts.personId ? await personPrefill(ctx, opts.personId) : {};
  const out: (ChecklistEntry & { optional?: boolean })[] = [];
  for (const r of pb.requirements) {
    const personId = r.scope === "person" ? opts.personId ?? null : null;
    const base = { key: r.key, personId, optional: !!r.optional };
    const ex = opts.extracted?.[r.key];
    if (ex?.value) {
      out.push({ ...base, status: "received", value: ex.value, source: ex.source ?? null, documentId: ex.documentId ?? null, confidence: ex.confidence ?? null });
      continue;
    }
    if (r.condition === "personLacksCurrentCdd" && cdd) {
      out.push({ ...base, status: "on_file", source: `CDD on file, review due ${cdd.reviewDueOn}` });
      continue;
    }
    if (r.condition === "clientIsNew" && cl?.lifecycle !== "prospect") {
      out.push({ ...base, status: "not_needed", reason: "Existing client" });
      continue;
    }
    if (r.scope === "person" && prefill[r.key]) {
      out.push({ ...base, status: "on_file", value: prefill[r.key], source: "Person record" });
      continue;
    }
    out.push({ ...base, status: "needed" });
  }
  return out;
}

export function outstanding(t: Pick<Task, "checklist">) {
  return t.checklist.filter((e) => e.status === "needed" && !e.optional);
}

export async function setChecklist(ctx: Ctx, taskId: string, checklist: Task["checklist"], reason: string, actor = "system") {
  const before = await getTask(ctx, taskId);
  await ctx.db.update(taskT).set({ checklist }).where(eq(taskT.id, taskId));
  const changes = checklist.filter((e) => {
    const b = before.checklist.find((x) => x.key === e.key && (x.personId ?? null) === (e.personId ?? null));
    return !b || b.status !== e.status || b.value !== e.value || b.documentId !== e.documentId || b.optional !== e.optional;
  }).map((e) => `${e.key}: ${e.status}`);
  const removed = before.checklist.filter((b) => !checklist.some((e) => e.key === b.key && (e.personId ?? null) === (b.personId ?? null))).map((b) => `${b.key}: removed`);
  if (changes.length || removed.length) {
    await logEvent(ctx, taskId, "checklist.updated", reason, { changes: [...changes, ...removed] }, actor);
    await invalidatePreparation(ctx, taskId, reason);
  }
}

// ---------- Tasks ----------
export async function getTask(ctx: Ctx, id: string): Promise<Task & { _steps: StepDef[] }> {
  const t = await ctx.db.query.task.findFirst({ where: and(eq(taskT.id, id), eq(taskT.firmId, ctx.firmId)) });
  if (!t) throw new Error(`Task ${id} not found`);
  return withSteps(ctx, t as Task);
}

export function currentStep(t: Pick<Task, "stepIndex" | "status" | "_steps">, pb?: PlaybookDef): StepDef | null {
  const steps = pb?.steps ?? t._steps;
  if (t.status !== "open" || !steps) return null;
  return steps[t.stepIndex] ?? null;
}

async function withSteps(ctx: Ctx, t: Task): Promise<Task & { _steps: StepDef[] }> {
  const pb = await getPlaybook(ctx, t.playbookId, t.playbookVersion);
  return Object.assign(t, { _steps: pb.steps });
}

export async function computeDueDate(ctx: Ctx, pb: PlaybookDef, clientId: string, effectiveDate: string | null, periodYear?: number, periodKey?: string | null): Promise<string | null> {
  const d = pb.deadline;
  if (d.kind === "event") return effectiveDate ? addDays(effectiveDate, d.days) : null;
  const cl = await ctx.db.query.client.findFirst({ where: eq(clientT.id, clientId) });
  const year = periodYear ?? Number(ctx.clock.today().slice(0, 4));
  if (d.kind === "anniversary" && cl?.incorporatedOn) return addDays(`${year}${cl.incorporatedOn.slice(4)}`, d.days);
  if (d.kind === "fye" && cl?.fyeMonth && cl?.fyeDay) {
    const fye = periodKey?.match(/^AGM:(\d{4}-\d{2}-\d{2})$/)?.[1] ?? financialYearEnds(cl, periodYear ?? year - 1).at(-1);
    if (!fye) throw new Error("No accounting period ends in the selected year after the year-end change");
    return addMonths(fye, d.months);
  }
  if (d.kind === "br_expiry") {
    const br = await ctx.db.query.businessRegistration.findFirst({ where: eq(businessRegistration.clientId, clientId) });
    return br?.expiresOn ?? null;
  }
  if (d.kind === "fixed_annual") return `${year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
  return null;
}

export async function startTask(ctx: Ctx, t: {
  requestId?: string | null; clientId: string; playbookId: string; personId?: string | null;
  extracted?: Extracted; params?: Record<string, unknown>; assigneeId?: string | null; periodKey?: string | null; periodYear?: number;
  title?: string;
}): Promise<Task> {
  const pb = await getPlaybook(ctx, t.playbookId);
  const cl = await ctx.db.query.client.findFirst({ where: eq(clientT.id, t.clientId) });
  if (!cl) throw new Error("Client not found");
  const checklist = await buildChecklist(ctx, pb, { clientId: t.clientId, personId: t.personId, extracted: t.extracted });
  const eff = t.extracted?.effDate?.value ?? (t.params?.effectiveDate as string | undefined) ?? null;
  const effectiveDate = isIsoDate(eff) ? eff : null;
  const extracted: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(t.extracted ?? {})) extracted[k] = v;
  const personName = t.personId ? (await ctx.db.query.person.findFirst({ where: eq(personT.id, t.personId) }))?.nameEn : null;
  const [row] = await ctx.db.insert(taskT).values({
    id: ctx.ids.next("tsk"), firmId: ctx.firmId, requestId: t.requestId ?? null, clientId: t.clientId,
    playbookId: pb.id, playbookVersion: pb.version,
    // Onboarding checks the instructing person for KYC; they aren't what the task is about.
    title: t.title ?? (personName && pb.category !== "New client onboarding" ? `${pb.name.en}: ${personName}` : pb.name.en),
    personId: t.personId ?? null, assigneeId: t.assigneeId ?? cl.staffId ?? ctx.userId,
    checklist, extracted, params: t.params ?? {}, effectiveDate,
    dueDate: await computeDueDate(ctx, pb, t.clientId, effectiveDate, t.periodYear, t.periodKey),
    onCredit: cl.paymentTermsDays > 0, periodKey: t.periodKey ?? null, createdAt: ctx.clock.now(),
  }).returning();
  await logEvent(ctx, row.id, "task.created", `Opened from playbook "${pb.name.en}"`, { playbookId: pb.id, version: pb.version });
  const task = row as Task;
  await runEnterHooks(ctx, task, pb, 0);
  return getTask(ctx, row.id);
}

/** Records state for a step. `which` is a step kind (the current step if it matches, else the first open step of that kind) or an index. */
export async function markStepState(ctx: Ctx, taskId: string, which: StepKind | number, data: Record<string, unknown>) {
  const t = await getTask(ctx, taskId);
  const pb = await getPlaybook(ctx, t.playbookId, t.playbookVersion);
  let idx: number;
  if (typeof which === "number") idx = which;
  else if (pb.steps[t.stepIndex]?.kind === which) idx = t.stepIndex;
  else idx = pb.steps.findIndex((s, i) => s.kind === which && i >= t.stepIndex);
  if (idx < 0) idx = pb.steps.findIndex((s) => s.kind === which);
  if (idx < 0) throw new Error(`Task ${taskId} has no ${String(which)} step`);
  const stepState = { ...t.stepState, [String(idx)]: { ...(t.stepState[String(idx)] as object ?? {}), ...data } };
  await ctx.db.update(taskT).set({ stepState }).where(eq(taskT.id, taskId));
  return idx;
}

export function stepData(t: Task, idx: number): Record<string, unknown> {
  return (t.stepState[String(idx)] as Record<string, unknown>) ?? {};
}

async function invoiceStatus(ctx: Ctx, t: Task) {
  if (!t.requestId) return null;
  const r = await ctx.db.query.request.findFirst({ where: eq(requestT.id, t.requestId) });
  if (!r?.invoiceId) return null;
  const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, r.invoiceId) });
  return inv?.status ?? null;
}

type Completion = { done: boolean; skipped?: string };

async function stepCompletion(ctx: Ctx, t: Task, step: StepDef, idx: number, pb: PlaybookDef): Promise<Completion> {
  const s = stepData(t, idx);
  switch (step.kind) {
    case "send": return { done: !!s.sent || !!s.skipped, skipped: s.skipped as string | undefined };
    case "pay": {
      if (t.onCredit) return { done: true, skipped: "Skipped: client is on credit terms, so work starts before payment" };
      const st = await invoiceStatus(ctx, t);
      if (st === "paid") return { done: true };
      if (st === null && pb.feeCents === 0) return { done: true, skipped: "Skipped: no fee for this task" };
      if (s.waived) return { done: true, skipped: "Payment waived by staff" };
      return { done: false };
    }
    case "collect": return { done: outstanding(t).length === 0 };
    case "kyc":
    case "screen": return { done: !!s.cleared };
    case "generate": return { done: !!s.generated };
    case "sign": return { done: !!s.signed || !!s.skipped, skipped: s.skipped as string | undefined };
    case "file": return { done: !!s.filed };
    case "register": return { done: !!s.applied };
    case "confirm": return { done: !!s.sent };
    case "task": return { done: !!s.done };
    case "wait_until": return { done: !!t.effectiveDate && t.effectiveDate <= ctx.clock.today() };
  }
}

async function runEnterHooks(ctx: Ctx, t: Task, pb: PlaybookDef, idx: number) {
  const step = pb.steps[idx];
  if (!step) return;
  for (const h of enterHooks.get(step.kind) ?? []) await h(ctx, await getTask(ctx, t.id), step, idx, pb);
}

const REOPENABLE: StepKind[] = ["kyc", "screen", "generate", "sign", "file", "register"];

/** Rebuild prepared work whenever its inputs change, including complete-to-complete edits.
 * Filed records and signed PDFs remain in history; neither counts as approval for new facts. */
export async function invalidatePreparation(ctx: Ctx, taskId: string, reason: string) {
  const t = await getTask(ctx, taskId);
  const collectIdx = t._steps.findIndex(s => s.kind === "collect");
  if (t.status !== "open" || collectIdx < 0 || t.stepIndex <= collectIdx || !REOPENABLE.includes(t._steps[t.stepIndex]?.kind)) return;
  const stepState = Object.fromEntries(Object.entries(t.stepState).filter(([k]) => Number(k) < collectIdx));
  // Structured share instructions are derived from the checklist too.
  const params = { ...t.params };
  delete params.structured;
  await ctx.db.update(taskT).set({ stepIndex: collectIdx, stepState, params }).where(eq(taskT.id, taskId));
  await ctx.db.update(proposal).set({ status: "superseded", decidedAt: ctx.clock.now() }).where(and(
    eq(proposal.firmId, ctx.firmId), eq(proposal.taskId, taskId), eq(proposal.status, "pending"),
    inArray(proposal.kind, ["record_filing", "register_change", "send_signing", "screening_review"]),
  ));
  await ctx.db.update(signEnvelope).set({ status: "voided" }).where(and(eq(signEnvelope.firmId, ctx.firmId), eq(signEnvelope.taskId, taskId)));
  await logEvent(ctx, taskId, "step.reopened", `Back to collection: ${reason}`);
}

export async function taskBlockers(ctx: Ctx, taskId: string) {
  return ctx.db.select().from(proposal).where(and(eq(proposal.firmId, ctx.firmId), eq(proposal.taskId, taskId), eq(proposal.status, "pending"), inArray(proposal.kind, ["conflict", "cancel_task", "change_request"])));
}

/** Every human approval rechecks the authoritative task, not the browser's old card. */
export async function assertTaskReady(ctx: Ctx, taskId: string, kind: StepKind) {
  const t = await getTask(ctx, taskId);
  if (t.status !== "open") throw new Error("This task is no longer open");
  if (currentStep(t)?.kind !== kind) throw new Error(`This task is no longer at the ${kind} step`);
  if (outstanding(t).length) throw new Error("Required information is still outstanding");
  if ((await taskBlockers(ctx, taskId)).length) throw new Error("Resolve the pending conflict, change or cancellation before continuing");
  return t;
}

/** Moves the task forward through every step whose completion condition holds. */
export async function advance(ctx: Ctx, taskId: string): Promise<Task & { _steps: StepDef[] }> {
  for (let guard = 0; guard < 40; guard++) {
    const t = await getTask(ctx, taskId);
    if (t.status !== "open") return t;
    const pb = await getPlaybook(ctx, t.playbookId, t.playbookVersion);

    // Entry check: new outstanding items after collection send the task back to collect
    // (nothing is generated or signed on stale information).
    const collectIdx = pb.steps.findIndex((s) => s.kind === "collect");
    const cur = pb.steps[t.stepIndex];
    if (collectIdx >= 0 && t.stepIndex > collectIdx && cur && REOPENABLE.includes(cur.kind) && outstanding(t).length > 0) {
      await invalidatePreparation(ctx, taskId, `${outstanding(t).map((e) => e.key).join(", ")} now needed`);
      continue;
    }

    if (!cur) {
      await ctx.db.update(taskT).set({ status: "done", completedAt: ctx.clock.now() }).where(eq(taskT.id, taskId));
      await logEvent(ctx, taskId, "task.done", "Task completed");
      continue;
    }
    if ((cur.kind === "collect" || REOPENABLE.includes(cur.kind)) && (await taskBlockers(ctx, taskId)).length) return t;
    const c = await stepCompletion(ctx, t, cur, t.stepIndex, pb);
    if (!c.done) return t;
    await logEvent(ctx, taskId, c.skipped ? "step.skipped" : "step.completed", c.skipped ?? `Done: ${cur.label}`, { step: t.stepIndex, kind: cur.kind });
    const next = t.stepIndex + 1;
    await ctx.db.update(taskT).set({ stepIndex: next }).where(eq(taskT.id, taskId));
    if (pb.steps[next]) {
      await logEvent(ctx, taskId, "step.entered", `Now: ${pb.steps[next].label}`, { step: next, kind: pb.steps[next].kind });
      await runEnterHooks(ctx, t, pb, next);
    }
  }
  throw new Error(`advance(${taskId}) did not settle`);
}

export async function cancelTask(ctx: Ctx, taskId: string, reason: string, actor = ctx.userId) {
  await ctx.db.update(taskT).set({ status: "cancelled", completedAt: ctx.clock.now() }).where(eq(taskT.id, taskId));
  await ctx.db.update(proposal).set({ status: "superseded", decidedAt: ctx.clock.now() }).where(and(eq(proposal.firmId, ctx.firmId), eq(proposal.taskId, taskId), eq(proposal.status, "pending")));
  await ctx.db.update(signEnvelope).set({ status: "voided" }).where(and(eq(signEnvelope.firmId, ctx.firmId), eq(signEnvelope.taskId, taskId)));
  await logEvent(ctx, taskId, "task.cancelled", reason, {}, actor);
}

export async function tasksForRequest(ctx: Ctx, requestId: string) {
  return (await ctx.db.select().from(taskT).where(and(eq(taskT.firmId, ctx.firmId), eq(taskT.requestId, requestId))).orderBy(asc(taskT.createdAt), asc(taskT.id))) as Task[];
}

export async function openTasksForClient(ctx: Ctx, clientId: string) {
  return (await ctx.db.select().from(taskT).where(and(eq(taskT.firmId, ctx.firmId), eq(taskT.clientId, clientId), eq(taskT.status, "open"))).orderBy(asc(taskT.createdAt))) as Task[];
}
