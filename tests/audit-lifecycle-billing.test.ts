// Bounded mixed lifecycle corpus; fictional clients, real PG, scripted AI/fake providers.
// BUILD_SPEC §§4.2, 6–7: changed priced work needs human-reviewed billing; immutable issued
// invoice/accepted receipt, coherent active task/send cards. DECISIONS #39: later expenses
// get an additional invoice and do not re-close the existing task's payment gate.
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, review, goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { approveProposal, getProposal, pendingProposals } from "@/domain/proposals";
import { currentStep, getTask, tasksForRequest } from "@/domain/engine";
import { invoiceForRequest } from "@/domain/outbound";
import { invoiceWithLines, setLineAmount } from "@/domain/invoices";
import { startManualRequest } from "@/domain/manual";
import { batchStart } from "@/domain/batch";
import { matchDeposit } from "@/domain/payments";
import { addCost } from "@/domain/costs";
import { applyReview } from "@/agent/review";
import { getPlaybook } from "@/domain/playbooks";
import { recordMailboxReply } from "@/domain/mailbox-replies";
import { deliveryPayload } from "@/domain/mail-delivery";
import { client, contact, conversation, invoiceLine, mailDelivery, message, payment, task, taskEvent } from "@/db/schema";
import { Crypto } from "@/lib/crypto";

