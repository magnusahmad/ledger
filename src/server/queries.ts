import "server-only";
import { stepStatus } from "@/lib/display";
import { waitingOnFor } from "@/domain/engine";
import { and, asc, desc, eq, inArray, isNotNull, ne, or, sql, type SQL } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import {
  appUser, attachment, bankTransaction, client, conversation, document, invoice, llmCall, mailItem, message, proposal, request as requestT, task, taskEvent, playbook, payment,
} from "@/db/schema";
import { outstanding } from "@/domain/engine";
import { splitDeadlines, upcomingDeadlines } from "@/domain/deadlines";
import { itemLabel, money } from "@/domain/labels";
import { kvGet } from "@/domain/kv";

export async function navCounts(ctx: Ctx) {
  const [p] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(proposal).where(and(eq(proposal.firmId, ctx.firmId), inArray(proposal.status, ["pending", "processing", "recovery"])));
  const [t] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(task).where(and(eq(task.firmId, ctx.firmId), eq(task.status, "open")));
  const [u] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(bankTransaction).where(and(eq(bankTransaction.firmId, ctx.firmId), eq(bankTransaction.status, "unmatched")));
  const [i] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(invoice).where(and(eq(invoice.firmId, ctx.firmId), inArray(invoice.status, ["sent", "part_paid"])));
  const dueNow = splitDeadlines(await upcomingDeadlines(ctx, { withinDays: 0 }), ctx.clock.today()).needsYou.length;
  return { pending: p.n + dueNow, openTasks: t.n, unmatched: u.n, unpaid: i.n };
}

/** A cheap fingerprint of everything the intray shows, for live refresh. */
export async function liveVersion(ctx: Ctx) {
  const r = await ctx.db.execute(sql`select
    (select coalesce(max(created_at), 'epoch') from proposal where firm_id = ${ctx.firmId})::text as p,
    (select coalesce(max(decided_at), 'epoch') from proposal where firm_id = ${ctx.firmId})::text as d,
    (select coalesce(max(at), 'epoch') from task_event where firm_id = ${ctx.firmId})::text as e,
    (select coalesce(max(at), 'epoch') from message where firm_id = ${ctx.firmId})::text as m,
    (select coalesce(max(processed_at), 'epoch') from message where firm_id = ${ctx.firmId})::text as mp,
    (select count(*) from message where firm_id = ${ctx.firmId} and direction = 'in' and processed_at is null)::text as reading,
    (select count(*) from job where firm_id = ${ctx.firmId} and status = 'queued')::text as j`);
  const row = r.rows[0] as Record<string, string>;
  return Object.values(row).join("|");
}

export async function clientNames(ctx: Ctx) {
  const rows = await ctx.db.select({ id: client.id, nameEn: client.nameEn, nameTc: client.nameTc, lifecycle: client.lifecycle, jurisdiction: client.jurisdiction }).from(client).where(and(eq(client.firmId, ctx.firmId), ne(client.lifecycle, "archived"))).orderBy(asc(client.nameEn));
  return rows;
}

