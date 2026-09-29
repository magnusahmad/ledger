// Wires the engine's human-gated steps to proposals, and automatic steps to their work.
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { conversation, filing, message, proposal, request as requestT, task as taskT } from "@/db/schema";
import { onEnterStep, markStepState, getTask, logEvent, advance, assertTaskReady } from "./engine";
import { createProposal, onApprove, pendingProposals } from "./proposals";
import { planRegisterChanges } from "./register-effects";
import { generateForTask } from "@/documents/generate";
import { enqueue, onJob } from "./jobs";
import { composeReply } from "./inbound";
import { itemLabel } from "./labels";
import type { ReplyFacts } from "@/agent/draft";
import { getPlaybook } from "./playbooks";
import { validRegisterDate } from "@/documents/register-export";
import { approvalState, assertApprovalState, expireApproval } from "./approval-state";

onEnterStep("generate", async (ctx, task, _step, idx) => {
  try {
    const docs = await generateForTask(ctx, task.id);
    await markStepState(ctx, task.id, idx, { generated: true, documentIds: docs.map((d) => d.id), signatureFields: docs.map((d) => ({ id: d.id, signers: d.signers, fields: d.signatureFields })) });
    await logEvent(ctx, task.id, "documents.generated", `Prepared ${docs.map((d) => d.title).join(", ")}`, { documentIds: docs.map((d) => d.id) });
  } catch (e) {
    await logEvent(ctx, task.id, "documents.failed", `Couldn't prepare documents: ${(e as Error).message}`);
    await createProposal(ctx, { kind: "triage", title: `Documents need attention: ${task.title}`, summary: (e as Error).message, clientId: task.clientId, taskId: task.id, payload: { taskId: task.id } });
  }
});

onEnterStep("file", async (ctx, task, step) => {
  if ((await pendingProposals(ctx, { taskId: task.id, kind: "record_filing" })).length) return;
  const pb = await getPlaybook(ctx, task.playbookId, task.playbookVersion);
  await createProposal(ctx, { kind: "record_filing", title: `${step.label}: ${task.title}`, summary: `File on ${step.authority ?? "the portal"} and record the reference here.`, clientId: task.clientId, taskId: task.id, payload: { taskId: task.id, approvalState: await approvalState(ctx, task.id), form: pb.forms ?? "", authority: step.authority ?? null } });
});

onApprove("record_filing", async (ctx, p, opts) => {
  const taskId = p.payload.taskId as string;
  const t = await assertTaskReady(ctx, taskId, "file");
  await assertApprovalState(ctx, taskId, p.payload.approvalState, p.id);
  const edits = (opts.edits ?? {}) as { reference?: string; filedOn?: string; companyNumber?: string; incorporatedOn?: string };
  if (!edits.reference?.trim()) throw new Error("Enter the filing reference (e.g. the e-Registry submission number)");
  if (t.playbookId === "hk.incorporation") {
    const companyNumber = edits.companyNumber?.trim();
    const incorporatedOn = edits.incorporatedOn ?? "";
    if (!companyNumber || !validRegisterDate(incorporatedOn)) throw new Error("Enter the company number and valid incorporation date from the certificate");
    await ctx.db.update(taskT).set({ params: { ...t.params, incorporationRegistration: { companyNumber, incorporatedOn } } }).where(and(eq(taskT.id, t.id), eq(taskT.firmId, ctx.firmId)));
  }
  const form = String(p.payload.form ?? "");
  const filedOn = edits.filedOn ?? ctx.clock.today();
  const periodKey = t.periodKey ?? (form === "NAR1" ? `NAR1:${filedOn.slice(0, 4)}` : null);
  await ctx.db.insert(filing).values({ id: ctx.ids.next("fil"), firmId: ctx.firmId, clientId: t.clientId, form: form || "Filing", description: t.title, filedOn, reference: edits.reference.trim(), periodKey, sourceTaskId: taskId });
  await markStepState(ctx, taskId, "file", { filed: true, reference: edits.reference.trim(), filedOn });
  await logEvent(ctx, taskId, "filing.recorded", `${form} filed, reference ${edits.reference.trim()}`, {}, ctx.userId);
  await advance(ctx, taskId);
});

onEnterStep("register", async (ctx, task) => {
  if ((await pendingProposals(ctx, { taskId: task.id, kind: "register_change" })).length) return;
  try {
    const changes = await planRegisterChanges(ctx, task.id);
    await createProposal(ctx, { kind: "register_change", title: `Update registers: ${task.title}`, summary: changes.map((c) => c.description).join("\n") || "No register changes; confirm to continue.", clientId: task.clientId, taskId: task.id, payload: { taskId: task.id, approvalState: await approvalState(ctx, task.id), preview: changes.map((c) => c.description) } });
  } catch (e) {
    await logEvent(ctx, task.id, "register.blocked", (e as Error).message);
    await createProposal(ctx, { kind: "triage", title: `Register update needs attention: ${task.title}`, summary: (e as Error).message, clientId: task.clientId, taskId: task.id, payload: { taskId: task.id } });
  }
});