let ctx: TestCtx, seq: number;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx(); seq = 0;
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
  ctx.llm.on("review", review({ items: [] }));
  ctx.llm.on("mailbox_review", { changes: [], summary: "No task changes" });
});
const sender = { email: "director@kbtrading.example", name: "CHAN Tai Man" };
async function inbound(actions: Parameters<typeof intake>[0]["actions"], text: string, replyTo?: string) {
  ctx.llm.set("intake", intake({ actions }));
  const m = await ingestMessage(ctx, { channel: "email", provider: "fake", providerMessageId: `lifecycle-${++seq}`, rfcMessageId: `<lifecycle-${seq}@example>`, inReplyTo: replyTo ?? null, from: sender, to: [ctx.mail.address], cc: [], subject: "Mixed client instructions", text, attachments: [], receivedAt: ctx.clock.now() });
  return processInbound(ctx, m.id);
}
const initialItems = [
  { playbookId: "hk.changeOffice" },
  { playbookId: "hk.changeParticulars", person: { personId: "per_p1" } },
];
async function open(origin: "intake" | "manual" = "intake", terms = 0, third = false) {
  await ctx.db.update(client).set({ paymentTermsDays: terms }).where(eq(client.id, "cli_c1"));
  const items = [...initialItems, ...(third ? [{ playbookId: "hk.changeName" }] : [])];
  if (origin === "manual") return startManualRequest(ctx, { clientId: "cli_c1", items, notes: "Office and director particulars discussed with the client", confirm: true });
  const r = await inbound(items.map(i => action({ type: "start_request", playbookId: i.playbookId, ...(i.person ? { person: { mode: "existing", personId: i.person.personId, nameEn: "CHAN Tai Man", nameZh: null, email: sender.email } } : {}) })), "Please change our office and update my particulars.");
  const p = (await pendingProposals(ctx, { kind: "send_message" })).find(p => p.requestId === r.requestId)!;
  return { requestId: r.requestId!, taskIds: r.taskIds, proposalId: p.id };
}
async function issue(proposalId: string) {
  const p = await getProposal(ctx, proposalId);
  expect(ctx.mail.sent()).toHaveLength(0);
  await approveProposal(ctx, p.id);
  const inv = (await invoiceForRequest(ctx, p.requestId!))!;
  expect(ctx.mail.sent()).toHaveLength(1);
  expect(ctx.mail.sent()[0].attachmentNames).toEqual([`${inv.number}.pdf`]);
  const journal = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.sourceKey, `message:${p.payload.messageId}`) }))!;
  const payload = deliveryPayload(ctx, journal);
  expect(payload.attachments?.[0].content.subarray(0, 4).toString()).toBe("%PDF");
  return { inv, receipt: structuredClone(ctx.mail.sent()[0]), journalId: journal.id, attachmentHash: Crypto.sha256(payload.attachments![0].content) };
}
async function deposit(invoiceId: string, amountCents: number) {
  const inv = await invoiceWithLines(ctx, invoiceId);
  const r = await matchDeposit(ctx, { providerTxId: `deposit-${++seq}`, amountCents, currency: "HKD", reference: inv.number, payerName: sender.name, receivedAt: ctx.clock.now() });
  if (r === "proposed") {
    const p = (await pendingProposals(ctx, { kind: "match_payment" })).at(-1)!;
    await approveProposal(ctx, p.id);
  } else expect(r).toBe("matched");
}
async function suggest(taskId: string, mode: "add" | "swap", playbookId = "hk.annualReturn", invoiceChange = false) {
  ctx.llm.set("review", review({ items: [], playbookFit: mode, suggestedPlaybookId: playbookId, invoiceChange: { needed: invoiceChange, reason: invoiceChange ? "New priced annual return service" : null }, summary: `Client ${mode}s ${playbookId}` }));
  const r = await inbound([action({ type: "change_request", taskId, description: `Please ${mode} ${playbookId}` })], `Please ${mode} the annual return service.`);
  const p = (await pendingProposals(ctx)).find(p => r.proposalIds.includes(p.id) && p.kind === "change_request")!;
  expect(p).toBeTruthy();
  const before = (await ctx.db.select({ id: task.id }).from(task)).map(t => t.id);
  await approveProposal(ctx, p.id);
  const created = (await ctx.db.select().from(task)).filter(t => !before.includes(t.id));
  expect(created).toHaveLength(1);
  return { added: await getTask(ctx, created[0].id), result: r };
}
async function cancelCard(taskId: string) {
  ctx.llm.set("review", review({ items: [] }));
  const r = await inbound([action({ type: "cancel_request", taskId, description: "Client cancelled this service only" })], "Cancel this service only.");
  return (await pendingProposals(ctx)).find(p => r.proposalIds.includes(p.id) && p.kind === "cancel_task")!;
}
async function assertReceiptUnchanged(issued: Awaited<ReturnType<typeof issue>>) {
  expect(ctx.mail.sent()[0]).toEqual(issued.receipt);
  const j = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.id, issued.journalId) }))!;
  expect(Crypto.sha256(deliveryPayload(ctx, j).attachments![0].content)).toBe(issued.attachmentHash);
}
function amounts(lines: { kind: string; amountCents: number }[]) {
  return lines.map(l => [l.kind, l.amountCents]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
async function expectedCharges(playbookId: string) {
  const pb = await getPlaybook(ctx, playbookId);
  return amounts([{ kind: "fee", amountCents: pb.feeCents }, ...(pb.statutoryFees ?? []).map(s => ({ kind: "disbursement", amountCents: s.amountCents }))]);
}
// Reproducible seeds select origin, two/three initial tasks, terms, payment state and
// sibling cancellation. 4 samples, 12–18 domain calls each; no engine step-pointer writes.
const corpus = [
  { seed: 0xB311, origin: "intake" as const, terms: 0, paid: "sent", third: false, cancelSibling: false, invoiceChange: false },
  { seed: 0xB312, origin: "manual" as const, terms: 0, paid: "partial", third: true, cancelSibling: true, invoiceChange: true },
  { seed: 0xB313, origin: "intake" as const, terms: 0, paid: "paid", third: true, cancelSibling: true, invoiceChange: false },
  { seed: 0xB314, origin: "manual" as const, terms: 30, paid: "sent", third: false, cancelSibling: false, invoiceChange: true },
];

describe("L-B01: new service after issuance has an explicit human-reviewed quote", () => {
  for (const v of corpus) it(`priced add after ${v.paid} preserves issued billing and queues a quote (${v.origin}, seed=${v.seed})`, async () => {
    const r = await open(v.origin, v.terms, v.third);
    const issued = await issue(r.proposalId!);
    if (v.paid !== "sent") await deposit(issued.inv.id, v.paid === "partial" ? 12345 : issued.inv.totalCents);
    if (v.cancelSibling) {
      const cancel = await cancelCard(r.taskIds[1]);
      await approveProposal(ctx, cancel.id);
      expect((await getTask(ctx, r.taskIds[1])).status).toBe("cancelled");
    }
    const oldInvoice = await invoiceWithLines(ctx, issued.inv.id);
    const oldPayments = await ctx.db.select().from(payment).where(eq(payment.invoiceId, issued.inv.id));
    const { added } = await suggest(r.taskIds[0], "add", "hk.annualReturn", v.invoiceChange);
    expect(await invoiceWithLines(ctx, issued.inv.id)).toEqual(oldInvoice);
    expect(await ctx.db.select().from(payment).where(eq(payment.invoiceId, issued.inv.id))).toEqual(oldPayments);
    await assertReceiptUnchanged(issued);
    expect(ctx.mail.sent()).toHaveLength(1);
    const newLines = await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.taskId, added.id));
    // Staff may edit this quote; the initial seed must cover the configured priced service.
    expect(amounts(newLines), "new priced work disappeared from billing").toEqual(await expectedCharges(added.playbookId));
    const cards = await pendingProposals(ctx, { kind: "send_message" });
    const quote = cards.find(p => (p.payload.taskIds as string[] | undefined)?.includes(added.id));
    expect(quote, "new service needs a human-reviewed quote before its send step is complete").toBeTruthy();
    expect(currentStep(await getTask(ctx, added.id))?.kind).toBe("send");
    await approveProposal(ctx, quote!.id);
    expect(ctx.mail.sent()).toHaveLength(2);
    const newInvoice = await invoiceWithLines(ctx, newLines[0].invoiceId);
    expect(newInvoice.id).not.toBe(oldInvoice.id);
    expect(ctx.mail.sent()[1].attachmentNames).toEqual([`${newInvoice.number}.pdf`]);
    expect(currentStep(await getTask(ctx, added.id))?.kind).toBe(v.terms ? "collect" : "pay");
    const cost = await addCost(ctx, r.taskIds[0], { kind: "disbursement", description: `Late postage seed ${v.seed}`, amountCents: 199 + v.seed % 7 });
    expect(cost.additional).toBe(true);
    expect(ctx.mail.sent()).toHaveLength(2);
    await approveProposal(ctx, cost.proposalId!);
    expect(await invoiceWithLines(ctx, oldInvoice.id)).toEqual(oldInvoice);
    await assertReceiptUnchanged(issued);
  });
});

