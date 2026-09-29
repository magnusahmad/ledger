import { beforeEach, expect, it } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { appoint, createPerson } from "@/domain/records";
import { significantController, charge } from "@/db/schema";
import { renderRegisters } from "@/documents/register-export";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });
it("printed registers exclude future appointments and controllers while retaining charge history known on the selected date", async () => {
  const p = await createPerson(ctx, { nameEn: "Future Director", nameZh: "未來董事" });
  await appoint(ctx, { clientId: "cli_c1", personId: p.id, role: "director", fromDate: "2026-10-01" });
  await ctx.db.insert(significantController).values({ id: "scr_future", firmId: ctx.firmId, clientId: "cli_c1", personId: p.id, nature: "Future control", registrableFrom: "2026-10-01" });
  await ctx.db.insert(charge).values({ id: "charge_old", firmId: ctx.firmId, clientId: "cli_c1", description: "Historic charge", createdOn: "2025-01-01", satisfiedOn: "2026-10-01" });
  const before = await renderRegisters(ctx, "cli_c1", "2026-09-30", "en");
  expect(before.text).not.toContain("Future Director");
  expect(before.text).toContain("Historic charge");
  expect(before.text).not.toContain("Satisfied 2026-10-01");
  const after = await renderRegisters(ctx, "cli_c1", "2026-10-01", "en");
  expect(after.text).toContain("Future Director");
  expect(after.text).toContain("Satisfied 2026-10-01");
  for (const title of ["Directors", "Secretaries", "Members", "Significant controllers", "Share movements", "Charges"]) expect(after.text).toContain(title);
  expect(after.pdf.subarray(0, 4).toString()).toBe("%PDF");
});
it("register exports reject another firm's company and impossible calendar dates", async () => {
  await expect(renderRegisters({ ...ctx, firmId: "other_firm" }, "cli_c1", "2026-09-29")).rejects.toThrow(/not found/i);
  await expect(renderRegisters(ctx, "cli_c1", "2025-02-30")).rejects.toThrow(/date/i);
});
it("Chinese register exports use the client's language and name", async () => {
  const r = await renderRegisters(ctx, "cli_c1", "2026-09-29", "tc");
  expect(r.text).toContain("董事登記冊");
  expect(r.text).toContain("成員登記冊");
  expect(r.text).not.toContain("Directors");
});
