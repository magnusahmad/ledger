// Real PostgreSQL interleavings at observed-mail and approved-delivery boundaries.
// The proxies only pause completed real queries: they never change database answers.
import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { mailDelivery, message, invoice, request, proposal } from "@/db/schema";
import { seedDemo } from "@/db/seed-demo";
import { pollMail } from "@/channels/mail-poller";
import { recordMailboxReply } from "@/domain/mailbox-replies";
import { approveProposal, getProposal, pendingProposals, resolveInterruptedProposal } from "@/domain/proposals";
import { getTask, tasksForRequest, taskEvents } from "@/domain/engine";
import { readApprovedInput } from "@/domain/approval-execution";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, goodDraft } from "./agent-fixtures";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeOffice" })] }));
  ctx.llm.on("draft", goodDraft);
  ctx.llm.on("mailbox_review", { summary: "Acknowledged", changes: [] });
});

function barrier() {
  let enter!: () => void, release!: () => void;
  const entered = new Promise<void>(r => { enter = r; });
  const released = new Promise<void>(r => { release = r; });
  return { entered, release, pause: async () => { enter(); await released; } };
}

async function bounded<T>(promise: Promise<T>): Promise<T> {
  let timer!: ReturnType<typeof setTimeout>;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Barrier deadline exceeded (10 seconds)")), 10_000); })]); }
  finally { clearTimeout(timer); }
}

function afterPendingRead(db: Ctx["db"], id: string, gate: ReturnType<typeof barrier>): Ctx["db"] {
  let paused = false;
  return new Proxy(db, { get(target, key) {
    if (key === "transaction") return (fn: (tx: Ctx["db"]) => Promise<unknown>) => target.transaction(tx => fn(afterPendingRead(tx as unknown as Ctx["db"], id, gate)));
    if (key === "query") return { ...target.query, proposal: new Proxy(target.query.proposal, { get(query, method) {
      if (method === "findFirst") return async (...args: Parameters<typeof query.findFirst>) => {
        const row = await query.findFirst(...args);
        if (!paused && row?.id === id && row.status === "pending") { paused = true; await gate.pause(); }
        return row;
      };
      const value = Reflect.get(query, method); return typeof value === "function" ? value.bind(query) : value;
    } }) };
    const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
  } });
}

// prepared→sending commits before the transaction holding the delivery/facts fence.
function afterDeliveryStart(db: Ctx["db"], gate: ReturnType<typeof barrier>): Ctx["db"] {
  let paused = false;
  const chain = (builder: object): object => new Proxy(builder, { get(target, key) {
    const value = Reflect.get(target, key);
    if (typeof value !== "function") return value;
    if (key === "returning") return async (...args: unknown[]) => {
      const rows = await value.apply(target, args) as (typeof mailDelivery.$inferSelect)[];
      if (!paused && rows.some(row => row.status === "sending")) { paused = true; await gate.pause(); }
      return rows;
    };
    return (...args: unknown[]) => chain(value.apply(target, args));
  } });
  return new Proxy(db, { get(target, key) {
    if (key === "update") return (table: Parameters<typeof target.update>[0]) => table === mailDelivery ? chain(target.update(table)) : target.update(table);
    const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
  } });
}