describe("Draft changes preserve complete fees and a usable approval path", () => {
  for (const mode of ["add", "swap"] as const) it(`L-B02: a draft ${mode} includes every configured statutory charge of the new playbook`, async () => {
    const r = await open("intake");
    const { added } = await suggest(r.taskIds[0], mode);
    const inv = (await invoiceForRequest(ctx, r.requestId))!;
    expect(inv.status).toBe("draft");
    const lines = (await invoiceWithLines(ctx, inv.id)).lines.filter(l => l.taskId === added.id);
    expect(amounts(lines)).toEqual(await expectedCharges(added.playbookId));
    expect(ctx.mail.sent()).toHaveLength(0);
  });
  it("L-B03: approving every current request reply advances a draft-added task out of send", async () => {
    const r = await open("manual");
    const { added } = await suggest(r.taskIds[0], "add", "hk.changeOffice");
    const cards = await pendingProposals(ctx, { kind: "send_message" });
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) if ((await getProposal(ctx, card.id)).status === "pending") await approveProposal(ctx, card.id);
    expect((await invoiceForRequest(ctx, r.requestId))!.status).toBe("sent");
    expect(currentStep(await getTask(ctx, added.id))?.kind, "an active added task has no usable send approval").not.toBe("send");
  });
  it("L-B04: an old last-task cancellation cannot void billing for a subsequently added active sibling", async () => {
    const r = await open("intake");
    await approveProposal(ctx, (await cancelCard(r.taskIds[1])).id);
    const staleCancel = await cancelCard(r.taskIds[0]);
    expect(staleCancel.payload.voidInvoice).toBe(true);
    const { added } = await suggest(r.taskIds[0], "add", "hk.changeOffice");
    // Either refresh/reject the stale card or safely cancel only its original task.
    await approveProposal(ctx, staleCancel.id).catch(e => expect(String(e)).toMatch(/chang|stale|superseded|review/i));
    expect((await getTask(ctx, added.id)).status).toBe("open");
    expect((await invoiceForRequest(ctx, r.requestId))!.status, "a new active sibling was left on a void invoice").not.toBe("void");
  });
});