export type PageInput = { page?: unknown; pageSize?: unknown; q?: unknown };
export type TaskFilter = PageInput & { status?: "open" | "done" | "cancelled" | "all"; clientId?: string; assigneeId?: string; held?: boolean };
export type PageResult<R> = { rows: R[]; total: number; page: number; pageSize: number };
export function pageQuery(q: unknown) { return typeof q === "string" ? q.trim().slice(0, 256) : ""; }
function textSearch(q: unknown, fields: SQL[]) {
  const text = pageQuery(q);
  // Search is literal: client input cannot turn '%' or '_' into a wildcard.
  const pattern = `%${text.replace(/[\\%_]/g, c => `\\${c}`)}%`;
  return text ? or(...fields.map(field => sql`${field} ilike ${pattern}`)) : undefined;
}
function pageWindow(total: number, opts: PageInput) {
  const size = Number(opts.pageSize ?? 50), requested = Number(opts.page ?? 1);
  const pageSize = Number.isSafeInteger(size) && size > 0 ? Math.min(size, 100) : 50;
  const page = Math.min(Math.max(1, Math.ceil(total / pageSize)), Number.isSafeInteger(requested) && requested > 0 ? requested : 1);
  return { total, page, pageSize, offset: (page - 1) * pageSize };
}
function taskFilter(ctx: Ctx, where: TaskFilter) {
  return and(eq(task.firmId, ctx.firmId), eq(client.firmId, ctx.firmId),
    where.status && where.status !== "all" ? eq(task.status, where.status) : undefined,
    where.clientId ? eq(task.clientId, where.clientId) : undefined,
    where.assigneeId ? eq(task.assigneeId, where.assigneeId) : undefined,
    where.held ? isNotNull(task.holdReason) : undefined,
    textSearch(where.q, [sql`${task.title}`, sql`${client.nameEn}`, sql`${client.nameTc}`, sql`${client.nameSc}`]));
}
async function readTaskRows(ctx: Ctx, where: TaskFilter, window?: ReturnType<typeof pageWindow>) {
  let query = ctx.db.select({ t: task, c: client, pb: playbook.def, i: invoice }).from(task)
    .innerJoin(client, and(eq(client.id, task.clientId), eq(client.firmId, ctx.firmId)))
    .innerJoin(playbook, and(eq(playbook.id, task.playbookId), eq(playbook.version, task.playbookVersion), eq(playbook.firmId, ctx.firmId)))
    .leftJoin(requestT, and(eq(requestT.id, task.requestId), eq(requestT.firmId, ctx.firmId)))
    .leftJoin(invoice, and(eq(invoice.id, requestT.invoiceId), eq(invoice.firmId, ctx.firmId)))
    .where(taskFilter(ctx, where)).orderBy(desc(task.createdAt), desc(task.id)).$dynamic();
  if (window) query = query.limit(window.pageSize).offset(window.offset);
  return (await query).map(({ t, c, pb, i }) => {
    const step = pb.steps[t.stepIndex];
    return { ...t, clientName: c.nameEn, clientNameZh: c.nameTc, stepLabel: stepStatus(step, t.status), stepKind: step?.kind ?? null, waitingOn: waitingOnFor(t, step), outstanding: outstanding(t).map(e => itemLabel(e.key, "en", t.params)), invoice: i ? { number: i.number, status: i.status, total: money(i.totalCents, i.currency) } : null, stepCount: pb.steps.length };
  });
}
export type TaskRow = Awaited<ReturnType<typeof readTaskRows>>[number];
export async function taskPage(ctx: Ctx, where: TaskFilter = {}): Promise<PageResult<TaskRow>> {
  const [count] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(task).innerJoin(client, eq(client.id, task.clientId)).innerJoin(playbook, and(eq(playbook.id, task.playbookId), eq(playbook.version, task.playbookVersion), eq(playbook.firmId, ctx.firmId))).where(taskFilter(ctx, where));
  const { offset: _offset, ...meta } = pageWindow(count.n, where);
  void _offset;
  return { ...meta, rows: await readTaskRows(ctx, where, pageWindow(count.n, where)) };
}
/** Complete batched internal snapshots; staff routes use bounded taskPage. */
export async function taskRows(ctx: Ctx, where: TaskFilter = {}): Promise<TaskRow[]> {
  return where.page !== undefined || where.pageSize !== undefined ? (await taskPage(ctx, where)).rows : readTaskRows(ctx, where);
}

export async function pendingProposalRows(ctx: Ctx) {
  const rows = await ctx.db.select({ p: proposal, c: client }).from(proposal).leftJoin(client, eq(client.id, proposal.clientId))
    .where(and(eq(proposal.firmId, ctx.firmId), inArray(proposal.status, ["pending", "processing", "recovery"]))).orderBy(desc(proposal.createdAt));
  return rows.map(({ p, c }) => ({ ...p, clientName: c?.nameEn ?? null, clientLifecycle: c?.lifecycle ?? null }));
}

export async function todayData(ctx: Ctx) {
  const proposals = await pendingProposalRows(ctx);
  const open = (await taskRows(ctx, { status: "open" })).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  const { needsYou: dueNow, upcoming: deadlines } = splitDeadlines(await upcomingDeadlines(ctx, { withinDays: 30 }), ctx.clock.today());
  const overdue = await ctx.db.select({ i: invoice, c: client }).from(invoice).innerJoin(client, eq(client.id, invoice.clientId))
    .where(and(eq(invoice.firmId, ctx.firmId), inArray(invoice.status, ["sent", "part_paid"]), sql`${invoice.dueOn} < ${ctx.clock.today()}`)).orderBy(asc(invoice.dueOn));
  const done = await ctx.db.select({ t: task, c: client }).from(task).innerJoin(client, eq(client.id, task.clientId))
    .where(and(eq(task.firmId, ctx.firmId), eq(task.status, "done"), sql`${task.completedAt} > now() - interval '7 days'`)).orderBy(desc(task.completedAt)).limit(8);
  return {
    proposals,
    waitingClient: open.filter((t) => t.waitingOn === "client" || t.waitingOn === "signatures"),
    awaitingPayment: open.filter((t) => t.waitingOn === "payment"),
    working: open.filter((t) => t.waitingOn === "clerk" || t.waitingOn === "you"),
    deadlines,
    dueNow,
    overdue: overdue.map(({ i, c }) => ({ ...i, clientName: c.nameEn })),
    done: done.map(({ t, c }) => ({ ...t, clientName: c.nameEn })),
    lastMailPoll: await kvGet<string>(ctx, "mail.lastPollAt"),
    lastBankPoll: await kvGet<string>(ctx, "bank.lastPollAt"),
  };
}

