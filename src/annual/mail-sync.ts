// Reads the pilot's team mailboxes through the relevance gate (src/annual/mail-gate.ts). Skipped mail
// is counted, never stored. Kept mail is stored once (deduplicated on its Message-ID across mailboxes)
// and linked to its case, or waits for staff when it could belong to more than one company. This
// path never runs the general intake, so a stray email has no way to create a prospect, task or proposal.
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { arCase, arCaseEvent, arMail, arMailScan, client as clientT, contact } from "@/db/schema";
import { addDays } from "@/domain/dates";
import { kvGet, kvSet } from "@/domain/kv";
import type { GraphFullMessage, GraphMessageMeta } from "@/integrations/mail/graph";
import { gateMessage, tallySkips, type GateContext, type GateMessage, type GateResult } from "./mail-gate";
import { markSent } from "./cases";

export interface MailboxSource {
  delta(mailbox: string, folder: "inbox" | "sentitems", cursor: string | null, o: { since: string }): Promise<{ messages: GraphMessageMeta[]; cursor: string }>;
  headers(mailbox: string, id: string): Promise<Record<string, string>>;
  full(mailbox: string, id: string, folder?: string): Promise<GraphFullMessage>;
  createDraft(mailbox: string, m: { to: string[]; cc?: string[]; subject: string; text: string; attachments?: { filename: string; mime: string; content: Buffer }[]; replyToId?: string }): Promise<{ draftId: string; conversationId: string | null; webLink: string | null }>;
}

export type SyncOptions = { mailboxes: string[]; firmDomains: string[]; lookbackDays: number };

/** Mail from a company's contacts belongs to its case from this long before the deadline. */
export const WINDOW_BEFORE_DAYS = 60;
export const WINDOW_AFTER_DAYS = 60;
const SYSTEM = "system:mail-sync";
const FOLDERS = ["inbox", "sentitems"] as const;

export async function gateContext(ctx: Ctx, firmDomains: string[]): Promise<GateContext> {
  const cases = await ctx.db.select().from(arCase).where(and(eq(arCase.firmId, ctx.firmId), ne(arCase.stage, "registered")));
  if (!cases.length) return { firmDomains, threads: [], contacts: [] };
  const clientIds = [...new Set(cases.map((c) => c.clientId))];
  const emails = new Map<string, Set<string>>();
  const add = (clientId: string, e: string | null) => { if (e) (emails.get(clientId) ?? emails.set(clientId, new Set()).get(clientId)!).add(e.trim().toLowerCase()); };
  for (const c of await ctx.db.select().from(contact).where(and(eq(contact.firmId, ctx.firmId), inArray(contact.clientId, clientIds)))) add(c.clientId, c.email);
  const linked = await ctx.db.select({ caseId: arMail.caseId, from: arMail.fromAddr, dir: arMail.direction, rfc: arMail.internetMessageId }).from(arMail)
    .where(and(eq(arMail.firmId, ctx.firmId), eq(arMail.status, "linked")));
  const caseClient = new Map(cases.map((c) => [c.id, c.clientId]));
  for (const l of linked) if (l.caseId && l.dir === "in" && caseClient.has(l.caseId)) add(caseClient.get(l.caseId)!, l.from);
  return {
    firmDomains,
    threads: cases.filter((c) => c.draft?.conversationId).map((c) => ({
      caseId: c.id, clientId: c.clientId, conversationIds: [c.draft!.conversationId!],
      messageIds: linked.filter((l) => l.caseId === c.id && l.dir === "out" && l.rfc).map((l) => l.rfc!),
    })),
    contacts: cases.map((c) => ({
      caseId: c.id, clientId: c.clientId, dueDate: c.dueDate, emails: [...(emails.get(c.clientId) ?? [])],
      windowFrom: addDays(c.dueDate, -WINDOW_BEFORE_DAYS), windowTo: c.registeredOn ?? addDays(c.dueDate, WINDOW_AFTER_DAYS),
    })),
  };
}

