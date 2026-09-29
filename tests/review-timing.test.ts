import { beforeEach, expect, it } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { createRequest, startTask, logEvent } from "@/domain/engine";
import { createProposal, approveProposal, onApprove } from "@/domain/proposals";
import { stepTiming } from "@/db/schema";
import { timeSavedForTask, firmTimeSaved } from "@/domain/time-saved";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });

it("a twenty-minute review remains twenty minutes in task and firm reports", async () => {
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.changeOffice" });
  await ctx.db.insert(stepTiming).values({ id: "tim_long", firmId: ctx.firmId, taskId: t.id, activity: "approve", shownAt: ctx.clock.now(), actedAt: ctx.clock.now(), seconds: 1200 });
  expect((await timeSavedForTask(ctx, t.id)).staffMinutes).toBe(20);
  expect((await firmTimeSaved(ctx)).staffMinutes).toBe(20);
});

it("a request review is allocated across its tasks and counted only once at firm level", async () => {
  const r = await createRequest(ctx, { clientId: "cli_c1" });
  const a = await startTask(ctx, { clientId: "cli_c1", requestId: r.id, playbookId: "hk.changeOffice" });
  const b = await startTask(ctx, { clientId: "cli_c1", requestId: r.id, playbookId: "hk.changeName" });
  const p = await createProposal(ctx, { kind: "triage", title: "Shared request review", requestId: r.id });
  await ctx.db.insert(stepTiming).values({ id: "tim_shared", firmId: ctx.firmId, proposalId: p.id, activity: "approve", shownAt: ctx.clock.now(), actedAt: ctx.clock.now(), seconds: 120 });
  expect((await timeSavedForTask(ctx, a.id)).staffMinutes).toBe(1);
  expect((await timeSavedForTask(ctx, b.id)).staffMinutes).toBe(1);
  expect((await firmTimeSaved(ctx)).staffMinutes).toBe(2);
});

it("unmeasured work is marked unmeasured and CSA parity events create no estimated saving", async () => {
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.changeOffice" });
  for (const kind of ["documents.generated", "register.updated", "task.done"]) await logEvent(ctx, t.id, kind, "Imported history");
  const report = await timeSavedForTask(ctx, t.id);
  expect(report.hasMeasurements).toBe(false);
  expect(report.baselineMinutes).toBe(0);
});

it("approval time stops at the staff click rather than including adapter processing time", async () => {
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.changeOffice" });
  const p = await createProposal(ctx, { kind: "triage", title: "Review", taskId: t.id });
  const shownAt = ctx.clock.now();
  ctx.clock.advanceSeconds(60);
  onApprove("triage", async () => { ctx.clock.advanceSeconds(30); });
  await approveProposal(ctx, p.id, { shownAt });
  expect((await timeSavedForTask(ctx, t.id)).staffMinutes).toBe(1);
});
