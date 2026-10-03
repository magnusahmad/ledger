import { randomUUID } from "node:crypto";
import { operationalNow } from "@/lib/clock";
import { and, eq, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { kv } from "@/db/schema";

export async function kvGet<T>(ctx: Ctx, key: string): Promise<T | null> {
  const r = await ctx.db.query.kv.findFirst({ where: and(eq(kv.firmId, ctx.firmId), eq(kv.key, key)) });
  return (r?.value as T) ?? null;
}
export async function kvSet(ctx: Ctx, key: string, value: unknown) {
  await ctx.db.insert(kv).values({ firmId: ctx.firmId, key, value }).onConflictDoUpdate({ target: [kv.firmId, kv.key], set: { value } });
}

export type Lease = { assertCurrent(): Promise<void>; setValue(key: string, value: unknown): Promise<void> };

/** Ownership is checked on renewal and release, so an old process cannot clear a new lease. */
export async function withLease<T>(ctx: Ctx, name: string, seconds: number, fn: (lease: Lease) => Promise<T>): Promise<T | null> {
  const key = `lease.${name}`;
  const owner = randomUUID();
  const until = () => new Date(operationalNow(ctx.clock).getTime() + seconds * 1000).toISOString();
  await ctx.db.insert(kv).values({ firmId: ctx.firmId, key, value: { until: new Date(0).toISOString() } }).onConflictDoNothing();
  const got = await ctx.db.execute(sql`update kv set value = ${JSON.stringify({ owner, until: until() })}::jsonb where firm_id = ${ctx.firmId} and key = ${key} and (value->>'until')::timestamptz <= ${operationalNow(ctx.clock).toISOString()}::timestamptz returning key`);
  if (!got.rows.length) return null;
  const lease: Lease = { async assertCurrent() {
    const current = await kvGet<{ owner?: string; until: string }>(ctx, key);
    if (current?.owner !== owner || new Date(current.until) <= operationalNow(ctx.clock)) throw new Error("Poll ownership expired; another worker will recover unfinished items");
  }, async setValue(targetKey, value) {
    await ctx.db.transaction(async db => {
      await db.execute(sql`select key from kv where firm_id = ${ctx.firmId} and key = ${key} for update`);
      const txCtx = { ...ctx, db: db as unknown as Ctx["db"] };
      const current = await kvGet<{ owner?: string; until: string }>(txCtx, key);
      if (current?.owner !== owner || new Date(current.until) <= operationalNow(ctx.clock)) throw new Error("Poll ownership expired before cursor commit");
      await kvSet(txCtx, targetKey, value);
    });
  } };
  const timer = setInterval(() => {
    void ctx.db.execute(sql`update kv set value = ${JSON.stringify({ owner, until: until() })}::jsonb where firm_id = ${ctx.firmId} and key = ${key} and value->>'owner' = ${owner} and (value->>'until')::timestamptz > ${operationalNow(ctx.clock).toISOString()}::timestamptz`).catch(() => {});
  }, Math.max(1000, seconds * 1000 / 3));
  timer.unref();
  try { return await fn(lease); } finally {
    clearInterval(timer);
    await ctx.db.execute(sql`update kv set value = ${JSON.stringify({ until: new Date(0).toISOString() })}::jsonb where firm_id = ${ctx.firmId} and key = ${key} and value->>'owner' = ${owner}`);
  }
}
