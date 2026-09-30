// Staff sometimes answer clients straight from the shared Gmail mailbox. Those replies must
// land in the thread, and must stop Harbourline sending its own now-stale draft.
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { pollMail } from "@/channels/mail-poller";
import { approveProposal, getProposal, pendingProposals } from "@/domain/proposals";
import { getTask, taskEvents, tasksForRequest, startTask, createRequest } from "@/domain/engine";
import { gmailDirection } from "@/integrations/mail/gmail-labels";
import { client, message } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeOffice" })] }));
  ctx.llm.on("draft", goodDraft);
});

/** A client email that Harbourline reads and drafts a reply to (pending approval). */
async function clientAsks() {
  const inbound = ctx.mail.deliver({ from: { email: "director@kbtrading.example", name: "CHAN Tai Man" }, subject: "Office move", text: "We are moving office next month.", providerThreadId: "thr-1" });
  await pollMail(ctx);
  const [p] = await pendingProposals(ctx, { kind: "send_message" });
  return { inbound, p };
}

/** Karen answers from Gmail instead of approving the draft. */
function staffRepliesInGmail(inReplyTo: string | null | undefined, text = "Hi Mr Chan, noted. No need to send the tenancy agreement, we have it. Karen") {
  return ctx.mail.deliver({ from: { email: ctx.mail.address, name: "Karen Yip" }, to: ["director@kbtrading.example"], subject: "Re: Office move", text, inReplyTo, providerThreadId: "thr-1" });
}

describe("Replies sent from the shared mailbox", () => {
  it("a reply staff send from the mailbox joins the client's thread as sent mail, not as a new client email", async () => {
    const { inbound } = await clientAsks();
    const clientsBefore = (await ctx.db.select().from(client)).length;
    const intakeCalls = ctx.llm.callsFor("intake").length;
    staffRepliesInGmail(inbound.rfcMessageId);
    await pollMail(ctx);
    const conv = (await ctx.db.query.message.findFirst({ where: eq(message.rfcMessageId, inbound.rfcMessageId!) }))!.conversationId;
    const reply = (await ctx.db.select().from(message).where(eq(message.conversationId, conv))).find((m) => m.viaMailbox);
    expect(reply).toMatchObject({ direction: "out", status: "sent", fromAddr: ctx.mail.address, toAddrs: ["director@kbtrading.example"] });
    expect((await ctx.db.select().from(client)).length).toBe(clientsBefore);
    expect(ctx.llm.callsFor("intake").length).toBe(intakeCalls);
  });

  it("a mailbox reply withdraws Harbourline's pending draft on that thread, so it can't be sent twice", async () => {
    const { inbound, p } = await clientAsks();
    staffRepliesInGmail(inbound.rfcMessageId);
    await pollMail(ctx);
    const after = await getProposal(ctx, p.id);
    expect(after).toMatchObject({ status: "superseded", payload: { supersededBy: "mailbox_reply" } });
    expect((await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) }))).toMatchObject({ status: "failed", error: "Replied from the mailbox instead" });
    await expect(approveProposal(ctx, p.id)).rejects.toThrow();
    expect(ctx.mail.sent()).toHaveLength(0);
  });

  it("when the withdrawn draft carried the invoice and upload link, a replacement card keeps them from being lost", async () => {
    const { inbound, p } = await clientAsks();
    staffRepliesInGmail(inbound.rfcMessageId);
    await pollMail(ctx);
    const [card] = await pendingProposals(ctx, { kind: "send_message" });
    expect(card.title).toMatch(/^Still to send: invoice and upload link to /);
    expect(card).toMatchObject({ requestId: p.requestId, payload: { replaces: p.id } });
    await approveProposal(ctx, card.id);
    expect(ctx.mail.sent()[0].attachmentNames[0]).toMatch(/^CRCS-\d{4}-\d{4}\.pdf$/);
  });

  it("mail Harbourline sent itself isn't recorded twice when it shows up in the Sent folder", async () => {
    const { p } = await clientAsks();
    await approveProposal(ctx, p.id);
    const sent = ctx.mail.sent()[0];
    const count = (await ctx.db.select().from(message)).length;
    ctx.mail.deliver({ from: { email: ctx.mail.address }, to: sent.to, subject: sent.subject, text: sent.text, providerMessageId: sent.providerMessageId, rfcMessageId: sent.rfcMessageId });
    await pollMail(ctx);
    expect((await ctx.db.select().from(message)).length).toBe(count);
  });

  it("the next client email is read with the firm's mailbox reply in the thread", async () => {
    const { inbound } = await clientAsks();
    const reply = staffRepliesInGmail(inbound.rfcMessageId, "No need to send the tenancy agreement, we have it.");
    await pollMail(ctx);
    ctx.mail.deliver({ from: { email: "director@kbtrading.example", name: "CHAN Tai Man" }, subject: "Re: Office move", text: "Great, thanks.", inReplyTo: reply.rfcMessageId, providerThreadId: "thr-1" });
    await pollMail(ctx);
    const last = ctx.llm.callsFor("intake").at(-1)!;
    expect(JSON.stringify(last)).toContain("No need to send the tenancy agreement, we have it.");
  });

  it("a mailbox reply is logged on the thread's open tasks", async () => {
    const { inbound, p } = await clientAsks();
    staffRepliesInGmail(inbound.rfcMessageId);
    await pollMail(ctx);
    const [t] = await tasksForRequest(ctx, p.requestId!);
    const ev = (await taskEvents(ctx, t.id)).find((e) => e.kind === "message.mailbox_reply");
    expect(ev?.summary).toContain("Re: Office move");
  });
});

