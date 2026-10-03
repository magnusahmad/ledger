// Area 2 original-reporter coverage: shared-mailbox Sent history under duplicates,
// reordered provider batches and explicit firm/conversation boundaries (DECISIONS #36/#43).
import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import type { InboundMail } from "@/integrations/types";
import { seedDemo } from "@/db/seed-demo";
import { client, conversation, job, mailDelivery, message, proposal, request, task } from "@/db/schema";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { recordMailboxReply } from "@/domain/mailbox-replies";
import { approveProposal, createProposal, getProposal, pendingProposals } from "@/domain/proposals";
import { createRequest, startTask, taskEvents, tasksForRequest } from "@/domain/engine";
import { pollMail } from "@/channels/mail-poller";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, goodDraft, intake } from "./agent-fixtures";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.set("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeOffice" })] }));
  ctx.llm.set("draft", goodDraft);
  ctx.llm.set("mailbox_review", { summary: "Acknowledgement only", changes: [] });
});

function mail(id: string, overrides: Partial<InboundMail> = {}): InboundMail {
  return { provider: "fake", providerMessageId: id, providerThreadId: "sent-audit-thread", rfcMessageId: `<${id}@audit.example>`, inReplyTo: null, references: [], from: { email: ctx.mail.address, name: "Karen Yip" }, to: ["director@kbtrading.example"], cc: [], subject: "Re: Office move", text: `Acknowledged ${id}.`, html: null, receivedAt: new Date("2026-09-29T02:05:00Z"), attachments: [], ...overrides };
}
async function pendingRequest() {
  const inbound = mail("client-ask", { from: { email: "director@kbtrading.example", name: "CHAN Tai Man" }, to: [ctx.mail.address], receivedAt: new Date("2026-09-29T02:00:00Z"), text: "We are moving office next month." });
  const stored = await ingestMessage(ctx, { ...inbound, channel: "email" });
  const result = await processInbound(ctx, stored.id);
  const p = (await pendingProposals(ctx, { kind: "send_message" }))[0];
  const [t] = await tasksForRequest(ctx, result.requestId!);
  return { inbound, stored, p, t };
}
async function followups(originalId: string) {
  return (await ctx.db.select().from(proposal).where(eq(proposal.firmId, ctx.firmId))).filter(p => p.payload.replaces === originalId);
}

// Both independent callers finish their initial provider-ID lookup before either proceeds.
// The barrier observes a real successful query, including nested ingest savepoints;
// it introduces no error and leaves the production transaction/constraints intact.
function duplicateReadBarrier() {
  let count = 0; let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const timer = setTimeout(release, 5_000);
  function caller(): Ctx {
    let paused = false;
    function wrap(db: Ctx["db"]): Ctx["db"] {
      return new Proxy(db, { get(target, key) {
        if (key === "transaction") return (callback: (tx: Ctx["db"]) => Promise<unknown>, ...args: unknown[]) => target.transaction(tx => callback(wrap(tx as unknown as Ctx["db"])), ...args as []);
        if (key === "query") return new Proxy(target.query, { get(q, table) {
          if (table !== "message") return Reflect.get(q, table);
          return new Proxy(q.message, { get(m, method) {
            if (method !== "findFirst") return Reflect.get(m, method);
            return async (...args: Parameters<typeof m.findFirst>) => {
              const result = await m.findFirst(...args);
              if (!paused) { paused = true; if (++count === 2) { clearTimeout(timer); release(); } await gate; }
              return result;
            };
          } });
        } });
        const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
      } });
    }
    return { ...ctx, db: wrap(ctx.db) };
  }
  return { caller, reached: () => count, close: () => { clearTimeout(timer); release(); } };
}

