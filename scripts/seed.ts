// npm run db:seed — loads the fictional demo firm, clients and history (idempotent via reset).
import { makeRuntimeCtx } from "@/lib/runtime";
import { resetDemoData } from "@/domain/demo";
import { closePools } from "@/db/client";
import { runMigrations } from "@/db/migrate";
const ctx = makeRuntimeCtx();
await runMigrations(ctx.config.DATABASE_URL);
await resetDemoData(ctx);
console.log(`Seeded demo data${ctx.config.DEMO_EXISTING_CLIENT_EMAIL ? `; ${ctx.config.DEMO_EXISTING_CLIENT_EMAIL} is CHAN Tai Man of Kowloon Bay Trading Limited` : ""}`);
await closePools();
