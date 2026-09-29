import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { getTask, tasksForRequest } from "@/domain/engine";
import { nextInvoiceNumber, setInvoiceNumber, InvoiceError, invoiceWithLines } from "@/domain/invoices";
import { pollBank } from "@/domain/payments";
import { runReminders } from "@/domain/reminders";
import { runJobs } from "@/domain/jobs";
import { invoice, payment, bankTransaction, request as requestT } from "@/db/schema";
import "@/domain/accounting-sync";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
});

/** Silverstrand Holdings (cli_c2) pays upfront; HO Wing Yan is its director. */
async function sentRequest(opts: { clientEmail?: string; twoTasks?: boolean } = {}) {
  const email = opts.clientEmail ?? "wingyan@silverstrand.example";
  const acts = [action({ type: "start_request", playbookId: "hk.changeOffice", fields: [{ key: "newAddr", value: "20/F, 1 Queen's Road Central", quote: null }] })];
  if (opts.twoTasks) acts.push(action({ type: "start_request", playbookId: "hk.changeName", fields: [{ key: "newName", value: "Silverstrand Global Limited", quote: null }] }));
  ctx.llm.set("intake", intake({ client: { kind: "existing", clientId: email.includes("silverstrand") ? "cli_c2" : "cli_c1", companyName: null, companyNumber: null, senderName: "HO Wing Yan", reason: "linked" }, actions: acts }));
  ctx.llm.set("draft", goodDraft);
  const m = await ingestMessage(ctx, { channel: "email", provider: "fake", providerMessageId: `m${Math.random()}`, from: { email, name: "HO Wing Yan" }, to: [], cc: [], subject: "Changes", text: "Please handle.", receivedAt: ctx.clock.now(), attachments: [] });
  const r = await processInbound(ctx, m.id);
  const p = (await pendingProposals(ctx, { kind: "send_message" }))[0];
  await approveProposal(ctx, p.id);
  const inv = (await ctx.db.query.invoice.findFirst({ where: eq(invoice.requestId, r.requestId!) }))!;
  return { requestId: r.requestId!, inv, tasks: await tasksForRequest(ctx, r.requestId!) };
}

const stepKind = async (id: string) => { const t = await getTask(ctx, id); return t._steps[t.stepIndex]?.kind ?? t.status; };

describe("Invoice numbering", () => {
  it("a custom invoice number does not consume the auto sequence; duplicates and blanks are rejected; it can't change once sent", async () => {
    const { inv } = await sentRequest();
    const first = await nextInvoiceNumber(ctx);
    const [draft] = await ctx.db.insert(invoice).values({ id: "inv_x", firmId: ctx.firmId, clientId: "cli_c2", number: "TMP-1", status: "draft" }).returning();
    await setInvoiceNumber(ctx, draft.id, "SPECIAL-2026-A");
    const second = await nextInvoiceNumber(ctx);
    expect(Number(second.slice(-4))).toBe(Number(first.slice(-4)) + 1);
    await expect(setInvoiceNumber(ctx, draft.id, inv.number)).rejects.toBeInstanceOf(InvoiceError);
    await expect(setInvoiceNumber(ctx, draft.id, "  ")).rejects.toBeInstanceOf(InvoiceError);
    await expect(setInvoiceNumber(ctx, inv.id, "NEW-1")).rejects.toThrow(/sent/);
  });
});

describe("Payment matching (Airwallex deposits)", () => {
  it("a deposit quoting the invoice number with the exact amount advances every task on that invoice", async () => {
    const { inv, tasks } = await sentRequest({ twoTasks: true });
    for (const t of tasks) expect(await stepKind(t.id)).toBe("pay");
    await ctx.bank.simulateDeposit!({ amountCents: inv.totalCents, currency: "HKD", reference: `Payment for ${inv.number}`, payerName: "SILVERSTRAND HOLDINGS LTD" });
    const r = await pollBank(ctx);
    expect(r.matched).toBe(1);
    expect((await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))!.status).toBe("paid");
    const [pay] = await ctx.db.select().from(payment).where(eq(payment.invoiceId, inv.id));
    expect(pay).toMatchObject({ method: "bank_auto", amountCents: inv.totalCents });
    for (const t of tasks) expect(await stepKind(t.id)).toBe("collect");
  });

  it("the invoice number is found in a messy reference (spaces, lower case, no dash)", async () => {
    const { inv } = await sentRequest();
    await ctx.bank.simulateDeposit!({ amountCents: inv.totalCents, currency: "HKD", reference: `fps ${inv.number.toLowerCase().replace(/-/g, " ")}`, payerName: "HO W Y" });
    expect((await pollBank(ctx)).matched).toBe(1);
  });

  it("the same bank deposit is never recorded twice", async () => {
    const { inv } = await sentRequest();
    await ctx.bank.simulateDeposit!({ amountCents: inv.totalCents, currency: "HKD", reference: inv.number, payerName: "HO" });
    await pollBank(ctx);
    await pollBank(ctx);
    expect(await ctx.db.select().from(payment).where(eq(payment.invoiceId, inv.id))).toHaveLength(1);
    expect(await ctx.db.select().from(bankTransaction)).toHaveLength(1);
  });

  it("an underpayment is flagged for review and does not open the payment gate", async () => {
    const { inv, tasks } = await sentRequest();
    await ctx.bank.simulateDeposit!({ amountCents: inv.totalCents - 10000, currency: "HKD", reference: inv.number, payerName: "HO" });
    const r = await pollBank(ctx);
    expect(r.proposed).toBe(1);
    const p = (await pendingProposals(ctx, { kind: "match_payment" }))[0];
    expect(p.summary).toMatch(/less than/i);
    await approveProposal(ctx, p.id);
    expect((await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))!.status).toBe("part_paid");
    expect(await stepKind(tasks[0].id)).toBe("pay");
  });

  it("a deposit without a reference but with the exact amount of one open invoice is proposed, not auto-matched", async () => {
    const { inv, tasks } = await sentRequest();
    await ctx.bank.simulateDeposit!({ amountCents: inv.totalCents, currency: "HKD", reference: "", payerName: "HO WING YAN" });
    const r = await pollBank(ctx);
    expect(r.matched).toBe(0);
    const p = (await pendingProposals(ctx, { kind: "match_payment" }))[0];
    expect(p.payload).toMatchObject({ invoiceId: inv.id });
    await approveProposal(ctx, p.id);
    expect(await stepKind(tasks[0].id)).toBe("collect");
    const [pay] = await ctx.db.select().from(payment).where(eq(payment.invoiceId, inv.id));
    expect(pay.method).toBe("bank_approved");
  });

  it("a deposit matching nothing stays in the unmatched queue", async () => {
    await ctx.bank.simulateDeposit!({ amountCents: 123456, currency: "HKD", reference: "random", payerName: "Nobody" });
    const r = await pollBank(ctx);
    expect(r).toMatchObject({ matched: 0, proposed: 0, unmatched: 1 });
  });
});

