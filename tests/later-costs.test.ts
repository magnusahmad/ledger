// Costs that come up after invoicing (late fees, fines, stamp duty, court fees paid on the
// client's behalf) must be billed without rewriting an invoice the client already has.
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { createRequest, startTask } from "@/domain/engine";
import { createInvoiceForRequest, markInvoiceSent, invoiceWithLines } from "@/domain/invoices";
import { addCost } from "@/domain/costs";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { invoice } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
});

async function taskWithInvoice(status: "draft" | "sent" | "paid") {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.annualReturn" });
  const inv = (await createInvoiceForRequest(ctx, req.id))!;
  if (status !== "draft") await markInvoiceSent(ctx, inv.id);
  if (status === "paid") await ctx.db.update(invoice).set({ status: "paid", paidCents: inv.totalCents }).where(eq(invoice.id, inv.id));
  return { t, inv: (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))! };
}

const lateFee = { description: "Annual return late filing fee (paid to the Companies Registry)", amountCents: 87000, kind: "disbursement" as const };

describe("Costs added after invoicing", () => {
  it("a cost added while the invoice is still a draft goes on that invoice", async () => {
    const { t, inv } = await taskWithInvoice("draft");
    const r = await addCost(ctx, t.id, lateFee);
    expect(r).toMatchObject({ invoiceId: inv.id, additional: false, proposalId: null });
    const after = await invoiceWithLines(ctx, inv.id);
    expect(after.totalCents).toBe(inv.totalCents + 87000);
    expect(after.lines.at(-1)).toMatchObject({ description: lateFee.description, kind: "disbursement", taskId: t.id });
  });

  it("a cost added after the invoice was sent goes on an additional invoice, drafted to the client for approval, and sends nothing", async () => {
    const { t, inv } = await taskWithInvoice("sent");
    const r = await addCost(ctx, t.id, lateFee);
    expect(r.additional).toBe(true);
    expect((await invoiceWithLines(ctx, inv.id)).totalCents).toBe(inv.totalCents);
    const extra = await invoiceWithLines(ctx, r.invoiceId);
    expect(extra).toMatchObject({ status: "draft", totalCents: 87000, requestId: t.requestId, clientId: "cli_c1" });
    expect(extra.number).not.toBe(inv.number);
    const [p] = await pendingProposals(ctx, { kind: "send_message" });
    expect(p).toMatchObject({ id: r.proposalId, payload: { invoiceId: r.invoiceId } });
    expect(ctx.mail.sent()).toHaveLength(0);
  });

  it("approving it sends the additional invoice as a PDF and marks it issued", async () => {
    const { t } = await taskWithInvoice("sent");
    const r = await addCost(ctx, t.id, lateFee);
    await approveProposal(ctx, r.proposalId!);
    const extra = (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, r.invoiceId) }))!;
    expect(extra.status).toBe("sent");
    expect(ctx.mail.sent()[0].attachmentNames).toEqual([`${extra.number}.pdf`]);
    expect(ctx.mail.sent()[0].subject).toBe(`Invoice ${extra.number}: costs paid on your behalf`);
    expect(ctx.mail.sent()[0].text).not.toContain("/u/");
  });

  it("a paid invoice is never changed by a later cost", async () => {
    const { t, inv } = await taskWithInvoice("paid");
    const r = await addCost(ctx, t.id, lateFee);
    expect(r.invoiceId).not.toBe(inv.id);
    expect((await invoiceWithLines(ctx, inv.id)).lines.some((l) => l.description === lateFee.description)).toBe(false);
  });

  it("a cost needs a description and an amount above zero", async () => {
    const { t } = await taskWithInvoice("draft");
    await expect(addCost(ctx, t.id, { ...lateFee, description: " " })).rejects.toThrow(/describe/i);
    await expect(addCost(ctx, t.id, { ...lateFee, amountCents: 0 })).rejects.toThrow(/amount/i);
  });
});
