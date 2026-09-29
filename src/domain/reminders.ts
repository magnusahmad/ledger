// Overdue invoice reminders to the billing contact in their language. Default escalation:
// reminder at +7 and +14 days overdue, partner flag at +30 (awaiting the firm's real policy).
import { and, eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { contact, conversation, invoice, message, reminder, type Lang } from "@/db/schema";
import { draftEmail, type ReplyFacts } from "@/agent/draft";
import { createProposal } from "./proposals";
import { getFirm } from "./firm";
import { daysBetween, fmtDate } from "./dates";
import { money } from "./labels";

export const DEFAULT_POLICY = [
  { level: 1, daysOverdue: 7, action: "remind" as const },
  { level: 2, daysOverdue: 14, action: "remind" as const },
  { level: 3, daysOverdue: 30, action: "partner" as const },
];

export async function runReminders(ctx: Ctx): Promise<number> {
  const today = ctx.clock.today();
  const open = await ctx.db.select().from(invoice).where(and(eq(invoice.firmId, ctx.firmId), inArray(invoice.status, ["sent", "part_paid"])));
  let created = 0;
  for (const inv of open) {
    if (!inv.dueOn || inv.dueOn >= today) continue;
    const overdue = daysBetween(inv.dueOn, today);
    const done = new Set((await ctx.db.select().from(reminder).where(eq(reminder.invoiceId, inv.id))).map((r) => r.level));
    const step = [...DEFAULT_POLICY].reverse().find((p) => overdue >= p.daysOverdue);
    if (!step || done.has(step.level)) continue;
    if (step.action === "partner") {
      const p = await createProposal(ctx, { kind: "triage", title: `Invoice ${inv.number} is ${overdue} days overdue`, summary: "Flag to the partner: consider switching this client to upfront terms.", clientId: inv.clientId, payload: { invoiceId: inv.id, escalation: true } });
      await ctx.db.insert(reminder).values({ id: ctx.ids.next("rem"), firmId: ctx.firmId, invoiceId: inv.id, level: step.level, proposalId: p.id, createdAt: ctx.clock.now() });
      created++;
      continue;
    }
    const bc = inv.billingContactId ? await ctx.db.query.contact.findFirst({ where: eq(contact.id, inv.billingContactId) }) : null;
    if (!bc?.email) continue;
    const lang = (bc.language ?? "en") as Lang;
    const firm = await getFirm(ctx);
    const facts: ReplyFacts = {
      language: lang, recipientName: bc.salutation?.[lang] ?? bc.name, clientName: "", signOff: firm.signOff?.[lang] ?? firm.legalName,
      newRequests: [], updates: [], changes: [], cancellations: [], questions: [], clarifications: [], uploadUrl: null,
      invoice: { number: inv.number, totalFormatted: money(inv.totalCents - inv.paidCents, inv.currency), lines: [], terms: `issued ${fmtDate(inv.issuedOn, lang)}, due ${fmtDate(inv.dueOn, lang)}`, paymentInstructions: Object.entries(await ctx.bank.accountDetails()).map(([k, v]) => `${k}: ${v}`).join("\n") },
      extraNotes: [`This is payment reminder number ${step.level}. The invoice is ${overdue} days overdue. Be polite; if they have already paid, thank them and ask them to ignore this.`],
    };
    const d = await draftEmail(ctx, facts, { purpose: `Polite payment reminder ${step.level} for an overdue invoice` });
    let conv = await ctx.db.query.conversation.findFirst({ where: and(eq(conversation.clientId, inv.clientId), eq(conversation.counterpartyEmail, bc.email.toLowerCase())) });
    if (!conv) [conv] = await ctx.db.insert(conversation).values({ id: ctx.ids.next("cnv"), firmId: ctx.firmId, clientId: inv.clientId, channel: "email", subject: `Invoice ${inv.number}`, counterpartyEmail: bc.email.toLowerCase(), createdAt: ctx.clock.now() }).returning();
    const [draft] = await ctx.db.insert(message).values({ id: ctx.ids.next("msg"), firmId: ctx.firmId, conversationId: conv.id, direction: "out", status: "draft", fromAddr: ctx.mail.address, toAddrs: [bc.email], subject: d.subject, text: d.body, language: lang, at: ctx.clock.now() }).returning();
    const p = await createProposal(ctx, { kind: "send_message", title: `Send reminder ${step.level} for ${inv.number}`, summary: `${overdue} days overdue, ${money(inv.totalCents - inv.paidCents)} outstanding`, clientId: inv.clientId, payload: { messageId: draft.id, requestId: null, taskIds: [], draftSource: d.source, purpose: "reminder", invoiceId: inv.id } });
    await ctx.db.insert(reminder).values({ id: ctx.ids.next("rem"), firmId: ctx.firmId, invoiceId: inv.id, level: step.level, proposalId: p.id, messageId: draft.id, createdAt: ctx.clock.now() });
    created++;
  }
  return created;
}
