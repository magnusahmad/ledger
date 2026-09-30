// Third parties: banks, law firms, auditors, officials, outgoing secretaries. They're linked to
// tasks, not the client list. Their email is logged on those tasks and never read as a client
// instruction, so it can't create prospects or drafted replies.
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { client as clientT, conversation, invoice, message, proposal, task as taskT, taskParty, thirdParty } from "@/db/schema";
import { cancelTask, logEvent } from "./engine";
import { voidInvoice } from "./invoices";
import { createProposal } from "./proposals";
import { audit } from "./audit";

export class ThirdPartyError extends Error {}
export type PartyRole = typeof thirdParty.$inferSelect["role"];

export const ROLE_LABEL: Record<PartyRole, string> = {
  bank: "Bank", law_firm: "Law firm", auditor: "Auditor", government: "Government", outgoing_secretary: "Outgoing secretary", notary: "Notary", other: "Other", ignore: "Ignored sender",
};

export async function addThirdParty(ctx: Ctx, p: { name: string; organisation?: string | null; email?: string | null; role: PartyRole; notes?: string | null }) {
  if (!p.name.trim()) throw new ThirdPartyError("Give a name");
  const email = p.email?.trim().toLowerCase() || null;
  if (email) {
    const existing = await findThirdPartyByEmail(ctx, email);
    if (existing) return existing;
  }
  const [row] = await ctx.db.insert(thirdParty).values({ id: ctx.ids.next("tp"), firmId: ctx.firmId, name: p.name.trim(), organisation: p.organisation?.trim() || null, email, role: p.role, notes: p.notes ?? null, createdAt: ctx.clock.now() }).returning();
  await audit(ctx, "third_party.add", "third_party", row.id, { role: row.role });
  return row;
}

export async function findThirdPartyByEmail(ctx: Ctx, email: string | null | undefined) {
  if (!email) return null;
  return (await ctx.db.query.thirdParty.findFirst({ where: and(eq(thirdParty.firmId, ctx.firmId), sql`lower(${thirdParty.email}) = ${email.toLowerCase()}`) })) ?? null;
}

export async function linkThirdParty(ctx: Ctx, taskId: string, partyId: string) {
  const p = await ctx.db.query.thirdParty.findFirst({ where: and(eq(thirdParty.id, partyId), eq(thirdParty.firmId, ctx.firmId)) });
  if (!p) throw new ThirdPartyError("Third party not found");
  const inserted = await ctx.db.insert(taskParty).values({ id: ctx.ids.next("tpl"), firmId: ctx.firmId, taskId, partyId, createdAt: ctx.clock.now() }).onConflictDoNothing().returning();
  if (inserted.length) await logEvent(ctx, taskId, "party.linked", `Third party added: ${p.name}${p.organisation ? `, ${p.organisation}` : ""}`, { partyId }, ctx.userId);
}

export async function partiesForTask(ctx: Ctx, taskId: string) {
  const rows = await ctx.db.select({ p: thirdParty }).from(taskParty).innerJoin(thirdParty, eq(thirdParty.id, taskParty.partyId)).where(and(eq(taskParty.taskId, taskId), eq(taskParty.firmId, ctx.firmId)));
  return rows.map((r) => r.p);
}

export async function listThirdParties(ctx: Ctx) {
  return ctx.db.select().from(thirdParty).where(and(eq(thirdParty.firmId, ctx.firmId), sql`${thirdParty.role} <> 'ignore'`)).orderBy(thirdParty.name);
}

/** Inbound mail from a known third party: log it on their open tasks instead of reading it as a client instruction. */
export async function handleThirdPartyMail(ctx: Ctx, msg: typeof message.$inferSelect): Promise<boolean> {
  const party = await findThirdPartyByEmail(ctx, msg.fromAddr);
  if (!party) return false;
  if (party.role !== "ignore") {
    const links = await ctx.db.select({ t: taskT }).from(taskParty).innerJoin(taskT, eq(taskT.id, taskParty.taskId)).where(and(eq(taskParty.partyId, party.id), eq(taskT.status, "open")));
    const who = `${party.name}${party.organisation ? ` (${party.organisation})` : ""}`;
    for (const { t } of links) await logEvent(ctx, t.id, "message.third_party", `Email from ${who}: ${msg.subject ?? ""}`, { messageId: msg.id, partyId: party.id }, "third_party");
    const clients = [...new Set(links.map((l) => l.t.clientId))];
    if (clients.length === 1) await ctx.db.update(conversation).set({ clientId: clients[0] }).where(and(eq(conversation.id, msg.conversationId), sql`${conversation.clientId} is null`));
    if (!links.length) await createProposal(ctx, { kind: "triage", title: `Email from ${who}`, summary: "A third party wrote in, but isn't linked to an open task. Read it and link it to the right task if needed.", clientId: clients[0] ?? null, payload: { messageId: msg.id, partyId: party.id } });
  }
  await ctx.db.update(message).set({ processedAt: ctx.clock.now() }).where(eq(message.id, msg.id));
  return true;
}

