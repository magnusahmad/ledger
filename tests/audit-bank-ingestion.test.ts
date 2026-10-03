// Area 6: bank ingestion/cursors/identity. Allocation is the separate billing audit.
import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb } from "./helpers";
import type { Ctx } from "@/lib/ctx";
import type { BankDeposit } from "@/integrations/types";
import { bankTransaction, firm, payment, proposal } from "@/db/schema";
import { pollBank } from "@/domain/payments";
import { kvGet, kvSet } from "@/domain/kv";
import { officialDeposit, recordedBank } from "./airwallex-recorded-fixtures";

let ctx: Ctx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx({ now: "2026-10-02T12:00:00Z" });
  await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Fictional audit firm", invoicePrefix: "AUDIT" });
});
const deposit = (patch: Partial<BankDeposit> = {}): BankDeposit => ({ providerTxId: "fictional-bank-1", amountCents: 1025, currency: "HKD", reference: "Unallocated fictional deposit", payerName: "Fictional payer", receivedAt: new Date("2026-10-02T02:00:00Z"), ...patch });
function feed(rows: BankDeposit[]) { ctx.bank.listDeposits = async () => rows; }
const cursor = () => kvGet<string>(ctx, `bank.cursor.${ctx.bank.name}`);

it("BING01 the same provider identity ingests independently in two firms and each firm replay remains exactly once", async () => {
  await ctx.db.insert(firm).values({ id: "firm_bank_other", legalName: "Other fictional firm", invoicePrefix: "OTHER" });
  feed([deposit()]); await pollBank(ctx);
  const other = { ...ctx, firmId: "firm_bank_other" }; await pollBank(other); await pollBank(ctx); await pollBank(other);
  const rows = await ctx.db.select().from(bankTransaction);
  expect(rows).toHaveLength(2);
  expect(rows.map(row => row.firmId).sort()).toEqual(["firm_bank_other", ctx.firmId].sort());
  expect(rows.every(row => row.providerTxId === deposit().providerTxId)).toBe(true);
});
it("BING02 a pending deposit settling after a newer deposit moved the creation cursor remains discoverable", async () => {
  let settled = false;
  const pending = officialDeposit({ id: "late-settlement", created_at: "2026-10-01T00:00:00Z", settled_at: "2026-10-02T11:00:00Z" });
  const newer = officialDeposit({ id: "newer-first", created_at: "2026-10-01T12:00:00Z", settled_at: "2026-10-01T12:01:00Z" });
  const reply = (q: URLSearchParams) => {
    const lower = q.get("from_created_at");
    const rows = [{ ...pending, status: settled ? "SETTLED" : "PENDING" }, newer].filter(row => !lower || new Date(row.created_at as string) >= new Date(lower));
    return { body: { has_more: false, items: rows } };
  };
  ctx.bank = recordedBank(reply).bank; await pollBank(ctx); settled = true;
  // Cold provider/context replacement: only PostgreSQL retains cursor/history.
  // Share the deterministic ID sequence so fixture IDs cannot collide on restart.
  ctx = { ...makeCtx({ now: "2026-10-02T12:00:00Z" }), ids: ctx.ids, bank: recordedBank(reply).bank };
  await pollBank(ctx); await pollBank(ctx);
  const rows = await ctx.db.select().from(bankTransaction);
  expect(rows.map(row => row.providerTxId).sort()).toEqual(["late-settlement", "newer-first"]);
  expect(rows.find(row => row.providerTxId === "late-settlement")?.receivedAt.toISOString()).toBe("2026-10-02T11:00:00.000Z");
});
it("BING03 malformed bank items leave the cursor unchanged and never persist invalid transaction metadata", async () => {
  const initial = "2026-10-01T00:00:00.000Z"; await kvSet(ctx, `bank.cursor.${ctx.bank.name}`, initial);
  const patches: Partial<BankDeposit>[] = [{ amountCents: -1 }, { amountCents: 0 }, { amountCents: 1.5 }, { amountCents: Number.MAX_SAFE_INTEGER + 1 }, { providerTxId: "" }, { currency: "" }, { receivedAt: new Date("invalid") }];
  for (const patch of patches) {
    // Each deterministic sample starts from the same known state, so an earlier
    // failure cannot masquerade as acceptance of a later malformed sample.
    await ctx.db.delete(bankTransaction); await kvSet(ctx, `bank.cursor.${ctx.bank.name}`, initial);
    feed([deposit(patch)]); await pollBank(ctx).catch(() => undefined);
    expect.soft(await ctx.db.select().from(bankTransaction), `invalid ${Object.keys(patch)[0]} must not persist`).toHaveLength(0);
    expect.soft(await cursor()).toBe(initial);
    expect.soft(await ctx.db.select().from(payment)).toHaveLength(0);
    expect.soft(await ctx.db.select().from(proposal)).toHaveLength(0);
  }
});
it("BING04 a later provider page failure cannot commit a partial ingestion cursor or lose the retry", async () => {
  let failed = true;
  const { bank } = recordedBank(q => Number(q.get("page_num")) === 0
    ? { body: { has_more: true, items: [officialDeposit({ id: "first-page" })] } }
    : failed ? { status: 500, body: { code: "service_unavailable" } } : { body: { has_more: false, items: [officialDeposit({ id: "second-page" })] } });
  ctx.bank = bank; await pollBank(ctx).catch(() => undefined);
  expect.soft(await cursor()).toBeNull(); expect.soft(await ctx.db.select().from(bankTransaction)).toHaveLength(0);
  failed = false; await pollBank(ctx);
  expect((await ctx.db.select().from(bankTransaction)).map(row => row.providerTxId).sort()).toEqual(["first-page", "second-page"]);
});
it("BING05 out-of-order deposits and an older later replay never move the cursor backwards", async () => {
  const newer = deposit({ providerTxId: "newer", receivedAt: new Date("2026-10-02T04:00:00Z") }); const older = deposit({ providerTxId: "older", receivedAt: new Date("2026-10-02T01:00:00Z") });
  feed([newer, older]); await pollBank(ctx); expect(await cursor()).toBe(newer.receivedAt.toISOString());
  feed([older]); await pollBank(ctx); expect(await cursor()).toBe(newer.receivedAt.toISOString());
  expect(await ctx.db.select().from(bankTransaction)).toHaveLength(2);
});
it("BING06 duplicate poll entries retain the first stored canonical facts without extra proposals or payments", async () => {
  const canonical = deposit(); feed([canonical]); await pollBank(ctx);
  feed([deposit({ amountCents: 5000, reference: "Different replay reference" }), canonical]); await pollBank(ctx);
  const rows = await ctx.db.select().from(bankTransaction); expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ amountCents: 1025, reference: canonical.reference, currency: "HKD" });
  expect(await ctx.db.select().from(payment)).toHaveLength(0); expect(await ctx.db.select().from(proposal)).toHaveLength(0);
});
it("BING07 a provider transport failure preserves the prior cursor and permits the following poll", async () => {
  const initial = "2026-10-01T00:00:00.000Z"; await kvSet(ctx, `bank.cursor.${ctx.bank.name}`, initial);
  ctx.bank.listDeposits = async () => { throw new Error("Fictional provider unavailable"); };
  await expect(pollBank(ctx)).rejects.toThrow(/unavailable/); expect(await cursor()).toBe(initial);
  expect(await ctx.db.select().from(bankTransaction)).toHaveLength(0);
  feed([deposit()]); await pollBank(ctx); expect((await ctx.db.select().from(bankTransaction).where(eq(bankTransaction.providerTxId, deposit().providerTxId)))).toHaveLength(1);
});

