// Resets the demo database to the seed state (single-user demo build only).
import { sql } from "drizzle-orm";
import { rmSync } from "node:fs";
import path from "node:path";
import type { Ctx } from "@/lib/ctx";
import * as schema from "@/db/schema";
import { seedDemo } from "@/db/seed-demo";

export async function resetDemoData(ctx: Ctx) {
  ctx.clock.setOffsetDays?.(0); // a jumped demo clock goes back to today with the data
  const tables = Object.values(schema)
    .filter((t) => typeof t === "object" && t !== null && Symbol.for("drizzle:Name") in (t as object))
    .map((t) => `"${(t as unknown as Record<symbol, string>)[Symbol.for("drizzle:Name")]}"`);
  // A sandbox bank account keeps its deposits across resets, and invoice numbers start again:
  // an old deposit must not pay (or clutter) new demo data. The marker is written in the same
  // transaction as the wipe, so a worker poll during the re-seed already sees it.
  await ctx.db.transaction(async (tx) => {
    await tx.execute(sql.raw(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
    await tx.insert(schema.kv).values({ firmId: ctx.firmId, key: "bank.ignoreBefore", value: ctx.clock.now().toISOString() });
  });
  const { STORAGE_ROOT } = await import("@/lib/runtime");
  for (const f of ["inbox.json", "outbox.json", "deposits.json"]) rmSync(path.join(STORAGE_ROOT, "fake", f), { force: true });
  await seedDemo(ctx, { demoEmail: ctx.config.DEMO_EXISTING_CLIENT_EMAIL ?? null });
}
