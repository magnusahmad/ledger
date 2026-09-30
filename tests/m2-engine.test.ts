import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { ensureFirm } from "@/domain/firm";
import { createClient, createPerson } from "@/domain/records";
import { loadPlaybookLibrary, getPlaybook, allPlaybookFiles, requirementLibrary } from "@/domain/playbooks";
import { createRequest, startTask, advance, markStepState, getTask, taskEvents, currentStep } from "@/domain/engine";
import { cddRecord, invoice, request as requestT } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await ensureFirm(ctx);
  await loadPlaybookLibrary(ctx);
});

async function setup(opts: { terms?: number } = {}) {
  const c = await createClient(ctx, { nameEn: "Kowloon Bay Trading Limited", paymentTermsDays: opts.terms ?? 0, incorporatedOn: "2019-10-28" });
  const req = await createRequest(ctx, { clientId: c.id, summary: "Appoint a director" });
  return { c, req };
}

async function withInvoice(requestId: string, clientId: string, status: "sent" | "paid") {
  await ctx.db.insert(invoice).values({ id: "inv_1", firmId: ctx.firmId, clientId, requestId, number: "CRCS-2026-0001", status, totalCents: 180000 });
  await ctx.db.update(requestT).set({ invoiceId: "inv_1" }).where(eq(requestT.id, requestId));
}

describe("Playbook library (data integrity)", () => {
  it("every requirement referenced by a playbook exists in the requirement library, in all three languages", async () => {
    const items = requirementLibrary();
    for (const pb of allPlaybookFiles()) {
      for (const r of pb.requirements) {
        expect(items[r.key], `${pb.id} references unknown item ${r.key}`).toBeDefined();
        expect(items[r.key].label.tc && items[r.key].label.sc && items[r.key].label.en).toBeTruthy();
      }
    }
  });

  it("no playbook matches clients by keywords: each has a natural-language whenToUse for the intake agent", () => {
    for (const pb of allPlaybookFiles()) {
      expect((pb as Record<string, unknown>).triggerKeywords, pb.id).toBeUndefined();
      expect(pb.whenToUse.length, pb.id).toBeGreaterThan(20);
    }
  });

  it("every step kind in the library is one the engine knows how to run", () => {
    const known = ["send", "pay", "collect", "kyc", "screen", "generate", "sign", "file", "register", "confirm", "task", "wait_until"];
    for (const pb of allPlaybookFiles()) for (const s of pb.steps) expect(known, `${pb.id}: ${s.kind}`).toContain(s.kind);
  });
});

