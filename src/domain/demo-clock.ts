// Demo clock: jump the app's "today" forward to show date-driven behaviour (reminders,
// escalation, deadlines) in a recording. The offset lives in the database so the web app and
// the worker agree; each process picks it up with syncDemoClock. Demo tools only.
import type { Ctx } from "@/lib/ctx";
import { kvGet, kvSet } from "./kv";
import { runChasers } from "./chasing";
import { runReminders } from "./reminders";

const KEY = "demo.clockOffsetDays";

export async function demoClockOffset(ctx: Ctx) {
  return (await kvGet<number>(ctx, KEY)) ?? 0;
}

/** Apply the saved offset to this process's clock. Cheap; call per request and per worker tick. */
export async function syncDemoClock(ctx: Ctx) {
  if (!ctx.clock.setOffsetDays) return;
  ctx.clock.setOffsetDays(ctx.config.demoTools ? await demoClockOffset(ctx) : 0);
}

export async function fastForward(ctx: Ctx, days: number) {
  if (!ctx.config.demoTools) throw new Error("Demo tools are off in this environment");
  if (!Number.isInteger(days) || days < 1 || days > 60) throw new Error("Jump 1 to 60 days at a time");
  if (!ctx.clock.setOffsetDays) throw new Error("This clock can't be moved");
  const offsetDays = (await demoClockOffset(ctx)) + days;
  await kvSet(ctx, KEY, offsetDays);
  ctx.clock.setOffsetDays(offsetDays);
  const chases = await runChasers(ctx);
  const reminders = await runReminders(ctx);
  return { today: ctx.clock.today(), offsetDays, chases, reminders };
}

export async function backToToday(ctx: Ctx) {
  await kvSet(ctx, KEY, 0);
  ctx.clock.setOffsetDays?.(0);
}