function afterPendingList(db: Ctx["db"], id: string, gate: ReturnType<typeof barrier>): Ctx["db"] {
  let paused = false;
  const chain = (builder: object, watching = false): object => new Proxy(builder, { get(target, key) {
    const value = Reflect.get(target, key);
    if (key === "then") return (resolve: (rows: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve(target).then(async rows => {
      if (watching && !paused && Array.isArray(rows) && rows.some(row => row.id === id && row.status === "pending")) { paused = true; await gate.pause(); }
      return rows;
    }).then(resolve, reject);
    if (typeof value !== "function") return value;
    return (...args: unknown[]) => chain(value.apply(target, args), watching || (key === "from" && args[0] === proposal));
  } });
  return new Proxy(db, { get(target, key) {
    if (key === "transaction") return (fn: (tx: Ctx["db"]) => Promise<unknown>) => target.transaction(tx => fn(afterPendingList(tx as unknown as Ctx["db"], id, gate)));
    if (key === "select") return (...args: unknown[]) => chain(Reflect.apply(Reflect.get(target, key), target, args));
    const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
  } });
}

function afterSentReceipt(db: Ctx["db"], gate: ReturnType<typeof barrier>): Ctx["db"] {
  let paused = false;
  const chain = (builder: object, watching = false): object => new Proxy(builder, { get(target, key) {
    const value = Reflect.get(target, key);
    if (key === "then") return (resolve: (rows: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve(target).then(async rows => {
      if (watching && !paused) { paused = true; await gate.pause(); }
      return rows;
    }).then(resolve, reject);
    if (typeof value !== "function") return value;
    return (...args: unknown[]) => chain(value.apply(target, args), watching || (key === "set" && (args[0] as { status?: string }).status === "sent"));
  } });
  return new Proxy(db, { get(target, key) {
    if (key === "update") return (table: Parameters<typeof target.update>[0]) => table === message ? chain(target.update(table)) : target.update(table);
    const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
  } });
}

async function clientAsks() {
  const inbound = ctx.mail.deliver({ from: { email: "director@kbtrading.example" }, subject: "Office move", text: "Please move our office.", providerThreadId: "race-thread" });
  expect((await pollMail(ctx)).errors).toEqual([]);
  const [p] = await pendingProposals(ctx, { kind: "send_message" });
  const req = (await ctx.db.query.request.findFirst({ where: eq(request.id, p.requestId!) }))!;
  return { inbound, p, req, tasks: await tasksForRequest(ctx, req.id) };
}

function manualReply(inbound: Awaited<ReturnType<typeof clientAsks>>["inbound"]) {
  return ctx.mail.deliver({ from: { email: ctx.mail.address, name: "Staff" }, to: ["director@kbtrading.example"], subject: "Re: Office move", text: "Please disregard the old request details; I have answered separately.", providerThreadId: "race-thread", inReplyTo: inbound.rfcMessageId });
}

async function historyAndInvoice(req: Awaited<ReturnType<typeof clientAsks>>["req"], tasks: Awaited<ReturnType<typeof clientAsks>>["tasks"], sent: boolean) {
  expect(await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, req.invoiceId!) })).toMatchObject({ status: sent ? "sent" : "draft" });
  for (const t of tasks) {
    const full = await getTask(ctx, t.id);
    expect(full._steps[full.stepIndex].kind).toBe(sent ? "collect" : "send");
    expect((await taskEvents(ctx, t.id)).filter(e => e.kind === "message.mailbox_reply")).toHaveLength(1);
  }
}

it("a stale pending withdrawal read cannot overwrite a claimed approval or create a duplicate follow-up", async () => {
  const { inbound, p, req, tasks } = await clientAsks();
  const gate = barrier(), delivery = barrier();
  const reply = recordMailboxReply({ ...ctx, db: afterPendingRead(ctx.db, p.id, gate) }, manualReply(inbound));
  let approval: Promise<unknown> | undefined;
  let afterMailbox: Awaited<ReturnType<typeof getProposal>> | undefined;
  try {
    await bounded(Promise.race([gate.entered, reply.then(() => { throw new Error("The pending-read barrier was not reached"); })]));
    approval = approveProposal({ ...ctx, db: afterDeliveryStart(ctx.db, delivery) }, p.id).then(value => ({ value }), error => ({ error }));
    await bounded(Promise.race([delivery.entered, approval.then(() => { throw new Error("The delivery-start barrier was not reached"); })]));
    gate.release();
    await bounded(reply);
    afterMailbox = await getProposal(ctx, p.id);
  } finally { gate.release(); delivery.release(); }
  if (approval) await bounded(approval);
  expect(afterMailbox?.status).toBe("processing");
  expect(await pendingProposals(ctx, { kind: "send_message" })).toHaveLength(1);
  expect((await getProposal(ctx, p.id)).status).toBe("recovery");
  expect(ctx.mail.sent()).toHaveLength(0);
  await historyAndInvoice(req, tasks, false);
});

it("a stale mailbox withdrawal cannot overwrite an approved completed-outside decision or create a duplicate follow-up", async () => {
  const { inbound, p, req, tasks } = await clientAsks();
  const gate = barrier();
  const reply = recordMailboxReply({ ...ctx, db: afterPendingRead(ctx.db, p.id, gate) }, manualReply(inbound));
  try {
    await bounded(Promise.race([gate.entered, reply.then(() => { throw new Error("The pending-read barrier was not reached"); })]));
    await bounded(approveProposal(ctx, p.id, { edits: { completedOutside: "on", note: "Invoice and details delivered in person" } }));
  } finally { gate.release(); }
  await reply;
  expect(ctx.mail.sent()).toHaveLength(0);
  expect(await getProposal(ctx, p.id)).toMatchObject({ status: "approved" });
  expect(await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) })).toMatchObject({ status: "failed", error: "Completed by staff outside Harbourline" });
  expect(await pendingProposals(ctx, { kind: "send_message" })).toHaveLength(0);
  expect(await ctx.db.select().from(mailDelivery)).toHaveLength(0);
  await historyAndInvoice(req, tasks, true);
});

