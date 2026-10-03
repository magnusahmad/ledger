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

/** A session lock spans committed preparation and external I/O. Use one checked
 * out connection for every operation so queued lock holders cannot exhaust the
 * pool while the owner waits for a second connection. */
export async function withDbSessionLock<T>(db: Db, key: string, fn: (session: Db) => Promise<T>): Promise<T> {
  const pool = (db as Db & { $client?: Pool }).$client;
  if (!pool || !(pool instanceof Pool)) throw new Error("A session operation requires a database pool");
  const client = await pool.connect();
  let acquired = false;
  let discard = false;
  try {
    await client.query("select pg_advisory_lock(hashtextextended($1, 0))", [key]);
    acquired = true;
    // Domain readers can use Promise.all. A checked-out pg client supports one
    // active query, so serialize that work explicitly rather than using its
    // deprecated implicit query queue.
    let tail: Promise<unknown> = Promise.resolve();
    const session = new Proxy(client, { get(target, property) {
      if (property === "query") return (...args: Parameters<typeof client.query>) => {
        const result = tail.then(() => client.query(...args));
        tail = result.catch(() => undefined);
        return result;
      };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    } });
    return await fn(drizzle(session, { schema }));
  } finally {
    if (acquired) {
      try {
        const result = await client.query<{ unlocked: boolean }>("select pg_advisory_unlock(hashtextextended($1, 0)) as unlocked", [key]);
        discard = result.rows[0]?.unlocked !== true;
      } catch { discard = true; }
    } else discard = true;
    // Never return a connection with an unconfirmed session lock to the pool.
    client.release(discard);
  }
}

export async function closePools() {
  for (const p of g.__hlPools!.values()) await p.end();
  g.__hlPools!.clear();
}
