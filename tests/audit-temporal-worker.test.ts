// Actual worker/main loop. Every provider is fake; the CR network check is stubbed.
// Only its sleep and operational Date.now are controlled, leaving real PG timers intact.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { goodDraft } from "./agent-fixtures";
import { startManualRequest } from "@/domain/manual";
import { getPlaybook, savePlaybookVersion } from "@/domain/playbooks";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { kvGet, kvSet, withLease } from "@/domain/kv";

const state = vi.hoisted(() => ({ ctx: undefined as TestCtx | undefined, failChase: false, chaseCalls: 0, formsCalls: 0, failForms: "none" as "none" | "throw" | "reported", formsWait: null as Promise<void> | null }));
vi.mock("@/lib/runtime", () => ({ makeRuntimeCtx: () => state.ctx! }));
vi.mock("@/documents/forms-check", () => ({ checkForms: async () => {
  state.formsCalls++;
  if (state.formsWait) await state.formsWait;
  const failure = state.failForms; state.failForms = "none";
  if (failure === "throw") throw new Error("Injected transient form-check failure");
  return { checked: 1, changed: [], errors: failure === "reported" ? ["NR1: Injected transient fetch failure"] : [] };
} }));
vi.mock("@/domain/chasing", async importOriginal => {
  const actual = await importOriginal<typeof import("@/domain/chasing")>();
  return { ...actual, runChasers: async (ctx: TestCtx) => {
    state.chaseCalls++;
    if (state.failChase) { state.failChase = false; throw new Error("Injected transient chase-duty database failure"); }
    return actual.runChasers(ctx);
  } };
});

let ctx: TestCtx, operationalMs: number;
const sleeps: (() => void)[] = [];
const signals: (() => void)[] = [];
const realSleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
async function tickFinished() {
  for (let i = 0; i < 200; i++) { if (sleeps.length) return; await realSleep(10); }
  throw new Error("Bounded actual worker tick did not reach its controlled sleep");
}
async function nextTick() { sleeps.shift()!(); await tickFinished(); }
beforeEach(async () => {
  await resetDb(); vi.resetModules();
  ctx = makeCtx({ now: "2026-09-20T02:00:00Z" });
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); ctx.llm.on("draft", goodDraft);
  const pb = await getPlaybook(ctx, "hk.changeOffice");
  await savePlaybookVersion(ctx, pb.id, pb.version, JSON.stringify({ ...pb, feeCents: 0, statutoryFees: [] }));
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: pb.id }], confirm: true });
  await approveProposal(ctx, r.proposalId!);
  ctx.clock.advanceDays(10);
  ctx.config = { ...ctx.config, POLL_INTERVAL_MS: 100_000 };
  state.ctx = ctx; state.failChase = false; state.chaseCalls = 0; state.formsCalls = 0; state.failForms = "none"; state.formsWait = null;
  sleeps.length = 0; signals.length = 0;
  operationalMs = ctx.clock.operationalNow().getTime();
  vi.spyOn(Date, "now").mockImplementation(() => operationalMs);
  const timeout = globalThis.setTimeout;
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((fn: () => void, delay: number, ...args: unknown[]) => {
    if (delay === 100_000) { sleeps.push(fn); return { unref() {} } as ReturnType<typeof setTimeout>; }
    return timeout(fn, delay, ...args);
  }) as typeof setTimeout);
  const on = process.on.bind(process);
  vi.spyOn(process, "on").mockImplementation(((event: string, fn: () => void) => {
    if (event === "SIGINT" || event === "SIGTERM") { signals.push(fn); return process; }
    return on(event, fn);
  }) as typeof process.on);
  vi.spyOn(process, "exit").mockImplementation((() => undefined) as typeof process.exit);
});
afterEach(async () => {
  signals[0]?.(); // Actual worker stop handler, with process.exit safely stubbed.
  sleeps.shift()?.(); await realSleep(30);
  vi.restoreAllMocks();
});