async function protectedWork(clientId = "cli_c2", firmId = ctx.firmId) {
  const [baseClient] = await ctx.db.select().from(client).where(eq(client.id, "cli_c2"));
  if (firmId !== ctx.firmId) await ctx.db.insert(client).values({ ...baseClient, id: clientId, firmId, nameEn: "Foreign confidential company" });
  const [conv] = await ctx.db.insert(conversation).values({ id: ctx.ids.next("cnv"), firmId, clientId, channel: "email", providerThreadId: `protected-${firmId}`, subject: "Unrelated private request", lastMessageAt: new Date("2026-09-29T01:00:00Z") }).returning();
  const ownReq = await createRequest(ctx, { clientId: "cli_c2", conversationId: conv.id });
  const ownTask = await startTask(ctx, { requestId: ownReq.id, clientId: "cli_c2", playbookId: "hk.changeOffice" });
  if (firmId !== ctx.firmId) {
    await ctx.db.update(request).set({ firmId, clientId }).where(eq(request.id, ownReq.id));
    await ctx.db.update(task).set({ firmId, clientId, status: "done" }).where(eq(task.id, ownTask.id));
  }
  const [parent] = await ctx.db.insert(message).values({ id: ctx.ids.next("msg"), firmId, conversationId: conv.id, direction: "in", provider: "fake", providerMessageId: `protected-parent-${firmId}`, rfcMessageId: `<protected-${firmId}@audit.example>`, fromAddr: "private@other.example", toAddrs: [ctx.mail.address], text: "CONFIDENTIAL FOREIGN HISTORY", status: "received", at: new Date("2026-09-29T01:00:00Z"), processedAt: ctx.clock.now() }).returning();
  const [draft] = await ctx.db.insert(message).values({ id: ctx.ids.next("msg"), firmId, conversationId: conv.id, direction: "out", toAddrs: ["wingyan@silverstrand.example"], subject: "Unrelated draft", text: "Unrelated approved-review wording", status: "draft", at: ctx.clock.now() }).returning();
  const p = await createProposal({ ...ctx, firmId }, { kind: "send_message", clientId, requestId: ownReq.id, title: "Unrelated preview", payload: { purpose: "request", messageId: draft.id } });
  await ctx.db.update(message).set({ proposalId: p.id }).where(eq(message.id, draft.id));
  const [queued] = await ctx.db.insert(job).values({ id: ctx.ids.next("job"), firmId, kind: "xero.sync_invoice", payload: { unrelated: true }, dedupeKey: `protected-${firmId}` }).returning();
  async function snapshot() {
    return { conversation: await ctx.db.query.conversation.findFirst({ where: eq(conversation.id, conv.id) }), draft: await ctx.db.query.message.findFirst({ where: eq(message.id, draft.id) }), proposal: await ctx.db.query.proposal.findFirst({ where: eq(proposal.id, p.id) }), task: await ctx.db.query.task.findFirst({ where: eq(task.id, ownTask.id) }), job: await ctx.db.query.job.findFirst({ where: eq(job.id, queued.id) }), events: await taskEvents(ctx, ownTask.id) };
  }
  return { conv, parent, draft, p, snapshot };
}