function conversationFilter(ctx: Ctx, where: PageInput) {
  return and(eq(conversation.firmId, ctx.firmId),
    sql`exists (select 1 from message m where m.conversation_id = ${conversation.id} and m.firm_id = ${ctx.firmId})`,
    textSearch(where.q, [sql`${conversation.subject}`, sql`${conversation.counterpartyEmail}`, sql`${client.nameEn}`, sql`${client.nameTc}`, sql`${client.nameSc}`]));
}
async function readConversations(ctx: Ctx, where: PageInput, window?: ReturnType<typeof pageWindow>) {
  let query = ctx.db.select({ v: conversation, c: client }).from(conversation).leftJoin(client, and(eq(client.id, conversation.clientId), eq(client.firmId, ctx.firmId)))
    .where(conversationFilter(ctx, where)).orderBy(desc(conversation.lastMessageAt), desc(conversation.createdAt), desc(conversation.id)).$dynamic();
  if (window) query = query.limit(window.pageSize).offset(window.offset);
  const rows = await query, ids = rows.map(r => r.v.id);
  const [last, drafts] = ids.length ? await Promise.all([
    ctx.db.selectDistinctOn([message.conversationId]).from(message).where(and(eq(message.firmId, ctx.firmId), inArray(message.conversationId, ids), ne(message.status, "draft"))).orderBy(message.conversationId, desc(message.at), desc(message.id)),
    ctx.db.select({ id: message.conversationId, n: sql<number>`count(*)::int` }).from(message).where(and(eq(message.firmId, ctx.firmId), inArray(message.conversationId, ids), eq(message.status, "draft"))).groupBy(message.conversationId),
  ]) : [[], []];
  const lastById = new Map(last.map(m => [m.conversationId, m])), draftsById = new Map(drafts.map(d => [d.id, d.n]));
  return rows.map(({ v, c }) => ({ ...v, clientName: c?.nameEn ?? null, last: lastById.get(v.id) ?? null, drafts: draftsById.get(v.id) ?? 0 }));
}
export async function conversationPage(ctx: Ctx, where: PageInput = {}) {
  const [count] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(conversation).leftJoin(client, and(eq(client.id, conversation.clientId), eq(client.firmId, ctx.firmId))).where(conversationFilter(ctx, where));
  const { offset: _offset, ...meta } = pageWindow(count.n, where); void _offset;
  return { ...meta, rows: await readConversations(ctx, where, pageWindow(count.n, where)) };
}
export async function conversations(ctx: Ctx, where: PageInput = {}) {
  return where.page !== undefined || where.pageSize !== undefined ? (await conversationPage(ctx, where)).rows : readConversations(ctx, where);
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

function mailFilter(ctx: Ctx, where: PageInput) {
  return and(eq(mailItem.firmId, ctx.firmId), textSearch(where.q, [sql`${mailItem.summary}`, sql`${mailItem.sender}`, sql`${client.nameEn}`, sql`${client.nameTc}`, sql`${client.nameSc}`]));
}
async function readMailItems(ctx: Ctx, where: PageInput, window?: ReturnType<typeof pageWindow>) {
  let query = ctx.db.select({ m: mailItem, c: client }).from(mailItem).leftJoin(client, and(eq(client.id, mailItem.clientId), eq(client.firmId, ctx.firmId))).where(mailFilter(ctx, where)).orderBy(desc(mailItem.createdAt), desc(mailItem.id)).$dynamic();
  if (window) query = query.limit(window.pageSize).offset(window.offset);
  return query;
}
export async function mailItemPage(ctx: Ctx, where: PageInput = {}) {
  const [count] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(mailItem).leftJoin(client, and(eq(client.id, mailItem.clientId), eq(client.firmId, ctx.firmId))).where(mailFilter(ctx, where));
  const { offset: _offset, ...meta } = pageWindow(count.n, where); void _offset;
  return { ...meta, rows: await readMailItems(ctx, where, pageWindow(count.n, where)) };
}
export async function mailItems(ctx: Ctx, where: PageInput = {}) {
  return where.page !== undefined || where.pageSize !== undefined ? (await mailItemPage(ctx, where)).rows : readMailItems(ctx, where);
}

export async function paymentPage(ctx: Ctx, where: PageInput = {}) {
  const filter = and(eq(bankTransaction.firmId, ctx.firmId), textSearch(where.q, [sql`${bankTransaction.reference}`, sql`${bankTransaction.payerName}`, sql`${bankTransaction.matchNote}`, sql`${invoice.number}`]));
  const joined = () => ctx.db.select({ b: bankTransaction, i: invoice }).from(bankTransaction)
    .leftJoin(payment, and(eq(payment.bankTransactionId, bankTransaction.id), eq(payment.firmId, ctx.firmId)))
    .leftJoin(invoice, and(eq(invoice.id, payment.invoiceId), eq(invoice.firmId, ctx.firmId)));
  const matching = joined().where(filter).as("matching_deposits");
  const [count] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(matching);
  const { offset: _offset, ...meta } = pageWindow(count.n, where); void _offset;
  const rows = await joined().where(filter).orderBy(desc(bankTransaction.receivedAt), desc(bankTransaction.id)).limit(meta.pageSize).offset(pageWindow(count.n, where).offset);
  return { ...meta, rows };
}