it("L-B05: a firm-initiated batch draft is linked to its current approval card", async () => {
  expect((await batchStart(ctx, { playbookId: "hk.annualReturn", clientIds: ["cli_c1"], periodYear: 2027 })).created).toBe(1);
  const p = (await pendingProposals(ctx, { kind: "send_message" })).find(p => p.payload.batch)!;
  const m = (await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) }))!;
  expect(m.proposalId, "manual mailbox replies cannot withdraw an unlinked batch draft").toBe(p.id);

});

it("control: partial payment, sibling cancellation and later cost preserve the primary gate and accepted receipt", async () => {
  const r = await open("intake"); const issued = await issue(r.proposalId!);
  await deposit(issued.inv.id, 12345);
  expect(currentStep(await getTask(ctx, r.taskIds[0]))?.kind).toBe("pay");
  const cancel = await cancelCard(r.taskIds[1]); expect(cancel.payload.voidInvoice).toBe(false);
  await approveProposal(ctx, cancel.id);
  const snapshot = await invoiceWithLines(ctx, issued.inv.id);
  const receipts = await ctx.db.select().from(payment).where(eq(payment.invoiceId, issued.inv.id));
  const late = await addCost(ctx, r.taskIds[0], { kind: "disbursement", description: "Additional courier paid on behalf", amountCents: 21800 });
  expect(late.additional).toBe(true); expect(ctx.mail.sent()).toHaveLength(1);
  await approveProposal(ctx, late.proposalId!);
  expect(await invoiceWithLines(ctx, issued.inv.id)).toEqual(snapshot);
  expect(await ctx.db.select().from(payment).where(eq(payment.invoiceId, issued.inv.id))).toEqual(receipts);
  expect(currentStep(await getTask(ctx, r.taskIds[0]))?.kind).toBe("pay");
  await deposit(issued.inv.id, snapshot.totalCents - snapshot.paidCents);
  expect(currentStep(await getTask(ctx, r.taskIds[0]))?.kind).toBe("collect");
  const unpaidExtra = await invoiceWithLines(ctx, late.invoiceId); expect(unpaidExtra.status).toBe("sent");
  await assertReceiptUnchanged(issued);
});

it("control: cancelling all paid services retains paid invoice, exact payment rows and the issued PDF", async () => {
  const r = await open("manual"); const issued = await issue(r.proposalId!);
  await deposit(issued.inv.id, issued.inv.totalCents);
  const snapshot = await invoiceWithLines(ctx, issued.inv.id);
  const receipts = await ctx.db.select().from(payment).where(eq(payment.invoiceId, issued.inv.id));
  for (const id of r.taskIds) await approveProposal(ctx, (await cancelCard(id)).id);
  expect((await tasksForRequest(ctx, r.requestId)).every(t => t.status === "cancelled")).toBe(true);
  expect(await invoiceWithLines(ctx, issued.inv.id)).toEqual(snapshot);
  expect(await ctx.db.select().from(payment).where(eq(payment.invoiceId, issued.inv.id))).toEqual(receipts);
  await assertReceiptUnchanged(issued); expect(ctx.mail.sent()).toHaveLength(1);
});

it("control: credit work advances before payment and late costs keep the original send and payment evidence", async () => {
  const r = await open("intake", 30, true); const issued = await issue(r.proposalId!);
  for (const id of r.taskIds) expect(currentStep(await getTask(ctx, id))?.kind).toBe("collect");
  const snapshot = await invoiceWithLines(ctx, issued.inv.id);
  const late = await addCost(ctx, r.taskIds[0], { kind: "fee", description: "Additional handling agreed by staff", amountCents: 12300 });
  await approveProposal(ctx, late.proposalId!);
  expect(await invoiceWithLines(ctx, issued.inv.id)).toEqual(snapshot);
  await assertReceiptUnchanged(issued);
  for (const id of r.taskIds) expect(currentStep(await getTask(ctx, id))?.kind).toBe("collect");
  expect(ctx.mail.sent()).toHaveLength(2);
});

