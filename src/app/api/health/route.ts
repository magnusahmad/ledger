// Health check for the installation (no sign-in, no client data): database reachable, records copy age,
// last mail sync and status-file write, any step errors from the last background cycle, and which
// build this is (src/lib/build.ts), so support can match a query to the right code and documents.
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { makeRuntimeCtx } from "@/lib/runtime";
import { readHealth } from "@/annual/cycle";
import { productionProblems } from "@/lib/modules";
import { buildReport, readBuildStamp } from "@/lib/build";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = makeRuntimeCtx();
  let db = true;
  try { await ctx.db.execute(sql`select 1`); } catch { db = false; }
  const h = db ? await readHealth(ctx).catch(() => null) : null;
  const problems = productionProblems(ctx.config);
  const recordsAgeHours = h?.recordsAsAt ? Math.round((Date.now() - new Date(h.recordsAsAt).getTime()) / 3600_000) : null;
  const ok = db && !problems.length && !!h && !Object.keys(h.errors).length;
  return NextResponse.json({ ok, db, build: buildReport(ctx.config, readBuildStamp()), configProblems: problems, recordsAgeHours, lastCycleAt: h?.lastCycleAt ?? null, clientListReadAt: h?.clientListReadAt ?? null, lastMailSyncAt: h?.lastMailSyncAt ?? null, lastStatusWriteAt: h?.lastStatusWriteAt ?? null, errors: h?.errors ?? {} }, { status: ok ? 200 : 503 });
}
