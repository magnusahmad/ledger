// Health check for the installation (no sign-in, no client data): database reachable, CSA copy age,
// last mail sync and status-file write, and any step errors from the last background cycle.
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { makeRuntimeCtx } from "@/lib/runtime";
import { readHealth } from "@/annual/cycle";
import { productionProblems } from "@/lib/modules";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = makeRuntimeCtx();
  let db = true;
  try { await ctx.db.execute(sql`select 1`); } catch { db = false; }
  const h = db ? await readHealth(ctx).catch(() => null) : null;
  const problems = productionProblems(ctx.config);
  const csaAgeHours = h?.csaBackupTakenAt ? Math.round((Date.now() - new Date(h.csaBackupTakenAt).getTime()) / 3600_000) : null;
  const ok = db && !problems.length && !!h && !Object.keys(h.errors).length;
  return NextResponse.json({ ok, db, configProblems: problems, csaAgeHours, lastCycleAt: h?.lastCycleAt ?? null, lastMailSyncAt: h?.lastMailSyncAt ?? null, lastStatusWriteAt: h?.lastStatusWriteAt ?? null, errors: h?.errors ?? {} }, { status: ok ? 200 : 503 });
}