/**
 * "Not a client": the sender of this thread is a third party (or someone to ignore). If
 * Harbourline made a prospect from their email, that prospect is retired: its tasks cancelled,
 * draft invoices voided and pending drafts withdrawn. A real client's contact can't be tagged.
 */
export async function markSenderNotClient(ctx: Ctx, conversationId: string, o: { as: "third_party" | "ignore"; name: string; organisation?: string | null; role?: PartyRole; taskId?: string | null }) {
  const conv = await ctx.db.query.conversation.findFirst({ where: and(eq(conversation.id, conversationId), eq(conversation.firmId, ctx.firmId)) });
  if (!conv) throw new ThirdPartyError("Conversation not found");
  const email = conv.counterpartyEmail ?? (await ctx.db.query.message.findFirst({ where: and(eq(message.conversationId, conv.id), eq(message.direction, "in")) }))?.fromAddr ?? null;
  if (!email) throw new ThirdPartyError("No sender address on this thread");
  const cl = conv.clientId ? await ctx.db.query.client.findFirst({ where: eq(clientT.id, conv.clientId) }) : null;
  const contacts = await ctx.db.query.contact.findMany({ where: (c, { eq }) => eq(sql`lower(${c.email})`, email.toLowerCase()) });
  const realClient = contacts.map((c) => c.clientId).find((id) => id !== cl?.id || cl?.lifecycle !== "prospect");
  if (realClient) {
    const rc = await ctx.db.query.client.findFirst({ where: eq(clientT.id, realClient) });
    throw new ThirdPartyError(`${email} is a contact of ${rc?.nameEn ?? "a client"}; remove the contact first`);
  }
  const party = await addThirdParty(ctx, { name: o.name || email, organisation: o.organisation, email, role: o.as === "ignore" ? "ignore" : o.role ?? "other" });

  if (cl?.lifecycle === "prospect") {
    const tasks = await ctx.db.select().from(taskT).where(and(eq(taskT.clientId, cl.id), eq(taskT.status, "open")));
    for (const t of tasks) await cancelTask(ctx, t.id, `Sender marked as not a client (${party.name})`);
    const invs = await ctx.db.select().from(invoice).where(and(eq(invoice.clientId, cl.id), eq(invoice.status, "draft")));
    for (const i of invs) await voidInvoice(ctx, i.id, "Sender marked as not a client");
    const pending = await ctx.db.select().from(proposal).where(and(eq(proposal.clientId, cl.id), eq(proposal.status, "pending")));
    if (pending.length) {
      await ctx.db.update(proposal).set({ status: "superseded", decidedAt: ctx.clock.now() }).where(inArray(proposal.id, pending.map((p) => p.id)));
      await ctx.db.update(message).set({ status: "failed", error: "Sender marked as not a client" }).where(and(inArray(message.proposalId, pending.map((p) => p.id)), eq(message.status, "draft")));
    }
    await ctx.db.update(clientT).set({ lifecycle: "archived" }).where(eq(clientT.id, cl.id));
    await ctx.db.update(conversation).set({ clientId: null }).where(eq(conversation.id, conv.id));
    await audit(ctx, "client.archived", "client", cl.id, { reason: "Sender marked as not a client", partyId: party.id });
  }
  if (o.taskId) {
    await linkThirdParty(ctx, o.taskId, party.id);
    const t = await ctx.db.query.task.findFirst({ where: eq(taskT.id, o.taskId) });
    if (t) await ctx.db.update(conversation).set({ clientId: t.clientId }).where(eq(conversation.id, conv.id));
  }
  return party;
}
