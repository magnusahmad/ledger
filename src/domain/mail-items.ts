// Registered office mail: a scanned letter is read by the model, matched to a client,
// logged, and the client notification is drafted for approval in the client's language.
import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { client as clientT, conversation, document, mailItem } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import { callAgent } from "@/agent/call";
import { MailItemZ } from "@/agent/schemas";
import { MAIL_SYSTEM } from "@/agent/prompts";
import { composeReply } from "./inbound";
import { createProposal } from "./proposals";
import type { ReplyFacts } from "@/agent/draft";
import type { LlmMessage } from "@/integrations/types";
import { valueText } from "@/lib/display";

export async function logMailItem(ctx: Ctx, o: { filename: string; mime: string; content: Buffer; receivedOn: string }) {
  const clients = await ctx.db.select({ id: clientT.id, nameEn: clientT.nameEn, nameTc: clientT.nameTc, number: clientT.companyNumber }).from(clientT).where(eq(clientT.firmId, ctx.firmId));
  const dataUrl = `data:${o.mime};base64,${o.content.toString("base64")}`;
  const parts: Extract<LlmMessage, { content: unknown[] }>["content"] = [{ type: "text", text: `Clients at our registered-office address: ${JSON.stringify(clients)}\nToday: ${ctx.clock.today()}` }];
  if (o.mime.startsWith("image/")) parts.push({ type: "image_url", image_url: { url: dataUrl } });
  else parts.push({ type: "file", file: { filename: o.filename, file_data: dataUrl } });
  const r = await callAgent(ctx, { agent: "mail", system: MAIL_SYSTEM, user: parts, schema: MailItemZ });
  const clientId = r.clientId && clients.some((c) => c.id === r.clientId) ? r.clientId : null;
  const docId = ctx.ids.next("doc");
  const key = `mail/${docId}-${o.filename.replace(/[^\w.\-]/g, "_")}`;
  await ctx.storage.put(key, o.content);
  await ctx.db.insert(document).values({ id: docId, firmId: ctx.firmId, clientId, kind: "mail_item", title: `Letter from ${r.sender}`, storageKey: key, mime: o.mime, sha256: Crypto.sha256(o.content), source: "scan", extractedText: r.summaryEn, createdAt: ctx.clock.now() });
  const [row] = await ctx.db.insert(mailItem).values({ id: ctx.ids.next("mai"), firmId: ctx.firmId, clientId, documentId: docId, receivedOn: o.receivedOn, sender: r.sender, summary: r.summaryEn, urgency: r.urgency, createdAt: ctx.clock.now() }).returning();
  if (!clientId) {
    await createProposal(ctx, { kind: "triage", title: `Whose letter is this? (${r.addressee})`, summary: r.summaryEn, payload: { mailItemId: row.id } });
    return row;
  }
  const letter = { mailItemId: row.id, clientId, documentId: docId, sender: r.sender, summary: r.summaryEn, actionNeeded: r.actionNeeded, urgency: r.urgency, receivedOn: o.receivedOn };
  const e = r.enforcement;
  if (e) {
    // Enforcement: one card to start the matching work, with the letter's date as the hard deadline.
    const playbookId = e.kind === "summons" ? "hk.prosecution" : e.kind === "warning_letter" ? "hk.warningLetter" : "hk.lateFiling";
    const cl = (await ctx.db.query.client.findFirst({ where: eq(clientT.id, clientId) }))!;
    const label = e.kind === "summons" ? "Summons" : e.kind === "warning_letter" ? "Warning letter" : "Late filing notice";
    const p = await createProposal(ctx, {
      kind: "start_enforcement", title: `${label} for ${cl.nameEn}${e.dueDate ? `: ${e.kind === "summons" ? "hearing" : "act by"} ${valueText(e.dueDate)}` : ""}`, summary: r.summaryEn, clientId,
      payload: { playbookId, dueDate: e.dueDate, form: e.form, reference: e.reference, amountHkd: e.amountHkd, letter },
    });
    await ctx.db.update(mailItem).set({ proposalId: p.id }).where(eq(mailItem.id, row.id));
    return { ...row, proposalId: p.id };
  }
  const notice = await draftLetterNotice(ctx, letter);
  return { ...row, proposalId: notice.id };
}

export type LoggedLetter = { mailItemId: string; clientId: string; documentId: string; sender: string; summary: string; actionNeeded: string | null; urgency: "normal" | "urgent"; receivedOn: string };

/** The plain "a letter arrived for you" notice, drafted for approval with the scan attached. */
export async function draftLetterNotice(ctx: Ctx, l: LoggedLetter) {
  const cl = (await ctx.db.query.client.findFirst({ where: eq(clientT.id, l.clientId) }))!;
  const instructing = await ctx.db.query.contact.findFirst({ where: (c, { eq, and }) => and(eq(c.clientId, l.clientId), eq(c.isInstructing, true)) });
  const [conv] = await ctx.db.insert(conversation).values({ id: ctx.ids.next("cnv"), firmId: ctx.firmId, clientId: l.clientId, channel: "email", subject: `Mail received: ${l.sender}`, counterpartyEmail: instructing?.email ?? null, createdAt: ctx.clock.now() }).returning();
  const lang = instructing?.language ?? cl.messageLang;
  const facts: ReplyFacts = { language: lang, recipientName: "", clientName: "", signOff: "", newRequests: [], updates: [], changes: [], cancellations: [], questions: [], clarifications: [], invoice: null, uploadUrl: null,
    extraNotes: [`We received a letter for the company at the registered office on ${l.receivedOn} from ${l.sender}: ${l.summary}.`, l.actionNeeded ? `Action the client may need to take: ${l.actionNeeded}` : "", "A scanned copy is attached; ask whether they want the original forwarded or held."].filter(Boolean) };
  const draft = await composeReply(ctx, { clientId: l.clientId, conversationId: conv.id, inReplyTo: null, facts, requestId: null, purpose: "Notify the client that mail arrived at the registered office" });
  const p = await createProposal(ctx, { kind: "send_message", title: `${l.urgency === "urgent" ? "Urgent: " : ""}Tell ${cl.nameEn} about a letter from ${l.sender}`, clientId: l.clientId, payload: { messageId: draft.id, requestId: null, taskIds: [], draftSource: draft.source, purpose: "mail", attachDocumentIds: [l.documentId] } });
  await ctx.db.update(mailItem).set({ proposalId: p.id }).where(eq(mailItem.id, l.mailItemId));
  return p;
}