describe("Task engine", () => {
  it("a task on credit terms skips the payment step", async () => {
    const { c, req } = await setup({ terms: 30 });
    const t = await startTask(ctx, { requestId: req.id, clientId: c.id, playbookId: "hk.changeOffice" });
    expect(t.onCredit).toBe(true);
    await markStepState(ctx, t.id, "send", { sent: true });
    await advance(ctx, t.id);
    expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("collect");
    const ev = await taskEvents(ctx, t.id);
    expect(ev.some((e) => e.kind === "step.skipped" && /credit/i.test(e.summary))).toBe(true);
  });

  it("an upfront task waits at the payment step until the invoice is paid", async () => {
    const { c, req } = await setup();
    await withInvoice(req.id, c.id, "sent");
    const t = await startTask(ctx, { requestId: req.id, clientId: c.id, playbookId: "hk.changeOffice" });
    await markStepState(ctx, t.id, "send", { sent: true });
    await advance(ctx, t.id);
    expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("pay");
    await ctx.db.update(invoice).set({ status: "paid" }).where(eq(invoice.id, "inv_1"));
    await advance(ctx, t.id);
    expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("collect");
  });

  it("KYC items for a person with current CDD are marked on file and not requested", async () => {
    const { c, req } = await setup();
    const p = await createPerson(ctx, { nameEn: "LEE Siu Ling", nameZh: "李小玲", idNumber: "A1234567", residentialAddress: "1 Tai Hang Road", correspondenceAddress: "Unit 1502, Kowloon Bay Centre", email: "sl@example.com", phone: "+852 9000 0000" });
    await ctx.db.insert(cddRecord).values({ id: "cdd_1", firmId: ctx.firmId, personId: p.id, verifiedOn: "2025-11-02", reviewDueOn: "2027-11-02" });
    const t = await startTask(ctx, { requestId: req.id, clientId: c.id, playbookId: "hk.appointDirector", personId: p.id });
    const byKey = Object.fromEntries(t.checklist.map((e) => [e.key, e.status]));
    expect(byKey.idCopy).toBe("on_file");
    expect(byKey.addrProof).toBe("on_file");
    expect(byKey.selfie).toBe("on_file");
    expect(byKey.fullName).toBe("on_file");
    expect(byKey.effDate).toBe("needed");
  });

  it("an officer change is titled with the person it concerns, but an onboarding task is not titled with the instructing person checked for KYC", async () => {
    const { c, req } = await setup();
    const p = await createPerson(ctx, { nameEn: "LEE Siu Ling" });
    expect((await startTask(ctx, { requestId: req.id, clientId: c.id, playbookId: "hk.appointDirector", personId: p.id })).title).toBe("Appoint a director: LEE Siu Ling");
    expect((await startTask(ctx, { requestId: req.id, clientId: c.id, playbookId: "hk.transferIn", personId: p.id })).title).toBe("Take over an existing company");
  });

  it("a person whose CDD review date has passed is asked for fresh KYC documents", async () => {
    const { c, req } = await setup();
    const p = await createPerson(ctx, { nameEn: "LEE Siu Ling" });
    await ctx.db.insert(cddRecord).values({ id: "cdd_1", firmId: ctx.firmId, personId: p.id, verifiedOn: "2023-01-01", reviewDueOn: "2025-01-01" });
    const t = await startTask(ctx, { requestId: req.id, clientId: c.id, playbookId: "hk.appointDirector", personId: p.id });
    expect(t.checklist.find((e) => e.key === "idCopy")?.status).toBe("needed");
  });

  it("details already given in the client's first message are pre-filled and not requested again", async () => {
    const { c, req } = await setup();
    const t = await startTask(ctx, { requestId: req.id, clientId: c.id, playbookId: "hk.changeOffice", extracted: { newAddr: { value: "Room 801, 8/F, 1 Hennessy Road, Wan Chai", source: "our new office is Room 801..." } } });
    expect(t.checklist.find((e) => e.key === "newAddr")).toMatchObject({ status: "received", value: "Room 801, 8/F, 1 Hennessy Road, Wan Chai" });
  });

  it("a task cannot enter generate while required items are outstanding", async () => {
    const { c, req } = await setup({ terms: 30 });
    const t = await startTask(ctx, { requestId: req.id, clientId: c.id, playbookId: "hk.changeOffice" });
    await markStepState(ctx, t.id, "send", { sent: true });
    await advance(ctx, t.id);
    expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("collect");
    await advance(ctx, t.id);
    expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("collect");
  });

  it("when a new required item appears after collection, the task steps back to collect before generating", async () => {
    const { c, req } = await setup({ terms: 30 });
    const t = await startTask(ctx, { requestId: req.id, clientId: c.id, playbookId: "hk.changeOffice", extracted: {
      newAddr: { value: "Room 801, 1 Hennessy Road" }, effDate: { value: "2026-10-15" }, premises: { value: "tenancy.pdf" } } });
    await markStepState(ctx, t.id, "send", { sent: true });
    const moved = await advance(ctx, t.id);
    expect(currentStep(moved)?.kind).not.toBe("collect");
    const task = await getTask(ctx, t.id);
    const { setChecklist } = await import("@/domain/engine");
    await setChecklist(ctx, t.id, [...task.checklist.map((e) => e.key === "effDate" ? { ...e, status: "needed" as const, value: null } : e)], "Client says the move date is not fixed yet");
    const back = await advance(ctx, t.id);
    expect(currentStep(back)?.kind).toBe("collect");
  });

  it("every step transition writes a task event, and finishing the last step marks the task done", async () => {
    const { c, req } = await setup({ terms: 30 });
    const t = await startTask(ctx, { requestId: req.id, clientId: c.id, playbookId: "hk.mailHandling", extracted: { mailInstructions: { value: "scan" } } });
    let task = await advance(ctx, t.id); // collect complete -> task
    expect(currentStep(task)?.kind).toBe("task");
    await markStepState(ctx, t.id, "task", { done: true });
    task = await advance(ctx, t.id);
    expect(currentStep(task)?.kind).toBe("confirm");
    await markStepState(ctx, t.id, "confirm", { sent: true });
    task = await advance(ctx, t.id);
    expect(task.status).toBe("done");
    const kinds = (await taskEvents(ctx, t.id)).map((e) => e.kind);
    expect(kinds.filter((k) => k === "step.completed").length).toBe(3);
    expect(kinds).toContain("task.done");
  });

  it("the deadline is computed from the playbook rule and the effective date", async () => {
    const { c, req } = await setup({ terms: 30 });
    const t = await startTask(ctx, { requestId: req.id, clientId: c.id, playbookId: "hk.appointDirector", extracted: { effDate: { value: "2026-10-01" } } });
    expect(t.effectiveDate).toBe("2026-10-01");
    expect(t.dueDate).toBe("2026-10-16");
  });

  it("getPlaybook returns the latest active version", async () => {
    const pb = await getPlaybook(ctx, "hk.appointDirector");
    expect(pb.version).toBeGreaterThanOrEqual(2);
  });
});