// Provider thread binding is fixture transport metadata, not a task/approval-state shortcut.
// The business actions below use batchStart and recordMailboxReply unchanged.
it("L-B05: a manual mailbox reply on a batch thread withdraws the old draft and preserves a fresh invoice review", async () => {
  await batchStart(ctx, { playbookId: "hk.annualReturn", clientIds: ["cli_c1"], periodYear: 2027 });
  const p = (await pendingProposals(ctx, { kind: "send_message" })).find(p => p.payload.batch)!;
  const m = (await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) }))!;
  await ctx.db.update(conversation).set({ providerThreadId: "fixture-batch-thread" }).where(eq(conversation.id, m.conversationId));
  const observed = await recordMailboxReply(ctx, ctx.mail.deliver({ from: { email: ctx.mail.address, name: "Karen" }, to: [sender.email], subject: "Re: annual return", text: "I replied to your annual return enquiry manually; the invoice and upload details still need delivery", providerThreadId: "fixture-batch-thread" }));
  expect(observed.withdrawn).toContain(p.id);
  expect((await getProposal(ctx, p.id)).status).toBe("superseded");
  const fresh = (await pendingProposals(ctx, { kind: "send_message" })).find(card => card.payload.replaces === p.id)!;
  expect(fresh).toBeTruthy();
  const freshDraft = (await ctx.db.query.message.findFirst({ where: eq(message.id, fresh.payload.messageId as string) }))!;
  expect(freshDraft.proposalId).toBe(fresh.id);
  expect(ctx.mail.sent()).toHaveLength(0);
  const inv = (await invoiceForRequest(ctx, p.requestId!))!; expect(inv.status).toBe("draft");
  await approveProposal(ctx, fresh.id);
  expect(ctx.mail.sent()).toHaveLength(1);
  expect(ctx.mail.sent()[0].attachmentNames).toEqual([`${inv.number}.pdf`]);
});

it("an approved cancellation records its own approval while withdrawing obsolete task actions", async () => {
  const r = await open("manual");
  const p = await cancelCard(r.taskIds[0]);
  await approveProposal(ctx, p.id);
  expect((await getProposal(ctx, p.id)).status).toBe("approved");
  expect((await getTask(ctx, r.taskIds[0])).status).toBe("cancelled");
});

it("a post-issued service change is recorded as approved follow-up work rather than a meeting", async () => {
  const r = await open("intake");
  await issue(r.proposalId!);
  const { added } = await suggest(r.taskIds[0], "add");
  const card = (await pendingProposals(ctx, { kind: "send_message" })).find(p => (p.payload.taskIds as string[] ?? []).includes(added.id));
  expect(card).toBeTruthy();
  const draft = await ctx.db.query.message.findFirst({ where: eq(message.id, card!.payload.messageId as string) });
  expect((draft!.intake?.facts as { context?: string }).context).toBe("change");
  const events = await ctx.db.select().from(taskEvent).where(eq(taskEvent.taskId, added.id));
  expect(events.some(e => e.summary.includes("approved follow-up"))).toBe(true);
  expect(events.some(e => e.summary.includes("meeting or call"))).toBe(false);
});

