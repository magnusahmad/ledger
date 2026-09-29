import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

const g = globalThis as unknown as { __hlPools?: Map<string, Pool> };
g.__hlPools ??= new Map();

export function getPool(url: string): Pool {
  let pool = g.__hlPools!.get(url);
  if (!pool) {
    pool = new Pool({ connectionString: url, max: 10 });
    g.__hlPools!.set(url, pool);
  }
  return pool;
}

export function getDb(url: string): Db {
  return drizzle(getPool(url), { schema });
}

export async function closePools() {
  for (const p of g.__hlPools!.values()) await p.end();
  g.__hlPools!.clear();
}
