// Playbook library: JSON files under seed/playbooks are the source of truth,
// loaded into the versioned `playbook` table.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { playbook, requirementItem } from "@/db/schema";
import type { PlaybookDef, RequirementDef } from "./playbook-types";
import { validatePlaybook } from "./playbook-validation";
import { audit } from "./audit";

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
      .onConflictDoNothing({ target: [playbook.firmId, playbook.id, playbook.version] });
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

/** Staff changes publish a new version; existing tasks retain their pinned definition. */
export async function savePlaybookVersion(ctx: Ctx, id: string, expectedVersion: number, json: string): Promise<PlaybookDef> {
  if (json.length > 100_000) throw new Error("Playbook JSON must be under 100,000 characters.");
  const draft = validatePlaybook(json, await getRequirementDefs(ctx));
  if (draft.id !== id) throw new Error("id cannot change when editing a playbook.");
  if (draft.version !== expectedVersion) throw new Error("version cannot be edited; it increments automatically when you save.");
  return ctx.db.transaction(async tx => {
    // Serialize saves across processes, scoped to this firm's one playbook.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${ctx.firmId + ":" + id}))`);
    const txCtx = { ...ctx, db: tx };
    const current = await getPlaybook(txCtx, id);
    if (current.version !== expectedVersion) throw new Error("This playbook changed since you opened it. Reload to review the newer version before saving.");
    if (draft.jurisdiction !== current.jurisdiction) throw new Error("jurisdiction cannot change on an existing playbook.");
    const next = { ...draft, version: current.version + 1 };
    await tx.insert(playbook).values({ id, firmId: ctx.firmId, version: next.version, jurisdiction: next.jurisdiction, def: next, createdAt: ctx.clock.now() });
    await audit(txCtx, "playbook.version_created", "playbook", id, { previousVersion: current.version, version: next.version });
    return next;
  });
}
