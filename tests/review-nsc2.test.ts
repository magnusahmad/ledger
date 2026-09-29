import { PDFDocument } from "pdf-lib";
import { beforeEach, expect, it } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { startTask } from "@/domain/engine";
import { loadDocContext } from "@/documents/context";
import { formValues, generateForTask } from "@/documents/generate";
import { listFieldNames, readFormValues } from "@/documents/cr-forms";
import { buyback, issuedAsAt, membersAsAt } from "@/domain/shares";
import { planRegisterChanges } from "@/domain/register-effects";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });
async function buybackTask(capitalPaymentCents: number, missing = false) {
  const movement = { kind: "buyback", fromPersonId: "per_p2", fromName: "LEE Siu Ling", toPersonId: null, toName: null, toNameZh: null,
    className: "Ordinary", quantity: 1000, pricePerShareCents: 200, considerationCents: 200000,
    currency: "HKD", existingUnpaidCents: 0,
    ...(missing ? {} : { buybackFunding: capitalPaymentCents ? "capital" : "profits", capitalPaymentCents, postBuybackCapitalCents: 1000000 - capitalPaymentCents, paymentDate: "2026-10-15" }),
  };
  ctx.llm.on("structure", { items: [movement] });
  return startTask(ctx, { clientId: "cli_c1", playbookId: "hk.buyback", extracted: { buybackDetails: { value: "Buy back 1,000 fully paid ordinary shares from LEE Siu Ling at HK$2 each. Funds and post-buyback capital verified by staff." }, effDate: { value: "2026-10-15" }, solvencyStatement: { value: "verified-solvency.pdf" } } });
}

it("NSC2 private-company buyback records delivered shares and exact post-buyback capital, leaving listed-only fields blank", async () => {
  const t = await buybackTask(0);
  const values = formValues("NSC2", await loadDocContext(ctx, t.id));
  expect(values).toMatchObject({ "fill_3_P.1": "Ordinary", "fill_4_P.1": "1,000", "fill_5_P.1": "15/10/2026", "fill_4_P.2": "9,000", "fill_5_P.2": "10,000", "fill_6_P.2": "10,000", "fill_7_P.2": "0" });
  for (const key of ["fill_6_P.1", "fill_7_P.1", "fill_8_P.1", "fill_21_P.1", "fill_22_P.1", "fill_23_P.1"]) expect(values[key] ?? "").toBe("");
  const fields = await listFieldNames("NSC2");
  for (const key of Object.keys(values)) expect(fields.has(key), key).toBe(true);
  const docs = await generateForTask(ctx, t.id);
  const nsc2 = docs.find(d => d.template === "cr:NSC2")!;
  expect(nsc2).toBeDefined();
  const stored = await ctx.db.query.document.findFirst({ where: (d, { eq }) => eq(d.id, nsc2.id) });
  const filled = await PDFDocument.load(await ctx.storage.get(stored!.storageKey!));
  // The showcase company's corporate secretary signs; strike "Director" only.
  expect(filled.getForm().getDropdown("Dropdown_1_P.2").getSelected()).toEqual(["—".repeat(93)]);
  expect(filled.getForm().getDropdown("Dropdown_2_P.2").getSelected()).toEqual([" "]);
  expect(await readFormValues(await ctx.storage.get(stored!.storageKey!))).toMatchObject({ "fill_4_P.1": "1,000", "fill_5_P.2": "10,000" });
});

it("capital-funded NSC2 states the payment and the register applies exactly that reduction", async () => {
  const t = await buybackTask(200000);
  const values = formValues("NSC2", await loadDocContext(ctx, t.id));
  expect(values).toMatchObject({ "fill_23_P.1": "HKD 2,000", "fill_24_P.1": "15", "fill_25_P.1": "10", "fill_26_P.1": "2026", "fill_5_P.2": "8,000", "fill_6_P.2": "8,000" });
  const plan = await planRegisterChanges(ctx, t.id);
  expect(plan[0].description).toMatch(/capital.*2,000/i);
  for (const change of plan) await change.apply();
  expect((await issuedAsAt(ctx, "cli_c1", "2026-10-15"))[0]).toMatchObject({ issued: 9000, paidUpCents: 800000 });
  expect((await issuedAsAt(ctx, "cli_c1", "2026-10-14"))[0]).toMatchObject({ issued: 10000, paidUpCents: 1000000 });
});

it("a profits-funded buyback cancels shares without a pro-rata reduction in share capital", async () => {
  const capital = (await issuedAsAt(ctx, "cli_c1", "2026-10-15"))[0];
  await buyback(ctx, { clientId: "cli_c1", shareClassId: capital.shareClassId, fromPersonId: "per_p2", date: "2026-10-15", quantity: 1000, considerationCents: 200000, capitalReductionCents: 0 });
  expect((await issuedAsAt(ctx, "cli_c1", "2026-10-15"))[0]).toMatchObject({ issued: 9000, paidUpCents: 1000000 });
  expect((await membersAsAt(ctx, "cli_c1", "2026-10-15")).find(m => m.personId === "per_p2")?.quantity).toBe(2000);
});

it("NSC2 refuses to guess funding or post-buyback capital from the purchase price", async () => {
  const t = await buybackTask(0, true);
  await expect(generateForTask(ctx, t.id)).rejects.toThrow(/funding|capital/i);
  expect(await ctx.db.query.document.findMany({ where: (d, { eq }) => eq(d.taskId, t.id) })).toHaveLength(0);
});