it("a deposit created before the demo reset cannot become new trial money merely because it settles after the reset", async () => {
  await kvSet(ctx, "bank.ignoreBefore", "2026-10-02T00:00:00.000Z");
  const old: BankDeposit & { createdAt: Date } = { ...deposit(), createdAt: new Date("2026-10-01T23:00:00Z"), receivedAt: new Date("2026-10-02T02:00:00Z") };
  feed([old]); await pollBank(ctx);
  expect(await ctx.db.select().from(bankTransaction)).toHaveLength(0);
  expect(await ctx.db.select().from(payment)).toHaveLength(0);
  expect(await ctx.db.select().from(proposal)).toHaveLength(0);
});

it("only freshly fetched creation dates advance the provider cursor; stored settlement retries cannot move it", async () => {
  await kvSet(ctx, `bank.cursor.${ctx.bank.name}`, "2026-10-02T01:00:00.000Z");
  await ctx.db.insert(bankTransaction).values({ id: "btx_stored_retry", firmId: ctx.firmId, provider: ctx.bank.name, providerTxId: "stored-retry", amountCents: 1025, currency: "HKD", reference: "Unallocated retry", receivedAt: new Date("2026-10-03T01:00:00Z"), status: "unmatched" });
  const fresh: BankDeposit & { createdAt: Date } = { ...deposit(), createdAt: new Date("2026-10-02T02:00:00Z"), receivedAt: new Date("2026-10-02T03:00:00Z") };
  feed([fresh]); await pollBank(ctx);
  expect(await cursor()).toBe(fresh.createdAt.toISOString());
  feed([]); await pollBank(ctx);
  expect(await cursor()).toBe(fresh.createdAt.toISOString());
  expect(await ctx.db.select().from(bankTransaction)).toHaveLength(2);
  expect(await ctx.db.select().from(payment)).toHaveLength(0);
  expect(await ctx.db.select().from(proposal)).toHaveLength(0);
});
