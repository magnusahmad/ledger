// Work that happens outside Harbourline (Stamp Office visits, notaries, waiting on a bank or
// the outgoing secretary) is tracked as off-platform steps and holds, so tasks don't stall silently.
import { describe, it, expect, beforeEach } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { advance, cancelTask, createRequest, currentStep, getTask, markStepState, startTask, waitingOnFor } from "@/domain/engine";
import { addOffPlatformStep, completeOffPlatformStep, putOnHold, releaseHold, followedUp, outsideWork } from "@/domain/off-platform";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
});

/** Kowloon Bay Trading is on credit terms, so after "send" the task goes straight to "collect". */
async function officeMove() {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  return startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.changeOffice" });
}

describe("Off-platform steps", () => {
  it("an off-platform step ordered before a later step stops the task moving on until it's done", async () => {
    const t = await officeMove();
    const a = await addOffPlatformStep(ctx, t.id, { title: "Collect signed tenancy agreement from the landlord", waitingOn: "third_party", beforeStep: 1 });
    await markStepState(ctx, t.id, "send", { sent: true });
    await advance(ctx, t.id);
    expect((await getTask(ctx, t.id)).stepIndex).toBe(0);
    await completeOffPlatformStep(ctx, a.id, { note: "Original received at the office" });
    expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("collect");
  });

  it("completing an off-platform step needs proof: a note, a reference or a document", async () => {
    const t = await officeMove();
    const a = await addOffPlatformStep(ctx, t.id, { title: "Stamp the instrument at the IRD Stamp Office", waitingOn: "us", dueDate: "2026-10-05" });
    await expect(completeOffPlatformStep(ctx, a.id, {})).rejects.toThrow(/proof/i);
    await expect(completeOffPlatformStep(ctx, a.id, { note: "  " })).rejects.toThrow(/proof/i);
    const done = await completeOffPlatformStep(ctx, a.id, { reference: "SO-2026-11873" });
    expect(done).toMatchObject({ status: "done", proofReference: "SO-2026-11873", completedBy: ctx.userId });
  });

  it("an off-platform step can't be added to a closed task", async () => {
    const t = await officeMove();
    await cancelTask(ctx, t.id, "Client changed plans");
    await expect(addOffPlatformStep(ctx, t.id, { title: "Anything", waitingOn: "us" })).rejects.toThrow(/closed|open/i);
  });
});

describe("On hold", () => {
  it("a task on hold doesn't move on by itself, and moves on when released", async () => {
    const t = await officeMove();
    await putOnHold(ctx, t.id, { reason: "Directors disagree on the new address; waiting for a board resolution", waitingOn: "client", followUpOn: "2026-10-06" });
    await markStepState(ctx, t.id, "send", { sent: true });
    await advance(ctx, t.id);
    expect((await getTask(ctx, t.id)).stepIndex).toBe(0);
    const held = await getTask(ctx, t.id);
    expect(waitingOnFor(held, currentStep(held))).toBe("hold");
    await releaseHold(ctx, t.id, "Resolution signed");
    expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("collect");
    expect((await getTask(ctx, t.id)).holdReason).toBeNull();
  });

  it("putting a task on hold needs a reason and a follow-up date", async () => {
    const t = await officeMove();
    await expect(putOnHold(ctx, t.id, { reason: "", waitingOn: "client", followUpOn: "2026-10-06" })).rejects.toThrow(/reason/i);
    await expect(putOnHold(ctx, t.id, { reason: "Waiting for the bank", waitingOn: "third_party", followUpOn: "" })).rejects.toThrow(/follow/i);
  });
});

describe("Today: outside the platform", () => {
  it("Today lists held tasks and open off-platform steps, with due follow-ups first", async () => {
    // Clock: 29 Sept 2026.
    const a = await officeMove();
    const b = await officeMove();
    await putOnHold(ctx, a.id, { reason: "Waiting on the outgoing secretary for the minute book", waitingOn: "third_party", followUpOn: "2026-10-10" });
    const step = await addOffPlatformStep(ctx, b.id, { title: "Chase the bank for the mandate form", waitingOn: "third_party", followUpOn: "2026-09-28" });
    const rows = await outsideWork(ctx);
    expect(rows.map((r) => r.kind)).toEqual(["step", "hold"]);
    expect(rows[0]).toMatchObject({ id: step.id, followUpDue: true });
    expect(rows[1]).toMatchObject({ taskId: a.id, followUpDue: false });
    await followedUp(ctx, { kind: "step", id: step.id, nextFollowUpOn: "2026-10-05", note: "Bank says next week" });
    expect((await outsideWork(ctx)).find((r) => r.id === step.id)?.followUpDue).toBe(false);
  });
});