describe("Xero sync via MCP", () => {
  it("an approved invoice is created in Xero once, even when the first attempt fails and the job retries", async () => {
    ctx.accounting.failNext = 1;
    const { inv } = await sentRequest();
    await runJobs(ctx);
    expect(ctx.accounting.invoices.size).toBe(0);
    ctx.clock.advanceSeconds(60);
    await runJobs(ctx);
    ctx.clock.advanceSeconds(600);
    await runJobs(ctx);
    expect(ctx.accounting.invoices.size).toBe(1);
    const row = (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))!;
    expect(row).toMatchObject({ xeroStatus: "synced", xeroInvoiceId: expect.any(String) });
    const x = [...ctx.accounting.invoices.values()][0];
    expect(x.number).toBe(inv.number);
    expect(x.lines.reduce((s, l) => s + l.amountCents, 0)).toBe(inv.totalCents);
  });

  it("a matched payment is recorded in Xero against the right invoice, after the invoice itself has synced", async () => {
    const { inv } = await sentRequest();
    await ctx.bank.simulateDeposit!({ amountCents: inv.totalCents, currency: "HKD", reference: inv.number, payerName: "HO" });
    await pollBank(ctx);
    await runJobs(ctx); // invoice then payment (payment waits for the invoice id)
    ctx.clock.advanceSeconds(60);
    await runJobs(ctx);
    const row = (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))!;
    expect(ctx.accounting.payments).toEqual([expect.objectContaining({ invoiceId: row.xeroInvoiceId, amountCents: inv.totalCents, reference: inv.number })]);
    const [pay] = await ctx.db.select().from(payment).where(eq(payment.invoiceId, inv.id));
    expect(pay.xeroStatus).toBe("synced");
  });
});

describe("Reminders and revisions", () => {
  it("an overdue invoice gets a reminder drafted to the billing contact in their language at +7 and +14 days, never twice per level", async () => {
    // Kowloon Bay Trading: 30-day terms; billing contact WONG Mei Kei (English).
    const { inv } = await sentRequest({ clientEmail: "director@kbtrading.example" });
    ctx.clock.advanceDays(30 + 7);
    ctx.llm.set("draft", (req: { messages: { content: unknown }[] }) => {
      const text = String(req.messages[req.messages.length - 1].content);
      const n = text.match(/CRCS-\d{4}-\d{4}/)?.[0] ?? "";
      const amt = text.match(/HK\$[\d,]+/)?.[0] ?? "";
      return { subject: `Reminder: ${n}`, body: `Dear Ms Wong,\n\nA gentle reminder that invoice ${n} for ${amt} is overdue.\n\nKaren Yip` };
    });
    expect(await runReminders(ctx)).toBe(1);
    expect(await runReminders(ctx)).toBe(0);
    const [p] = await pendingProposals(ctx, { kind: "send_message" });
    const draft = await ctx.db.query.message.findFirst({ where: (m, { eq }) => eq(m.id, p.payload.messageId as string) });
    expect(draft).toMatchObject({ toAddrs: ["meikei.wong@kbtrading.example"], language: "en" });
    expect(draft!.text).toContain(inv.number);
    ctx.clock.advanceDays(7);
    expect(await runReminders(ctx)).toBe(1);
  });

  it("revising a sent invoice creates a new version that supersedes the old one, only after approval", async () => {
    const { inv, requestId } = await sentRequest();
    const { proposeRevision } = await import("@/domain/invoices");
    const p = await proposeRevision(ctx, inv.id, { reason: "Fee agreed at HK$1,200", lines: [{ description: "Change of registered office", amountCents: 120000, kind: "fee" }] });
    expect((await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))!.status).toBe("sent");
    await approveProposal(ctx, p.id);
    const old = (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))!;
    expect(old.status).toBe("void");
    const req = (await ctx.db.query.request.findFirst({ where: eq(requestT.id, requestId) }))!;
    const nw = await invoiceWithLines(ctx, req.invoiceId!);
    expect(nw).toMatchObject({ number: `${inv.number}-R2`, version: 2, supersedesId: inv.id, totalCents: 120000, status: "sent" });
  });
});
