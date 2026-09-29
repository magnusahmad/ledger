import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { getDb } from "./client";

export async function runMigrations(url: string) {
  await migrate(getDb(url), { migrationsFolder: path.join(process.cwd(), "src/db/migrations") });
}
