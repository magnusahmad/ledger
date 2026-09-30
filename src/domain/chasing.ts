// Chasing: tasks waiting on the client for information or signatures get a reminder drafted
// on a set rhythm, escalated as the statutory deadline gets close or after repeated chases.
// Every reminder is a draft for approval; nothing goes out on its own.
import { and, desc, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { hkDate } from "@/lib/clock";
import { conversation, firm, message, request as requestT, task as taskT, taskAction, type Lang } from "@/db/schema";
import { currentStep, getTask, outstanding, taskEvents } from "./engine";
import { daysBetween } from "./dates";
import { composeReply, emptyFacts, newRequestFacts } from "./inbound";
import { createProposal, pendingProposals } from "./proposals";
import { addOffPlatformStep } from "./off-platform";
import { plural } from "@/lib/display";

export type ChaseRules = { firstAfterDays: number; repeatEveryDays: number; escalateWithinDays: number; escalateAfterChases: number };
export const DEFAULT_CHASE_RULES: ChaseRules = { firstAfterDays: 5, repeatEveryDays: 5, escalateWithinDays: 14, escalateAfterChases: 3 };

export async function chaseRules(ctx: Ctx): Promise<ChaseRules> {
  const f = await ctx.db.query.firm.findFirst({ where: eq(firm.id, ctx.firmId) });
  return { ...DEFAULT_CHASE_RULES, ...((f?.settings as { chase?: Partial<ChaseRules> } | undefined)?.chase ?? {}) };
}

export async function setChaseRules(ctx: Ctx, r: ChaseRules) {
  for (const [k, v] of Object.entries(r)) if (!Number.isInteger(v) || v < 1 || v > 365) throw new Error(`${k} must be a whole number of days from 1 to 365`);
  const f = (await ctx.db.query.firm.findFirst({ where: eq(firm.id, ctx.firmId) }))!;
  await ctx.db.update(firm).set({ settings: { ...(f.settings as object), chase: r } }).where(eq(firm.id, ctx.firmId));
}

/** Events that mean the client was just asked, or just did something: the chase clock restarts. */
const TOUCH = new Set(["task.created", "step.entered", "message.sent", "message.mailbox_reply", "portal.upload", "agent.information", "agent.change", "signing.signed", "chase.sent"]);

const SIGNATURES: Record<Lang, string> = { en: "Signatures on the documents we sent for e-signature", tc: "簽署我們以電子方式發送的文件", sc: "签署我们以电子方式发送的文件" };
const DEADLINE_CLOSE: Record<Lang, string> = {
  en: "The statutory deadline is close. If we don't receive these soon, the filing may be late and late fees or penalties may apply.",
  tc: "法定期限將至。如未能盡快收到上述資料，文件或會逾期提交，並可能須繳付逾期費用或罰款。",
  sc: "法定期限将至。如未能尽快收到上述资料，文件或会逾期提交，并可能须缴付逾期费用或罚款。",
};

export async function runChasers(ctx: Ctx): Promise<number> {
  const rules = await chaseRules(ctx);
  const today = ctx.clock.today();
  const open = await ctx.db.select().from(taskT).where(and(eq(taskT.firmId, ctx.firmId), eq(taskT.status, "open")));
  let drafted = 0;
  for (const row of open) {
    if (row.holdReason) continue;
    const t = await getTask(ctx, row.id);
    const step = currentStep(t);
    const owesInfo = step?.kind === "collect" && outstanding(t).length > 0;
    const owesSignature = step?.kind === "sign";
    if (!owesInfo && !owesSignature) continue;
    if ((await pendingProposals(ctx, { taskId: t.id, kind: "send_message" })).some((p) => p.payload.purpose === "chase")) continue;

    const events = await taskEvents(ctx, t.id);
    const touches = events.filter((e) => TOUCH.has(e.kind));
    const last = touches.at(-1);
    if (!last) continue;
    const lastClientSide = [...touches].reverse().find((e) => e.kind !== "chase.sent");
    const chasesSince = touches.filter((e) => e.kind === "chase.sent" && (!lastClientSide || e.at > lastClientSide.at)).length;
    const wait = chasesSince === 0 ? rules.firstAfterDays : rules.repeatEveryDays;
    if (daysBetween(hkDate(last.at), today) < wait) continue;

    const escalation = (!!t.dueDate && daysBetween(today, t.dueDate) <= rules.escalateWithinDays) || chasesSince >= rules.escalateAfterChases;
    await draftChase(ctx, t.id, { escalation, owesSignature });
    drafted++;
  }
  return drafted;
}

async function draftChase(ctx: Ctx, taskId: string, o: { escalation: boolean; owesSignature: boolean }) {
  const t = await getTask(ctx, taskId);
  const cl = (await ctx.db.query.client.findFirst({ where: (c, { eq }) => eq(c.id, t.clientId) }))!;
  const contacts = await ctx.db.query.contact.findMany({ where: (c, { eq }) => eq(c.clientId, t.clientId) });
  const to = contacts.find((c) => c.isInstructing && c.email) ?? contacts.find((c) => c.email);
  const lang = (to?.language ?? cl.messageLang) as Lang;
  const req = t.requestId ? await ctx.db.query.request.findFirst({ where: eq(requestT.id, t.requestId) }) : null;
  const convId = req?.conversationId
    ?? (await ctx.db.select().from(conversation).where(and(eq(conversation.clientId, t.clientId), eq(conversation.firmId, ctx.firmId))).orderBy(desc(conversation.lastMessageAt)).limit(1))[0]?.id
    ?? (await ctx.db.insert(conversation).values({ id: ctx.ids.next("cnv"), firmId: ctx.firmId, clientId: t.clientId, channel: "email", subject: t.title, counterpartyEmail: to?.email ?? null, lastMessageAt: ctx.clock.now(), createdAt: ctx.clock.now() }).returning())[0].id;
  const [item] = await newRequestFacts(ctx, [t.id], lang);
  const needed = o.owesSignature ? [SIGNATURES[lang]] : item.needed;
  const facts = { ...emptyFacts(lang), context: "chase" as const, newRequests: [{ ...item, needed, onFile: [], alreadyReceived: [] }], extraNotes: o.escalation ? [DEADLINE_CLOSE[lang]] : [] };
  const lastIn = (await ctx.db.select().from(message).where(and(eq(message.conversationId, convId), eq(message.direction, "in"))).orderBy(desc(message.at)).limit(1))[0] ?? null;
  const draft = await composeReply(ctx, { clientId: t.clientId, conversationId: convId, inReplyTo: lastIn, facts, requestId: t.requestId, to: to?.email ? [to.email] : undefined, purpose: "update" });
  const who = to?.name ?? cl.nameEn;
  const what = o.owesSignature ? "signatures outstanding" : `${plural(needed.length, "item")} outstanding`;
  const p = await createProposal(ctx, {
    kind: "send_message", title: `${o.escalation ? "Escalate: " : "Chase "}${who}: ${what}`, summary: `${t.title}${t.dueDate ? `, due ${t.dueDate}` : ""}`,
    clientId: t.clientId, requestId: t.requestId, taskId: t.id, payload: { messageId: draft.id, requestId: t.requestId, taskIds: [], draftSource: draft.source, purpose: "chase", escalation: o.escalation },
  });
  await ctx.db.update(message).set({ proposalId: p.id }).where(eq(message.id, draft.id));
  if (o.escalation) {
    const hasCall = (await ctx.db.select().from(taskAction).where(and(eq(taskAction.taskId, t.id), eq(taskAction.status, "open")))).some((a) => a.title.startsWith("Call "));
    if (!hasCall) await addOffPlatformStep(ctx, t.id, { title: `Call ${who} about what's outstanding`, waitingOn: "us", dueDate: ctx.clock.today() });
  }
}
