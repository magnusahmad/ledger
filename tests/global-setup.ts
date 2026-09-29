import { Client } from "pg";
import { runMigrations } from "../src/db/migrate";
import { closePools } from "../src/db/client";

const URL = "postgres://localhost/harbourline_test";

export default async function setup() {
  const c = new Client({ connectionString: URL });
  await c.connect();
  await c.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await c.end();
  await runMigrations(URL);
  await closePools();
}
