import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { bankTransaction, invoice, payment } from "@/db/schema";
import { matchDeposit } from "@/domain/payments";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });
async function fixture() {
  const [inv] = await ctx.db.insert(invoice).values({ id: "poll-invoice", firmId: ctx.firmId, clientId: "cli_c1", number: "POLL-1", status: "sent", totalCents: 10000 }).returning();
  const d = { providerTxId: "poll-deposit", amountCents: 10000, currency: "HKD", reference: inv.number, payerName: "Fixture", receivedAt: ctx.clock.now() };
  return { inv, d };
}
it("an explicitly ignored bank deposit stays ignored when the provider replays it", async () => {
  const { inv, d } = await fixture();
  await ctx.db.insert(bankTransaction).values({ id: "poll-bank", firmId: ctx.firmId, provider: ctx.bank.name, ...d, status: "ignored" });
  await matchDeposit(ctx, d);
  expect((await ctx.db.query.bankTransaction.findFirst({ where: eq(bankTransaction.id, "poll-bank") }))?.status).toBe("ignored");
  expect((await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))?.paidCents).toBe(0);
});
it("a replay cannot replace a persisted deposit's amount or reference", async () => {
  const { inv, d } = await fixture();
  await ctx.db.insert(bankTransaction).values({ id: "poll-bank", firmId: ctx.firmId, provider: ctx.bank.name, ...d, amountCents: 5000, reference: "Unknown reference" });
  await matchDeposit(ctx, d);
  expect((await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))?.paidCents).toBe(0);
  expect(await ctx.db.select().from(payment).where(eq(payment.invoiceId, inv.id))).toHaveLength(0);
});
