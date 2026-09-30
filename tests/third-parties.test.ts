// Banks, law firms, auditors, officials and outgoing secretaries email the firm too. They are
// third parties on a task, not clients: their mail must never create prospects or drafted replies.
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { pollMail } from "@/channels/mail-poller";
import { pendingProposals } from "@/domain/proposals";
import { createRequest, startTask, taskEvents, getTask, tasksForRequest } from "@/domain/engine";
import { addThirdParty, linkThirdParty, markSenderNotClient, partiesForTask } from "@/domain/third-parties";
import { addOffPlatformStep, putOnHold } from "@/domain/off-platform";
import { client, invoice, message } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
});

async function officeMove() {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  return startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.changeOffice" });
}

describe("Third parties", () => {
  it("an email from a known third party is logged on its tasks and never becomes a prospect or gets a drafted reply", async () => {
    const t = await officeMove();
    const bank = await addThirdParty(ctx, { name: "Grace Lau", organisation: "HSBC Commercial Banking", email: "Grace.Lau@hsbc.example", role: "bank" });
    await linkThirdParty(ctx, t.id, bank.id);
    const clients = (await ctx.db.select().from(client)).length;
    ctx.mail.deliver({ from: { email: "grace.lau@hsbc.example", name: "Grace Lau" }, subject: "Mandate form for Kowloon Bay Trading", text: "Please find the signed mandate form attached." });
    await pollMail(ctx);
    expect((await ctx.db.select().from(client)).length).toBe(clients);
    expect(ctx.llm.callsFor("intake")).toHaveLength(0);
    expect(await pendingProposals(ctx, { kind: "send_message" })).toHaveLength(0);
    expect((await taskEvents(ctx, t.id)).find((e) => e.kind === "message.third_party")?.summary).toContain("HSBC Commercial Banking");
    const m = (await ctx.db.select().from(message)).find((x) => x.fromAddr === "grace.lau@hsbc.example")!;
    expect(m.processedAt).not.toBeNull();
  });

  it("an email from an ignored address is recorded but starts nothing", async () => {
    await addThirdParty(ctx, { name: "Newsletter", email: "news@marketing.example", role: "ignore" });
    ctx.mail.deliver({ from: { email: "news@marketing.example" }, subject: "Our autumn offers", text: "Buy now" });
    await pollMail(ctx);
    expect(ctx.llm.callsFor("intake")).toHaveLength(0);
    expect(await pendingProposals(ctx)).toHaveLength(0);
  });

  it("tagging a sender as not a client retires the prospect made from their email: tasks cancelled, draft invoice voided, pending drafts withdrawn, off the client list", async () => {
    ctx.llm.on("intake", intake({ client: { kind: "new_prospect", clientId: null, companyName: null, companyNumber: null, senderName: "Peter Ho", reason: "Unknown sender" }, actions: [action({ type: "start_request", playbookId: "hk.changeOffice" })] }));
    ctx.mail.deliver({ from: { email: "peter.ho@lawfirm.example", name: "Peter Ho" }, subject: "Re: share charge", text: "We act for the lender. Please confirm the registered office address." });
    await pollMail(ctx);
    const [p] = await pendingProposals(ctx, { kind: "send_message" });
    const prospectId = p.clientId!;
    await markSenderNotClient(ctx, p.payload.messageId ? (await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) }))!.conversationId : "", { as: "third_party", name: "Peter Ho", organisation: "Ho & Partners (lender's solicitors)", role: "law_firm" });
    expect(await pendingProposals(ctx, { clientId: prospectId })).toHaveLength(0);
    for (const t of await tasksForRequest(ctx, p.requestId!)) expect((await getTask(ctx, t.id)).status).toBe("cancelled");
    expect((await ctx.db.select().from(invoice).where(eq(invoice.clientId, prospectId)))[0].status).toBe("void");
    expect((await ctx.db.query.client.findFirst({ where: eq(client.id, prospectId) }))?.lifecycle).toBe("archived");
    // Their next email is recognised as a third party.
    ctx.mail.deliver({ from: { email: "peter.ho@lawfirm.example", name: "Peter Ho" }, subject: "Chaser", text: "Any update?" });
    await pollMail(ctx);
    expect(ctx.llm.callsFor("intake")).toHaveLength(1);
  });

  it("tagging a real client's contact as not a client is refused", async () => {
    ctx.llm.on("intake", intake({ actions: [action({ type: "general_correspondence" })] }));
    ctx.mail.deliver({ from: { email: "director@kbtrading.example", name: "CHAN Tai Man" }, subject: "Hello", text: "Hello" });
    await pollMail(ctx);
    const m = (await ctx.db.select().from(message)).find((x) => x.fromAddr === "director@kbtrading.example" && x.direction === "in")!;
    await expect(markSenderNotClient(ctx, m.conversationId, { as: "ignore", name: "x" })).rejects.toThrow(/contact of/i);
  });

  it("a third party can be linked to a task and named on its off-platform steps and holds", async () => {
    const t = await officeMove();
    const sec = await addThirdParty(ctx, { name: "Outgoing secretary", organisation: "Pacific Corporate Services", email: "cs@pacific.example", role: "outgoing_secretary" });
    await linkThirdParty(ctx, t.id, sec.id);
    await linkThirdParty(ctx, t.id, sec.id); // linking twice is harmless
    expect((await partiesForTask(ctx, t.id)).map((x) => x.organisation)).toEqual(["Pacific Corporate Services"]);
    const step = await addOffPlatformStep(ctx, t.id, { title: "Collect the minute book", waitingOn: "third_party", partyId: sec.id });
    expect(step.partyId).toBe(sec.id);
    await putOnHold(ctx, t.id, { reason: "Waiting for the statutory books", waitingOn: "third_party", partyId: sec.id, followUpOn: "2026-10-06" });
    expect((await getTask(ctx, t.id)).holdPartyId).toBe(sec.id);
  });
});
