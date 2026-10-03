import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { createRequest, startTask, getTask, advance } from "@/domain/engine";
import { applyRegisterChanges } from "@/domain/register-effects";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { portalSubmit, portalSubmitField } from "@/domain/portal";
import { createPerson } from "@/domain/records";
import { renderRegisters } from "@/documents/register-export";
import { document, firm, person, shareMovement, significantController, task } from "@/db/schema";
import "@/domain/inbound";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });

async function controllerTask(items: unknown[]) {
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.updateControllers", extracted: { effDate: { value: "2026-09-29" }, controllerDetails: { value: "Explicit confirmed controller instructions attached" } } });
  await ctx.db.update(task).set({ params: { ...t.params, controllerPlan: { items } } }).where(eq(task.id, t.id));
  return t;
}
async function controllerApproval(t: Awaited<ReturnType<typeof controllerTask>>) {
  const full = await getTask(ctx, t.id);
  const index = full._steps.findIndex(s => s.kind === "register");
  await ctx.db.update(task).set({ checklist: t.checklist.map(e => ({ ...e, status: "received", value: e.value ?? "Confirmed" })), stepIndex: index - 1, stepState: { [index - 1]: { filed: true, signed: true, generated: true } } }).where(eq(task.id, t.id));
  await advance(ctx, t.id);
  return (await pendingProposals(ctx, { taskId: t.id, kind: "register_change" }))[0];
}

it("controller cessation preserves earlier register exports and changes only after human approval", async () => {
  const holder = await createPerson(ctx, { nameEn: "Dated Board Rights Holder", correspondenceAddress: "Confirmed address" });
  const added = await controllerTask([{ kind: "add", personId: holder.id, nature: "Explicit majority-board appointment rights", registrableFrom: "2026-09-20" }]);
  const proposal = await controllerApproval(added);
  expect(proposal).toBeDefined();
  expect(await ctx.db.select().from(significantController).where(eq(significantController.personId, holder.id))).toHaveLength(0);
  await approveProposal(ctx, proposal.id);
  const [row] = await ctx.db.select().from(significantController).where(eq(significantController.personId, holder.id));
  const ceased = await controllerTask([{ kind: "cease", controllerId: row.id, ceasedOn: "2026-09-29" }]);
  const cessation = await controllerApproval(ceased);
  expect((await ctx.db.query.significantController.findFirst({ where: eq(significantController.id, row.id) }))!.ceasedOn).toBeNull();
  await approveProposal(ctx, cessation.id);
  expect(await ctx.db.query.significantController.findFirst({ where: eq(significantController.id, row.id) })).toMatchObject({ nature: "Explicit majority-board appointment rights", registrableFrom: "2026-09-20", ceasedOn: "2026-09-29" });
  const before = await renderRegisters(ctx, "cli_c1", "2026-09-19", "en");
  const active = await renderRegisters(ctx, "cli_c1", "2026-09-28", "en");
  const after = await renderRegisters(ctx, "cli_c1", "2026-09-29", "en");
  expect(before.text).not.toContain(holder.nameEn);
  expect(active.text).toContain(holder.nameEn);
  expect(active.text).toContain("Explicit majority-board appointment rights");
  expect(after.text).not.toContain(holder.nameEn);
});

it("invalid, duplicate and foreign controller plans leave records, documents and capital unchanged (bounded 15-case corpus)", async () => {
  const existing = (await ctx.db.select().from(significantController).where(eq(significantController.clientId, "cli_c1")))[0];
  await ctx.db.insert(firm).values({ id: "firm_audit_other", legalName: "Fictional Other Firm", invoicePrefix: "QA" });
  await ctx.db.insert(person).values({ id: "per_audit_foreign", firmId: "firm_audit_other", nameEn: "Fictional Other Firm Person" });
  const base = { kind: "add", personId: "per_p3", nature: "Confirmed board control", registrableFrom: "2026-09-29" };
  const dates = ["", " ", "2025-02-29", "2026-02-30", "2026-13-01", "2026-00-01", "2026-09-00", "2026-09-29T00:00:00Z"];
  const plans: unknown[][] = dates.map(date => [{ ...base, registrableFrom: date }]);
  plans.push([{ ...base, nature: "\u3000" }], [{ ...base, personId: "per_audit_foreign" }], [{ ...base, personId: existing.personId }], [{ kind: "cease", controllerId: existing.id, ceasedOn: existing.registrableFrom }], [{ kind: "cease", controllerId: existing.id, ceasedOn: "1900-01-01" }], [{ kind: "cease", controllerId: "scr_missing", ceasedOn: "2026-09-29" }], [{ ...base }, { ...base }]);
  expect(plans).toHaveLength(15);
  const controllers = await ctx.db.select().from(significantController);
  const documents = await ctx.db.select().from(document);
  const capital = await ctx.db.select().from(shareMovement);
  for (const items of plans) {
    const t = await controllerTask(items);
    await expect(applyRegisterChanges(ctx, t.id)).rejects.toThrow();
    expect(await ctx.db.select().from(significantController)).toEqual(controllers);
    expect(await ctx.db.select().from(document)).toEqual(documents);
    expect(await ctx.db.select().from(shareMovement)).toEqual(capital);
  }
});

