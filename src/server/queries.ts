import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import {
  appUser, attachment, bankTransaction, client, conversation, document, invoice, llmCall, mailItem, message, proposal, request as requestT, task, taskEvent,
} from "@/db/schema";
import { getTask, outstanding } from "@/domain/engine";
import { upcomingDeadlines } from "@/domain/deadlines";
import { itemLabel, money } from "@/domain/labels";
import { kvGet } from "@/domain/kv";

export async function navCounts(ctx: Ctx) {
  const [p] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(proposal).where(and(eq(proposal.firmId, ctx.firmId), eq(proposal.status, "pending")));
  const [t] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(task).where(and(eq(task.firmId, ctx.firmId), eq(task.status, "open")));
  const [u] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(bankTransaction).where(and(eq(bankTransaction.firmId, ctx.firmId), eq(bankTransaction.status, "unmatched")));
  const [i] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(invoice).where(and(eq(invoice.firmId, ctx.firmId), inArray(invoice.status, ["sent", "part_paid"])));
  return { pending: p.n, openTasks: t.n, unmatched: u.n, unpaid: i.n };
}

/** A cheap fingerprint of everything the intray shows, for live refresh. */
export async function liveVersion(ctx: Ctx) {
  const r = await ctx.db.execute(sql`select
    (select coalesce(max(created_at), 'epoch') from proposal where firm_id = ${ctx.firmId})::text as p,
    (select coalesce(max(decided_at), 'epoch') from proposal where firm_id = ${ctx.firmId})::text as d,
    (select coalesce(max(at), 'epoch') from task_event where firm_id = ${ctx.firmId})::text as e,
    (select coalesce(max(at), 'epoch') from message where firm_id = ${ctx.firmId})::text as m,
    (select count(*) from job where firm_id = ${ctx.firmId} and status = 'queued')::text as j`);
  const row = r.rows[0] as Record<string, string>;
  return Object.values(row).join("|");
}

export async function clientNames(ctx: Ctx) {
  const rows = await ctx.db.select({ id: client.id, nameEn: client.nameEn, nameTc: client.nameTc, lifecycle: client.lifecycle, jurisdiction: client.jurisdiction }).from(client).where(eq(client.firmId, ctx.firmId)).orderBy(asc(client.nameEn));
  return rows;
}

export type TaskRow = Awaited<ReturnType<typeof taskRows>>[number];
export async function taskRows(ctx: Ctx, where: { status?: "open" | "done" | "cancelled" | "all"; clientId?: string; assigneeId?: string } = {}) {
  const rows = await ctx.db.select({ t: task, c: client }).from(task).innerJoin(client, eq(client.id, task.clientId))
    .where(and(eq(task.firmId, ctx.firmId), where.status && where.status !== "all" ? eq(task.status, where.status) : undefined, where.clientId ? eq(task.clientId, where.clientId) : undefined, where.assigneeId ? eq(task.assigneeId, where.assigneeId) : undefined))
    .orderBy(desc(task.createdAt)).limit(300);
  const out = [];
  for (const { t, c } of rows) {
    const full = await getTask(ctx, t.id);
    const step = full._steps[full.stepIndex];
    const inv = t.requestId ? await ctx.db.select({ i: invoice }).from(requestT).innerJoin(invoice, eq(invoice.id, requestT.invoiceId)).where(eq(requestT.id, t.requestId)).then((r) => r[0]?.i ?? null) : null;
    const waitingOn = t.status !== "open" ? null
      : step?.kind === "pay" ? "payment" : step?.kind === "collect" ? "client" : step?.kind === "sign" ? "signatures" : step?.human ? "you" : "harbourline";
    out.push({ ...t, clientName: c.nameEn, clientNameZh: c.nameTc, stepLabel: step?.label ?? (t.status === "done" ? "Done" : t.status), stepKind: step?.kind ?? null, waitingOn, outstanding: outstanding(full).map((e) => itemLabel(e.key, "en", t.params)), invoice: inv ? { number: inv.number, status: inv.status, total: money(inv.totalCents, inv.currency) } : null, stepCount: full._steps.length });
  }
  return out;
}

