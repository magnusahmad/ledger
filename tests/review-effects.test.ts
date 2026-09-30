import { beforeEach, expect, it } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { startTask, markStepState } from "@/domain/engine";
import { planRegisterChanges, applyRegisterChanges } from "@/domain/register-effects";
import { getPersonProtected, getClient } from "@/domain/records";
import { screenPerson, recordCdd } from "@/domain/screening";
import { upcomingDeadlines } from "@/domain/deadlines";
import { valueText } from "@/lib/display";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });
it("a particulars preview does not write protected fields and applying it uses the same proposed values", async () => {
  ctx.llm.on("structure_particulars", { changes: [{ field: "corrAddr", value: "New correspondence address" }, { field: "idNo", value: "K999999(1)" }] });
  const t = await startTask(ctx, { clientId: "cli_c1", personId: "per_p1", playbookId: "hk.changeParticulars", extracted: { changeDetail: { value: "Change the address and ID" }, effDate: { value: "2026-09-29" } } });
  const before = await getPersonProtected(ctx, "per_p1");
  const preview = await planRegisterChanges(ctx, t.id);
  expect(preview).toHaveLength(1);
  expect(preview[0].description).not.toContain("K999999");
  expect((await getPersonProtected(ctx, "per_p1")).idNumber).toBe(before.idNumber);
  await applyRegisterChanges(ctx, t.id);
  const after = await getPersonProtected(ctx, "per_p1");
  expect(after.correspondenceAddress).toBe("New correspondence address");
  expect(after.idNumber).toBe("K999999(1)");
  expect(after.idNumberEnc).not.toContain("K999999");
});
it("a financial year end change updates both calendar fields only when the preview is applied", async () => {
  ctx.llm.on("structure_fye", { month: 12, day: 31, firstPeriodEnd: "2026-12-31" });
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.changeFye", extracted: { newFye: { value: "31 December, first period ending 31 December 2026" } } });
  const before = await getClient(ctx, "cli_c1");
  expect(await planRegisterChanges(ctx, t.id)).toHaveLength(1);
  expect((await getClient(ctx, "cli_c1")).fyeMonth).toBe(before.fyeMonth);
  await applyRegisterChanges(ctx, t.id);
  expect(await getClient(ctx, "cli_c1")).toMatchObject({ fyeMonth: 12, fyeDay: 31 });
});
it("a KYC review can close once its screened person has current CDD, without creating duplicate CDD", async () => {
  const t = await startTask(ctx, { clientId: "cli_c1", personId: "per_p1", playbookId: "hk.kycReview" });
  await expect(planRegisterChanges(ctx, t.id)).rejects.toThrow();
  const screening = await screenPerson(ctx, "per_p1", t.id);
  await recordCdd(ctx, "per_p1", t.id, screening.id);
  await markStepState(ctx, t.id, "screen", { cleared: true, screened: ["per_p1"] });
  const before = await ctx.db.query.cddRecord.findMany();
  expect(await planRegisterChanges(ctx, t.id)).toHaveLength(1);
  await applyRegisterChanges(ctx, t.id);
  expect(await ctx.db.query.cddRecord.findMany()).toHaveLength(before.length);
});
it("a dormant-company task changes operating status only when its register preview is applied", async () => {
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.dormant" });
  expect(await planRegisterChanges(ctx, t.id)).toHaveLength(1);
  expect((await getClient(ctx, "cli_c1")).operatingStatus).not.toBe("dormant");
  await applyRegisterChanges(ctx, t.id);
  expect((await getClient(ctx, "cli_c1")).operatingStatus).toBe("dormant");
});

it("a changed financial year end preserves prior periods and schedules the first changed period without inventing intervening periods", async () => {
  ctx.llm.on("structure_fye", { month: 12, day: 31, firstPeriodEnd: "2027-12-31" });
  const original = await getClient(ctx, "cli_c1");
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.changeFye", extracted: { newFye: { value: "31 December, first period ends 2027-12-31" } } });
  await applyRegisterChanges(ctx, t.id);
  const agms = (await upcomingDeadlines(ctx, { clientId: "cli_c1", withinDays: 1000 })).filter(d => d.key === "AGM");
  expect(agms.some(d => d.label.includes("31 Dec 2027") && d.dueDate === "2028-09-30")).toBe(true);
  expect(agms.some(d => d.label.includes("31 Dec 2025") || d.label.includes("31 Dec 2026"))).toBe(false);
  const old = `2026-${String(original.fyeMonth).padStart(2, "0")}-${String(original.fyeDay).padStart(2, "0")}`;
  expect(agms.some(d => d.label.includes(valueText(old)))).toBe(true);
  const annual = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.agm", periodYear: 2027, periodKey: "AGM:2027-12-31" });
  expect(annual.dueDate).toBe("2028-09-30");
});