it("an upload storage failure rolls back submitted fields and remains retryable", async () => {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const p = await createPerson(ctx, { nameEn: "Upload Retry Person" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", personId: p.id, playbookId: "hk.appointDirector" });
  const pdf = await PDFDocument.create(); pdf.addPage();
  const submission = { fields: [{ taskId: t.id, key: "corrAddr", value: "Verified retry address" }], files: [{ taskId: t.id, key: "idCopy", filename: "ID.pdf", mime: "application/pdf", content: Buffer.from(await pdf.save()) }] };
  const before = (await getTask(ctx, t.id)).checklist;
  const documents = await ctx.db.select().from(document);
  const put = ctx.storage.put.bind(ctx.storage);
  ctx.storage.put = async () => { throw new Error("Simulated temporary upload failure"); };
  await expect(portalSubmit(ctx, req.uploadToken, submission)).rejects.toThrow(/upload failure/);
  ctx.storage.put = put;
  expect((await getTask(ctx, t.id)).checklist).toEqual(before);
  expect((await ctx.db.query.person.findFirst({ where: eq(person.id, p.id) }))!.correspondenceAddress).toBeNull();
  expect(await ctx.db.select().from(document)).toEqual(documents);
  await portalSubmit(ctx, req.uploadToken, submission);
  const after = await getTask(ctx, t.id);
  expect(after.checklist.find(e => e.key === "corrAddr")).toMatchObject({ status: "received", value: "Verified retry address" });
  expect(after.checklist.find(e => e.key === "idCopy")).toMatchObject({ status: "received", documentId: expect.any(String) });
  expect(await ctx.db.select().from(document)).toHaveLength(documents.length + 1);
});

it("an approved controller nature change retains both dated entries instead of rewriting history", async () => {
  const holder = await createPerson(ctx, { nameEn: "Controller Nature History" });
  const first = await controllerTask([{ kind: "add", personId: holder.id, nature: "Original majority-board appointment rights", registrableFrom: "2026-09-20" }]);
  await approveProposal(ctx, (await controllerApproval(first)).id);
  const row = (await ctx.db.select().from(significantController).where(eq(significantController.personId, holder.id)))[0];
  const change = await controllerTask([{ kind: "cease", controllerId: row.id, ceasedOn: "2026-09-29" }, { kind: "add", personId: holder.id, nature: "Confirmed right to exercise significant influence", registrableFrom: "2026-09-29" }]);
  await approveProposal(ctx, (await controllerApproval(change)).id);
  expect(await ctx.db.select().from(significantController).where(eq(significantController.personId, holder.id))).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: row.id, nature: "Original majority-board appointment rights", registrableFrom: "2026-09-20", ceasedOn: "2026-09-29" }),
    expect.objectContaining({ nature: "Confirmed right to exercise significant influence", registrableFrom: "2026-09-29", ceasedOn: null, sourceTaskId: change.id }),
  ]));
  for (const language of ["en", "tc", "sc"] as const) {
    const prior = await renderRegisters(ctx, "cli_c1", "2026-09-28", language);
    const current = await renderRegisters(ctx, "cli_c1", "2026-09-29", language);
    expect(prior.text).toContain("Original majority-board appointment rights");
    expect(prior.text).not.toContain("Confirmed right to exercise significant influence");
    expect(current.text).toContain("Confirmed right to exercise significant influence");
    expect(current.text).not.toContain("Original majority-board appointment rights");
  }
});


it("R-15 public upload cannot satisfy a typed correspondence-address requirement", async () => {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const holder = await createPerson(ctx, { nameEn: "Typed Field Upload Fuzz" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", personId: holder.id, playbookId: "hk.appointDirector" });
  const pdf = await PDFDocument.create(); pdf.addPage();
  const before = (await getTask(ctx, t.id)).checklist;
  const documents = await ctx.db.select().from(document);
  await expect(portalSubmit(ctx, req.uploadToken, { fields: [], files: [{ taskId: t.id, key: "corrAddr", filename: "wrong-kind.pdf", mime: "application/pdf", content: Buffer.from(await pdf.save()) }] })).rejects.toThrow(/file|document|typed|value|upload/i);
  expect((await getTask(ctx, t.id)).checklist).toEqual(before);
  expect(await ctx.db.select().from(document)).toEqual(documents);
});

it("R-16 editing controller instructions discards the cached plan and previews the newly confirmed facts", async () => {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const holder = await createPerson(ctx, { nameEn: "Edited Controller Holder" });
  ctx.llm.set("structure_controllers", { items: [{ kind: "add", personId: holder.id, nature: "Original confirmed board appointment rights", registrableFrom: "2026-09-20" }] });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.updateControllers", personId: holder.id, extracted: { effDate: { value: "2026-09-29" }, controllerDetails: { value: "Original confirmed board appointment rights from 20 September 2026" } } });
  const initial = await controllerApproval(t);
  expect(initial.payload.preview).toEqual([expect.stringContaining("Original confirmed board appointment rights")]);
  ctx.llm.set("structure_controllers", { items: [{ kind: "add", personId: holder.id, nature: "Corrected confirmed significant influence rights", registrableFrom: "2026-09-29" }] });
  await portalSubmitField(ctx, req.uploadToken, { taskId: t.id, key: "controllerDetails", value: "Correction: confirmed significant influence rights only, registrable from 29 September 2026" });
  const fresh = (await pendingProposals(ctx, { taskId: t.id, kind: "register_change" }))[0];
  expect(fresh).toBeDefined();
  expect(fresh.id).not.toBe(initial.id);
  expect(fresh.payload.preview).toEqual([expect.stringContaining("Corrected confirmed significant influence rights")]);
  expect(await ctx.db.select().from(significantController).where(eq(significantController.personId, holder.id))).toHaveLength(0);
  await approveProposal(ctx, fresh.id);
  expect(await ctx.db.select().from(significantController).where(eq(significantController.personId, holder.id))).toEqual([expect.objectContaining({ nature: "Corrected confirmed significant influence rights", registrableFrom: "2026-09-29" })]);
});