export async function pendingProposalRows(ctx: Ctx) {
  const rows = await ctx.db.select({ p: proposal, c: client }).from(proposal).leftJoin(client, eq(client.id, proposal.clientId))
    .where(and(eq(proposal.firmId, ctx.firmId), eq(proposal.status, "pending"))).orderBy(desc(proposal.createdAt));
  return rows.map(({ p, c }) => ({ ...p, clientName: c?.nameEn ?? null, clientLifecycle: c?.lifecycle ?? null }));
}

export async function todayData(ctx: Ctx) {
  const proposals = await pendingProposalRows(ctx);
  const open = await taskRows(ctx, { status: "open" });
  const deadlines = (await upcomingDeadlines(ctx, { withinDays: 30 }));
  const overdue = await ctx.db.select({ i: invoice, c: client }).from(invoice).innerJoin(client, eq(client.id, invoice.clientId))
    .where(and(eq(invoice.firmId, ctx.firmId), inArray(invoice.status, ["sent", "part_paid"]), sql`${invoice.dueOn} < ${ctx.clock.today()}`)).orderBy(asc(invoice.dueOn));
  const done = await ctx.db.select({ t: task, c: client }).from(task).innerJoin(client, eq(client.id, task.clientId))
    .where(and(eq(task.firmId, ctx.firmId), eq(task.status, "done"), sql`${task.completedAt} > now() - interval '7 days'`)).orderBy(desc(task.completedAt)).limit(8);
  return {
    proposals,
    waitingClient: open.filter((t) => t.waitingOn === "client" || t.waitingOn === "signatures"),
    awaitingPayment: open.filter((t) => t.waitingOn === "payment"),
    working: open.filter((t) => t.waitingOn === "harbourline" || t.waitingOn === "you"),
    deadlines,
    overdue: overdue.map(({ i, c }) => ({ ...i, clientName: c.nameEn })),
    done: done.map(({ t, c }) => ({ ...t, clientName: c.nameEn })),
    lastMailPoll: await kvGet<string>(ctx, "mail.lastPollAt"),
    lastBankPoll: await kvGet<string>(ctx, "bank.lastPollAt"),
  };
}

export async function conversations(ctx: Ctx) {
  const rows = await ctx.db.select({ v: conversation, c: client }).from(conversation).leftJoin(client, eq(client.id, conversation.clientId))
    .where(eq(conversation.firmId, ctx.firmId)).orderBy(desc(conversation.lastMessageAt), desc(conversation.createdAt)).limit(200);
  const out = [];
  for (const { v, c } of rows) {
    const last = await ctx.db.select().from(message).where(and(eq(message.conversationId, v.id), ne(message.status, "draft"))).orderBy(desc(message.at)).limit(1);
    const drafts = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(message).where(and(eq(message.conversationId, v.id), eq(message.status, "draft")));
    out.push({ ...v, clientName: c?.nameEn ?? null, last: last[0] ?? null, drafts: drafts[0].n });
  }
  return out.filter((c) => c.last || c.drafts);
}

export async function threadMessages(ctx: Ctx, conversationId: string) {
  const msgs = await ctx.db.select().from(message).where(eq(message.conversationId, conversationId)).orderBy(asc(message.at));
  const atts = msgs.length ? await ctx.db.select({ a: attachment, d: document }).from(attachment).leftJoin(document, eq(document.id, attachment.documentId)).where(inArray(attachment.messageId, msgs.map((m) => m.id))) : [];
  return { msgs, atts: atts.map(({ a, d }) => ({ ...a, doc: d })) };
}

export async function taskTimeline(ctx: Ctx, taskId: string) {
  const ev = await ctx.db.select().from(taskEvent).where(eq(taskEvent.taskId, taskId)).orderBy(desc(taskEvent.at), desc(taskEvent.id));
  const calls = await ctx.db.select({ agent: llmCall.agent, at: llmCall.at, latencyMs: llmCall.latencyMs, error: llmCall.error }).from(llmCall).where(eq(llmCall.taskId, taskId)).orderBy(desc(llmCall.at));
  return { ev, calls };
}

export async function users(ctx: Ctx) {
  return ctx.db.select().from(appUser).where(eq(appUser.firmId, ctx.firmId));
}

export async function mailItems(ctx: Ctx) {
  return ctx.db.select({ m: mailItem, c: client }).from(mailItem).leftJoin(client, eq(client.id, mailItem.clientId)).where(eq(mailItem.firmId, ctx.firmId)).orderBy(desc(mailItem.createdAt)).limit(100);
}