onApprove("register_change", async (ctx, p) => {
  const taskId = p.payload.taskId as string;
  await assertTaskReady(ctx, taskId, "register");
  await assertApprovalState(ctx, taskId, p.payload.approvalState, p.id);
  const changes = await planRegisterChanges(ctx, taskId);
  const applied = changes.map(c => c.description);
  if (JSON.stringify(applied) !== JSON.stringify(p.payload.preview)) {
    await expireApproval(ctx, taskId, p.id);
    throw new Error("The register changes differ from the preview. Preparation has restarted for a fresh approval.");
  }
  // Execute the checked plan itself; never independently recompute effects after approval.
  for (const change of changes) await change.apply();
  await markStepState(ctx, taskId, "register", { applied: true, changes: applied });
  await logEvent(ctx, taskId, "register.updated", applied.length ? applied.join("; ") : "Registers confirmed", {}, ctx.userId);
  await advance(ctx, taskId);
});

onEnterStep("task", async (ctx, task, step) => {
  await logEvent(ctx, task.id, "step.waiting", `Waiting for staff: ${step.label}`);
});

onEnterStep("confirm", async (ctx, task) => {
  await enqueue(ctx, "draft.confirmation", { taskId: task.id }, `confirm:${task.id}`);
});

onJob("draft.confirmation", async (ctx, { taskId }) => {
  const t = await getTask(ctx, taskId as string);
  if (t.status !== "open") return;
  const existing = await ctx.db.select().from(proposal).where(and(eq(proposal.taskId, t.id), eq(proposal.kind, "send_message")));
  if (existing.some((x) => (x.payload as { markStep?: unknown }).markStep && x.status === "pending")) return;
  const pb = await getPlaybook(ctx, t.playbookId, t.playbookVersion);
  const req = t.requestId ? await ctx.db.query.request.findFirst({ where: eq(requestT.id, t.requestId) }) : null;
  const conv = req?.conversationId ? await ctx.db.query.conversation.findFirst({ where: eq(conversation.id, req.conversationId) }) : null;
  const lastIn = conv ? (await ctx.db.select().from(message).where(and(eq(message.conversationId, conv.id), eq(message.direction, "in")))).sort((a, b) => b.at.getTime() - a.at.getTime())[0] ?? null : null;
  const cl = (await ctx.db.query.client.findFirst({ where: (c, { eq }) => eq(c.id, t.clientId) }))!;
  const lang = (lastIn?.language ?? (conv ? (await ctx.db.select().from(message).where(eq(message.conversationId, conv.id))).find((m) => m.direction === "out")?.language : null) ?? cl.messageLang) as ReplyFacts["language"];
  const filed = Object.values(t.stepState).map((s) => (s as { reference?: string }).reference).find(Boolean);
  const facts: ReplyFacts = {
    language: lang, recipientName: "", clientName: "", signOff: "", newRequests: [], changes: [], cancellations: [], questions: [], clarifications: [], invoice: null, uploadUrl: null,
    updates: [{ title: pb.name[lang] ?? t.title, received: [], stillNeeded: [], nextStep: "Completed" }],
    extraNotes: [`This task is now complete: ${t.title}.`, ...(filed ? [`Filed with the authority, reference ${filed}.`] : []), ...pb.complianceNotes.filter((n) => /remind|bank|chop|signboard|update/i.test(n)).slice(0, 2)],
  };
  let convId = conv?.id;
  if (!convId) { const [c] = await ctx.db.insert(conversation).values({ id: ctx.ids.next("cnv"), firmId: ctx.firmId, clientId: t.clientId, channel: "email", subject: t.title, createdAt: ctx.clock.now() }).returning(); convId = c.id; }
  const draft = await composeReply(ctx, { clientId: t.clientId, conversationId: convId, inReplyTo: lastIn, facts, requestId: null, purpose: "Tell the client the work is complete, with the filing reference and any follow-up they should do." });
  await createProposal(ctx, { kind: "send_message", title: `Confirm completion to client: ${t.title}`, clientId: t.clientId, taskId: t.id, requestId: t.requestId, payload: { messageId: draft.id, requestId: null, taskIds: [], draftSource: draft.source, markStep: { taskId: t.id, kind: "confirm" }, purpose: "confirmation" } });
});

/** Staff mark a manual ("task") step done from the task page. */
export async function completeManualStep(ctx: Ctx, taskId: string, note?: string) {
  const t = await getTask(ctx, taskId);
  const step = t._steps[t.stepIndex];
  if (step?.kind !== "task") throw new Error("The current step isn't a manual step");
  await markStepState(ctx, taskId, "task", { done: true, note: note ?? null });
  await logEvent(ctx, taskId, "step.manual_done", `${step.label}${note ? `: ${note}` : ""}`, {}, ctx.userId);
  return advance(ctx, taskId);
}

/** Staff can tick a checklist item received by hand (e.g. a document handed over in person). */
export async function tickItem(ctx: Ctx, taskId: string, key: string, value: string | null) {
  const t = await getTask(ctx, taskId);
  const next = t.checklist.map((e) => e.key === key && (!e.personId || e.personId === t.personId) ? { ...e, status: "received" as const, value: value ?? e.value ?? null, source: "Ticked by staff" } : e);
  const { setChecklist } = await import("./engine");
  await setChecklist(ctx, taskId, next, `${itemLabel(key)} marked received by staff`, ctx.userId);
  return advance(ctx, taskId);
}