describe("Area 2: shared-mailbox Sent history stays idempotent and scoped", () => {
  it("SENT01 parallel capture of one provider Sent item acknowledges both callers with one history row, task event and invoice/link followup", async () => {
    const { inbound, p, t, stored } = await pendingRequest();
    const sent = mail("parallel-provider", { inReplyTo: inbound.rfcMessageId });
    const barrier = duplicateReadBarrier();
    try {
      const results = await Promise.allSettled([recordMailboxReply(barrier.caller(), sent), recordMailboxReply(barrier.caller(), sent)]);
      expect(results.map(r => r.status), `Duplicate lookups reached: ${barrier.reached()}; ${JSON.stringify(results)}`).toEqual(["fulfilled", "fulfilled"]);
      expect(results.filter(r => r.status === "fulfilled" && r.value.recorded)).toHaveLength(1);
      expect(await ctx.db.select().from(message).where(and(eq(message.conversationId, stored.conversationId), eq(message.viaMailbox, true)))).toHaveLength(1);
      expect((await taskEvents(ctx, t.id)).filter(e => e.kind === "message.mailbox_reply")).toHaveLength(1);
      expect(await followups(p.id)).toHaveLength(1);
      expect(ctx.mail.sent()).toHaveLength(0);
    } finally { barrier.close(); }
  });

  it("SENT02 concurrent provider aliases with the same RFC Message-ID create one Sent history entry and one replacement", async () => {
    const { p, stored, t } = await pendingRequest();
    const sent = mail("alias-one", { rfcMessageId: "<same-staff-email@audit.example>" });
    const barrier = duplicateReadBarrier();
    try {
      const results = await Promise.allSettled([recordMailboxReply(barrier.caller(), sent), recordMailboxReply(barrier.caller(), { ...sent, providerMessageId: "alias-two" })]);
      expect(results.map(r => r.status)).toEqual(["fulfilled", "fulfilled"]);
      expect(await ctx.db.select().from(message).where(and(eq(message.conversationId, stored.conversationId), eq(message.rfcMessageId, sent.rfcMessageId!)))).toHaveLength(1);
      expect((await taskEvents(ctx, t.id)).filter(e => e.kind === "message.mailbox_reply")).toHaveLength(1);
      expect(await followups(p.id)).toHaveLength(1);
    } finally { barrier.close(); }
  });

  it("SENT03 a delayed older Sent item cannot move a conversation's latest activity backwards and history remains chronological", async () => {
    const { stored } = await pendingRequest();
    await recordMailboxReply(ctx, mail("newer-sent", { receivedAt: new Date("2026-09-29T04:00:00Z"), text: "NEWER RESPONSE" }));
    await recordMailboxReply(ctx, mail("older-sent", { receivedAt: new Date("2026-09-29T03:00:00Z"), text: "OLDER RESPONSE" }));
    expect((await ctx.db.query.conversation.findFirst({ where: eq(conversation.id, stored.conversationId) }))!.lastMessageAt?.toISOString()).toBe("2026-09-29T04:00:00.000Z");
    await recordMailboxReply(ctx, mail("last-review", { receivedAt: new Date("2026-09-29T05:00:00Z") }));
    const user = JSON.stringify(ctx.llm.callsFor("mailbox_review").at(-1));
    expect(user.indexOf("OLDER RESPONSE")).toBeLessThan(user.indexOf("NEWER RESPONSE"));
  });

  it("SENT04 own RFC delivery proof during polling and manual capture preserves the original receipt and one manual followup without another send", async () => {
    const { p, stored } = await pendingRequest();
    await approveProposal(ctx, p.id);
    const accepted = ctx.mail.sent()[0];
    const sentMessage = await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) });
    const [draft] = await ctx.db.insert(message).values({ ...sentMessage!, id: ctx.ids.next("msg"), providerMessageId: null, rfcMessageId: null, status: "draft", proposalId: null, text: "A newer human review draft" }).returning();
    const fresh = await createProposal(ctx, { kind: "send_message", clientId: p.clientId, requestId: p.requestId, title: "New human review", payload: { purpose: "request", messageId: draft.id } });
    await ctx.db.update(message).set({ proposalId: fresh.id }).where(eq(message.id, draft.id));
    const proof = mail(accepted.providerMessageId, { rfcMessageId: accepted.rfcMessageId, text: accepted.text, subject: accepted.subject, providerThreadId: "sent-audit-thread" });
    ctx.mail.deliver(proof);
    expect((await pollMail(ctx)).errors).toEqual([]);
    expect((await getProposal(ctx, fresh.id)).status).toBe("pending");
    const manual = mail("manual-with-proof", { text: "Separate manual reply" }); ctx.mail.deliver(manual);
    const results = await Promise.all([pollMail(ctx), recordMailboxReply(ctx, proof), recordMailboxReply(ctx, manual)]);
    expect((results[0] as Awaited<ReturnType<typeof pollMail>>).errors).toEqual([]);
    expect(await followups(fresh.id)).toHaveLength(1);
    expect(await ctx.db.select().from(message).where(and(eq(message.conversationId, stored.conversationId), eq(message.rfcMessageId, proof.rfcMessageId!)))).toHaveLength(1);
    expect((await ctx.db.query.message.findFirst({ where: eq(message.id, sentMessage!.id) }))!.text).toBe(sentMessage!.text);
    expect((await ctx.db.select().from(mailDelivery)).map(d => d.status)).toEqual(["sent"]);
    expect((await getProposal(ctx, p.id)).status).toBe("approved");
    expect(ctx.mail.sent()).toHaveLength(1);
  });

  it("SENT05 an unrelated conversation's valid acknowledgement leaves another client's draft, proposal, queued job and task unchanged", async () => {
    await pendingRequest(); const other = await protectedWork(); const before = await other.snapshot();
    await recordMailboxReply(ctx, mail("unrelated-ack"));
    expect(await other.snapshot()).toEqual(before);
    expect(ctx.mail.sent()).toHaveLength(0);
  });

  it("SENT06 In-Reply-To referencing another firm's known RFC ID cannot join its conversation, change its records or expose its history", async () => {
    await pendingRequest(); const foreign = await protectedWork("foreign_client", "foreign_firm"); const before = await foreign.snapshot();
    const reply = mail("foreign-rfc-reply", { providerThreadId: "unknown-own-thread", inReplyTo: foreign.parent.rfcMessageId });
    const result = await recordMailboxReply(ctx, reply);
    const own = (await ctx.db.query.message.findFirst({ where: eq(message.id, result.messageId) }))!;
    const ownConv = (await ctx.db.query.conversation.findFirst({ where: eq(conversation.id, own.conversationId) }))!;
    expect.soft(ownConv.firmId).toBe(ctx.firmId);
    expect.soft(own.conversationId).not.toBe(foreign.conv.id);
    expect.soft(await foreign.snapshot()).toEqual(before);
    expect.soft(JSON.stringify(ctx.llm.callsFor("mailbox_review"))).not.toContain("CONFIDENTIAL FOREIGN HISTORY");
    expect.soft(JSON.stringify(ctx.llm.callsFor("mailbox_review"))).not.toContain("Foreign confidential company");
  });

  it("SENT07 provider message identifiers are local to a firm's mailbox and the same identifier in another firm cannot block legitimate capture", async () => {
    const foreign = await protectedWork("foreign_client", "foreign_firm");
    const id = foreign.parent.providerMessageId!; const before = await foreign.snapshot();
    const result = await recordMailboxReply(ctx, mail(id, { providerThreadId: "own-unique-thread" }));
    expect(result.recorded).toBe(true);
    const rows = await ctx.db.select().from(message).where(eq(message.providerMessageId, id));
    expect(rows.map(r => r.firmId).sort()).toEqual([ctx.firmId, "foreign_firm"].sort());
    expect(await foreign.snapshot()).toEqual(before);
  });

  it("SENT08 repeated and reordered followup Sent items preserve exactly one invoice/upload replacement and never complete tasks without approval", async () => {
    const { p, t } = await pendingRequest(); const before = await ctx.db.query.task.findFirst({ where: eq(task.id, t.id) });
    const a = mail("followup-new", { receivedAt: new Date("2026-09-29T04:00:00Z") });
    const b = mail("followup-old", { receivedAt: new Date("2026-09-29T03:00:00Z") });
    for (const sent of [a, a, b, b, a]) await recordMailboxReply(ctx, sent);
    const copies = await followups(p.id);
    expect(copies).toHaveLength(1);
    expect(copies[0]).toMatchObject({ status: "pending", requestId: p.requestId, payload: { replaces: p.id, purpose: "request" } });
    const copy = await ctx.db.query.message.findFirst({ where: eq(message.id, copies[0].payload.messageId as string) });
    const original = await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) });
    expect(copy!.text).toBe(original!.text); expect(copy!.toAddrs).toEqual(original!.toAddrs);
    expect(copy!.text).toContain("Upload here:"); expect(copy!.text).toContain("Invoice CRCS-");
    expect(await ctx.db.query.task.findFirst({ where: eq(task.id, t.id) })).toEqual(before);
    expect((await taskEvents(ctx, t.id)).filter(e => e.kind === "message.mailbox_reply")).toHaveLength(2);
    expect(ctx.mail.sent()).toHaveLength(0);
  });
});
