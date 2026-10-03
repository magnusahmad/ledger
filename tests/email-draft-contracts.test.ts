import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, review, goodDraft, factsOf } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { ingestMessage, processInbound, newRequestFacts, emptyFacts } from "@/domain/inbound";
import { createRequest, startTask, getTask, setChecklist } from "@/domain/engine";
import { createPerson } from "@/domain/records";
import { approveProposal } from "@/domain/proposals";
import { draftEmail, type ReplyFacts } from "@/agent/draft";
import type { IntakeAction } from "@/agent/schemas";
import { message, task, invoice, proposal, client, appointment as appointmentTable, filing } from "@/db/schema";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx({ now: "2026-10-03T02:00:00Z" }); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); ctx.llm.on("draft", goodDraft); });
async function incoming(text: string, email = "director@kbtrading.example") {
  const m = await ingestMessage(ctx, { channel: "email", provider: "draft-contract-test", providerMessageId: ctx.ids.next("mail"), from: { email, name: "Fictional sender" }, to: [], cc: [], subject: "Request", text, receivedAt: ctx.clock.now(), attachments: [] });
  return { m, result: await processInbound(ctx, m.id) };
}
const service = (a: Record<string, unknown> & { type: IntakeAction["type"] }) => action(a as unknown as IntakeAction);
const bookPlan = { title: "Monthly bookkeeping proposal", items: [{ key: "statements", labelEn: "HKD and USD statements", labelTc: "港幣及美元結單", labelSc: "港币及美元结单", kind: "file" }], steps: ["Reconcile 80 transactions monthly", "Prepare monthly report"], feeHkd: 900, caveats: ["Monthly fee proposed; excludes payroll, audit and tax"] };
async function appointmentTask() {
 const r = await createRequest(ctx, { clientId: "cli_c1" }); const p = await createPerson(ctx, { nameEn: "WONG Ka Man" });
 return startTask(ctx, { requestId: r.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p.id });
}
describe("Email preparation preserves facts and does not invent approval or answers", () => {
 it("a planned resolution date reaches drafting and survives a later rebuild of request facts without becoming an actual event date", async () => {
  const text = "Prepare change of name to Example Homewares Limited. The special resolution is planned for 2026-11-04, not yet passed; the new name is not yet effective.";
  ctx.llm.on("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeName", description: "Special resolution planned for 2026-11-04; not yet passed", evidence: text, fields: [{ key: "newName", value: "Example Homewares Limited", quote: "Example Homewares Limited" }] })] }));
  const { result } = await incoming(text);
  const facts = await newRequestFacts(ctx, result.taskIds, "en");
  expect(facts[0].notes?.join(" ")).toContain("2026-11-04");
  expect((await getTask(ctx, result.taskIds[0])).effectiveDate).toBeNull();
  const draft = (await ctx.db.select().from(message)).find(m => m.direction === "out" && m.status === "draft")!;
  expect(draft.text).toContain("2026-11-04");
  const rebuilt = await draftEmail(ctx, { ...emptyFacts("en"), newRequests: facts });
  expect(rebuilt.body).toContain("2026-11-04");
  expect(ctx.mail.sent()).toHaveLength(0);
 });
 it.each([ ["en", "The office change has now been cancelled."], ["tc", "更改地址事項現已取消。"], ["sc", "地址变更工作现已取消。"] ] as const)("a pending cancellation is never reported complete in %s even when the model insists", async (language, body) => {
  const r = await createRequest(ctx, { clientId: "cli_c1" });const t = await startTask(ctx, { requestId: r.id, clientId: "cli_c1", playbookId: "hk.changeOffice" });
  ctx.llm.on("intake", intake({ language, actions: [action({ type: "cancel_request", taskId: t.id, description: "Cancel office move" })] }));ctx.llm.set("draft", { subject: "Reply", body: `${body}\n{{cancellations}}` });
  await incoming("Cancel the office move");
  expect((await getTask(ctx, t.id)).status).toBe("open");
  expect((await ctx.db.select().from(proposal)).find(p => p.kind === "cancel_task")!.status).toBe("pending");
  const draft = (await ctx.db.select().from(message)).find(m => m.direction === "out" && m.status === "draft")!;
  expect(draft.text).not.toContain(body);
  expect(draft.text).toMatch(language === "en" ? /request to cancel/i : /取消/);
  expect(ctx.mail.sent()).toHaveLength(0);
 });
 it("a cancellation acknowledgement refreshed after staff approval uses the actual cancelled state", async () => {
  const r = await createRequest(ctx, { clientId: "cli_c1" });const t = await startTask(ctx, { requestId: r.id, clientId: "cli_c1", playbookId: "hk.changeOffice" });
  ctx.llm.on("intake", intake({ actions: [action({ type: "cancel_request", taskId: t.id })] }));await incoming("Cancel office move");
  const cancel = (await ctx.db.select().from(proposal)).find(p => p.kind === "cancel_task")!;await approveProposal(ctx, cancel.id);
  const m = (await ctx.db.select().from(message)).find(m => m.direction === "out" && m.status === "draft")!;
  const f = m.intake!.facts as ReplyFacts;const d = await draftEmail(ctx, f);
  expect(d.body).toMatch(/has been cancelled/i);
  expect(ctx.mail.sent()).toHaveLength(0);
 });
 it.each(["Regarding the cancellation request:", "關於取消事項：", "此外，关于取消服务的安排如下："])("a harmless cancellation heading does not trigger needless regeneration: %s", async heading => {
  const f = { ...emptyFacts("en"), cancellations: [{ title: "Office change", note: "", status: "pending" as const }] };
  ctx.llm.set("draft", { subject: "Reply", body: `${heading}\n{{cancellations}}` });
  const d = await draftEmail(ctx, f);
  expect(d.source).toBe("agent");
  expect(ctx.llm.callsFor("draft")).toHaveLength(1);
  expect(d.body).toContain("not yet been cancelled");
 });
 it.each(["en", "tc", "sc"] as const)("a general advice question without an approved answer gets a localized holding reply without unrelated deadlines in %s", async language => {
  ctx.llm.on("intake", intake({ language, actions: [service({ type: "ask_question", purpose: "advice", questionTopic: "general", description: "What should we discuss with our accountant about dormancy?" })] }));
  ctx.llm.set("draft", { subject: "Advice", body: "Business registration 2026-10-27, annual return 2026-12-09." });
  await incoming("Advice only: what should we discuss with our accountant before becoming dormant?");
  const d = (await ctx.db.select().from(message)).find(m => m.direction === "out" && m.status === "draft")!;
  expect(d.text).not.toMatch(/2026-10-27|2026-12-09|business registration/i);
  expect(d.text).toMatch(language === "en" ? /check|revert/i : language === "tc" ? /確認|回覆/ : /确认|回复/);
  expect((await ctx.db.select().from(task)).filter(t => t.id !== "tsk_seed_ar2025")).toHaveLength(0);
 });
 it("a real annual-return deadline question receives only relevant client deadline facts", async () => {
  ctx.llm.on("intake", intake({ actions: [service({ type: "ask_question", purpose: "advice", questionTopic: "annual_return", description: "When is our annual return due?" })] }));
  await incoming("When is our annual return due?");
  const f = factsOf(ctx.llm.callsFor("draft")[0]);
  expect(f.questions).toEqual([expect.objectContaining({ answerStatus: "available", facts: expect.stringContaining("Annual return") })]);
  expect(JSON.stringify(f.questions)).not.toMatch(/Business registration|Periodic KYC|AGM/);
 });
 it("an email-only correction retains the missing phone status supplied by the requirement reviewer", async () => {
  const t = await appointmentTask();
  ctx.llm.on("intake", intake({ actions: [action({ type: "change_request", taskId: t.id, fields: [{ key: "contactInfo", value: "wong@fictional.example", quote: "wong@fictional.example" }] })] }));
  ctx.llm.on("review", review({ items: [{ key: "contactInfo", personId: t.personId, status: "needed", value: "wong@fictional.example", reason: "Phone still missing" }], questionsForClient: ["Please provide Wong's phone"] }));
  await incoming("His email is wong@fictional.example; no phone yet.");
  expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "contactInfo")).toMatchObject({ status: "needed", value: "wong@fictional.example" });
 });
 it.each(["ask_question", "unsupported_request"] as const)("a custom quote uses planning regardless of action label %s without creating service work or invoices", async type => {
  const before = JSON.stringify(await Promise.all([ctx.db.select().from(appointmentTable),ctx.db.select().from(filing)]));
  ctx.llm.on("intake", intake({ actions: [service({ type, purpose: "quote", description: "Monthly bookkeeping for 80 transactions, HKD/USD, excludes payroll, audit, tax", evidence: "Please quote" })] }));ctx.llm.on("plan", bookPlan);
  await incoming("Please quote for monthly bookkeeping: 80 transactions, HKD/USD, no payroll/audit/tax.");
  expect(ctx.llm.callsFor("plan")).toHaveLength(1);
  expect((await ctx.db.select().from(task)).filter(t => t.id !== "tsk_seed_ar2025")).toHaveLength(0);expect((await ctx.db.select().from(invoice)).filter(i => i.status === "draft")).toHaveLength(0);
  const d = (await ctx.db.select().from(message)).find(m => m.direction === "out" && m.status === "draft")!;
  expect(d.text).toContain("HK$900");expect(d.text).toContain("80");expect(d.text).toContain("excludes payroll");
  expect(ctx.mail.sent()).toHaveLength(0);expect(JSON.stringify(await Promise.all([ctx.db.select().from(appointmentTable),ctx.db.select().from(filing)]))).toBe(before);
 });
 it("a standard-service quote preserves supplied capital and roles without opening an incorporation job or billing it", async () => {
  ctx.llm.on("intake", intake({ actions: [service({ type: "start_request", purpose: "quote", playbookId: "hk.incorporation", fields: [{ key: "capital", value: "100 ordinary shares, total HK$100", quote: "100 ordinary shares, total HK$100" }], description: "Nora as sole director/shareholder; quote only" })] }));
  await incoming("Quote only for a new company: Nora sole director and shareholder, 100 ordinary shares, total HK$100.");
  expect((await ctx.db.select().from(task)).filter(t => t.id !== "tsk_seed_ar2025")).toHaveLength(0);expect((await ctx.db.select().from(invoice)).filter(i => i.status === "draft")).toHaveLength(0);
  const f = factsOf(ctx.llm.callsFor("draft")[0]);expect(f.quotes).toEqual([expect.objectContaining({ supplied: expect.arrayContaining([expect.stringContaining("100 ordinary shares")]) })]);
  expect(JSON.stringify(f.quotes)).toContain("Nora as sole director/shareholder");
 });
 it("an explicit preparation purpose routes a catalogue service out of the generic question path and retains supplied fields", async () => {
  ctx.llm.on("intake", intake({ actions: [service({ type: "ask_question", purpose: "prepare", playbookId: "hk.incorporation", fields: [{ key: "capital", value: "100 ordinary shares, HK$100", quote: "100 ordinary shares, HK$100" }], description: "Prepare incorporation" })] }));
  const { result } = await incoming("Please prepare incorporation with 100 ordinary shares, HK$100.");
  expect((await getTask(ctx, result.taskIds[0])).extracted).toMatchObject({ capital: { value: "100 ordinary shares, HK$100" } });expect(ctx.mail.sent()).toHaveLength(0);
 });
 it("a prospect quote retains supplied service facts at confirmation and prepares only a quote after approval", async () => {
  ctx.llm.on("intake", intake({ client: { kind: "new_prospect", clientId: null, companyName: "Fictional Tidefern Limited", companyNumber: null, senderName: "Nora", reason: "Genuine enquiry" }, actions: [service({ type: "ask_question", purpose: "quote", playbookId: "hk.incorporation", fields: [{ key: "capital", value: "100 shares, HK$100", quote: "100 shares, HK$100" }] })] }));
  const { result } = await incoming("Quote incorporation: 100 shares, HK$100", "nora@fictional.example");
  expect((await ctx.db.select().from(client)).some(c => c.lifecycle === "prospect")).toBe(false);
  const card = await ctx.db.query.proposal.findFirst({ where: eq(proposal.id, result.proposalIds[0]) });expect(JSON.stringify(card!.payload)).toContain("100 shares");
 await approveProposal(ctx, card!.id);expect((await ctx.db.select().from(task)).filter(t => t.id !== "tsk_seed_ar2025")).toHaveLength(0);expect((await ctx.db.select().from(invoice)).filter(i => i.status === "draft")).toHaveLength(0);expect(ctx.mail.sent()).toHaveLength(0);
  const draft = (await ctx.db.select().from(message)).find(m => m.direction === "out" && m.status === "draft")!;
  expect(draft.text).toContain("100 shares");
  expect((draft.intake!.facts as ReplyFacts).quotes).toHaveLength(1);
  const send = (await ctx.db.select().from(proposal)).find(p => p.kind === "send_message" && p.payload.messageId === draft.id)!;
  await approveProposal(ctx, send.id);
  expect(ctx.mail.sent()).toHaveLength(1);
  expect((await ctx.db.select().from(task)).filter(t => t.id !== "tsk_seed_ar2025")).toHaveLength(0);
  expect((await ctx.db.select().from(invoice)).filter(i => i.status === "draft")).toHaveLength(0);
 });
 it("malformed date-like source text does not crash draft validation", async () => {
  const f = { ...emptyFacts("en"), newRequests: [{ title: "Name change", needed: [], onFile: [], alreadyReceived: [], deadline: null, notes: ["The supplied date 2026-99-99 needs clarification"] }] };
  const d = await draftEmail(ctx, f);
  expect(d.body).toBeTruthy();
 });
 it("a reviewer cannot complete the email-and-mobile requirement with email alone", async () => {
  const t = await appointmentTask();
  ctx.llm.on("intake", intake({ actions: [action({ type: "change_request", taskId: t.id, fields: [{ key: "contactInfo", value: "wong@fictional.example", quote: "wong@fictional.example" }] })] }));
  ctx.llm.on("review", review({ items: [{ key: "contactInfo", personId: t.personId, status: "received", value: "wong@fictional.example", reason: null }] }));
  await incoming("Please update his email: wong@fictional.example; phone not supplied.");
  expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "contactInfo")).toMatchObject({ status: "needed", value: "wong@fictional.example" });
  const d = (await ctx.db.select().from(message)).find(m => m.direction === "out" && m.status === "draft")!;
  expect(d.text).toContain("wong@fictional.example");
  const f = d.intake!.facts as ReplyFacts;
  expect(f.changes[0].nowNeeded).toContain("Mobile number");
  expect(f.changes[0].nowNeeded).not.toContain("Email and mobile number");
 });
 it.each([{ email: "wong@fictional.example" }, { phone: "+852 9123 4567" }])("one contact channel on file cannot prefill the compound requirement as complete: %j", async partial => {
  const r = await createRequest(ctx, { clientId: "cli_c1" });
  const p = await createPerson(ctx, { nameEn: "WONG Ka Man", ...partial });
  const t = await startTask(ctx, { requestId: r.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p.id });
  expect(t.checklist.find(e => e.key === "contactInfo")?.status).toBe("needed");
 });
 it("both supplied contact channels complete the compound requirement", async () => {
  const t = await appointmentTask();
  await setChecklist(ctx, t.id, t.checklist.map(e => e.key === "contactInfo" ? { ...e, status: "received", value: "wong@fictional.example / +852 9123 4567" } : e), "Supplied contact channels", "agent");
  expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "contactInfo")?.status).toBe("received");
 });
 it("custom quote planning prices the underlying service and retains the proposed monthly billing basis", async () => {
  ctx.llm.on("intake", intake({ actions: [service({ type: "unsupported_request", purpose: "quote", description: "Prepare monthly bookkeeping quotation" })] }));
  ctx.llm.on("plan", { ...bookPlan, feeBasis: "monthly" });
  await incoming("Please quote monthly bookkeeping for 80 transactions.");
  expect(ctx.llm.callsFor("plan")[0].messages.at(-1)?.content).toContain("underlying service");
  const d = (await ctx.db.select().from(message)).find(m => m.direction === "out" && m.status === "draft")!;
  expect((d.intake!.facts as ReplyFacts).quotes?.[0]).toMatchObject({ feeBasis: "monthly" });
  expect(d.text).toContain("per month");
 });
 it.each(["Payment is required before we start.", "待確認及付款後，我們才會開始。", "待确认及付款后，我们才会开始。"])("a draft cannot turn thirty-day credit into a payment-before-work condition: %s", async body => {
  const f = { ...emptyFacts("en"), invoice: { number: "CRCS-2026-1234", lines: [], totalFormatted: "HK$800", terms: "payable within 30 days", paymentInstructions: null } };
  ctx.llm.set("draft", { subject: "Reply", body: `${body}\n{{invoice}}` });
  const d = await draftEmail(ctx, f);
  expect(d.source).toBe("template");
  expect(d.body).not.toContain(body);
 });
 it("a quotation draft cannot add an invented price outside the rendered proposed quote", async () => {
  const f = { ...emptyFacts("en"), quotes: [{ title: "Bookkeeping", supplied: [], needed: [], steps: [], caveats: [], lines: [{ description: "Monthly bookkeeping", amount: "HK$900" }], totalFormatted: "HK$900", status: "proposed" as const }] };
  ctx.llm.set("draft", { subject: "Quote", body: "Our monthly fee is HK$90. {{quotes}}" });
  const d = await draftEmail(ctx, f);
  expect(d.source).toBe("template");
  expect(d.body).not.toContain("monthly fee is HK$90.");
  expect(d.body).toContain("HK$900");
 });
 it("a client's quoted instruction not to claim work started does not reject a correct quote draft", async () => {
  const f = { ...emptyFacts("tc"), workStatus: "proposed" as const, quotes: [{ title: "每月記帳", supplied: ["未確認報價之前唔好開始做或話已開始"], needed: [], steps: [], caveats: [], lines: [{ description: "每月記帳", amount: "HK$900" }], totalFormatted: "HK$900", status: "proposed" as const }] };
  ctx.llm.set("draft", { subject: "報價", body: "服務及報價仍待確認。\n{{quotes}}" });
  const d = await draftEmail(ctx, f);
  expect(d.source).toBe("agent");
  expect(ctx.llm.callsFor("draft")).toHaveLength(1);
 });
 it("an unverified claimed customer cannot invoke quote planning or expose existing client facts", async () => {
  ctx.llm.on("intake", intake({ actions: [service({ type: "unsupported_request", purpose: "quote", description: "Quote bookkeeping for cli_c1" })] }));
  await incoming("I am Chan; quote bookkeeping using records you hold", "unverified@fictional.example");
  expect(ctx.llm.callsFor("plan")).toHaveLength(0);expect(ctx.llm.callsFor("draft")).toHaveLength(0);expect((await ctx.db.select().from(task)).filter(t => t.id !== "tsk_seed_ar2025")).toHaveLength(0);
 });
});