for (const alreadySent of [false, true]) it(`L-B01/L-B03: priced work added ${alreadySent ? "after" : "before"} a free request send gets reviewed billing and its normal payment gate`, async () => {
  // These two boundary cases protect upfront gating; the demo client otherwise has 30-day credit.
  await ctx.db.update(client).set({ paymentTermsDays: 0 }).where(eq(client.id, "cli_c1"));
  const freePb = await getPlaybook(ctx, "hk.kycReview");
  expect(freePb.feeCents).toBe(0); expect(freePb.statutoryFees ?? []).toHaveLength(0);
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: freePb.id }], confirm: true });
  expect(await invoiceForRequest(ctx, r.requestId)).toBeNull();
  expect(currentStep(await getTask(ctx, r.taskIds[0]))?.kind).toBe("send");
  if (alreadySent) {
    await approveProposal(ctx, r.proposalId!);
    expect(ctx.mail.sent()).toHaveLength(1); expect(ctx.mail.sent()[0].attachmentNames).toEqual([]);
    expect(currentStep(await getTask(ctx, r.taskIds[0]))?.kind).toBe("collect");
  }
  const originalReceipt = alreadySent ? structuredClone(ctx.mail.sent()[0]) : null;
  const before = (await ctx.db.select({ id: task.id }).from(task)).map(t => t.id);
  const suggestions = await applyReview(ctx, r.taskIds[0], review({ items: [], playbookFit: "add", suggestedPlaybookId: "hk.annualReturn", summary: "Client also requests a priced annual return service" }), { clientId: "cli_c1" });
  const change = (await pendingProposals(ctx)).find(p => suggestions.proposals.includes(p.id) && p.kind === "change_request")!;
  expect(change).toBeTruthy();
  expect(ctx.mail.sent()).toHaveLength(alreadySent ? 1 : 0);
  await approveProposal(ctx, change.id);
  const created = (await ctx.db.select().from(task)).filter(t => !before.includes(t.id));
  expect(created).toHaveLength(1);
  const added = await getTask(ctx, created[0].id);
  const lines = await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.taskId, added.id));
  expect(amounts(lines), "priced add to a free request must not bypass billing merely because invoiceId is null").toEqual(await expectedCharges(added.playbookId));
  const quote = (await pendingProposals(ctx, { kind: "send_message" })).find(p => (p.payload.taskIds as string[] | undefined)?.includes(added.id));
  expect(quote, "newly priced service needs a usable approval").toBeTruthy();
  expect(currentStep(added)?.kind).toBe("send");
  expect(ctx.mail.sent()).toHaveLength(alreadySent ? 1 : 0);
  await approveProposal(ctx, quote!.id);
  const inv = await invoiceWithLines(ctx, lines[0].invoiceId);
  expect(inv.status).toBe("sent");
  expect(ctx.mail.sent().at(-1)!.attachmentNames).toEqual([`${inv.number}.pdf`]);
  const journal = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.sourceKey, `message:${quote!.payload.messageId}`) }))!;
  expect(deliveryPayload(ctx, journal).attachments![0].content.subarray(0,4).toString()).toBe("%PDF");
  expect(currentStep(await getTask(ctx, added.id))?.kind).toBe("pay");
  if (alreadySent) expect(ctx.mail.sent()[0]).toEqual(originalReceipt);
});

it("control: a paid issued swap preserves accepted billing and quotes replacement work through its own human send and payment gates", async () => {
  const r = await open("manual", 0, true); const issued = await issue(r.proposalId!);
  await deposit(issued.inv.id, issued.inv.totalCents);
  const original = await invoiceWithLines(ctx, issued.inv.id);
  const payments = await ctx.db.select().from(payment).where(eq(payment.invoiceId, original.id));
  expect((await getTask(ctx, r.taskIds[0])).status).toBe("open");
  const { added } = await suggest(r.taskIds[0], "swap");
  expect((await getTask(ctx, r.taskIds[0])).status).toBe("cancelled");
  expect(added.requestId).not.toBe(r.requestId);
  expect(await invoiceWithLines(ctx, original.id)).toEqual(original);
  expect(await ctx.db.select().from(payment).where(eq(payment.invoiceId, original.id))).toEqual(payments);
  await assertReceiptUnchanged(issued); expect(ctx.mail.sent()).toHaveLength(1);
  const lines = await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.taskId, added.id));
  expect(amounts(lines)).toEqual(await expectedCharges(added.playbookId));
  const quote = (await pendingProposals(ctx, { kind: "send_message" })).find(p => (p.payload.taskIds as string[] | undefined)?.includes(added.id))!;
  expect(quote).toBeTruthy(); expect(currentStep(added)?.kind).toBe("send");
  // Draft quote is staff-editable; seeded replacement fee is not an implicit old-fee offset.
  const fee = lines.find(l => l.kind === "fee")!;
  await setLineAmount(ctx, fee.id, fee.amountCents + 12300);
  const edited = await invoiceWithLines(ctx, fee.invoiceId);
  expect(edited.totalCents).toBe(82800);
  // Staff review also corrects the message total before sending the edited quote.
  const quoteDraft = (await ctx.db.query.message.findFirst({ where: eq(message.id, quote.payload.messageId as string) }))!;
  await approveProposal(ctx, quote.id, { edits: { text: quoteDraft.text!.replace("HK$705", "HK$828") } });
  expect(ctx.mail.sent().at(-1)!.text).toContain("HK$828");
  expect(ctx.mail.sent().at(-1)!.attachmentNames).toEqual([`${edited.number}.pdf`]);
  expect(currentStep(await getTask(ctx, added.id))?.kind).toBe("pay");
  await deposit(edited.id, edited.totalCents);
  expect(currentStep(await getTask(ctx, added.id))?.kind).toBe("collect");
  expect(await invoiceWithLines(ctx, original.id)).toEqual(original);
  expect(await ctx.db.select().from(payment).where(eq(payment.invoiceId, original.id))).toEqual(payments);
  await assertReceiptUnchanged(issued);
});