it("a manual reply committed after approval claim but before the delivery fence blocks the old approved send", async () => {
  const { inbound, p, req, tasks } = await clientAsks();
  const gate = barrier();
  let captured: Awaited<ReturnType<typeof getProposal>> | undefined;
  const approval = approveProposal({ ...ctx, db: afterDeliveryStart(ctx.db, gate) }, p.id).then(value => ({ value }), error => ({ error }));
  try {
    await bounded(Promise.race([gate.entered, approval.then(() => { throw new Error("The delivery-start barrier was not reached"); })]));
    expect((await getProposal(ctx, p.id)).status).toBe("processing");
    captured = await getProposal(ctx, p.id);
    const recorded = await recordMailboxReply(ctx, manualReply(inbound));
    expect(recorded.recorded).toBe(true);
    expect(await ctx.db.query.message.findFirst({ where: eq(message.id, recorded.messageId) })).toMatchObject({ viaMailbox: true, status: "sent" });
  } finally { gate.release(); }
  const outcome = await approval;
  expect(ctx.mail.sent()).toHaveLength(0);
  expect(outcome).toHaveProperty("error");
  expect((await getProposal(ctx, p.id)).status).not.toBe("approved");
  expect((await ctx.db.select().from(mailDelivery)).some(d => d.status === "sent")).toBe(false);
  const interrupted = await getProposal(ctx, p.id);
  expect(interrupted.approvedInput).toBe(captured!.approvedInput);
  expect(readApprovedInput(ctx, interrupted)).toEqual(readApprovedInput(ctx, captured!));
  await historyAndInvoice(req, tasks, false);
  const oldJournal = (await ctx.db.select().from(mailDelivery))[0];
  // Staff have a usable explicit exit; the new review has a new delivery namespace.
  const fresh = (await resolveInterruptedProposal(ctx, p.id, { checkedMailbox: true, note: "Manual mailbox reply checked; request details need a new reviewed follow-up" }))!;
  expect(fresh).toMatchObject({ status: "pending", payload: { recoveryFrom: p.id } });
  expect(ctx.mail.sent()).toHaveLength(0);
  const revised = "Reviewed after the manual reply: please use the revised request details.";
  await approveProposal(ctx, fresh.id, { edits: { text: revised } });
  expect(ctx.mail.sent()).toHaveLength(1);
  expect(ctx.mail.sent()[0].text).toBe(revised);
  const journals = await ctx.db.select().from(mailDelivery);
  expect(journals).toHaveLength(2);
  expect(journals.find(d => d.id === oldJournal.id)).toEqual(oldJournal);
  expect(journals.find(d => d.id !== oldJournal.id)).toMatchObject({ status: "sent", sourceKey: `message:${fresh.payload.messageId}` });
  expect(journals.find(d => d.id !== oldJournal.id)!.correlationId).not.toBe(oldJournal.correlationId);
  expect((await getProposal(ctx, fresh.id)).status).toBe("approved");
  await historyAndInvoice(req, tasks, true);
});

