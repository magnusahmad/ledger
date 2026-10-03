import { beforeEach, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { upcomingDeadlines } from "@/domain/deadlines";
import { appoint, createPerson, updateClient } from "@/domain/records";
import { addController, ceaseController } from "@/domain/controllers";
import { recordCdd } from "@/domain/screening";
import { hasCurrentCdd } from "@/domain/engine";
import { cddRecord, filing } from "@/db/schema";
import { addDays, addMonths, daysBetween, isIsoDate } from "@/domain/dates";
import { hkDate } from "@/lib/clock";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });
const deadlines = () => upcomingDeadlines(ctx, { clientId: "cli_c1", withinDays: 3650 });

it("A10-D02: years of downtime cannot replace the successor of an explicitly filed annual-return period", async () => {
  // Retained seed 0xA10DA7: four bounded downtime years, seeded known 2025 filing.
  const last = await ctx.db.query.filing.findFirst({ where: and(eq(filing.clientId, "cli_c1"), eq(filing.periodKey, "NAR1:2025")) });
  expect(last).toBeTruthy();
  const expected = (await deadlines()).find(d => d.key === "NAR1")!;
  expect(expected.periodKey).toBe("NAR1:2026");
  for (const year of [2028, 2031, 2036, 2040]) {
    ctx.clock.set(`${year}-09-29T02:00:00Z`);
    const ds = await deadlines();
    expect.soft(ds.find(d => d.periodKey === expected.periodKey), `downtime year ${year} silently substitutes a later unfiled period`).toMatchObject({ dueDate: expected.dueDate, overdue: true });
  }
  expect(await ctx.db.select().from(filing).where(eq(filing.clientId, "cli_c1"))).toContainEqual(last);
});

it("A10-D03: recorded last AGM retains its earliest unresolved financial year after years of downtime", async () => {
  await updateClient(ctx, "cli_c1", { incorporatedOn: "2020-01-15", fyeMonth: 12, fyeDay: 31, jurisdictionData: { lastAgm: "2024-12-31" } }, "Fictional temporal fixture with explicit last AGM");
  const next = (await deadlines()).find(d => d.key === "AGM" && d.periodYear === 2025)!;
  expect(next).toBeTruthy();
  ctx.clock.set("2032-09-29T02:00:00Z");
  expect((await deadlines()).find(d => d.periodKey === next.periodKey)).toMatchObject({ dueDate: "2026-09-30", overdue: true });
});

it("A10-D03 consumer: a last AGM before that year's financial year end cannot discard the existing outstanding period after downtime", async () => {
  // Same ordinary Silverstrand rule protected by m9-parity: Sep2025 meeting,
  // Dec2025 financial year end is still outstanding, due Sep2026.
  const current = (await upcomingDeadlines(ctx, { clientId: "cli_c2", withinDays: 400 })).find(d => d.key === "AGM")!;
  expect(current).toMatchObject({ periodKey: "AGM:2025", dueDate: "2026-09-30" });
  ctx.clock.set("2032-09-29T02:00:00Z");
  expect((await upcomingDeadlines(ctx, { clientId: "cli_c2", withinDays: 400 })).find(d => d.periodKey === current.periodKey))
    .toMatchObject({ dueDate: current.dueDate, overdue: true });
});

it("control: ordinary demo last-done period yields the current annual return without generating work or mail", async () => {
  const ds = await deadlines();
  expect(ds.find(d => d.key === "NAR1")?.periodKey).toBe("NAR1:2026");
  expect(ds.some(d => d.periodKey === "NAR1:2025")).toBe(false);
  expect(ctx.mail.sent()).toHaveLength(0);
});

async function oldCddPerson() {
  const person = await createPerson(ctx, { nameEn: "Fictional Future Officer" });
  ctx.clock.set("2020-01-01T02:00:00Z"); await recordCdd(ctx, person.id, null, null);
  ctx.clock.set("2026-09-29T02:00:00Z");
  return person;
}
it("A10-D04: a future officer's overdue CDD is excluded until the appointment actually starts", async () => {
  const baseline = (await deadlines()).filter(d => d.key === "KYC");
  const p = await oldCddPerson();
  await appoint(ctx, { clientId: "cli_c1", personId: p.id, role: "director", fromDate: "2030-01-01" });
  expect((await deadlines()).filter(d => d.key === "KYC")).toEqual(baseline);
});
it("A10-D04: a future controller's overdue CDD is excluded until its effective period starts", async () => {
  const baseline = (await deadlines()).filter(d => d.key === "KYC");
  const p = await oldCddPerson();
  await addController(ctx, { clientId: "cli_c1", personId: p.id, nature: "Fictional control", registrableFrom: "2030-01-01", sourceTaskId: "temporal-import" });
  expect((await deadlines()).filter(d => d.key === "KYC")).toEqual(baseline);
});
it("A10-D04: a controller with future cessation remains covered by CDD until that cessation date", async () => {
  const p = await oldCddPerson();
  const scr = await addController(ctx, { clientId: "cli_c1", personId: p.id, nature: "Fictional control", registrableFrom: "2020-01-01", sourceTaskId: "temporal-import" });
  const before = (await deadlines()).filter(d => d.key === "KYC");
  expect(before[0].dueDate).toBe("2022-01-01");
  await ceaseController(ctx, "cli_c1", scr.id, "2030-01-01");
  expect((await deadlines()).filter(d => d.key === "KYC")).toEqual(before);
});
it("A10-D05: a future CDD verification cannot replace today's earlier review deadline", async () => {
  const before = (await deadlines()).filter(d => d.key === "KYC");
  const old = await ctx.db.select().from(cddRecord).where(eq(cddRecord.personId, "per_p1"));
  expect(old.length).toBeGreaterThan(0);
  ctx.clock.set("2032-01-01T02:00:00Z");
  // Give every previously verified demo person a future review, so a sibling's
  // unchanged date cannot accidentally conceal the incorrect maximum selection.
  const people = new Set((await ctx.db.select().from(cddRecord).where(eq(cddRecord.firmId, ctx.firmId))).map(r => r.personId));
  for (const personId of people) await recordCdd(ctx, personId, null, null);
  ctx.clock.set("2026-09-29T02:00:00Z");
  expect((await hasCurrentCdd(ctx, "per_p1"))?.verifiedOn).not.toBe("2032-01-01");
  expect((await deadlines()).filter(d => d.key === "KYC")).toEqual(before);
});

it("control: retained civil-date corpus handles HK midnight, leap-day arithmetic and month/year clamps exactly", () => {
  expect(hkDate(new Date("2026-12-31T15:59:59Z"))).toBe("2026-12-31");
  expect(hkDate(new Date("2026-12-31T16:00:00Z"))).toBe("2027-01-01");
  for (const [date, months, expected] of [
    ["2024-01-31", 1, "2024-02-29"], ["2025-01-31", 1, "2025-02-28"],
    ["2024-02-29", 12, "2025-02-28"], ["2026-12-31", 2, "2027-02-28"],
    ["2024-03-31", -1, "2024-02-29"],
  ] as const) { expect(addMonths(date, months)).toBe(expected); expect(isIsoDate(expected)).toBe(true); }
  expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
  expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
  expect(isIsoDate("2025-02-29")).toBe(false);
});
