import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { ensureFirm } from "@/domain/firm";
import { createClient } from "@/domain/records";
import { loadPlaybookLibrary } from "@/domain/playbooks";
import { advance, cancelTask, currentStep, getTask, taskEvents, setChecklist, startTask, markStepState } from "@/domain/engine";
import { approveProposal, createProposal, getProposal, pendingProposals } from "@/domain/proposals";
import { client, filing, signEnvelope, task, person, firm } from "@/db/schema";
import { approvalState } from "@/domain/approval-state";
import { planRegisterChanges } from "@/domain/register-effects";
import { applyReview } from "@/agent/review";
import { review } from "./agent-fixtures";
import "@/domain/step-hooks";
import "@/domain/signing";
import { seedDemo } from "@/db/seed-demo";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await ensureFirm(ctx);
  await loadPlaybookLibrary(ctx);
});

it("a prepared approval binds linked officer particulars even when that officer is not the task subject", async () => {
  await seedDemo(ctx);
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.changeOffice" });
  const before = await approvalState(ctx, t.id);
  await ctx.db.update(person).set({ correspondenceAddress: "Unrelated company director" }).where(eq(person.id, "per_p3"));
  expect(await approvalState(ctx, t.id)).toBe(before);
  await ctx.db.update(person).set({ correspondenceAddress: "Updated director correspondence address" }).where(eq(person.id, "per_p1"));
  expect(await approvalState(ctx, t.id)).not.toBe(before);
});

it("a prepared approval binds the firm identity printed on its documents", async () => {
  await seedDemo(ctx);
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.changeOffice" });
  const before = await approvalState(ctx, t.id);
  await ctx.db.update(firm).set({ invoiceSeq: 999 }).where(eq(firm.id, ctx.firmId));
  expect(await approvalState(ctx, t.id)).toBe(before);
  await ctx.db.update(firm).set({ legalName: "Updated Fictional Firm Limited" }).where(eq(firm.id, ctx.firmId));
  expect(await approvalState(ctx, t.id)).not.toBe(before);
});

// Start from completed preparation so these tests isolate the real approval and engine boundaries.
async function atGate(kind: "file" | "register") {
  const c = await createClient(ctx, { nameEn: "Approval Test Limited", regOfficeEn: "Old office", paymentTermsDays: 30 });
  const t = await startTask(ctx, { clientId: c.id, playbookId: "hk.changeOffice", extracted: {
    newAddr: { value: "New office" }, effDate: { value: "2026-09-29" },
  } });
  const full = await getTask(ctx, t.id);
  const idx = full._steps.findIndex(s => s.kind === kind);
  const prior = kind === "file" ? { signed: true } : { filed: true };
  await ctx.db.update(task).set({ stepIndex: idx - 1, stepState: { [idx - 1]: prior } }).where(eq(task.id, t.id));
  await advance(ctx, t.id);
  const p = (await pendingProposals(ctx, { taskId: t.id, kind: kind === "file" ? "record_filing" : "register_change" }))[0];
  expect(p).toBeDefined();
  return { t: await getTask(ctx, t.id), p, c };
}
const edits = { edits: { reference: "FILING-123" } };

for (const kind of ["file", "register"] as const) describe(`${kind} approval freshness`, () => {
  it("new requirements at the approval gate reopen collection and supersede the old proposal", async () => {
    const { t, p } = await atGate(kind);
    await setChecklist(ctx, t.id, [...t.checklist, { key: "clarification", status: "needed" }], "Client instruction needs clarification");
    expect(currentStep(await advance(ctx, t.id))?.kind).toBe("collect");
    expect((await getProposal(ctx, p.id)).status).toBe("superseded");
    await expect(approveProposal(ctx, p.id, edits)).rejects.toThrow();
    expect(await ctx.db.select().from(filing)).toHaveLength(0);
  });

  it("a cancelled task cannot apply a still-pending approval", async () => {
    const { t, p, c } = await atGate(kind);
    await cancelTask(ctx, t.id, "Client cancelled");
    await expect(approveProposal(ctx, p.id, edits)).rejects.toThrow();
    expect(await ctx.db.select().from(filing)).toHaveLength(0);
    expect((await ctx.db.query.client.findFirst({ where: eq(client.id, c.id) }))?.regOfficeEn).toBe("Old office");
  });

  it("an approval cannot bypass the task's current step", async () => {
    const { t, p } = await atGate(kind);
    await ctx.db.update(task).set({ stepIndex: 2 }).where(eq(task.id, t.id));
    await expect(approveProposal(ctx, p.id, edits)).rejects.toThrow();
  });

  it("an unresolved conflict blocks approval even when all checklist items are present", async () => {
    const { t, p } = await atGate(kind);
    await createProposal(ctx, { kind: "conflict", title: "Which office?", taskId: t.id, clientId: t.clientId, payload: { key: "newAddr" } });
    await expect(approveProposal(ctx, p.id, edits)).rejects.toThrow(/conflict/i);
  });

  it("facts changed after the preview cannot be approved by an old browser card", async () => {
    const { t, p } = await atGate(kind);
    await ctx.db.update(task).set({ effectiveDate: "2026-11-01" }).where(eq(task.id, t.id));
    await expect(approveProposal(ctx, p.id, edits)).rejects.toThrow(/changed|stale|fresh/i);
    expect((await taskEvents(ctx, t.id)).some(e => e.kind === "step.reopened")).toBe(true);
    expect((await getProposal(ctx, p.id)).status).toBe("superseded");
    expect((await getTask(ctx, t.id)).stepIndex).toBeGreaterThan(2); // fresh preparation starts automatically
  });

  it("unchanged current facts can still be approved", async () => {
    const { t, p, c } = await atGate(kind);
    await approveProposal(ctx, p.id, edits);
    if (kind === "file") {
      expect(await ctx.db.select().from(filing)).toEqual([expect.objectContaining({ reference: "FILING-123" })]);
      expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("register");
    } else {
      expect((await ctx.db.query.client.findFirst({ where: eq(client.id, c.id) }))?.regOfficeEn).toBe("New office");
      expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("confirm");
    }
  });
});

