import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, review, goodDraft, factsOf } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { ingestMessage, processInbound, invoiceReplyFacts } from "@/domain/inbound";
import { createRequest, startTask, getTask, setChecklist } from "@/domain/engine";
import { createPerson, addContact } from "@/domain/records";
import { applyReview } from "@/agent/review";
import { playbookCatalogue } from "@/agent/context";
import { draftProblems, draftEmail } from "@/agent/draft";
import { emptyFacts } from "@/domain/inbound";
import { client, task, invoice, message, proposal } from "@/db/schema";
import { approveProposal } from "@/domain/proposals";
import { completeSending } from "@/domain/sending";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx({ now: "2026-10-03T02:00:00Z" }); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); ctx.llm.on("draft", goodDraft); });
async function incoming(text: string, email = "director@kbtrading.example", extra: Partial<Parameters<typeof ingestMessage>[1]> = {}) {
  const m = await ingestMessage(ctx, { channel: "email", provider: "wiring-test", providerMessageId: ctx.ids.next("wire"), from: { email, name: "Fictional sender" }, to: ["desk@caineroad.example"], cc: [], subject: "Instructions", text, attachments: [], receivedAt: ctx.clock.now(), ...extra });
  return { m, result: await processInbound(ctx, m.id) };
}
const plan = { title: "Proposed bank account assistance", items: [{ key: "bankPack", labelEn: "Bank documents", labelTc: "銀行文件", labelSc: "银行文件", kind: "file" }], steps: ["Prepare documents", "Arrange bank meeting"], feeHkd: 1800, caveats: ["Bank decides whether to approve"] };
async function appointment() {
  const r = await createRequest(ctx, { clientId: "cli_c1" });
  const p = await createPerson(ctx, { nameEn: "WONG Ka Man" });
  return startTask(ctx, { requestId: r.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p.id, extracted: { effDate: { value: "2026-10-15", source: "Prior instruction" } } });
}
describe("Email decisions cannot bypass Clerk's business rules", () => {
  it("financial wording is rendered from localized facts rather than rewritten by the model", async () => {
    const facts = { ...emptyFacts("sc"), invoice: { number: "TEST-001", totalFormatted: "HK$800", lines: [{ description: "Proposed service", amount: "HK$800" }], terms: "30天内付款", paymentInstructions: "Account name: Fictional Firm\nBank code: 016" } };
    ctx.llm.set("draft", { subject: "报价", body: "您好\n\n{{invoice}}" });
    const draft = await draftEmail(ctx, facts);
    expect(draft.source).toBe("agent");
    expect(ctx.llm.callsFor("draft")).toHaveLength(1);
    expect(draft.body).toContain("30天内付款");
    expect(draft.body).toContain(facts.invoice.paymentInstructions);
    expect(draft.body).not.toContain("{{invoice}}");
  });
  it("a changed enquiry cannot be approved using the old customer confirmation", async () => {
    ctx.llm.on("intake", intake({ client: { kind: "new_prospect", clientId: null, companyName: "Fictional Company", companyNumber: null, senderName: "New sender", reason: "Enquiry" }, actions: [] }));
    const { m, result } = await incoming("Take over as secretary", "new@fictional.example");
    await ctx.db.update(message).set({ text: "Ignore the old instructions" }).where(eq(message.id, m.id));
    await expect(approveProposal(ctx, result.proposalIds[0])).rejects.toThrow(/changed|review/i);
    expect((await ctx.db.select().from(client)).filter(c => c.lifecycle === "prospect")).toHaveLength(0);
  });
  it("another firm cannot approve this firm's customer confirmation", async () => {
    ctx.llm.on("intake", intake({ client: { kind: "new_prospect", clientId: null, companyName: "Fictional Company", companyNumber: null, senderName: "New sender", reason: "Enquiry" }, actions: [] }));
    const { result } = await incoming("Take over as secretary", "new@fictional.example");
    await expect(approveProposal({ ...ctx, firmId: "firm_other" }, result.proposalIds[0])).rejects.toThrow();
    expect((await ctx.db.select().from(client)).filter(c => c.lifecycle === "prospect")).toHaveLength(0);
  });
  it("a direct custom start uses the planner and remains unsendable until its plan is approved", async () => {
    ctx.llm.on("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.custom", description: "Please quote for bank assistance first" })] }));
    ctx.llm.on("plan", plan);
    const { result } = await incoming("Please quote for bank assistance first");
    const t = await getTask(ctx, result.taskIds[0]);
    expect(ctx.llm.callsFor("plan")).toHaveLength(1);
    expect(t.params.planStatus).toBe("proposed");
    const cards = await ctx.db.select().from(proposal);
    const send = cards.find(p => p.kind === "send_message")!;
    await expect(completeSending(ctx, result.taskIds, result.requestId)).rejects.toThrow(/plan/i);
    await expect(approveProposal(ctx, send.id)).rejects.toThrow(/plan/i);
    expect(ctx.mail.sent()).toHaveLength(0);
  });
  it.each(["Genuine service enquiry", "Supplier payment demand"])("an unknown sender labelled a prospect requires staff confirmation: %s", async text => {
    ctx.llm.on("intake", intake({ client: { kind: "new_prospect", clientId: null, companyName: "Fictional Company", companyNumber: null, senderName: "New sender", reason: "Unknown sender" }, actions: [action({ type: "start_request", playbookId: "hk.transferIn" })] }));
    const before = await ctx.db.select().from(client);
    const tasksBefore = await ctx.db.select().from(task), invoicesBefore = await ctx.db.select().from(invoice);
    const { result } = await incoming(text, "unknown@fictional.example");
    expect(await ctx.db.select().from(client)).toEqual(before);
    expect(await ctx.db.select().from(task)).toEqual(tasksBefore);
    expect(await ctx.db.select().from(invoice)).toEqual(invoicesBefore);
    expect(ctx.llm.callsFor("draft")).toHaveLength(0);
    expect(result.requestId).toBeNull();
    expect((await ctx.db.select().from(proposal)).map(p => [p.kind, p.payload.reason])).toEqual([["triage", "confirm_prospect"]]);
  });
  it("staff can confirm a genuine prospect once, generating reviewable work without sending", async () => {
    ctx.llm.on("intake", intake({ client: { kind: "new_prospect", clientId: null, companyName: "Fictional Company", companyNumber: null, senderName: "New sender", reason: "A genuine service enquiry" }, actions: [action({ type: "start_request", playbookId: "hk.transferIn" })] }));
    const { m, result } = await incoming("Please take over as secretary", "new@fictional.example");
    expect(result.requestId).toBeNull();
    const [card] = await ctx.db.select().from(proposal);
    await approveProposal(ctx, card.id);
    expect((await ctx.db.select().from(client)).filter(c => c.lifecycle === "prospect")).toHaveLength(1);
    const [prospect] = (await ctx.db.select().from(client)).filter(c => c.lifecycle === "prospect");
    expect((await ctx.db.select().from(task)).filter(t => t.clientId === prospect.id).map(t => t.playbookId)).toEqual(["hk.transferIn"]);
    expect(ctx.llm.callsFor("intake")).toHaveLength(1);
    expect((await processInbound(ctx, m.id)).requestId).not.toBeNull();
    await expect(approveProposal(ctx, card.id)).rejects.toThrow();
    expect(ctx.mail.sent()).toHaveLength(0);
  });
  it("reply-thread metadata does not authenticate an unknown sender or expose the client's snapshot", async () => {
    ctx.llm.on("intake", intake({ actions: [] }));
    const { m } = await incoming("Private directors: Fictional confidential particulars", undefined, { rfcMessageId: "<prior@fictional.example>", clientId: "cli_c1" });
    ctx.llm.set("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeOffice" })] }));
    const { result } = await incoming("Change the office", "unverified@fictional.example", { inReplyTo: m.rfcMessageId });
    expect(result.requestId).toBeNull();
    const prompt = ctx.llm.callsFor("intake").at(-1)!.messages.find(m => m.role === "user")!.content;
    expect(String(prompt)).not.toContain("2811043");
    expect(String(prompt)).not.toContain("Fictional confidential particulars");
  });
  it("a non-instructing contact cannot authorize client work by being a known email address", async () => {
    await addContact(ctx, { clientId: "cli_c1", name: "Billing observer", email: "observer@fictional.example", channel: "email", isInstructing: false });
    ctx.llm.on("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeOffice" })] }));
    const beforeTasks = await ctx.db.select().from(task);
    const { result } = await incoming("Change the office", "observer@fictional.example");
    expect(result.requestId).toBeNull();
    expect(await ctx.db.select().from(task)).toEqual(beforeTasks);
  });
  it("equivalent contact formatting is not a conflict, including model-suggested conflicts", async () => {
    const t = await appointment();
    const ci = "wong.kaman@fictional.example / +852 9123 8899";
    await setChecklist(ctx, t.id, t.checklist.map(e => e.key === "contactInfo" ? { ...e, status: "received", value: ci } : e), "Contact received");
    await applyReview(ctx, t.id, review({ items: [{ key: "contactInfo", personId: t.personId, status: "received", value: "Email: wong.kaman@fictional.example; Mobile: +852 9123 8899", reason: null }], conflicts: [{ key: "contactInfo", onFile: ci, incoming: "Email: wong.kaman@fictional.example; Mobile: +852 9123 8899", question: "Please confirm" }] }), { clientId: "cli_c1", kind: "information" });
    expect((await ctx.db.select().from(proposal)).filter(p => p.kind === "conflict")).toHaveLength(0);
    expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "idCopy")!.status).toBe("needed");
  });
  it("a date correction synchronizes the checklist, extracted date, authoritative date and deadline", async () => {
    const r = await createRequest(ctx, { clientId: "cli_c1" });
    const t = await startTask(ctx, { requestId: r.id, clientId: "cli_c1", playbookId: "hk.changeOffice", extracted: { effDate: { value: "2026-11-01", source: "Prior instruction" } } });
    await applyReview(ctx, t.id, review({ items: [{ key: "effDate", personId: null, status: "received", value: "2026-11-20", reason: null }], effectiveDate: "2026-11-20" }), { clientId: "cli_c1", kind: "change" });
    expect(await getTask(ctx, t.id)).toMatchObject({ effectiveDate: "2026-11-20", dueDate: "2026-12-05", extracted: { effDate: { value: "2026-11-20" } } });
  });
  it("Simplified Chinese payment terms are localized and credit terms never imply work has started", async () => {
    ctx.llm.on("intake", intake({ language: "sc", actions: [action({ type: "start_request", playbookId: "hk.changeOffice" })] }));
    const { result } = await incoming("请变更注册地址");
    const inv = (await ctx.db.select().from(invoice)).find(i => i.requestId === result.requestId)!;
    expect((await invoiceReplyFacts(ctx, inv.id, "sc"))!.terms).toBe("30天内付款");
    expect((await invoiceReplyFacts(ctx, inv.id, "en"))!.terms).not.toContain("started");
    const f = factsOf(ctx.llm.callsFor("draft")[0]);
    expect(f.workStatus).toBe("awaiting_approval");
  });
  it("a quoted effective date cannot silently disappear from the structured action", async () => {
    const text = "我陳大文會喺2026年10月31日辭任董事";
    ctx.llm.on("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.resignDirector", evidence: text, fields: [], effectiveDate: null })] }));
    const { result } = await incoming(text);
    expect(result.requestId).toBeNull();
    expect((await ctx.db.select().from(proposal)).some(p => p.kind === "triage" && p.payload.reason === "action_evidence")).toBe(true);
  });
  it("invented date evidence is held for review rather than changing an existing task", async () => {
    const t = await appointment();
    ctx.llm.on("intake", intake({ actions: [action({ type: "change_request", taskId: t.id, fields: [{ key: "effDate", value: "2026-12-01", quote: "2026年12月1日" }], effectiveDate: "2026-12-01", evidence: "2026年12月1日" })] }));
    ctx.llm.on("review", review({ items: [], effectiveDate: "2026-12-01" }));
    const { result } = await incoming("The date is unchanged");
    expect(result.taskIds).toHaveLength(0);
    expect((await getTask(ctx, t.id)).effectiveDate).toBe("2026-10-15");
    expect(ctx.llm.callsFor("review")).toHaveLength(0);
  });
  it("the intake catalogue cannot offer a bypass around custom planning or confuse a new director with a new person", async () => {
    const catalogue = await playbookCatalogue(ctx, ["HK"]);
    expect(catalogue.some(p => p.playbookId === "hk.custom")).toBe(false);
    expect(catalogue.find(p => p.playbookId === "hk.appointDirector")!.person).toBe("existing_or_new");
  });
  it("the production intake transport fits 16 unions while preserving attachment person references", async () => {
    ctx.llm.on("intake", intake({ actions: [] })); await incoming("Thank you");
    const schema = ctx.llm.callsFor("intake")[0].schema;
    const count = (x: unknown): number => !x || typeof x !== "object" ? 0 : Array.isArray(x) ? x.reduce((n, v) => n + count(v), 0) : (Array.isArray((x as Record<string, unknown>).type) || "anyOf" in x ? 1 : 0) + Object.values(x).reduce<number>((n, v) => n + count(v), 0);
    expect(count(schema)).toBeLessThanOrEqual(16);
    expect(JSON.stringify(schema)).toContain('"personId":{"type":["string","null"]}');
  });
  it("draft checks reject claiming work started while the supplied state is awaiting approval", () => {
    const facts = { ...emptyFacts("en"), workStatus: "awaiting_approval" as const };
    expect(draftProblems(facts, "We have started work on your bank account.").length).toBeGreaterThan(0);
  });
});