const toGate = (mailbox: string, m: GraphMessageMeta, headers: Record<string, string> = {}): GateMessage => ({
  mailbox, folder: m.folder, from: m.from, to: m.to, cc: m.cc, conversationId: m.conversationId, internetMessageId: m.internetMessageId,
  inReplyTo: headers["in-reply-to"] ?? null, references: (headers["references"] ?? "").split(/\s+/).filter(Boolean),
  headers, contentType: headers["content-type"] ?? null, isMeetingMessage: m.isMeetingMessage, receivedAt: m.receivedAt,
});

export async function syncMailboxes(ctx: Ctx, src: MailboxSource, o: SyncOptions) {
  const since = addDays(ctx.clock.today(), -o.lookbackDays);
  for (const mailbox of o.mailboxes) {
    for (const folder of FOLDERS) {
      const key = `annual.mail.cursor:${mailbox.toLowerCase()}:${folder}`;
      const { messages, cursor } = await src.delta(mailbox, folder, await kvGet<string>(ctx, key), { since });
      const results: GateResult[] = [];
      let gctx = await gateContext(ctx, o.firmDomains);
      for (const m of messages) {
        const r = await handle(ctx, src, gctx, mailbox, m);
        results.push(r);
        if (r.decision !== "skip") gctx = await gateContext(ctx, o.firmDomains); // a stored mail can add a contact or a thread
      }
      await recordScan(ctx, mailbox, results);
      await kvSet(ctx, key, cursor);
    }
  }
}

async function handle(ctx: Ctx, src: MailboxSource, gctx: GateContext, mailbox: string, m: GraphMessageMeta): Promise<GateResult> {
  // Cheap pass on metadata first; headers are fetched only for mail that could be kept.
  const first = gateMessage(toGate(mailbox, m), gctx);
  if (first.decision === "skip") return first;
  const headers = await src.headers(mailbox, m.id);
  const r = gateMessage(toGate(mailbox, m, headers), gctx);
  if (r.decision === "skip") return r;
  if (m.internetMessageId && (await ctx.db.query.arMail.findFirst({ where: and(eq(arMail.firmId, ctx.firmId), eq(arMail.internetMessageId, m.internetMessageId)) }))) return r;
  await store(ctx, src, mailbox, m, r.decision === "link" ? { status: "linked", caseId: r.caseId, via: r.via } : { status: "ask", candidates: r.caseIds });
  if (r.decision === "link" && r.via === "thread" && m.folder === "sentitems") {
    const c = await ctx.db.query.arCase.findFirst({ where: and(eq(arCase.id, r.caseId), eq(arCase.firmId, ctx.firmId)) });
    if (c?.stage === "draft_ready" && c.draft?.conversationId === m.conversationId) await markSent({ ...ctx, userId: SYSTEM }, c.id, { via: "seen_in_sent_items", at: new Date(m.receivedAt) });
  }
  return r;
}

async function store(ctx: Ctx, src: MailboxSource, mailbox: string, m: GraphMessageMeta,
  link: { status: "linked"; caseId: string; via: "thread" | "contact" | "manual"; by?: string } | { status: "ask"; candidates: string[] }) {
  const full = await src.full(mailbox, m.id, m.folder);
  const id = ctx.ids.next("arm");
  const attachments = [];
  for (const [i, a] of full.attachments.entries()) {
    const storageKey = `annual-mail/${id}/${i}-${a.filename.replace(/[\\/:*?"<>|]/g, "_")}`;
    await ctx.storage.put(storageKey, a.content);
    attachments.push({ filename: a.filename, mime: a.mime, storageKey, bytes: a.content.length });
  }
  await ctx.db.insert(arMail).values({
    id, firmId: ctx.firmId, mailbox: mailbox.toLowerCase(), graphId: m.id, folder: m.folder, direction: m.folder === "sentitems" ? "out" : "in",
    conversationId: m.conversationId, internetMessageId: m.internetMessageId, fromAddr: m.from, fromName: m.fromName,
    toAddrs: m.to, ccAddrs: m.cc, subject: m.subject, text: full.text, attachments, receivedAt: new Date(m.receivedAt),
    ...(link.status === "linked" ? { status: "linked", caseId: link.caseId, via: link.via, linkedBy: link.by ?? null } : { status: "ask", candidateCaseIds: link.candidates }),
  }).onConflictDoNothing();
  return id;
}

