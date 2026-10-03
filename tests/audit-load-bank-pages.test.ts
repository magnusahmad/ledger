// Area10 LOAD05–07: bounded no-progress feed handling. All transport is recorded,
// fictional and local; the fixture budget prevents the broken adapter making 10k calls.
import { beforeEach, expect, it } from "vitest";
import { makeCtx, resetDb } from "./helpers";
import type { Ctx } from "@/lib/ctx";
import { bankTransaction, firm, payment, proposal } from "@/db/schema";
import { pollBank } from "@/domain/payments";
import { kvGet, kvSet } from "@/domain/kv";
import { officialDeposit, recordedBank } from "./airwallex-recorded-fixtures";

let ctx: Ctx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx({ now: "2026-10-03T02:00:00Z" });
  await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Fictional load audit", invoicePrefix: "LOAD" });
});
const saved = "2026-10-02T00:00:00.000Z";
async function unchanged() {
  expect(await kvGet(ctx, "bank.cursor.airwallex")).toBe(saved);
  expect(await ctx.db.select().from(bankTransaction)).toEqual([]);
  expect(await ctx.db.select().from(payment)).toEqual([]);
  expect(await ctx.db.select().from(proposal)).toEqual([]);
}
for (const mode of ["repeated", "empty"] as const) it(`LOAD${mode === "repeated" ? "05" : "06"} ${mode} has-more pages stop with an actionable no-progress error before exhausting feed resources and retry preserves exactly-once ingestion`, async () => {
  let repaired = false;
  const feed = recordedBank(q => {
    const page = Number(q.get("page_num"));
    if (repaired) return { body: { items: [officialDeposit({ id: "LOAD-recovered" })], has_more: false } };
    if (page >= 6) throw new Error("Fixture hard request budget exhausted; adapter did not detect no progress");
    return { body: { items: mode === "empty" ? [] : [officialDeposit({ id: "LOAD-repeated-page" })], has_more: true } };
  });
  ctx.bank = feed.bank;
  await kvSet(ctx, "bank.cursor.airwallex", saved);
  let error: unknown;
  try { await pollBank(ctx); } catch (e) { error = e; }
  await unchanged();
  expect(feed.requests.length, "two unchanged pages must not keep requesting thousands of pages").toBeLessThanOrEqual(4);
  expect(String(error)).toMatch(/pagination|repeated page|empty page|no.progress/i);
  expect(String(error)).not.toMatch(/Fixture hard request budget/);
  repaired = true; await pollBank(ctx); await pollBank(ctx);
  expect((await ctx.db.select().from(bankTransaction)).map(r => r.providerTxId)).toEqual(["LOAD-recovered"]);
  expect(await ctx.db.select().from(payment)).toEqual([]);
  expect(await ctx.db.select().from(proposal)).toEqual([]);
});
it("LOAD07 three distinct settled provider pages drain fully and repeated polls retain one canonical deposit per identity", async () => {
  const feed = recordedBank(q => {
    const page = Number(q.get("page_num"));
    if (page > 2) throw new Error("Unexpected fourth distinct fixture page");
    return { body: { items: [officialDeposit({ id: `LOAD-page-${page}`, created_at: `2026-10-02T0${page}:00:00Z` })], has_more: page < 2 } };
  });
  ctx.bank = feed.bank;
  await pollBank(ctx); await pollBank(ctx);
  expect(feed.requests).toHaveLength(6);
  expect((await ctx.db.select().from(bankTransaction)).map(r => r.providerTxId).sort()).toEqual(["LOAD-page-0", "LOAD-page-1", "LOAD-page-2"]);
  expect(await kvGet(ctx, "bank.cursor.airwallex")).toBe("2026-10-02T02:00:00.000Z");
  expect(await ctx.db.select().from(payment)).toEqual([]); expect(await ctx.db.select().from(proposal)).toEqual([]);
});
