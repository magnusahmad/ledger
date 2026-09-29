// Modelled opportunities from TIME_SAVED_VS_CSA.md §3a, alongside partial
// approval timings. These are not an observed productivity multiplier.
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { stepTiming, taskEvent, llmCall, proposal, task } from "@/db/schema";

export const BASELINE_MINUTES: Record<string, { minutes: number; label: string }> = {
  request_reply: { minutes: 4, label: "Preparing the request message" },
  invoice: { minutes: 5, label: "Creating and attaching the invoice" },
  "payment.received": { minutes: 2, label: "Checking the bank and marking the invoice paid" },
  "agent.information": { minutes: 5, label: "Reading and entering the client's details" },
  "portal.upload": { minutes: 1, label: "Saving a document received from the client" },
};

export async function timeSavedForTask(ctx: Ctx, taskId: string) {
  const current = await ctx.db.query.task.findFirst({ where: and(eq(task.id, taskId), eq(task.firmId, ctx.firmId)) });
  if (!current) throw new Error("Task not found");
  const ev = await ctx.db.select().from(taskEvent).where(and(eq(taskEvent.taskId, taskId), eq(taskEvent.firmId, ctx.firmId)));
  const timings = await ctx.db.select().from(stepTiming).where(eq(stepTiming.firmId, ctx.firmId));
  const proposals = await ctx.db.select().from(proposal).where(eq(proposal.firmId, ctx.firmId));
  const tasks = await ctx.db.select().from(task).where(eq(task.firmId, ctx.firmId));
  const peers = current.requestId ? tasks.filter((t) => t.requestId === current.requestId) : [current];
  // One request-level approval is shared equally by its tasks, never duplicated.
  const allocated = timings.flatMap((timing) => {
    if (timing.taskId) return timing.taskId === taskId ? [{ timing, seconds: timing.seconds }] : [];
    const p = proposals.find((p) => p.id === timing.proposalId);
    if (!p) return [];
    const requestId = p.requestId ?? p.payload.requestId;
    const linked = requestId ? tasks.filter((t) => t.requestId === requestId) : tasks.filter((t) => Array.isArray(p.payload.taskIds) && p.payload.taskIds.includes(t.id));
    return linked.some((t) => t.id === taskId) ? [{ timing, seconds: timing.seconds / linked.length }] : [];
  });
  const kinds = new Set(ev.map((e) => e.kind));
  const items: { label: string; minutes: number }[] = [];
  const add = (k: string, divisor = 1) => { const b = BASELINE_MINUTES[k]; if (b) items.push({ label: b.label, minutes: b.minutes / divisor }); };
  for (const k of ["payment.received", "agent.information", "portal.upload"]) if (kinds.has(k)) add(k, k === "payment.received" ? peers.length : 1);
  if (kinds.has("message.sent")) { add("request_reply", peers.length); add("invoice", peers.length); }
  const staffSeconds = allocated.reduce((s, x) => s + x.seconds, 0);
  const aiCalls = (await ctx.db.select({ id: llmCall.id }).from(llmCall).where(and(eq(llmCall.taskId, taskId), eq(llmCall.firmId, ctx.firmId)))).length;
  return {
    baselineMinutes: items.reduce((s, x) => s + x.minutes, 0),
    staffMinutes: Math.round(staffSeconds / 6) / 10, staffSeconds,
    hasMeasurements: allocated.length > 0, items, approvals: allocated.length, aiCalls,
  };
}

export async function firmTimeSaved(ctx: Ctx) {
  const timings = await ctx.db.select().from(stepTiming).where(eq(stepTiming.firmId, ctx.firmId));
  return { approvals: timings.length, staffMinutes: Math.round(timings.reduce((s, t) => s + t.seconds, 0) / 6) / 10, editChars: timings.reduce((s, t) => s + t.editChars, 0) };
}
