// Postgres-backed job queue (no Redis). Handlers register by kind; the worker drains it.
import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { job } from "@/db/schema";
import { randomUUID } from "node:crypto";
import { operationalNow } from "@/lib/clock";

type JobHandler = (ctx: Ctx, payload: Record<string, unknown>) => Promise<void>;
const jobHandlers = new Map<string, JobHandler>();
const failureHandlers = new Map<string, (ctx: Ctx, payload: Record<string, unknown>, error: Error) => Promise<void>>();
export function onJobError(kind: string, h: (ctx: Ctx, payload: Record<string, unknown>, error: Error) => Promise<void>) { failureHandlers.set(kind, h); }
export function onJob(kind: string, h: JobHandler) { jobHandlers.set(kind, h); }

export async function enqueue(ctx: Ctx, kind: string, payload: Record<string, unknown>, dedupeKey?: string) {
  await ctx.db.insert(job).values({ id: ctx.ids.next("job"), firmId: ctx.firmId, kind, payload, dedupeKey: dedupeKey ?? null, runAfter: ctx.clock.now() })
    .onConflictDoNothing();
}

const JOB_LEASE_MS = 5 * 60_000;

/** Reclaim abandoned jobs. Row locks prevent a replacement overlapping a live handler. */
export async function runJobs(ctx: Ctx, limit = 20) {
  let ran = 0;
  for (let i = 0; i < limit; i++) {
    const owner = randomUUID();
    const now = operationalNow(ctx.clock);
    const claimed = await ctx.db.transaction(async db => {
      const [next] = await db.select().from(job).where(and(eq(job.firmId, ctx.firmId), or(
        and(eq(job.status, "queued"), lte(job.runAfter, ctx.clock.now())),
        and(eq(job.status, "running"), or(isNull(job.leaseUntil), lte(job.leaseUntil, now))),
      ))).orderBy(asc(job.createdAt)).limit(1).for("update", { skipLocked: true });
      if (!next) return null;
      const [row] = await db.update(job).set({ status: "running", attempts: sql`${job.attempts} + 1`, executionToken: owner, leaseUntil: new Date(now.getTime() + JOB_LEASE_MS) }).where(eq(job.id, next.id)).returning();
      return row;
    });
    if (!claimed) break;
    try {
      await ctx.db.transaction(async db => {
        // Hold the job lock across local effects and terminal completion. If the
        // process dies, PG rolls both back and the committed claim remains recoverable.
        const [current] = await db.select().from(job).where(and(eq(job.id, claimed.id), eq(job.firmId, ctx.firmId))).for("update");
        if (current.executionToken !== owner || current.status !== "running" || !current.leaseUntil || current.leaseUntil <= operationalNow(ctx.clock)) throw new Error("Job ownership expired before execution");
        const h = jobHandlers.get(current.kind);
        if (!h) throw new Error(`No handler for job ${current.kind}`);
        await h({ ...ctx, db: db as unknown as Ctx["db"] }, current.payload);
        if (current.leaseUntil <= operationalNow(ctx.clock)) throw new Error("Job ownership expired before completion; local changes rolled back");
        await db.update(job).set({ status: "done", lastError: null, executionToken: null, leaseUntil: null }).where(and(eq(job.id, current.id), eq(job.executionToken, owner)));
      });
    } catch (e) {
      await ctx.db.transaction(async db => {
        const failed = await db.update(job).set({ status: claimed.attempts >= 5 ? "failed" : "queued", lastError: (e as Error).message.slice(0, 1000),
          executionToken: null, leaseUntil: null, runAfter: new Date(ctx.clock.now().getTime() + 2 ** claimed.attempts * 5000),
        }).where(and(eq(job.id, claimed.id), eq(job.firmId, ctx.firmId), eq(job.executionToken, owner), eq(job.status, "running"))).returning();
        if (failed.length) await failureHandlers.get(claimed.kind)?.({ ...ctx, db: db as unknown as Ctx["db"] }, claimed.payload, e as Error);
      });
    }
    ran++;
  }
  return ran;
}
