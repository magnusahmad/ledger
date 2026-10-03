import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { pollMail } from "@/channels/mail-poller";
import { approveProposal, pendingProposals, rejectProposal } from "@/domain/proposals";
import { getTask, tasksForRequest } from "@/domain/engine";
import { client, invoice, job, message } from "@/db/schema";
import { stripQuoted, parseRaw, buildRaw } from "@/integrations/mail/mime";
import { sendMessage } from "@/domain/outbound";
import { AirwallexBank } from "@/integrations/bank/airwallex";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
});

const appoint = () => intake({ actions: [action({ type: "start_request", playbookId: "hk.appointDirector", person: { mode: "new", personId: null, nameEn: "WONG Ka Man", nameZh: null, email: null }, fields: [{ key: "effDate", value: "2026-10-15", quote: null }] })] });

describe("Email channel", () => {
  it("a request email with an invalid Airwallex account ID creates an actionable triage card and sends no payment instructions", async () => {
    const calls: string[] = [];
    const bank = new AirwallexBank({ clientId: "c", apiKey: "k", baseUrl: "https://x", globalAccountId: "acct_wrongAccountId", fetch: (async (url) => {
      calls.push(String(url));
      return String(url).includes("/login") ? Response.json({ token: "t" }) : Response.json({ code: "invalid_argument", message: "Invalid UUID string" }, { status: 400 });
    }) as typeof fetch });
    ctx.llm.on("intake", appoint());
    ctx.llm.on("draft", goodDraft);
    ctx.mail.deliver({ from: { email: "director@kbtrading.example", name: "CHAN" }, subject: "New director", text: "Please appoint WONG Ka Man." });
    const r = await pollMail({ ...ctx, bank });
    expect(r.errors[0]).toMatch(/AIRWALLEX_GLOBAL_ACCOUNT_ID.*UUID/);
    expect((await pendingProposals(ctx, { kind: "triage" }))[0].summary).toMatch(/GET \/api\/v1\/global_accounts/);
    expect(await pendingProposals(ctx, { kind: "send_message" })).toHaveLength(0);
    expect(ctx.mail.sent()).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  it("a request email with a valid Airwallex Global Account UUID drafts its invoice and bank details for staff approval", async () => {
    const id = "7f687fe6-dcf4-4462-92fa-80335301d9d2";
    const bank = new AirwallexBank({ clientId: "c", apiKey: "k", baseUrl: "https://x", globalAccountId: id, fetch: (async (url) => {
      if (String(url).endsWith("/authentication/login")) return Response.json({ token: "t" });
      if (String(url).endsWith(`/global_accounts/${id}`)) return Response.json({ account_name: "Demo firm", account_number: "12345678", institution: { name: "DBS Bank" } });
      return new Response("Unexpected route", { status: 404 });
    }) as typeof fetch });
    ctx.llm.on("intake", appoint());
    ctx.llm.on("draft", goodDraft);
    ctx.mail.deliver({ from: { email: "director@kbtrading.example", name: "CHAN" }, subject: "New director", text: "Please appoint WONG Ka Man." });
    const r = await pollMail({ ...ctx, bank });
    expect(r.errors).toEqual([]);
    const [p] = await pendingProposals(ctx, { kind: "send_message" });
    expect(p).toMatchObject({ clientId: "cli_c1", status: "pending" });
    const draft = await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) });
    expect(draft?.intake).toMatchObject({ facts: { invoice: { paymentInstructions: "Account name: Demo firm\nBank: DBS Bank\nAccount number: 12345678" } } });
    expect(await ctx.db.query.invoice.findFirst({ where: eq(invoice.requestId, p.requestId!) })).toMatchObject({ status: "draft" });
    expect(ctx.mail.sent()).toHaveLength(0);
  });

  it("an email from the demo test address is matched to the showcase client and lands in the intray", async () => {
    ctx.llm.on("intake", appoint());
    ctx.llm.on("draft", goodDraft);
    ctx.mail.deliver({ from: { email: "director@kbtrading.example", name: "CHAN Tai Man" }, subject: "New director", text: "Please appoint WONG Ka Man from 15 October." });
    const r = await pollMail(ctx);
    expect(r.processed).toBe(1);
    const [p] = await pendingProposals(ctx);
    expect(p).toMatchObject({ kind: "send_message", clientId: "cli_c1" });
  });

  it("staff confirmation of an unknown sender's enquiry creates a prospect and adds onboarding alongside the request", async () => {
    ctx.llm.on("intake", intake({ client: { kind: "new_prospect", clientId: null, companyName: "Blue Harbour Trading Limited", companyNumber: "3345678", senderName: "Sam Lee", reason: "Unknown sender" }, actions: [action({ type: "start_request", playbookId: "hk.appointDirector", person: { mode: "new", personId: null, nameEn: "Jane DOE", nameZh: null, email: null } })] }));
    ctx.llm.on("draft", goodDraft);
    ctx.mail.deliver({ from: { email: "sam@venture.example", name: "Sam Lee" }, subject: "Change of director", text: "We need to appoint Jane Doe." });
    await pollMail(ctx);
    expect(await ctx.db.query.client.findFirst({ where: eq(client.nameEn, "Blue Harbour Trading Limited") })).toBeUndefined();
    const [confirmation] = await pendingProposals(ctx, { kind: "triage" });
    expect(confirmation.payload.reason).toBe("confirm_prospect");
    await approveProposal(ctx, confirmation.id);
    const c = await ctx.db.query.client.findFirst({ where: eq(client.nameEn, "Blue Harbour Trading Limited") });
    expect(c).toMatchObject({ lifecycle: "prospect", companyNumber: "3345678" });
    const [p] = await pendingProposals(ctx, { kind: "send_message" });
    const tasks = await tasksForRequest(ctx, p.requestId!);
    expect(tasks.map((t) => t.playbookId)).toEqual(["hk.transferIn", "hk.appointDirector"]);
    const contacts = await ctx.db.query.contact.findMany({ where: (t, { eq }) => eq(t.clientId, c!.id) });
    expect(contacts[0]).toMatchObject({ email: "sam@venture.example", isBilling: true });
  });

  it("a prospect first known only by the sender is named after them, with no placeholder suffix, until the client gives the company's name and number", async () => {
    ctx.llm.on("intake", intake({ client: { kind: "new_prospect", clientId: null, companyName: null, companyNumber: null, senderName: "Sam Lee", reason: "Unknown sender" }, actions: [action({ type: "start_request", playbookId: "hk.changeOffice" })] }));
    ctx.llm.on("draft", goodDraft);
    ctx.mail.deliver({ from: { email: "sam@venture.example", name: "Sam Lee" }, subject: "Office", text: "Can you move our office?" });
    await pollMail(ctx);
    const [confirmation] = await pendingProposals(ctx, { kind: "triage" });
    await approveProposal(ctx, confirmation.id);
    const prospect = await ctx.db.query.client.findFirst({ where: eq(client.nameEn, "Sam Lee") });
    expect(prospect).toMatchObject({ lifecycle: "prospect" });
    ctx.llm.set("intake", intake({ client: { kind: "existing", clientId: prospect!.id, companyName: "Blue Harbour Trading Limited", companyNumber: "3345678", senderName: "Sam Lee", reason: "Same sender" }, actions: [action({ type: "general_correspondence" })] }));
    ctx.mail.deliver({ from: { email: "sam@venture.example", name: "Sam Lee" }, subject: "Re: Office", text: "It's Blue Harbour Trading Limited, CR 3345678." });
    await pollMail(ctx);
    expect(await ctx.db.query.client.findFirst({ where: eq(client.id, prospect!.id) })).toMatchObject({ nameEn: "Blue Harbour Trading Limited", companyNumber: "3345678" });
  });

  it("polling twice does not ingest the same message twice, and our own sent mail is ignored", async () => {
    ctx.llm.on("intake", appoint());
    ctx.llm.on("draft", goodDraft);
    ctx.mail.deliver({ providerMessageId: "same-1", from: { email: "director@kbtrading.example", name: "CHAN" }, subject: "x", text: "Please appoint WONG Ka Man." });
    await pollMail(ctx);
    await ctx.db.delete((await import("@/db/schema")).kv); // lose the cursor: the provider replays everything
    ctx.mail.deliver({ from: { email: ctx.mail.address, name: "Us" }, subject: "our own", text: "sent by us" });
    const r = await pollMail(ctx);
    expect(r.processed).toBe(0);
    expect(ctx.llm.callsFor("intake")).toHaveLength(1);
  });

  it("no email is sent without an approval, and rejecting a draft sends nothing", async () => {
    ctx.llm.on("intake", appoint());
    ctx.llm.on("draft", goodDraft);
    ctx.mail.deliver({ from: { email: "director@kbtrading.example", name: "CHAN" }, subject: "x", text: "Please appoint WONG Ka Man." });
    await pollMail(ctx);
    const [p] = await pendingProposals(ctx);
    await expect(sendMessage(ctx, "msg_does_not_exist", { approvedBy: "x" })).rejects.toThrow();
    await rejectProposal(ctx, p.id, "Not now");
    expect(ctx.mail.sent()).toHaveLength(0);
  });

  it("approving the reply sends it in the same thread with In-Reply-To set and the invoice PDF attached", async () => {
    ctx.llm.on("intake", appoint());
    ctx.llm.on("draft", goodDraft);
    ctx.mail.deliver({ rfcMessageId: "<client-1@kbtrading.example>", from: { email: "director@kbtrading.example", name: "CHAN" }, subject: "New director", text: "Please appoint WONG Ka Man." });
    await pollMail(ctx);
    const [p] = await pendingProposals(ctx);
    await approveProposal(ctx, p.id, { edits: { text: (await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) }))!.text + "\nPS: see you Friday." }, shownAt: new Date(ctx.clock.now().getTime() - 45_000) });
    const [sent] = ctx.mail.sent();
    expect(sent.inReplyTo).toBe("<client-1@kbtrading.example>");
    expect(sent.subject).toBe("Re: New director");
    expect(sent.text).toContain("PS: see you Friday.");
    const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.requestId, p.requestId!) });
    expect(sent.attachmentNames).toEqual([`${inv!.number}.pdf`]);
  });

  it("approving the reply marks the invoice sent, moves each task past the send step, and queues the Xero sync once", async () => {
    ctx.llm.on("intake", appoint());
    ctx.llm.on("draft", goodDraft);
    ctx.mail.deliver({ from: { email: "director@kbtrading.example", name: "CHAN" }, subject: "x", text: "Please appoint WONG Ka Man." });
    await pollMail(ctx);
    const [p] = await pendingProposals(ctx);
    await approveProposal(ctx, p.id);
    const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.requestId, p.requestId!) });
    expect(inv).toMatchObject({ status: "sent", issuedOn: "2026-09-29", dueOn: "2026-10-29" }); // Kowloon Bay Trading is on 30-day terms
    const [t] = await tasksForRequest(ctx, p.requestId!);
    const cur = await getTask(ctx, t.id);
    expect(cur._steps[cur.stepIndex].kind).toBe("collect"); // on credit terms, pay is skipped
    const jobs = await ctx.db.select().from(job).where(eq(job.kind, "xero.sync_invoice"));
    expect(jobs).toHaveLength(1);
    await expect(approveProposal(ctx, p.id)).rejects.toThrow(/already approved/);
    expect(ctx.mail.sent()).toHaveLength(1);
  });

  it("a client's reply in the same thread is routed to its conversation and the open task", async () => {
    ctx.llm.on("intake", appoint());
    ctx.llm.on("draft", goodDraft);
    ctx.mail.deliver({ from: { email: "director@kbtrading.example", name: "CHAN" }, subject: "New director", text: "Please appoint WONG Ka Man." });
    await pollMail(ctx);
    const [p] = await pendingProposals(ctx);
    await approveProposal(ctx, p.id);
    const [sent] = ctx.mail.sent();
    const [t] = await tasksForRequest(ctx, p.requestId!);
    ctx.llm.set("intake", (req: unknown) => intake({ actions: [action({ type: "provide_information", taskId: t.id, fields: [{ key: "corrAddr", value: "Unit 1502, Kowloon Bay Centre", quote: null }] })] }));
    ctx.llm.on("review", { items: [], switchPerson: null, effectiveDate: null, playbookFit: "ok", suggestedPlaybookId: null, invoiceChange: { needed: false, reason: null }, conflicts: [], questionsForClient: [], summary: "ok" });
    ctx.mail.deliver({ inReplyTo: sent.rfcMessageId, from: { email: "director@kbtrading.example", name: "CHAN" }, subject: "Re: New director", text: "Correspondence address: Unit 1502, Kowloon Bay Centre" });
    await pollMail(ctx);
    const msgs = await ctx.db.select().from(message).where(eq(message.direction, "in"));
    const convs = new Set(msgs.filter((m) => m.fromAddr === "director@kbtrading.example").map((m) => m.conversationId));
    expect(convs.size).toBe(1);
    expect((await getTask(ctx, t.id)).checklist.find((e) => e.key === "corrAddr")?.status).toBe("received");
  });

  it("an intake failure on one message doesn't stop the poller: it becomes a triage card and the cursor moves on", async () => {
    ctx.llm.on("intake", () => { throw new Error("provider down"); });
    ctx.mail.deliver({ from: { email: "director@kbtrading.example", name: "CHAN" }, subject: "x", text: "hello" });
    const r = await pollMail(ctx);
    expect(r.processed).toBe(1);
    expect((await pendingProposals(ctx)).map((p) => p.kind)).toEqual(["triage"]);
  });

  it("a processing failure leaves Reading, retains the error for staff review, and is not processed twice", async () => {
    ctx.llm.on("intake", appoint());
    ctx.llm.on("draft", goodDraft);
    ctx.bank.accountDetails = async () => { throw new Error("Bank account is not configured correctly"); };
    ctx.mail.deliver({ providerMessageId: "bank-failure-1", from: { email: "director@kbtrading.example", name: "CHAN" }, subject: "New director", text: "Please appoint WONG Ka Man." });
    const result = await pollMail(ctx);
    expect(result.errors).toHaveLength(1);
    const [card] = await pendingProposals(ctx, { kind: "triage" });
    const failed = await ctx.db.query.message.findFirst({ where: eq(message.id, card.payload.messageId as string) });
    expect(failed?.processedAt).toEqual(ctx.clock.now());
    expect(failed?.error).toBe("Bank account is not configured correctly");
    expect(ctx.mail.sent()).toHaveLength(0);
    await ctx.db.delete((await import("@/db/schema")).kv);
    expect((await pollMail(ctx)).processed).toBe(0);
    expect(ctx.llm.callsFor("intake")).toHaveLength(1);
    expect(await pendingProposals(ctx, { kind: "triage" })).toHaveLength(1);
  });
});

