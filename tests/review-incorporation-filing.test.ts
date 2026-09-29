import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { startTask, getTask } from "@/domain/engine";
import { approveProposal, createProposal } from "@/domain/proposals";
import { approvalState } from "@/domain/approval-state";
import { task, filing } from "@/db/schema";
import "@/domain/step-hooks";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });
async function atFiling() {
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.incorporation" });
  const full = await getTask(ctx, t.id);
  await ctx.db.update(task).set({ stepIndex: full._steps.findIndex(s => s.kind === "file"), checklist: full.checklist.map(c => ({ ...c, status: "received" })) }).where(eq(task.id, t.id));
  return { t, p: await createProposal(ctx, { kind: "record_filing", title: "Record incorporation", taskId: t.id, payload: { taskId: t.id, form: "NNC1", approvalState: await approvalState(ctx, t.id) } }) };
}
it("recording incorporation requires the certificate number and a real calendar date before any filing write", async () => {
  const { p, t } = await atFiling();
  await expect(approveProposal(ctx, p.id, { edits: { reference: "CR-123", companyNumber: "", incorporatedOn: "2026-02-30" } })).rejects.toThrow(/certificate|company number|incorporation date/i);
  expect(await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, t.id))).toHaveLength(0);
});
it("recorded incorporation facts are retained for a separate register approval", async () => {
  const { p, t } = await atFiling();
  await approveProposal(ctx, p.id, { edits: { reference: "CR-123", companyNumber: "90000001", incorporatedOn: "2026-09-29" } });
  expect((await getTask(ctx, t.id)).params.incorporationRegistration).toEqual({ companyNumber: "90000001", incorporatedOn: "2026-09-29" });
  expect(await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, t.id))).toHaveLength(1);
});
