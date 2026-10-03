import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { makeCtx } from "./helpers";

it("adding persisted share order preserves the prior dated order of existing rows and gives later writes a larger sequence", async () => {
  const ctx = makeCtx(), name = `audit_share_order_${Date.now()}`;
  const migration = await readFile("src/db/migrations/0007_dated_share_order.sql", "utf8");
  await ctx.db.transaction(async db => {
    await db.execute(sql.raw(`create schema "${name}"`));
    try {
      await db.execute(sql.raw(`set local search_path to "${name}", public`));
      await db.execute(sql.raw(`create table share_movement (id text primary key, date date not null, created_at timestamptz not null)`));
      // Existing snapshots used date, created_at, id, independent of heap order.
      await db.execute(sql.raw(`insert into share_movement values ('z_legacy', '2020-01-01', '2020-01-01'), ('a_legacy', '2020-01-01', '2020-01-01')`));
      await db.execute(sql.raw(migration));
      const before = await db.execute(sql.raw(`select id from share_movement order by date, sequence`));
      expect(before.rows.map(r => r.id)).toEqual(["a_legacy", "z_legacy"]);
      await db.execute(sql.raw(`insert into share_movement (id,date,created_at) values ('0_new_random_id', '2020-01-01', '2020-01-01')`));
      const after = await db.execute(sql.raw(`select id from share_movement order by date, sequence`));
      expect(after.rows.map(r => r.id)).toEqual(["a_legacy", "z_legacy", "0_new_random_id"]);
    } finally {
      await db.execute(sql.raw(`set local search_path to public`));
      await db.execute(sql.raw(`drop schema "${name}" cascade`));
    }
  });
});
