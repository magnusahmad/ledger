import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { goodDraft } from "./agent-fixtures";
import { batchStart, batchGenerate } from "@/domain/batch";
import { appoint, officersAsAt } from "@/domain/records";
import { getTask, startTask, currentStep } from "@/domain/engine";
import { pendingProposals, createProposal } from "@/domain/proposals";
import { document, invoice, task, client, firm, request, message } from "@/db/schema";
import "@/domain/step-hooks";
import "@/domain/signing";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
});

it("a common director resignation queues each company's own task, invoice and request with the named officer and date", async () => {
  await appoint(ctx, { clientId: "cli_c2", personId: "per_p1", role: "director", fromDate: "2020-01-01" });
  const result = await batchStart(ctx, { playbookId: "hk.resignDirector", clientIds: ["cli_c1", "cli_c2", "cli_c3", "cli_c1"], personId: "per_p1", effectiveDate: "2026-10-15" });
  expect(result.created).toBe(2);
  expect(result.skipped.some(s => s.clientId === "cli_c3" && /director/i.test(s.reason))).toBe(true);
  const ts = await ctx.db.select().from(task).where(eq(task.playbookId, "hk.resignDirector"));
  expect(ts).toHaveLength(2);
  for (const t of ts) {
    const req = await ctx.db.query.request.findFirst({ where: eq(request.id, t.requestId!) });
    expect(req?.conversationId).toBeTruthy();
    const replies = await ctx.db.select().from(message).where(eq(message.conversationId, req!.conversationId!));
    expect(replies).toHaveLength(1);
    expect(replies[0].direction).toBe("out");
    expect(t.personId).toBe("per_p1"); expect(t.effectiveDate).toBe("2026-10-15");
    expect(t.checklist.find(e => e.key === "lastDay")).toMatchObject({ status: "received", value: "2026-10-15" });
    expect(t.checklist.find(e => e.key === "resignLetter")?.status).toBe("needed");
    expect((await officersAsAt(ctx, t.clientId, "2026-10-15", "director")).some(o => o.personId === "per_p1")).toBe(true);
  }
  expect(await ctx.db.select().from(invoice).where(eq(invoice.status, "draft"))).toHaveLength(2);
  expect(await pendingProposals(ctx, { kind: "send_message" })).toHaveLength(2);
  expect(ctx.mail.sent()).toHaveLength(0);
  const repeat = await batchStart(ctx, { playbookId: "hk.resignDirector", clientIds: ["cli_c1", "cli_c2"], personId: "per_p1", effectiveDate: "2026-10-15" });
  expect(repeat.created).toBe(0);
  expect(repeat.skipped).toHaveLength(2);
});

it("a batch officer change without a valid person or calendar date creates nothing", async () => {
  await expect(batchStart(ctx, { playbookId: "hk.resignDirector", clientIds: ["cli_c1"], personId: "per_p1", effectiveDate: "2026-02-31" })).rejects.toThrow(/date/i);
  await expect(batchStart(ctx, { playbookId: "hk.resignDirector", clientIds: ["cli_c1"], personId: "missing", effectiveDate: "2026-10-15" })).rejects.toThrow(/person|officer/i);
  expect(await ctx.db.select().from(task).where(eq(task.playbookId, "hk.resignDirector"))).toHaveLength(0);
});

async function atGenerate(complete: boolean) {
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.changeOffice", extracted: complete ? { newAddr: { value: "12/F, 88 Hung To Road, Kwun Tong, Hong Kong" }, effDate: { value: "2026-10-15" } } : {} });
  const full = await getTask(ctx, t.id);
  await ctx.db.update(task).set({ stepIndex: full._steps.findIndex(s => s.kind === "generate") }).where(eq(task.id, t.id));
  return t;
}

it("batch preparation generates ready tasks and reports missing requirements and stale selections individually", async () => {
  const ready = await atGenerate(true); const missing = await atGenerate(false);
  const sent = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.changeOffice" });
  const result = await batchGenerate(ctx, [missing.id, ready.id, sent.id, ready.id]);
  expect(result.generated).toEqual([ready.id]);
  expect(result.skipped).toEqual(expect.arrayContaining([
    expect.objectContaining({ taskId: missing.id, reason: expect.stringMatching(/outstanding/i) }),
    expect.objectContaining({ taskId: sent.id, reason: expect.stringMatching(/generate/i) }),
  ]));
  expect(await ctx.db.select().from(document).where(eq(document.taskId, ready.id))).toHaveLength(2);
  expect(await ctx.db.select().from(document).where(eq(document.taskId, missing.id))).toHaveLength(0);
  expect(currentStep(await getTask(ctx, ready.id))?.kind).toBe("sign");
  expect(await pendingProposals(ctx, { taskId: ready.id, kind: "send_signing" })).toHaveLength(1);
  expect(ctx.mail.sent()).toHaveLength(0);
  expect((await batchGenerate(ctx, [ready.id])).generated).toEqual([]);
});

it("a conflict blocks only its task in a document batch", async () => {
  const blocked = await atGenerate(true); const ready = await atGenerate(true);
  await createProposal(ctx, { kind: "conflict", title: "Confirm address", taskId: blocked.id });
  const result = await batchGenerate(ctx, [blocked.id, ready.id]);
  expect(result.generated).toEqual([ready.id]);
  expect(result.skipped[0]).toMatchObject({ taskId: blocked.id, reason: expect.stringMatching(/conflict/i) });
});

it("a batch cannot create work or documents for another firm's submitted IDs", async () => {
  await ctx.db.insert(firm).values({ id: "firm_other", legalName: "Other Firm", invoicePrefix: "OTHER-" });
  await ctx.db.insert(client).values({ id: "cli_private", firmId: "firm_other", nameEn: "Private Other Client" });
  await ctx.db.insert(task).values({ id: "tsk_private", firmId: "firm_other", clientId: "cli_private", title: "Other firm's task", playbookId: "hk.changeOffice", playbookVersion: 2, stepIndex: 3 });
  const started = await batchStart(ctx, { playbookId: "hk.annualReturn", clientIds: ["cli_private"], periodYear: 2026 });
  expect(started).toEqual({ created: 0, skipped: [{ clientId: "cli_private", reason: "Client not found" }] });
  const prepared = await batchGenerate(ctx, ["tsk_private"]);
  expect(prepared.generated).toEqual([]);
  expect(prepared.skipped).toHaveLength(1);
  expect(await ctx.db.select().from(document).where(eq(document.taskId, "tsk_private"))).toHaveLength(0);
  expect(await pendingProposals(ctx, { kind: "send_message" })).toHaveLength(0);
});
