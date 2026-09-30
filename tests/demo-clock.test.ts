// Recording a demo of chasing or deadlines needs days to pass. The demo clock jumps the app's
// "today" forward (web and worker agree via the database) and runs the date-driven checks.
import { describe, it, expect, beforeEach } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { advance, createRequest, markStepState, startTask } from "@/domain/engine";
import { fastForward, backToToday, syncDemoClock, demoClockOffset } from "@/domain/demo-clock";
import { pendingProposals } from "@/domain/proposals";
import { resetDemoData } from "@/domain/demo";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx(); // 29 Sept 2026
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
});

async function waitingOnClient() {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.changeOffice" });
  await markStepState(ctx, t.id, "send", { sent: true });
  await advance(ctx, t.id);
  return t;
}

describe("Demo clock", () => {
  it("fast-forwarding moves the app's today, and the follow-up checks run as of the new date", async () => {
    await waitingOnClient();
    const r = await fastForward(ctx, 5);
    expect(ctx.clock.today()).toBe("2026-10-04");
    expect(r).toMatchObject({ today: "2026-10-04", offsetDays: 5, chases: 1 });
    expect((await pendingProposals(ctx, { kind: "send_message" })).some((p) => p.payload.purpose === "chase")).toBe(true);
  });

  it("a jump must be 1 to 60 days", async () => {
    await expect(fastForward(ctx, 0)).rejects.toThrow(/1 to 60/);
    await expect(fastForward(ctx, 61)).rejects.toThrow(/1 to 60/);
    await expect(fastForward(ctx, 2.5)).rejects.toThrow(/1 to 60/);
  });

  it("fast-forward is refused when demo tools are off", async () => {
    const prod = { ...ctx, config: { ...ctx.config, demoTools: false } } as TestCtx;
    await expect(fastForward(prod, 3)).rejects.toThrow(/demo tools/i);
  });

  it("the saved offset is picked up by a fresh process (the worker), and back to today clears it", async () => {
    await fastForward(ctx, 3);
    const worker = makeCtx();
    await syncDemoClock(worker);
    expect(worker.clock.today()).toBe("2026-10-02");
    expect(await demoClockOffset(worker)).toBe(3);
    await backToToday(ctx);
    expect(ctx.clock.today()).toBe("2026-09-29");
    await syncDemoClock(worker);
    expect(worker.clock.today()).toBe("2026-09-29");
  });

  it("resetting the demo data puts the clock back to today", async () => {
    await fastForward(ctx, 10);
    await resetDemoData(ctx);
    expect(ctx.clock.today()).toBe("2026-09-29");
    expect(await demoClockOffset(ctx)).toBe(0);
  });
});