it("control: a draft swap preserves a staff-edited untouched sibling price and refreshes the full active-task quote", async () => {
  const r = await open("manual", 0, true);
  const original = (await invoiceForRequest(ctx, r.requestId))!;
  const old = await invoiceWithLines(ctx, original.id);
  const untouched = old.lines.filter(l => l.taskId === r.taskIds[1]);
  expect(untouched).toHaveLength(1);
  await setLineAmount(ctx, untouched[0].id, 43210);
  const preserved = (await invoiceWithLines(ctx, original.id)).lines.filter(l => l.taskId === r.taskIds[1]);
  const { added } = await suggest(r.taskIds[0], "swap");
  const current = await invoiceWithLines(ctx, original.id);
  expect(current.lines.filter(l => l.taskId === r.taskIds[1])).toEqual(preserved);
  expect(current.lines.some(l => l.taskId === r.taskIds[0])).toBe(false);
  expect(amounts(current.lines.filter(l => l.taskId === added.id))).toEqual(await expectedCharges(added.playbookId));
  const activeIds = (await tasksForRequest(ctx, r.requestId)).filter(t => t.status === "open").map(t => t.id).sort();
  const quote = (await pendingProposals(ctx, { kind: "send_message" })).find(p => p.requestId === r.requestId && p.payload.purpose === "request")!;
  expect((quote.payload.taskIds as string[]).slice().sort()).toEqual(activeIds);
  expect(ctx.mail.sent()).toHaveLength(0);
  await approveProposal(ctx, quote.id);
  for (const id of activeIds) expect(currentStep(await getTask(ctx, id))?.kind).toBe("pay");
  expect(ctx.mail.sent()).toHaveLength(1);
  expect(ctx.mail.sent()[0].attachmentNames).toEqual([`${current.number}.pdf`]);
});

for (const language of ["en", "tc", "sc"] as const) it(`control: the ${language} fallback follow-up quote states additional work and separate quote without inventing a meeting`, async () => {
  const r = await open("manual"); await issue(r.proposalId!);
  await ctx.db.update(client).set({ messageLang: language }).where(eq(client.id, "cli_c1"));
  await ctx.db.update(contact).set({ language }).where(eq(contact.clientId, "cli_c1"));
  ctx.llm.set("draft", { subject: "Invalid short fixture", body: "Missing required invoice and link" });
  const { added } = await suggest(r.taskIds[0], "add");
  const quote = (await pendingProposals(ctx, { kind: "send_message" })).find(p => (p.payload.taskIds as string[] | undefined)?.includes(added.id))!;
  expect(quote.payload.draftSource).toBe("template");
  const draft = (await ctx.db.query.message.findFirst({ where: eq(message.id, quote.payload.messageId as string) }))!;
  const inv = (await invoiceForRequest(ctx, added.requestId!))!;
  const expected = { en: "additional or replacement work. Please review the separate quote", tc: "新增或替代事項，請查閱下列獨立報價", sc: "新增或替代事项，请查阅下列独立报价" }[language];
  expect(draft.language).toBe(language); expect(draft.text).toContain(expected); expect(draft.text).toContain(inv.number);
  expect(draft.text).not.toMatch(/meeting with us|抽空與我們會面|抽空与我们会面/);
  expect(ctx.mail.sent()).toHaveLength(1);
});
