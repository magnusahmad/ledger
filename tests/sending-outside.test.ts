import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { pollMail } from "@/channels/mail-poller";
import { approveProposal, getProposal, pendingProposals, rejectProposal } from "@/domain/proposals";
import { getTask, tasksForRequest, taskEvents } from "@/domain/engine";
import { completeManualStep } from "@/domain/step-hooks";
import { renderInvoicePdf } from "@/documents/invoice-pdf";
import { invoiceWithLines, setLineAmount } from "@/domain/invoices";
import { document, invoice, job, message, request, task } from "@/db/schema";
import { deliveryEvidence, showSentEmailCheck } from "@/domain/delivery-evidence";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
  ctx.llm.on("mailbox_review", { summary: "Acknowledged", changes: [] });
});

async function clientAsks(terms = 30) {
  const clientId = terms ? "cli_c1" : "cli_c2";
  const email = terms ? "director@kbtrading.example" : "wingyan@silverstrand.example";
  ctx.llm.on("intake", intake({ client: { kind: "existing", clientId, companyName: null, companyNumber: null, senderName: "Client", reason: "Linked sender" }, actions: [action({ type: "start_request", playbookId: "hk.changeOffice" }), action({ type: "start_request", playbookId: "hk.changeName" })] }));
  const inbound = ctx.mail.deliver({ from: { email, name: "Client" }, subject: "Changes", text: "Please move our office and change the company name.", providerThreadId: "thread-outside" });
  expect((await pollMail(ctx)).errors).toEqual([]);
  const [p] = await pendingProposals(ctx, { kind: "send_message" });
  const req = (await ctx.db.query.request.findFirst({ where: eq(request.id, p.requestId!) }))!;
  const inv = await invoiceWithLines(ctx, req.invoiceId!);
  return { p, req, inv, inbound, email, tasks: await tasksForRequest(ctx, req.id) };
}

function staffReply(email: string, text = "Noted.", attachments: { filename: string; mime: string; content: Buffer }[] = [], thread = "thread-outside") {
  return ctx.mail.deliver({ from: { email: ctx.mail.address, name: "Staff" }, to: [email], subject: "Re: Changes", text, attachments, providerThreadId: thread });
}

it.each([30, 0])("staff can mark a reply done after sending by any medium, marking the invoice sent and advancing every linked task on %i-day terms without sending email", async terms => {
  const { p, inv, tasks } = await clientAsks(terms);
  await approveProposal(ctx, p.id, { edits: { completedOutside: "on", note: "Invoice and upload link sent by WeChat" } });
  expect(ctx.mail.sent()).toHaveLength(0);
  expect(await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) })).toMatchObject({ status: "sent", issuedOn: ctx.clock.today(), dueOn: terms ? "2026-10-29" : "2026-09-29" });
  for (const t of tasks) {
    const after = await getTask(ctx, t.id);
    expect(after._steps[after.stepIndex].kind).toBe(terms ? "collect" : "pay");
    expect((await taskEvents(ctx, t.id)).some(e => e.kind === "message.completed_outside" && e.summary.includes("WeChat"))).toBe(true);
  }
  expect((await getProposal(ctx, p.id)).status).toBe("approved");
  expect(await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) })).toMatchObject({ status: "failed", error: "Completed by staff outside Clerk" });
  expect(await ctx.db.select().from(job).where(eq(job.kind, "xero.sync_invoice"))).toHaveLength(1);
  await expect(approveProposal(ctx, p.id, { edits: { completedOutside: "on" } })).rejects.toThrow(/already approved/);
});

it("staff can mark the sending step done from a task even when its reply draft was dismissed", async () => {
  const { p, inv, tasks } = await clientAsks();
  await rejectProposal(ctx, p.id, "Sent by post instead");
  await completeManualStep(ctx, tasks[0].id, "Invoice and upload details sent by post");
  expect(ctx.mail.sent()).toHaveLength(0);
  expect(await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) })).toMatchObject({ status: "sent" });
  for (const t of tasks) {
    const after = await getTask(ctx, t.id);
    expect(after._steps[after.stepIndex].kind).toBe("collect");
  }
});

