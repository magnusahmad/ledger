import { beforeEach, expect, it, vi } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { bankTransaction } from "@/db/schema";

// A bank poll by the worker can land while the demo data is being re-seeded.
const during = vi.hoisted(() => ({ poll: null as null | (() => Promise<unknown>) }));
vi.mock("@/db/seed-demo", async (orig) => {
  const real = await orig<typeof import("@/db/seed-demo")>();
  return { ...real, seedDemo: async (...a: Parameters<typeof real.seedDemo>) => { await during.poll?.(); return real.seedDemo(...a); } };
});
const { resetDemoData } = await import("@/domain/demo");
const { pollBank } = await import("@/domain/payments");

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); });

it("a bank poll that runs while the demo data is being reset still ignores deposits made before the reset", async () => {
  const old = { providerTxId: "earlier-take", amountCents: 80000, currency: "HKD", reference: "CRCS-2026-0001", payerName: "Earlier rehearsal", receivedAt: new Date(ctx.clock.now().getTime() - 3_600_000) };
  ctx.bank.listDeposits = async () => [old];
  during.poll = () => pollBank(ctx);
  await resetDemoData(ctx);
  expect(await ctx.db.select().from(bankTransaction)).toHaveLength(0);
});
