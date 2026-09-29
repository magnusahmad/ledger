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

/** A short database lease so the web app and the worker never process the same poll twice. */
export async function withLease<T>(ctx: Ctx, name: string, seconds: number, fn: () => Promise<T>): Promise<T | null> {
  const key = `lease.${name}`;
  const now = new Date();
  const until = new Date(now.getTime() + seconds * 1000).toISOString();
  await ctx.db.insert(kv).values({ firmId: ctx.firmId, key, value: { until: new Date(0).toISOString() } }).onConflictDoNothing();
  const got = await ctx.db.execute(sql`update kv set value = ${JSON.stringify({ until })}::jsonb where firm_id = ${ctx.firmId} and key = ${key} and (value->>'until')::timestamptz < ${now.toISOString()}::timestamptz returning key`);
  if (!got.rows.length) return null;
  try { return await fn(); } finally {
    await ctx.db.execute(sql`update kv set value = ${JSON.stringify({ until: new Date(0).toISOString() })}::jsonb where firm_id = ${ctx.firmId} and key = ${key}`);
  }
}