describe("MIME handling", () => {
  it("quoted history is stripped from replies in English and Chinese mail clients", () => {
    expect(stripQuoted("Yes please go ahead.\n\nOn Tue, 29 Sep 2026 at 10:00, Karen <desk@x> wrote:\n> old text")).toBe("Yes please go ahead.");
    expect(stripQuoted("好的\n\n於 2026年9月29日 上午10:00，Karen 寫道：\n> 舊內容")).toBe("好的");
    expect(stripQuoted("Fine\n-----Original Message-----\nFrom: x")).toBe("Fine");
  });

  it("a composed reply round-trips through the parser with threading headers and attachments intact", async () => {
    const raw = await buildRaw("desk@caineroad.example", { to: ["a@b.example"], subject: "Re: Hi", text: "Body 中文", inReplyTo: "<x@y>", references: ["<x@y>"], attachments: [{ filename: "INV.pdf", mime: "application/pdf", content: Buffer.from("%PDF-1.4") }] });
    const m = await parseRaw(raw, "test", "1");
    expect(m).toMatchObject({ subject: "Re: Hi", inReplyTo: "<x@y>", from: { email: "desk@caineroad.example" } });
    expect(m.text).toContain("Body 中文");
    expect(m.attachments.map((a) => a.filename)).toEqual(["INV.pdf"]);
  });
});
