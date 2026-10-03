import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { makeCtx } from "./helpers";

it("firm-scoped bank identity migration preserves existing deposits and linked receipts while preventing duplicates only within each firm", async () => {
  const ctx = makeCtx(), name = `audit_bank_identity_${Date.now()}`;
  // Before the repair exists, apply no new migration: the old global identity
  // must fail the business assertion rather than failing on a missing fixture.
  const migration = await readFile("src/db/migrations/0009_firm_bank_identity.sql", "utf8").catch(error => { if (error.code === "ENOENT") return ""; throw error; });
  await ctx.db.transaction(async db => {
    await db.execute(sql.raw(`create schema "${name}"`));
    try {
      await db.execute(sql.raw(`set local search_path to "${name}", public`));
      await db.execute(sql.raw("create table bank_transaction (like public.bank_transaction including defaults)"));
      await db.execute(sql.raw("create table payment (like public.payment including defaults)"));
      await db.execute(sql.raw("create unique index bank_tx_uq on bank_transaction(provider,provider_tx_id)"));
      await db.execute(sql`insert into bank_transaction(id,firm_id,provider,provider_tx_id,amount_cents,currency,received_at) values ('legacy_bank','legacy_firm_a','fake','same_provider_id',1025,'HKD','2026-10-01')`);
      await db.execute(sql`insert into payment(id,firm_id,invoice_id,bank_transaction_id,amount_cents,received_on,method) values ('legacy_receipt','legacy_firm_a','legacy_invoice','legacy_bank',1025,'2026-10-01','bank_approved')`);
      const before = { bank: (await db.execute(sql`select * from bank_transaction`)).rows, payment: (await db.execute(sql`select * from payment`)).rows };
      for (const part of migration.split("--> statement-breakpoint")) if (part.trim()) await db.execute(sql.raw(part));
      expect({ bank: (await db.execute(sql`select * from bank_transaction`)).rows, payment: (await db.execute(sql`select * from payment`)).rows }).toEqual(before);
      const other = await db.execute(sql`insert into bank_transaction(id,firm_id,provider,provider_tx_id,amount_cents,currency,received_at) values ('other_bank','legacy_firm_b','fake','same_provider_id',1025,'HKD','2026-10-01') on conflict do nothing returning id`);
      expect(other.rows).toHaveLength(1);
      const duplicate = await db.execute(sql`insert into bank_transaction(id,firm_id,provider,provider_tx_id,amount_cents,currency,received_at) values ('duplicate_bank','legacy_firm_a','fake','same_provider_id',1025,'HKD','2026-10-01') on conflict do nothing returning id`);
      expect(duplicate.rows).toHaveLength(0);
    } finally {
      await db.execute(sql.raw("set local search_path to public"));
      await db.execute(sql.raw(`drop schema "${name}" cascade`));
    }
  });
});