it("a manual reply observed before approval withdraws the old card and leaves exactly one fresh human review without transport", async () => {
  const { inbound, p, req, tasks } = await clientAsks();
  await recordMailboxReply(ctx, manualReply(inbound));
  await expect(approveProposal(ctx, p.id)).rejects.toThrow(/superseded/);
  const cards = await pendingProposals(ctx, { kind: "send_message" });
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({ status: "pending", payload: { replaces: p.id } });
  expect(ctx.mail.sent()).toHaveLength(0);
  await historyAndInvoice(req, tasks, false);
});

it("a stale pending evidence list cannot rewrite the payload or title of an approval completed while that list was paused", async () => {
  const { p, req, tasks } = await clientAsks();
  const gate = barrier();
  const otherThread = ctx.mail.deliver({ from: { email: ctx.mail.address }, to: ["director@kbtrading.example"], subject: "Separate acknowledgement", text: "A separate note.", providerThreadId: "other-evidence-thread" });
  const capture = recordMailboxReply({ ...ctx, db: afterPendingList(ctx.db, p.id, gate) }, otherThread);
  let completed: Awaited<ReturnType<typeof getProposal>> | undefined;
  try {
    await bounded(Promise.race([gate.entered, capture.then(() => { throw new Error("The pending-evidence-list barrier was not reached"); })]));
    await bounded(approveProposal(ctx, p.id));
    completed = await getProposal(ctx, p.id);
  } finally { gate.release(); }
  await bounded(capture);
  const after = await getProposal(ctx, p.id);
  expect(after.status).toBe("approved");
  expect(after.payload).toEqual(completed!.payload);
  expect(after.title).toBe(completed!.title);
  expect(after.approvedInput).toBe(completed!.approvedInput);
  expect(readApprovedInput(ctx, after)).toEqual(readApprovedInput(ctx, completed!));
  expect(ctx.mail.sent()).toHaveLength(1);
  expect(await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, req.invoiceId!) })).toMatchObject({ status: "sent" });
  for (const t of tasks) expect((await getTask(ctx, t.id))._steps[(await getTask(ctx, t.id)).stepIndex].kind).toBe("collect");
  expect(await pendingProposals(ctx, { kind: "send_message" })).toHaveLength(0);
});

