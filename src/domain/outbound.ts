// Sending an approved message through the connected mailbox. Only called from an
// approval handler, so nothing reaches a client without a human click.
import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { conversation, invoice, message, request as requestT } from "@/db/schema";
import type { MailAttachment } from "@/integrations/types";
import { audit } from "./audit";

export class OutboundError extends Error {}

export async function sendMessage(ctx: Ctx, messageId: string, o: { edits?: { subject?: string; text?: string; to?: string[] }; attachments?: MailAttachment[]; approvedBy: string }) {
  const m = await ctx.db.query.message.findFirst({ where: eq(message.id, messageId) });
  if (!m) throw new OutboundError("Message not found");
  if (m.direction !== "out" || (m.status !== "draft" && m.status !== "approved" && m.status !== "failed")) throw new OutboundError(`Message is ${m.status}`);
  const conv = (await ctx.db.query.conversation.findFirst({ where: eq(conversation.id, m.conversationId) }))!;
  const subject = o.edits?.subject ?? m.subject ?? "";
  const text = o.edits?.text ?? m.text ?? "";
  const to = o.edits?.to ?? m.toAddrs;
  if (!to.length) throw new OutboundError("No recipient");
  await ctx.db.update(message).set({ status: "approved", subject, text, toAddrs: to }).where(eq(message.id, messageId));
  const refs = m.inReplyTo ? [m.inReplyTo] : [];
  try {
    const sent = await ctx.mail.send({ to, cc: m.ccAddrs, subject, text, html: textToHtml(text), attachments: o.attachments, inReplyTo: m.inReplyTo, references: refs, providerThreadId: conv.providerThreadId });
    await ctx.db.update(message).set({ status: "sent", provider: ctx.mail.name, providerMessageId: sent.providerMessageId, rfcMessageId: sent.rfcMessageId ?? null, at: ctx.clock.now(), error: null }).where(eq(message.id, messageId));
    if (sent.providerThreadId && !conv.providerThreadId) await ctx.db.update(conversation).set({ providerThreadId: sent.providerThreadId }).where(eq(conversation.id, conv.id));
    await ctx.db.update(conversation).set({ lastMessageAt: ctx.clock.now() }).where(eq(conversation.id, conv.id));
    await audit(ctx, "message.sent", "message", messageId, { to, subject, approvedBy: o.approvedBy, attachments: (o.attachments ?? []).map((a) => a.filename) });
  } catch (e) {
    await ctx.db.update(message).set({ status: "failed", error: (e as Error).message }).where(eq(message.id, messageId));
    throw e;
  }
  return (await ctx.db.query.message.findFirst({ where: eq(message.id, messageId) }))!;
}

export function textToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const linked = esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:Arial,'PingFang HK','Microsoft JhengHei',sans-serif;font-size:14px;line-height:1.55;color:#16181D">${linked.split(/\n{2,}/).map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, "<br>")}</p>`).join("")}</div>`;
}

export async function invoiceForRequest(ctx: Ctx, requestId: string | null) {
  if (!requestId) return null;
  const req = await ctx.db.query.request.findFirst({ where: eq(requestT.id, requestId) });
  return req?.invoiceId ? (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, req.invoiceId) })) ?? null : null;
}
