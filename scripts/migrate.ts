import { runMigrations } from "@/db/migrate";
import { closePools } from "@/db/client";
import { loadConfig } from "@/lib/config";
await runMigrations(loadConfig().DATABASE_URL);
console.log("Migrated");
await closePools();
