import { beforeEach, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { getPlaybook, savePlaybookVersion } from "@/domain/playbooks";
import { startManualRequest } from "@/domain/manual";
import { renderInvoicePdf } from "@/documents/invoice-pdf";
import { money } from "@/domain/labels";
import { invoice } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); });

it("money preserves ordinary whole, fractional and negative cents with their established currency labels", () => {
  for (const [cents, currency, expected] of [
    [0, "HKD", "HK$0"], [100, "HKD", "HK$1"], [12345, "HKD", "HK$123.45"],
    [1, "HKD", "HK$0.01"], [-1, "HKD", "HK$-0.01"], [-12345, "HKD", "HK$-123.45"],
    [-100, "HKD", "HK$-1"], [123456, "USD", "USD 1,234.56"], [10000, "CNY", "CNY 100"],
  ] as const) expect(money(cents, currency)).toBe(expected);
});

it("a supported maximum-safe saved quote keeps its exact final cent in displayed money and the actual invoice PDF", async () => {
  const pb = await getPlaybook(ctx, "hk.changeOffice");
  await savePlaybookVersion(ctx, pb.id, pb.version, JSON.stringify({ ...pb, feeCents: Number.MAX_SAFE_INTEGER, statutoryFees: [] }));
  const result = await startManualRequest(ctx, { clientId: "cli_c2", items: [{ playbookId: pb.id }], confirm: false });
  const saved = await ctx.db.query.invoice.findFirst({ where: eq(invoice.requestId, result.requestId) });
  expect(saved?.totalCents).toBe(Number.MAX_SAFE_INTEGER);
  const pdf = await renderInvoicePdf(ctx, saved!.id);
  const text = execFileSync("pdftotext", ["-layout", "-", "-"], { input: pdf, timeout: 10_000 }).toString().replace(/\s/g, "");
  const exact = "HK$90,071,992,547,409.91";
  expect.soft(money(Number.MAX_SAFE_INTEGER)).toBe(exact);
  expect.soft(text, "a correctly stored cent amount must not become a different amount on the saved client invoice").toContain(exact);
  expect(ctx.mail.sent()).toHaveLength(0);
});