it("A10-D07: a failed actual worker chase duty cannot be marked successful and suppressed for an hour", async () => {
  state.failChase = true;
  await import("@/worker/main"); await tickFinished();
  expect.soft(await kvGet(ctx, "worker.lastChasers"), "failed duty must not record a successful cadence checkpoint").toBeNull();
  operationalMs += 60_000;
  await nextTick();
  expect(state.chaseCalls, "next worker tick retries the transient duty rather than silently waiting an hour").toBe(2);
  expect((await pendingProposals(ctx)).filter(p => p.payload.purpose === "chase")).toHaveLength(1);
  expect(ctx.mail.sent()).toHaveLength(1);
});

it("control: actual worker repeated ticks after downtime preserve one human chase draft and operational lease timing", async () => {
  await import("@/worker/main"); await tickFinished();
  expect(state.chaseCalls).toBe(1); expect(state.formsCalls).toBe(1);
  expect((await pendingProposals(ctx)).filter(p => p.payload.purpose === "chase")).toHaveLength(1);
  operationalMs += 60_000; await nextTick();
  expect(state.chaseCalls).toBe(1);
  // Date offset must not expire an independently held operational lease.
  await withLease(ctx, "temporal-control", 300, async () => {
    ctx.clock.setOffsetDays(60);
    expect(await withLease(ctx, "temporal-control", 300, async () => "incorrectly reclaimed")).toBeNull();
    ctx.clock.setOffsetDays(0);
  });
  // Eight-day downtime should run due duties once, then pending approval dedupes.
  operationalMs += 8 * 86400_000; ctx.clock.advanceDays(8);
  await kvSet(ctx, "demo.clockOffsetDays", 0);
  await nextTick();
  expect(state.chaseCalls).toBe(2); expect(state.formsCalls).toBe(2);
  expect((await pendingProposals(ctx)).filter(p => p.payload.purpose === "chase")).toHaveLength(1);
  expect(ctx.mail.sent()).toHaveLength(1);
});

it.each(["throw", "reported"] as const)("A10-D07 consumer: a failed weekly forms check (%s) stays due for retry instead of being suppressed for seven days", async failure => {
  state.failForms = failure;
  await import("@/worker/main"); await tickFinished();
  expect.soft(await kvGet(ctx, "worker.lastFormsCheck"), "a rejected or incomplete check is not a successful weekly verification").toBeNull();
  expect(state.formsCalls).toBe(1);
  operationalMs += 60_000;
  await nextTick();
  expect.soft(state.formsCalls, "the next tick retries the failed Registry check").toBe(2);
  expect.soft(await kvGet(ctx, "worker.lastFormsCheck"), "only a complete successful retry records the cadence checkpoint").toBe(operationalMs);
  operationalMs += 60_000;
  await nextTick();
  expect.soft(state.formsCalls, "a successful check is not repeated every polling tick").toBe(2);
  expect((await pendingProposals(ctx)).filter(p => p.payload.purpose === "chase")).toHaveLength(1);
  expect(ctx.mail.sent()).toHaveLength(1);
});

it("control: a pending forms check keeps polling active without launching duplicate checks", async () => {
  let release!: () => void;
  state.formsWait = new Promise<void>(resolve => { release = resolve; });
  try {
    await import("@/worker/main"); await tickFinished();
    expect(state.formsCalls).toBe(1);
    operationalMs += 60_000;
    await nextTick();
    expect(state.formsCalls, "one unresolved external verification must not multiply on each poll").toBe(1);
    release(); state.formsWait = null;
    // Allow the real PostgreSQL acknowledgement to finish before another tick/reset.
    await realSleep(50);
    operationalMs += 60_000;
    await nextTick();
    expect(state.formsCalls).toBe(1);
    expect(ctx.mail.sent()).toHaveLength(1);
    expect((await pendingProposals(ctx)).filter(p => p.payload.purpose === "chase")).toHaveLength(1);
  } finally { release(); state.formsWait = null; await realSleep(50); }
});
