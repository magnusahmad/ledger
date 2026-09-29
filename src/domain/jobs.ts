// Postgres-backed job queue (no Redis). Handlers register by kind; the worker drains it.
import { and, asc, eq, lte, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { job } from "@/db/schema";

type JobHandler = (ctx: Ctx, payload: Record<string, unknown>) => Promise<void>;
const jobHandlers = new Map<string, JobHandler>();
export function onJob(kind: string, h: JobHandler) { jobHandlers.set(kind, h); }

export async function enqueue(ctx: Ctx, kind: string, payload: Record<string, unknown>, dedupeKey?: string) {
  await ctx.db.insert(job).values({ id: ctx.ids.next("job"), firmId: ctx.firmId, kind, payload, dedupeKey: dedupeKey ?? null, runAfter: ctx.clock.now() })
    .onConflictDoNothing();
}

/** Runs due jobs; failed jobs retry with backoff up to 5 attempts. */
export async function runJobs(ctx: Ctx, limit = 20) {
  const due = await ctx.db.select().from(job).where(and(eq(job.firmId, ctx.firmId), eq(job.status, "queued"), lte(job.runAfter, ctx.clock.now()))).orderBy(asc(job.createdAt)).limit(limit);
  let ran = 0;
  for (const j of due) {
    const claimed = await ctx.db.update(job).set({ status: "running", attempts: sql`${job.attempts} + 1` }).where(and(eq(job.id, j.id), eq(job.status, "queued"))).returning();
    if (!claimed.length) continue;
    const h = jobHandlers.get(j.kind);
    try {
      if (!h) throw new Error(`No handler for job ${j.kind}`);
      await h(ctx, j.payload);
      await ctx.db.update(job).set({ status: "done", lastError: null }).where(eq(job.id, j.id));
    } catch (e) {
      const attempts = claimed[0].attempts;
      await ctx.db.update(job).set({
        status: attempts >= 5 ? "failed" : "queued", lastError: (e as Error).message.slice(0, 1000),
        runAfter: new Date(ctx.clock.now().getTime() + 2 ** attempts * 5000),
      }).where(eq(job.id, j.id));
    }
    ran++;
  }
  return ran;
}
