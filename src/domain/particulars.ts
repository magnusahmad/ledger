import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Ctx } from "@/lib/ctx";
import { task } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import { structureParticulars } from "@/agent/structure";
import { callAgent } from "@/agent/call";
import type { Task } from "./engine";

export async function particularsFor(ctx: Ctx, t: Task, instruction: string) {
  if (!instruction.trim()) throw new Error("The proposed particulars are missing");
  const hash = Crypto.sha256(instruction);
  const saved = t.params.particulars as { hash: string; encrypted: string } | undefined;
  if (saved?.hash === hash) return JSON.parse(ctx.crypto.decrypt(saved.encrypted)) as Awaited<ReturnType<typeof structureParticulars>>;
  const changes = await structureParticulars(ctx, t.id, instruction);
  if (!changes.changes.length) throw new Error("No proposed particulars were identified; clarify the change");
  t.params = { ...t.params, particulars: { hash, encrypted: ctx.crypto.encrypt(JSON.stringify(changes)) } };
  await ctx.db.update(task).set({ params: t.params }).where(and(eq(task.id, t.id), eq(task.firmId, ctx.firmId)));
  return changes;
}

const FyeZ = z.object({ month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31), firstPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
export async function fyeFor(ctx: Ctx, t: Task, instruction: string) {
  if (!instruction.trim()) throw new Error("The new financial year end and first period are missing");
  const hash = Crypto.sha256(instruction);
  const saved = t.params.fyeChange as { hash: string; value: z.infer<typeof FyeZ> } | undefined;
  if (saved?.hash === hash) return FyeZ.parse(saved.value);
  const value = await callAgent(ctx, { agent: "structure_fye", taskId: t.id, schema: FyeZ, system: "Extract the explicitly requested new financial year end day/month and first period end (YYYY-MM-DD). Do not infer an omitted year or period. Return only the stated values; missing facts must fail validation for staff clarification.", user: instruction });
  const date = new Date(`${value.firstPeriodEnd}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value.firstPeriodEnd || date.getUTCDate() !== value.day || date.getUTCMonth() + 1 !== value.month) throw new Error("The first period end must be a valid date matching the new year end");
  t.params = { ...t.params, fyeChange: { hash, value } };
  await ctx.db.update(task).set({ params: t.params }).where(and(eq(task.id, t.id), eq(task.firmId, ctx.firmId)));
  return value;
}