describe("Suggested task updates from a mailbox reply", () => {
  const review = (changes: Record<string, unknown>[], summary = "Staff waived the tenancy agreement") => ({ summary, changes: changes.map((c) => ({ type: "note", taskId: null, key: null, value: null, playbookId: null, text: "", evidence: null, ...c })) });
  async function withTask() {
    const { inbound, p } = await clientAsks();
    const [t] = await tasksForRequest(ctx, p.requestId!);
    const key = (await getTask(ctx, t.id)).checklist.find((e) => e.status === "needed")!.key;
    return { inbound, p, t, key };
  }

  it("a reply that waives an item suggests marking it not needed, and changes nothing until approved", async () => {
    const { inbound, t, key } = await withTask();
    ctx.llm.on("mailbox_review", review([{ type: "not_needed", taskId: t.id, key, text: "Not needed: we already hold it" }]));
    staffRepliesInGmail(inbound.rfcMessageId);
    await pollMail(ctx);
    const [card] = await pendingProposals(ctx, { kind: "mailbox_update" });
    expect(card).toMatchObject({ clientId: "cli_c1" });
    expect((await getTask(ctx, t.id)).checklist.find((e) => e.key === key)?.status).toBe("needed");
    await approveProposal(ctx, card.id);
    expect((await getTask(ctx, t.id)).checklist.find((e) => e.key === key)?.status).toBe("not_needed");
  });

  it("approving applies only the changes staff keep ticked", async () => {
    const { inbound, t, key } = await withTask();
    ctx.llm.on("mailbox_review", review([{ type: "not_needed", taskId: t.id, key, text: "Not needed" }, { type: "note", taskId: t.id, text: "We will file on Monday" }]));
    staffRepliesInGmail(inbound.rfcMessageId);
    await pollMail(ctx);
    const [card] = await pendingProposals(ctx, { kind: "mailbox_update" });
    await approveProposal(ctx, card.id, { edits: { selection: "explicit", "apply:1": "on" } });
    expect((await getTask(ctx, t.id)).checklist.find((e) => e.key === key)?.status).toBe("needed");
    expect((await taskEvents(ctx, t.id)).some((e) => e.summary.includes("We will file on Monday"))).toBe(true);
  });

  it("suggestions for another client's task, or an item not on the checklist, are dropped", async () => {
    const { inbound, t } = await withTask();
    const req = await createRequest(ctx, { clientId: "cli_c2" });
    const other = await startTask(ctx, { requestId: req.id, clientId: "cli_c2", playbookId: "hk.changeOffice" });
    ctx.llm.on("mailbox_review", review([{ type: "cancel", taskId: other.id, text: "Cancel" }, { type: "not_needed", taskId: t.id, key: "noSuchItem", text: "Not needed" }]));
    staffRepliesInGmail(inbound.rfcMessageId);
    await pollMail(ctx);
    expect(await pendingProposals(ctx, { kind: "mailbox_update" })).toHaveLength(0);
  });

  it("a reply that only acknowledges creates no card", async () => {
    const { inbound } = await withTask();
    ctx.llm.on("mailbox_review", review([], "Acknowledged"));
    staffRepliesInGmail(inbound.rfcMessageId, "Thanks, noted.");
    await pollMail(ctx);
    expect(await pendingProposals(ctx, { kind: "mailbox_update" })).toHaveLength(0);
  });

  it("if the reply can't be read, it's still recorded and no card is created", async () => {
    const { inbound } = await withTask();
    ctx.llm.on("mailbox_review", () => ({ nonsense: true }));
    staffRepliesInGmail(inbound.rfcMessageId);
    await pollMail(ctx);
    expect((await ctx.db.select().from(message)).some((m) => m.viaMailbox)).toBe(true);
    expect(await pendingProposals(ctx, { kind: "mailbox_update" })).toHaveLength(0);
  });

  it("agreeing to new work suggests starting it with a confirmation and invoice to approve, and sends nothing", async () => {
    const { inbound } = await withTask();
    ctx.llm.on("mailbox_review", review([{ type: "start", playbookId: "hk.changeAuditor", text: "Start: change of auditor" }]));
    staffRepliesInGmail(inbound.rfcMessageId, "Happy to handle the auditor change as well.");
    await pollMail(ctx);
    const [card] = await pendingProposals(ctx, { kind: "mailbox_update" });
    await approveProposal(ctx, card.id);
    const drafts = (await pendingProposals(ctx, { kind: "send_message" })).filter((x) => x.payload.origin === "manual");
    expect(drafts).toHaveLength(1);
    expect((await tasksForRequest(ctx, drafts[0].requestId!)).map((x) => x.playbookId)).toEqual(["hk.changeAuditor"]);
    expect(ctx.mail.sent()).toHaveLength(0);
  });
});

describe("Gmail labels", () => {
  it("Gmail messages are classed by label: inbox is received, sent is a firm reply, drafts and spam are ignored", () => {
    expect(gmailDirection(["INBOX", "UNREAD"])).toBe("in");
    expect(gmailDirection(["SENT"])).toBe("out");
    expect(gmailDirection(["SENT", "INBOX"])).toBe("out");
    expect(gmailDirection(["DRAFT"])).toBeNull();
    expect(gmailDirection(["SPAM", "INBOX"])).toBeNull();
    expect(gmailDirection(["CATEGORY_UPDATES"])).toBeNull();
  });
});
