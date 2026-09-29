// Resets the demo database to the seed state (single-user demo build only).
import { sql } from "drizzle-orm";
import { rmSync } from "node:fs";
import path from "node:path";
import type { Ctx } from "@/lib/ctx";
import * as schema from "@/db/schema";
import { seedDemo } from "@/db/seed-demo";

export async function resetDemoData(ctx: Ctx) {
  const tables = Object.values(schema)
    .filter((t) => typeof t === "object" && t !== null && Symbol.for("drizzle:Name") in (t as object))
    .map((t) => `"${(t as unknown as Record<symbol, string>)[Symbol.for("drizzle:Name")]}"`);
  await ctx.db.execute(sql.raw(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
  for (const f of ["inbox.json", "outbox.json", "deposits.json"]) rmSync(path.join(process.cwd(), "storage/fake", f), { force: true });
  await seedDemo(ctx, { demoEmail: ctx.config.DEMO_EXISTING_CLIENT_EMAIL ?? null });
}
