// Credentials (CR e-accounts, OAuth refresh tokens, bank keys): encrypted at rest,
// every read logged, never returned by listing or UI APIs (AGENTS.md non-negotiable).
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { secret } from "@/db/schema";
import { audit } from "./audit";

export async function setSecret(ctx: Ctx, name: string, value: string) {
  const ciphertext = ctx.crypto.encrypt(value);
  await ctx.db.insert(secret).values({ id: ctx.ids.next("sec"), firmId: ctx.firmId, name, ciphertext, updatedAt: ctx.clock.now() })
    .onConflictDoUpdate({ target: [secret.firmId, secret.name], set: { ciphertext, updatedAt: ctx.clock.now() } });
  await audit(ctx, "secret.write", "secret", name);
}

export async function getSecret(ctx: Ctx, name: string, purpose: string): Promise<string | null> {
  const row = await ctx.db.query.secret.findFirst({ where: and(eq(secret.firmId, ctx.firmId), eq(secret.name, name)) });
  if (!row) return null;
  await audit(ctx, "secret.read", "secret", name, { purpose });
  return ctx.crypto.decrypt(row.ciphertext);
}

export async function listSecretNames(ctx: Ctx) {
  const rows = await ctx.db.select({ name: secret.name, updatedAt: secret.updatedAt }).from(secret).where(eq(secret.firmId, ctx.firmId));
  return rows;
}
