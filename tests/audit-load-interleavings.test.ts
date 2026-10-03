import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { getPlaybook, savePlaybookVersion } from "@/domain/playbooks";
import { createRequest, startTask, getTask, currentStep, outstanding } from "@/domain/engine";
import { putOnHold, releaseHold } from "@/domain/off-platform";
import { portalSubmitField } from "@/domain/portal";
import { runChasers } from "@/domain/chasing";
import { pendingProposals, approveProposal } from "@/domain/proposals";
import { filing, appointment, message } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx({ now: "2026-10-03T02:00:00Z" }); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); ctx.llm.on("draft", goodDraft); });
async function collecting() {
  const original = await getPlaybook(ctx, "hk.changeOffice");
  const pb = await savePlaybookVersion(ctx, original.id, original.version, JSON.stringify({ ...original, deadline: { kind: "none" }, requirements: [{ key: "newAddr" }], documents: [], forms: "", registerEffects: [], steps: [{ kind: "collect", label: "Get client address" }, { kind: "task", label: "Staff checks original address", human: true }] }));
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const t = await startTask(ctx, { clientId: "cli_c1", requestId: req.id, playbookId: pb.id });
  ctx.clock.advanceDays(6); return { req, t };
}
function pauseDraft() {
  let entered!: () => void, release!: () => void;
  const reached = new Promise<void>(r => { entered = r; }); const resumed = new Promise<void>(r => { release = r; });
  const original = ctx.llm.complete.bind(ctx.llm);
  ctx.llm.complete = async request => { if (request.agent === "draft") { entered(); await resumed; } return original(request); };
  return { reached, release };
}
async function effects() { return { filings: await ctx.db.select().from(filing), appointments: await ctx.db.select().from(appointment), sent: ctx.mail.sent() }; }

it("LOAD08 a chase paused while drafting does not publish obsolete missing-address instructions after the client supplies that address", async () => {
  const { t, req } = await collecting(); const before = await effects(); const barrier = pauseDraft();
  const chasing = runChasers(ctx); await barrier.reached;
  await portalSubmitField(ctx, req.uploadToken!, { taskId: t.id, key: "newAddr", expectedPersonId: null, value: "Unit 8, Fictional Current Road, Hong Kong" });
  expect(outstanding(await getTask(ctx, t.id))).toEqual([]);
  barrier.release(); await chasing;
  expect(await effects()).toEqual(before);
  expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("task");
  expect((await pendingProposals(ctx, { taskId: t.id })).filter(p => p.payload.purpose === "chase"), "Decision40: tasks with nothing outstanding are never chased").toHaveLength(0);
  expect((await ctx.db.select().from(message).where(eq(message.status, "draft"))).filter(m => m.text?.includes("Current Road"))).toHaveLength(0);
});
it("LOAD09 a hold committed while a chase draft is in flight leaves no held-task reminder awaiting staff approval", async () => {
  const { t } = await collecting(); const before = await effects(); const barrier = pauseDraft();
  const chasing = runChasers(ctx); await barrier.reached;
  await putOnHold(ctx, t.id, { reason: "Fictional bank original outstanding", waitingOn: "third_party", followUpOn: "2026-10-12" });
  barrier.release(); await chasing;
  expect((await getTask(ctx, t.id)).holdReason).toBe("Fictional bank original outstanding");
  expect(await effects()).toEqual(before);
  expect.soft((await pendingProposals(ctx, { taskId: t.id })).filter(p => p.payload.purpose === "chase"), "Decision40: held tasks are never chased").toHaveLength(0);
  // Separate same-rule consumer: a legitimate already-published reminder is
  // later put on hold. A fresh click must still check the current hold.
  const fresh = await collecting(); await runChasers(ctx);
  const [published] = (await pendingProposals(ctx, { taskId: fresh.t.id })).filter(p => p.payload.purpose === "chase"); expect(published).toBeDefined();
  await putOnHold(ctx, fresh.t.id, { reason: "Pause original instruction before sending", waitingOn: "third_party", followUpOn: "2026-10-20" });
  const approval = await Promise.allSettled([approveProposal(ctx, published.id)]);
  expect.soft(approval[0].status, "a current held-task chase must not be approved for delivery").toBe("rejected");
  expect(await effects(), "post-publication hold must prevent the actual Fake transport send").toEqual(before);
});
it("LOAD10 simultaneous release and legitimate client field submission preserve the new fact and stop at the human manual gate", async () => {
  const { t, req } = await collecting(); await putOnHold(ctx, t.id, { reason: "Await bank", waitingOn: "third_party", followUpOn: "2026-10-12" });
  const before = await effects();
  const results = await Promise.allSettled([releaseHold(ctx, t.id, "Original received"), portalSubmitField(ctx, req.uploadToken!, { taskId: t.id, key: "newAddr", expectedPersonId: null, value: "Unit 10, Fictional Safe Road" })]);
  expect(results.map(r => r.status)).toEqual(["fulfilled", "fulfilled"]);
  const latest = await getTask(ctx, t.id);
  expect(latest.holdReason).toBeNull(); expect(latest.checklist.find(e => e.key === "newAddr")?.value).toBe("Unit 10, Fictional Safe Road");
  expect(currentStep(latest)?.kind).toBe("task"); expect(latest.status).toBe("open"); expect(await effects()).toEqual(before);
});
