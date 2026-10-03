import { beforeEach, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedLoad } from "./load-fixtures";
import { goodDraft } from "./agent-fixtures";
import { enqueue, onJob, runJobs } from "@/domain/jobs";
import { logEvent, getTask, currentStep } from "@/domain/engine";
import { runChasers } from "@/domain/chasing";
import { runReminders } from "@/domain/reminders";
import { recoverApprovals, approveProposal, pendingProposals, rejectProposal } from "@/domain/proposals";
import { taskEvent, job, filing, appointment, document, proposal, task } from "@/db/schema";

let ctx: TestCtx; let corpus: Awaited<ReturnType<typeof seedLoad>>;
beforeEach(async () => { await resetDb(); ctx = makeCtx({ now: "2026-10-03T02:00:00Z" }); ctx.llm.on("draft", goodDraft); corpus = await seedLoad(ctx); }, 120_000);
async function protectedState() { return { filings: await ctx.db.select().from(filing), officers: await ctx.db.select().from(appointment), docs: await ctx.db.select().from(document), taskRows: await ctx.db.select().from(task), mail: ctx.mail.sent() }; }
it("LOAD11 two concurrent workers drain 240 deduplicated local bookkeeping jobs once without sending or changing statutory work under 2200-task backlog", async () => {
  const before = await protectedState();
  expect(currentStep(await getTask(ctx, corpus.signing))?.kind).toBe("sign"); expect(currentStep(await getTask(ctx, corpus.paying))?.kind).toBe("pay");
  onJob("audit.load.local", async (owned, payload) => { await logEvent(owned, payload.taskId as string, "audit.load.job", `Fictional local review ${payload.ordinal}`); });
  for (let i = 0; i < 240; i++) await enqueue(ctx, "audit.load.local", { taskId: corpus.oldManual, ordinal: i }, `load-job-${i}`);
  for (let i = 0; i < 240; i++) await enqueue(ctx, "audit.load.local", { taskId: corpus.oldManual, ordinal: i }, `load-job-${i}`);
  const start = performance.now(); const batches = await Promise.all([runJobs(ctx, 120), runJobs(ctx, 120)]);
  expect(batches.reduce((a, b) => a + b)).toBe(240); expect(await runJobs(ctx, 240)).toBe(0);
  const effects = await ctx.db.select().from(taskEvent).where(and(eq(taskEvent.taskId, corpus.oldManual), eq(taskEvent.kind, "audit.load.job")));
  expect(effects).toHaveLength(240); expect(new Set(effects.map(e => e.summary)).size).toBe(240);
  const jobs = await ctx.db.select().from(job).where(eq(job.kind, "audit.load.local")); expect(jobs.every(j => j.status === "done" && j.attempts === 1)).toBe(true);
  expect(await protectedState()).toEqual(before); console.info("LOAD_JOB_DRAIN", JSON.stringify({ seed: corpus.seed, jobs: jobs.length, batches, ms: performance.now() - start }));
}, 120_000);
it("LOAD12 monthly duties retain one pending chase per collecting task but never imply an unsent signing pack was delivered", async () => {
  const before = await protectedState(); const counts = [];
  for (const iso of ["2026-11-03T02:00:00Z", "2026-12-03T02:00:00Z", "2027-01-03T02:00:00Z"]) {
    ctx.clock.set(iso); const start = performance.now(); await runChasers(ctx); await runReminders(ctx); await recoverApprovals(ctx); await runJobs(ctx, 100);
    await runChasers(ctx); await runReminders(ctx); await recoverApprovals(ctx); await runJobs(ctx, 100);
    const pending = await ctx.db.select().from(proposal).where(eq(proposal.status, "pending"));
    const chases = pending.filter(p => p.payload.purpose === "chase"); const perTask = new Map<string, number>();
    for (const p of chases) perTask.set(p.taskId!, (perTask.get(p.taskId!) ?? 0) + 1);
    expect([...perTask.values()].every(n => n === 1), "Decision40: at most one reminder waits per task").toBe(true);
    expect(perTask.has(corpus.held)).toBe(false);
    expect.soft(perTask.has(corpus.signing), "No approved invitation was delivered: client must not be chased for documents we never sent").toBe(false);
    expect.soft(chases).toHaveLength(601);
    expect(await protectedState()).toEqual(before);
    counts.push({ iso, pending: pending.length, chases: chases.length, ms: performance.now() - start });
  }
  // Same retained signing anchor: staff finally approves actual invitations.
  // Remove only any earlier invalid reminder through the real staff rejection.
  for (const p of await pendingProposals(ctx, { taskId: corpus.signing })) if (p.payload.purpose === "chase") await rejectProposal(ctx, p.id, "No invitation had been sent; discard obsolete reminder");
  const [invitation] = await pendingProposals(ctx, { taskId: corpus.signing, kind: "send_signing" }); await approveProposal(ctx, invitation.id);
  const invited = (invitation.payload.signers as unknown[]).length; expect(invited).toBeGreaterThan(0); expect(ctx.mail.sent()).toHaveLength(invited);
  const pendingSignChases = async () => (await pendingProposals(ctx, { taskId: corpus.signing })).filter(p => p.payload.purpose === "chase");
  await runChasers(ctx); expect.soft(await pendingSignChases(), "actual signing.sent must restart client reminder time").toHaveLength(0);
  ctx.clock.advanceDays(4); await runChasers(ctx); expect.soft(await pendingSignChases()).toHaveLength(0);
  ctx.clock.advanceDays(1); await runChasers(ctx); await runChasers(ctx); expect(await pendingSignChases()).toHaveLength(1);
  expect(ctx.mail.sent()).toHaveLength(invited); expect(await ctx.db.select().from(filing)).toEqual(before.filings); expect(await ctx.db.select().from(appointment)).toEqual(before.officers);
  console.info("LOAD_MONTHLY_DUTIES", JSON.stringify({ seed: corpus.seed, tasks: before.taskRows.length, counts }));
}, 120_000);
