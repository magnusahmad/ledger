import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { kv } from "@/db/schema";

export async function kvGet<T>(ctx: Ctx, key: string): Promise<T | null> {
  const r = await ctx.db.query.kv.findFirst({ where: and(eq(kv.firmId, ctx.firmId), eq(kv.key, key)) });
  return (r?.value as T) ?? null;
}
export async function kvSet(ctx: Ctx, key: string, value: unknown) {
  await ctx.db.insert(kv).values({ firmId: ctx.firmId, key, value }).onConflictDoUpdate({ target: [kv.firmId, kv.key], set: { value } });
}