it("register effects changed since the displayed preview require a fresh preview", async () => {
  const { p, c, t } = await atGate("register");
  await ctx.db.update(client).set({ regOfficeEn: "Another recorded office" }).where(eq(client.id, c.id));
  await expect(approveProposal(ctx, p.id)).rejects.toThrow(/changed|stale|fresh/i);
  expect((await ctx.db.query.client.findFirst({ where: eq(client.id, c.id) }))?.regOfficeEn).toBe("Another recorded office");
  expect((await taskEvents(ctx, t.id)).some(e => e.kind === "step.reopened")).toBe(true);
  expect((await getProposal(ctx, p.id)).status).toBe("superseded");
  expect((await getTask(ctx, t.id)).stepIndex).toBeGreaterThan(2);
});

it("a changed completed value invalidates preparation and withdraws signing envelopes", async () => {
  const { t, p } = await atGate("file");
  await ctx.db.insert(signEnvelope).values({ id: "env_old", firmId: ctx.firmId, taskId: t.id, status: "sent", documentIds: [] });
  await setChecklist(ctx, t.id, t.checklist.map(e => e.key === "newAddr" ? { ...e, value: "Replacement office" } : e), "Client changed address");
  const after = await getTask(ctx, t.id);
  expect(currentStep(after)?.kind).toBe("collect");
  expect(Object.values(after.stepState).some((s) => (s as { signed?: boolean }).signed)).toBe(false);
  expect((await getProposal(ctx, p.id)).status).toBe("superseded");
  expect((await ctx.db.query.signEnvelope.findFirst())?.status).toBe("voided");
});

it("an effective-date-only review invalidates preparation even without a new checklist item", async () => {
  const { t, p } = await atGate("file");
  await applyReview(ctx, t.id, review({ items: [], effectiveDate: "2026-11-01" }), { clientId: t.clientId });
  expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("collect");
  expect((await getProposal(ctx, p.id)).status).toBe("superseded");
});

for (const playbookId of ["hk.changeFye", "hk.changeParticulars", "hk.kycReview"]) {
  it(`${playbookId} cannot silently succeed without the data or screening required by its register effect`, async () => {
    const c = await createClient(ctx, { nameEn: "Unsupported effect Limited" });
    const t = await startTask(ctx, { clientId: c.id, playbookId });
    await expect(planRegisterChanges(ctx, t.id)).rejects.toThrow(/missing|select|screening|not implemented|unsupported/i);
  });
}

it("a signing approval for an obsolete effective date sends no mail and is replaced", async () => {
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.changeOffice", extracted: {
    newAddr: { value: "12/F, 88 Hung To Road, Kwun Tong, Hong Kong" }, effDate: { value: "2026-09-29" },
  } });
  await markStepState(ctx, t.id, "send", { sent: true });
  await advance(ctx, t.id);
  const [p] = await pendingProposals(ctx, { taskId: t.id, kind: "send_signing" });
  expect(p).toBeDefined();
  await ctx.db.update(task).set({ effectiveDate: "2026-11-01" }).where(eq(task.id, t.id));
  await expect(approveProposal(ctx, p.id)).rejects.toThrow(/changed|stale|fresh/i);
  expect(ctx.mail.sent()).toHaveLength(0);
  expect((await getProposal(ctx, p.id)).status).toBe("superseded");
  const [fresh] = await pendingProposals(ctx, { taskId: t.id, kind: "send_signing" });
  expect(fresh.id).not.toBe(p.id);
  await approveProposal(ctx, fresh.id);
  expect(ctx.mail.sent()).toHaveLength(1);
});
