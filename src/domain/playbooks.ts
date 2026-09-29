// Playbook library: JSON files under seed/playbooks are the source of truth,
// loaded into the versioned `playbook` table.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { playbook, requirementItem } from "@/db/schema";
import type { PlaybookDef, RequirementDef } from "./playbook-types";

const SEED = path.join(process.cwd(), "seed");

export function allPlaybookFiles(): PlaybookDef[] {
  const dir = path.join(SEED, "playbooks");
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
    .flatMap((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as PlaybookDef[]);
}

export function requirementLibrary(): Record<string, RequirementDef> {
  return JSON.parse(readFileSync(path.join(SEED, "requirement-items.v2.json"), "utf8"));
}

/** Idempotent: inserts any playbook version not yet in the table. */
export async function loadPlaybookLibrary(ctx: Ctx) {
  for (const pb of allPlaybookFiles()) {
    await ctx.db.insert(playbook).values({ id: pb.id, firmId: ctx.firmId, version: pb.version, jurisdiction: pb.jurisdiction, def: pb })
      .onConflictDoUpdate({ target: [playbook.firmId, playbook.id, playbook.version], set: { def: pb, jurisdiction: pb.jurisdiction } });
  }
  for (const [key, def] of Object.entries(requirementLibrary())) {
    await ctx.db.insert(requirementItem).values({ key, firmId: ctx.firmId, def })
      .onConflictDoUpdate({ target: [requirementItem.firmId, requirementItem.key], set: { def } });
  }
}

export async function getPlaybook(ctx: Ctx, id: string, version?: number): Promise<PlaybookDef> {
  const rows = await ctx.db.select().from(playbook)
    .where(and(eq(playbook.firmId, ctx.firmId), eq(playbook.id, id), version ? eq(playbook.version, version) : eq(playbook.active, true)))
    .orderBy(desc(playbook.version)).limit(1);
  if (!rows[0]) throw new Error(`Playbook ${id} not found`);
  return rows[0].def;
}

export async function listPlaybooks(ctx: Ctx): Promise<PlaybookDef[]> {
  const rows = await ctx.db.select().from(playbook).where(and(eq(playbook.firmId, ctx.firmId), eq(playbook.active, true))).orderBy(playbook.id, desc(playbook.version));
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))).map((r) => r.def);
}

export async function getRequirementDefs(ctx: Ctx): Promise<Record<string, RequirementDef>> {
  const rows = await ctx.db.select().from(requirementItem).where(eq(requirementItem.firmId, ctx.firmId));
  return Object.fromEntries(rows.map((r) => [r.key, r.def]));
}
