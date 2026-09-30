import { runMigrations } from "@/db/migrate";
import { closePools } from "@/db/client";
import { loadConfig } from "@/lib/config";
import { makeRuntimeCtx } from "@/lib/runtime";
import { loadPlaybookLibrary } from "@/domain/playbooks";
import { firm } from "@/db/schema";
import { eq } from "drizzle-orm";
await runMigrations(loadConfig().DATABASE_URL);
// New playbook versions from seed/playbooks reach an existing firm without a reseed (idempotent).
const ctx = makeRuntimeCtx();
if (await ctx.db.query.firm.findFirst({ where: eq(firm.id, ctx.firmId) })) await loadPlaybookLibrary(ctx);
console.log("Migrated");
await closePools();
