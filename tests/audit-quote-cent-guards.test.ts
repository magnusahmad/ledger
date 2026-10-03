import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { getPlaybook, savePlaybookVersion } from "@/domain/playbooks";
import { startManualRequest } from "@/domain/manual";
import { invoiceWithLines, setLineAmount } from "@/domain/invoices";
import { request } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
});
async function quote(feeA: number, chargeA: number, feeB: number, chargeB: number) {
  for (const [id, feeCents, amountCents] of [["hk.changeOffice", feeA, chargeA], ["hk.changeName", feeB, chargeB]] as const) {
    const pb = await getPlaybook(ctx, id);
    await savePlaybookVersion(ctx, id, pb.version, JSON.stringify({ ...pb, feeCents, statutoryFees: [{ description: "Fictional charge", amountCents }] }));
  }
  const result = await startManualRequest(ctx, { clientId: "cli_c2", items: [{ playbookId: "hk.changeOffice" }, { playbookId: "hk.changeName" }], confirm: true });
  const req = (await ctx.db.query.request.findFirst({ where: eq(request.id, result.requestId) }))!;
  return { result, inv: await invoiceWithLines(ctx, req.invoiceId!) };
}
it("a normal reviewed multi-playbook quote retains every fee and disbursement cent behind human approval", async () => {
  const { result, inv } = await quote(101, 7, 250, 13);
  expect(inv.totalCents).toBe(371);
  expect(inv.lines.map(l => l.amountCents)).toEqual([101, 250, 7, 13]);
  expect(inv.status).toBe("draft");
  expect(result.proposalId).toBeTruthy();
  expect(ctx.mail.sent()).toHaveLength(0);
});
it("a combined quote at the inclusive safe-integer cent limit retains its exact total", async () => {
  const { inv } = await quote(Number.MAX_SAFE_INTEGER - 1000, 201, 796, 3);
  expect(inv.totalCents).toBe(Number.MAX_SAFE_INTEGER);
  expect(inv.lines.reduce((sum, l) => sum + BigInt(l.amountCents), BigInt(0))).toBe(BigInt(Number.MAX_SAFE_INTEGER));
  expect(ctx.mail.sent()).toHaveLength(0);
});
it("recalculating an edited quote rejects aggregate overflow and rolls back its changed price", async () => {
  const { inv } = await quote(101, 7, 250, 13);
  await setLineAmount(ctx, inv.lines[0].id, Number.MAX_SAFE_INTEGER - 500);
  const before = await invoiceWithLines(ctx, inv.id);
  await expect(setLineAmount(ctx, inv.lines[1].id, 1000)).rejects.toThrow(/safe integer cents/i);
  expect(await invoiceWithLines(ctx, inv.id)).toEqual(before);
  expect(ctx.mail.sent()).toHaveLength(0);
});