it("a manual reply observed after provider acceptance preserves the exact sent receipt and completes unchanged invoice and tasks without resend", async () => {
  const { inbound, p, req, tasks } = await clientAsks();
  const approvedTo = "approved-recipient@kbtrading.example";
  const approvedSubject = "Reviewed office instructions — 辦公室变更";
  const approvedText = "Staff reviewed these office instructions. 已核准。";
  const gate = barrier();
  const approval = approveProposal({ ...ctx, db: afterSentReceipt(ctx.db, gate) }, p.id, { edits: { to: approvedTo, subject: approvedSubject, text: approvedText } }).then(value => ({ value }), error => ({ error }));
  try {
    await bounded(Promise.race([gate.entered, approval.then(() => { throw new Error("The accepted-receipt barrier was not reached"); })]));
    expect(ctx.mail.sent()).toHaveLength(1);
    expect((await ctx.db.select().from(mailDelivery))[0]).toMatchObject({ status: "sent", result: { providerMessageId: ctx.mail.sent()[0].providerMessageId } });
    await bounded(recordMailboxReply(ctx, manualReply(inbound)));
  } finally { gate.release(); }
  const result = await bounded(approval);
  expect(result).not.toHaveProperty("error");
  expect((await getProposal(ctx, p.id)).status).toBe("approved");
  expect(ctx.mail.sent()).toHaveLength(1);
  expect(ctx.mail.sent()[0]).toMatchObject({ to: [approvedTo], subject: approvedSubject, text: approvedText });
  expect(await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) })).toMatchObject({ status: "sent", text: approvedText, subject: approvedSubject, toAddrs: [approvedTo], providerMessageId: ctx.mail.sent()[0].providerMessageId });
  expect(await pendingProposals(ctx, { kind: "send_message" })).toHaveLength(0);
  await historyAndInvoice(req, tasks, true);
  for (const t of tasks) {
    const sentEvents = (await taskEvents(ctx, t.id)).filter(e => e.kind === "message.sent");
    expect(sentEvents).toHaveLength(1);
    expect(sentEvents[0].summary).toContain(approvedTo);
    expect(sentEvents[0].summary).toContain(approvedSubject);
  }
});

it("a manual reply committed while authoritative absence reconciliation is awaited prevents transport of the stale approved question reply", async () => {
  // A real client question drafts a reply without creating a request/invoice/task.
  // Therefore no task FK lock prevents the mailbox observation from committing.
  ctx.llm.set("intake", intake({ actions: [action({ type: "ask_question", description: "Who is our company secretary?" })] }));
  const inbound = ctx.mail.deliver({ from: { email: "director@kbtrading.example" }, subject: "Secretary question", text: "Who is our company secretary?", providerThreadId: "race-thread" });
  expect((await pollMail(ctx)).errors).toEqual([]);
  const [p] = await pendingProposals(ctx, { kind: "send_message" });
  expect(p.requestId).toBeNull();
  expect(p.payload.taskIds).toEqual([]);
  const beforeInvoices = await ctx.db.select().from(invoice);
  const beforeRequests = await ctx.db.select().from(request);
  const gate = barrier();
  const provider = {
    name: ctx.mail.name, address: ctx.mail.address, reconciliationScope: ctx.mail.reconciliationScope,
    send: ctx.mail.send.bind(ctx.mail), fetchNew: ctx.mail.fetchNew.bind(ctx.mail),
    reconcileDelivery: async (correlation: string) => {
      const proof = await ctx.mail.reconcileDelivery(correlation);
      expect(proof.status).toBe("not_sent");
      await gate.pause();
      return proof;
    },
  };
  const approval = approveProposal({ ...ctx, mail: provider }, p.id).then(value => ({ value }), error => ({ error }));
  try {
    await bounded(Promise.race([gate.entered, approval.then(() => { throw new Error("The reconciliation-response barrier was not reached"); })]));
    const observed = await bounded(recordMailboxReply(ctx, manualReply(inbound)));
    expect(observed.recorded).toBe(true);
    // Visibility through the independent original DB context proves commit, not an
    // event inside an uncommitted mailbox transaction.
    expect(await ctx.db.query.message.findFirst({ where: eq(message.id, observed.messageId) })).toMatchObject({ viaMailbox: true, status: "sent" });
  } finally { gate.release(); }
  const outcome = await bounded(approval);
  expect(ctx.mail.sent()).toHaveLength(0);
  expect(outcome).toHaveProperty("error");
  expect((await getProposal(ctx, p.id)).status).not.toBe("approved");
  expect((await ctx.db.select().from(mailDelivery)).some(d => d.status === "sent")).toBe(false);
  expect(await ctx.db.select().from(invoice)).toEqual(beforeInvoices);
  expect(await ctx.db.select().from(request)).toEqual(beforeRequests);
});
