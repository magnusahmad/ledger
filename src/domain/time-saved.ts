// Hours-saved measurement (DECISIONS.md #20: a product requirement). Baseline minutes per
// activity are the per-task estimates in docs/TIME_SAVED_VS_CSA.md §3a (to be replaced by
// timings from the design partner); actual staff time comes from step_timing.
import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { stepTiming, taskEvent, llmCall } from "@/db/schema";

export const BASELINE_MINUTES: Record<string, { minutes: number; label: string }> = {
  "agent.intake": { minutes: 4, label: "Reading the request and working out what's needed (and what's on file)" },
  request_reply: { minutes: 6, label: "Writing the request message in the client's language" },
  invoice: { minutes: 6, label: "Creating and attaching the invoice" },
  "payment.received": { minutes: 2.5, label: "Checking the bank and marking the invoice paid" },
  "agent.information": { minutes: 5, label: "Re-reading the client's reply and filing their details" },
  "portal.upload": { minutes: 1.5, label: "Saving and renaming documents from chat or email" },
  "screening.clear": { minutes: 10, label: "Sanctions and PEP screening, filed on the person" },
  "documents.generated": { minutes: 12, label: "Retyping details into the forms and resolutions" },
  "signing.completed": { minutes: 3, label: "Building the signing pack and chasing signatures" },
  "register.updated": { minutes: 3, label: "Updating registers and filing history" },
  confirmation: { minutes: 2.5, label: "Writing the completion message" },
  status: { minutes: 5, label: "Status lookups and handover (\"where is this?\")" },
};

export async function timeSavedForTask(ctx: Ctx, taskId: string) {
  const ev = await ctx.db.select().from(taskEvent).where(eq(taskEvent.taskId, taskId));
  const timings = await ctx.db.select().from(stepTiming).where(eq(stepTiming.taskId, taskId));
  const kinds = new Set(ev.map((e) => e.kind));
  const done: { label: string; minutes: number }[] = [];
  const add = (k: string) => { const b = BASELINE_MINUTES[k]; if (b) done.push({ label: b.label, minutes: b.minutes }); };
  for (const k of ["agent.intake", "payment.received", "agent.information", "portal.upload", "screening.clear", "documents.generated", "signing.completed", "register.updated"]) if (kinds.has(k)) add(k);
  if (kinds.has("message.sent")) { add("request_reply"); add("invoice"); }
  if (kinds.has("task.done")) { add("confirmation"); add("status"); }
  const baseline = done.reduce((s, x) => s + x.minutes, 0);
  const staffSeconds = timings.reduce((s, t) => s + Math.min(t.seconds, 900), 0);
  const aiCalls = (await ctx.db.select({ id: llmCall.id }).from(llmCall).where(eq(llmCall.taskId, taskId))).length;
  return { baselineMinutes: baseline, staffMinutes: Math.round(staffSeconds / 6) / 10, items: done, approvals: timings.length, aiCalls };
}

export async function firmTimeSaved(ctx: Ctx) {
  const timings = await ctx.db.select().from(stepTiming).where(eq(stepTiming.firmId, ctx.firmId));
  return { approvals: timings.length, staffMinutes: Math.round(timings.reduce((s, t) => s + Math.min(t.seconds, 900), 0) / 6) / 10, editChars: timings.reduce((s, t) => s + t.editChars, 0) };
}