async function recordScan(ctx: Ctx, mailbox: string, results: GateResult[]) {
  if (!results.length) return;
  const t = tallySkips(results);
  const day = ctx.clock.today();
  const prev = await ctx.db.query.arMailScan.findFirst({ where: and(eq(arMailScan.firmId, ctx.firmId), eq(arMailScan.day, day), eq(arMailScan.mailbox, mailbox.toLowerCase())) });
  const skipped = { ...(prev?.skipped ?? {}) };
  for (const [k, v] of Object.entries(t.skipped)) skipped[k] = (skipped[k] ?? 0) + (v ?? 0);
  await ctx.db.insert(arMailScan).values({ firmId: ctx.firmId, day, mailbox: mailbox.toLowerCase(), scanned: t.scanned, linked: t.linked, ask: t.ask, skipped })
    .onConflictDoUpdate({ target: [arMailScan.firmId, arMailScan.day, arMailScan.mailbox], set: { scanned: sql`${arMailScan.scanned} + ${t.scanned}`, linked: sql`${arMailScan.linked} + ${t.linked}`, ask: sql`${arMailScan.ask} + ${t.ask}`, skipped } });
}

/** Staff attach an email the gate missed. Recorded as a gate defect (DECISIONS.md #56). */
export async function linkManually(ctx: Ctx, src: MailboxSource, o: { mailbox: string; graphId: string; caseId: string; folder?: string }) {
  const c = await ctx.db.query.arCase.findFirst({ where: and(eq(arCase.id, o.caseId), eq(arCase.firmId, ctx.firmId)) });
  if (!c) throw new Error("Case not found");
  const existing = await ctx.db.query.arMail.findFirst({ where: and(eq(arMail.firmId, ctx.firmId), eq(arMail.mailbox, o.mailbox.toLowerCase()), eq(arMail.graphId, o.graphId)) });
  if (existing) throw new Error("That email is already in the pilot");
  const full = await src.full(o.mailbox, o.graphId, o.folder ?? "inbox");
  const id = await store(ctx, { ...src, full: async () => full }, o.mailbox, full.meta, { status: "linked", caseId: c.id, via: "manual", by: ctx.userId });
  await ctx.db.insert(arCaseEvent).values({ id: ctx.ids.next("arce"), firmId: ctx.firmId, caseId: c.id, at: ctx.clock.now(), userId: ctx.userId, kind: "gate_defect", detail: { mailId: id, from: full.meta.from } });
}

/** Staff choose the case for mail that could belong to several companies, or dismiss it. */
export async function resolveAsk(ctx: Ctx, mailId: string, caseId: string | null) {
  const m = await ctx.db.query.arMail.findFirst({ where: and(eq(arMail.id, mailId), eq(arMail.firmId, ctx.firmId)) });
  if (!m || m.status !== "ask") throw new Error("This email isn't waiting for a choice");
  if (caseId && !m.candidateCaseIds.includes(caseId)) {
    const c = await ctx.db.query.arCase.findFirst({ where: and(eq(arCase.id, caseId), eq(arCase.firmId, ctx.firmId)) });
    if (!c) throw new Error("Case not found");
  }
  await ctx.db.update(arMail).set(caseId ? { status: "linked", caseId, via: "manual", linkedBy: ctx.userId } : { status: "dismissed", linkedBy: ctx.userId }).where(eq(arMail.id, mailId));
}

export async function caseMail(ctx: Ctx, caseId: string) {
  return ctx.db.select().from(arMail).where(and(eq(arMail.firmId, ctx.firmId), eq(arMail.caseId, caseId))).orderBy(arMail.receivedAt);
}

export async function mailWaiting(ctx: Ctx) {
  const rows = await ctx.db.select().from(arMail).where(and(eq(arMail.firmId, ctx.firmId), eq(arMail.status, "ask"))).orderBy(arMail.receivedAt);
  const names = new Map((await ctx.db.select({ id: arCase.id, name: clientT.nameEn }).from(arCase).innerJoin(clientT, eq(clientT.id, arCase.clientId)).where(eq(arCase.firmId, ctx.firmId))).map((r) => [r.id, r.name]));
  return rows.map((r) => ({ ...r, candidates: r.candidateCaseIds.map((id) => ({ id, name: names.get(id) ?? id })) }));
}
