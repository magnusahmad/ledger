// Clients go quiet. Outstanding information and signatures are chased on a set rhythm and
// escalated as the statutory deadline gets close. Every chase is a draft for approval.
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { advance, createRequest, logEvent, markStepState, startTask, taskEvents, getTask, currentStep } from "@/domain/engine";
import { runChasers, chaseRules, setChaseRules } from "@/domain/chasing";
import { putOnHold } from "@/domain/off-platform";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { taskAction, task as taskT } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx(); // 29 Sept 2026, 10:00 HKT
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
});

/** A change of office for Kowloon Bay Trading (credit terms), sent and now waiting on the client. */
async function waitingOnClient() {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.changeOffice" });
  await markStepState(ctx, t.id, "send", { sent: true });
  await advance(ctx, t.id);
  expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("collect");
  return t;
}
const chases = async () => pendingProposals(ctx, { kind: "send_message" }).then((ps) => ps.filter((p) => p.payload.purpose === "chase"));

describe("Chasing", () => {
  it("a client who owes items gets a chase drafted after the first-chase delay, and not before", async () => {
    await waitingOnClient();
    const { firstAfterDays } = await chaseRules(ctx);
    ctx.clock.advanceDays(firstAfterDays - 1);
    await runChasers(ctx);
    expect(await chases()).toHaveLength(0);
    ctx.clock.advanceDays(1);
    await runChasers(ctx);
    const [c] = await chases();
    expect(c.title).toMatch(/^Chase /);
    expect(c.payload.escalation).toBe(false);
  });

  it("a chase is only drafted: nothing is sent until approved, and approving logs it on the task", async () => {
    const t = await waitingOnClient();
    ctx.clock.advanceDays(5);
    await runChasers(ctx);
    expect(ctx.mail.sent()).toHaveLength(0);
    const [c] = await chases();
    await approveProposal(ctx, c.id);
    expect(ctx.mail.sent()).toHaveLength(1);
    expect((await taskEvents(ctx, t.id)).some((e) => e.kind === "chase.sent")).toBe(true);
  });

  it("the next chase waits the repeat interval after the last, and there's never more than one pending", async () => {
    await waitingOnClient();
    ctx.clock.advanceDays(5);
    await runChasers(ctx);
    await runChasers(ctx);
    expect(await chases()).toHaveLength(1);
    await approveProposal(ctx, (await chases())[0].id);
    ctx.clock.advanceDays(4);
    await runChasers(ctx);
    expect(await chases()).toHaveLength(0);
    ctx.clock.advanceDays(1);
    await runChasers(ctx);
    expect(await chases()).toHaveLength(1);
  });

  it("a chase escalates when the statutory deadline is close, and a call to the client is added as an off-platform step", async () => {
    const t = await waitingOnClient();
    await ctx.db.update(taskT).set({ dueDate: "2026-10-12" }).where(eq(taskT.id, t.id)); // 8 days after the first chase is due
    ctx.clock.advanceDays(5);
    await runChasers(ctx);
    const [c] = await chases();
    expect(c.title).toMatch(/^Escalate: /);
    expect(c.payload.escalation).toBe(true);
    const calls = await ctx.db.select().from(taskAction).where(eq(taskAction.taskId, t.id));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ waitingOn: "us", dueDate: ctx.clock.today() });
    expect(calls[0].title).toMatch(/^Call /);
  });

  it("a chase escalates after the set number of chases", async () => {
    await waitingOnClient();
    const { escalateAfterChases, repeatEveryDays } = await chaseRules(ctx);
    ctx.clock.advanceDays(5);
    for (let i = 0; i < escalateAfterChases; i++) {
      await runChasers(ctx);
      const [c] = await chases();
      expect(c.payload.escalation).toBe(false);
      await approveProposal(ctx, c.id);
      ctx.clock.advanceDays(repeatEveryDays);
    }
    await runChasers(ctx);
    expect((await chases())[0].payload.escalation).toBe(true);
  });

  it("tasks on hold, or with nothing outstanding, are never chased", async () => {
    const held = await waitingOnClient();
    await putOnHold(ctx, held.id, { reason: "Client travelling until mid-October", waitingOn: "client", followUpOn: "2026-10-15" });
    const req = await createRequest(ctx, { clientId: "cli_c1" });
    await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.changeOffice" }); // still at "send": nothing asked yet
    ctx.clock.advanceDays(10);
    await runChasers(ctx);
    expect(await chases()).toHaveLength(0);
  });

  it("the client doing something (an upload) restarts the clock", async () => {
    const t = await waitingOnClient();
    ctx.clock.advanceDays(4);
    await logEvent(ctx, t.id, "portal.upload", "Client uploaded hkid.jpg", {}, "client");
    ctx.clock.advanceDays(2);
    await runChasers(ctx);
    expect(await chases()).toHaveLength(0);
    ctx.clock.advanceDays(3);
    await runChasers(ctx);
    expect(await chases()).toHaveLength(1);
  });

  it("chase rules are whole days from 1 to 365, and saved rules replace the defaults", async () => {
    await expect(setChaseRules(ctx, { firstAfterDays: 0, repeatEveryDays: 5, escalateWithinDays: 14, escalateAfterChases: 3 })).rejects.toThrow(/whole number/);
    await setChaseRules(ctx, { firstAfterDays: 3, repeatEveryDays: 7, escalateWithinDays: 21, escalateAfterChases: 2 });
    expect(await chaseRules(ctx)).toEqual({ firstAfterDays: 3, repeatEveryDays: 7, escalateWithinDays: 21, escalateAfterChases: 2 });
  });
});