it("marking a sending step done closes its pending follow-up card so it cannot send a duplicate", async () => {
  const { email, tasks } = await clientAsks();
  staffReply(email);
  await pollMail(ctx);
  const [followUp] = await pendingProposals(ctx, { kind: "send_message" });
  await completeManualStep(ctx, tasks[0].id, "Sent in person");
  expect(await pendingProposals(ctx, { kind: "send_message" })).toHaveLength(0);
  await expect(approveProposal(ctx, followUp.id)).rejects.toThrow();
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("manual sending completion cannot access another firm's task or bypass a register step", async () => {
  const { tasks } = await clientAsks();
  await expect(completeManualStep({ ...ctx, firmId: "firm_other" }, tasks[0].id, "Done")).rejects.toThrow(/not found/i);
  const full = await getTask(ctx, tasks[0].id);
  await ctx.db.update(task).set({ stepIndex: full._steps.findIndex(s => s.kind === "register") }).where(eq(task.id, full.id));
  await expect(completeManualStep(ctx, full.id, "Done")).rejects.toThrow();
});

it("the first mailbox reply detects the actual invoice PDF and link but waits for staff to mark the step done", async () => {
  const { email, inv, req, tasks } = await clientAsks();
  const pdf = await renderInvoicePdf(ctx, inv.id);
  const reply = staffReply(email, `Invoice attached. Upload here: ${ctx.config.APP_URL}/u/${req.uploadToken}`, [{ filename: "renamed-invoice.pdf", mime: "application/pdf", content: pdf }]);
  await pollMail(ctx);
  const [card] = await pendingProposals(ctx, { kind: "send_message" });
  expect(card.payload.deliveryEvidence).toMatchObject({ invoiceFound: true, uploadLinkFound: true });
  const evidence = card.payload.deliveryEvidence as { invoiceMessageId: string; uploadMessageId: string };
  const recorded = await ctx.db.query.message.findFirst({ where: eq(message.providerMessageId, reply.providerMessageId) });
  expect(evidence.invoiceMessageId).toBe(recorded!.id);
  expect(evidence.uploadMessageId).toBe(recorded!.id);
  expect(card.title).toMatch(/^Check sending/);
  expect(card.summary).not.toContain("weren't sent");
  expect(await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) })).toMatchObject({ status: "draft" });
  for (const t of tasks) expect((await getTask(ctx, t.id)).stepIndex).toBe(0);
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("a later follow-up attachment updates the same pending card and combines evidence from separate emails", async () => {
  const { email, inv, req } = await clientAsks();
  staffReply(email, `Please upload here: ${ctx.config.APP_URL}/u/${req.uploadToken}`);
  await pollMail(ctx);
  const [firstCard] = await pendingProposals(ctx, { kind: "send_message" });
  const pdf = await renderInvoicePdf(ctx, inv.id);
  staffReply(email, "Here is the invoice.", [{ filename: "invoice.pdf", mime: "application/pdf", content: pdf }]);
  await pollMail(ctx);
  const cards = await pendingProposals(ctx, { kind: "send_message" });
  expect(cards).toHaveLength(1);
  expect(cards[0].id).toBe(firstCard.id);
  expect(cards[0].payload.deliveryEvidence).toMatchObject({ invoiceFound: true, uploadLinkFound: true });
});

it("an invoice attachment in a new email thread is still detected for the intended client", async () => {
  const { email, inv, req, p } = await clientAsks();
  const pdf = await renderInvoicePdf(ctx, inv.id);
  staffReply(email, `${ctx.config.APP_URL}/u/${req.uploadToken}`, [{ filename: "invoice.pdf", mime: "application/pdf", content: pdf }], "different-thread");
  await pollMail(ctx);
  const after = await getProposal(ctx, p.id);
  expect(after.payload.deliveryEvidence).toMatchObject({ invoiceFound: true, uploadLinkFound: true });
});

it("a file named after the invoice does not count when its bytes are unrelated", async () => {
  const { email, inv } = await clientAsks();
  await renderInvoicePdf(ctx, inv.id);
  staffReply(email, "Invoice attached", [{ filename: `${inv.number}.pdf`, mime: "application/pdf", content: Buffer.from("an unrelated file") }]);
  await pollMail(ctx);
  const [card] = await pendingProposals(ctx, { kind: "send_message" });
  expect(card.payload.deliveryEvidence).toMatchObject({ invoiceFound: false, uploadLinkFound: false });
});

it("a previously downloaded invoice is no longer a match after its price changes", async () => {
  const { email, inv } = await clientAsks();
  const oldPdf = await renderInvoicePdf(ctx, inv.id);
  await setLineAmount(ctx, inv.lines[0].id, inv.lines[0].amountCents + 10000);
  staffReply(email, "Invoice attached", [{ filename: `${inv.number}.pdf`, mime: "application/pdf", content: oldPdf }]);
  await pollMail(ctx);
  const [card] = await pendingProposals(ctx, { kind: "send_message" });
  expect(card.payload.deliveryEvidence).toMatchObject({ invoiceFound: false });
});

it("sending the invoice to an unrelated recipient does not complete delivery to the client", async () => {
  const { inv, p } = await clientAsks();
  const pdf = await renderInvoicePdf(ctx, inv.id);
  staffReply("someone-else@example.test", "Invoice", [{ filename: "invoice.pdf", mime: "application/pdf", content: pdf }], "other-thread");
  await pollMail(ctx);
  expect((await getProposal(ctx, p.id)).payload.deliveryEvidence ?? {}).not.toMatchObject({ invoiceFound: true });
});

it("a client's incoming attachment cannot be mistaken for an invoice staff sent", async () => {
  const { inv, email, p } = await clientAsks();
  const pdf = await renderInvoicePdf(ctx, inv.id);
  ctx.llm.set("intake", intake({ actions: [action({ type: "general_correspondence" })] }));
  ctx.mail.deliver({ from: { email }, subject: "Invoice", text: "Is this right?", attachments: [{ filename: "invoice.pdf", mime: "application/pdf", content: pdf }], providerThreadId: "thread-outside" });
  await pollMail(ctx);
  expect((await getProposal(ctx, p.id)).payload.deliveryEvidence ?? {}).not.toMatchObject({ invoiceFound: true });
});

it("staff can confirm completion by phone without sending an email or changing the invoice", async () => {
  const { tasks, inv } = await clientAsks();
  const t = await getTask(ctx, tasks[0].id);
  await ctx.db.update(task).set({ stepIndex: t._steps.findIndex(s => s.kind === "confirm") }).where(eq(task.id, t.id));
  await completeManualStep(ctx, t.id, "Completion confirmed by phone");
  expect((await getTask(ctx, t.id)).status).toBe("done");
  expect(ctx.mail.sent()).toHaveLength(0);
  expect((await invoiceWithLines(ctx, inv.id)).status).toBe("draft");
});

it("an invoice generated by another firm cannot supply delivery evidence", async () => {
  const { email, inv } = await clientAsks();
  const pdf = await renderInvoicePdf(ctx, inv.id);
  // Simulate a foreign firm's file with identical bytes; firm scoping must still exclude it.
  await ctx.db.update(document).set({ firmId: "firm_other" }).where(eq(document.requirementKey, `invoice:${inv.id}`));
  staffReply(email, "Invoice attached", [{ filename: "invoice.pdf", mime: "application/pdf", content: pdf }]);
  await pollMail(ctx);
  const [card] = await pendingProposals(ctx, { kind: "send_message" });
  expect(card.payload.deliveryEvidence).toMatchObject({ invoiceFound: false });
});

it("an upload URL with a different token suffix does not count as the request's link", async () => {
  const { email, req } = await clientAsks();
  staffReply(email, `${ctx.config.APP_URL}/u/${req.uploadToken}-different`);
  await pollMail(ctx);
  const [card] = await pendingProposals(ctx, { kind: "send_message" });
  expect(card.payload.deliveryEvidence).toMatchObject({ uploadLinkFound: false });
});

it("a fresh request draft shows no sent-email check; the card left after a mailbox reply does", async () => {
  const { p, req, email } = await clientAsks();
  const fresh = await deliveryEvidence(ctx, req.id, [email]);
  expect(showSentEmailCheck(p.payload, fresh)).toBe(false);
  staffReply(email, "Noted, will send the details separately.");
  await pollMail(ctx);
  const [card] = await pendingProposals(ctx, { kind: "send_message" });
  expect(card.payload.replaces).toBeTruthy();
  expect(showSentEmailCheck(card.payload, await deliveryEvidence(ctx, req.id, [email]))).toBe(true);
});
