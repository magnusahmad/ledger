import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { attachment, document, message } from "@/db/schema";
import { invoiceWithLines } from "./invoices";
import { Crypto } from "@/lib/crypto";

export async function invoiceFingerprint(ctx: Ctx, id: string) {
  const i = await invoiceWithLines(ctx, id);
  if (i.firmId !== ctx.firmId) throw new Error("Invoice not found");
  return invoiceContentFingerprint(i);
}

export function invoiceContentFingerprint(i: Awaited<ReturnType<typeof invoiceWithLines>>) {
  return Crypto.sha256(Buffer.from(JSON.stringify([i.id, i.number, i.currency, i.termsDays, i.totalCents, i.version, i.lines.map(l => [l.description, l.amountCents, l.kind, l.sort])])));
}

/** Exact generated-file matches, scoped to this firm and intended recipients. */
export async function deliveryEvidence(ctx: Ctx, requestId: string, recipients: string[]) {
  const req = await ctx.db.query.request.findFirst({ where: (r, { and, eq }) => and(eq(r.id, requestId), eq(r.firmId, ctx.firmId)) });
  const evidence = { invoiceFound: false, uploadLinkFound: false, invoiceMessageId: undefined as string | undefined, uploadMessageId: undefined as string | undefined };
  if (!req?.invoiceId) return evidence;
  const fingerprint = await invoiceFingerprint(ctx, req.invoiceId);
  const generated = await ctx.db.select().from(document).where(and(eq(document.firmId, ctx.firmId), eq(document.source, "generated"), eq(document.requirementKey, `invoice:${req.invoiceId}`), eq(document.extractedText, fingerprint)));
  const hashes = new Set(generated.map(d => d.sha256));
  const sent = await ctx.db.select().from(message).where(and(eq(message.firmId, ctx.firmId), eq(message.direction, "out"), eq(message.status, "sent")));
  const url = `${ctx.config.APP_URL}/u/${req.uploadToken}`;
  for (const m of sent) {
    if (m.at < req.createdAt || !m.toAddrs.some(to => recipients.some(r => r.toLowerCase() === to.toLowerCase()))) continue;
    const links = `${m.text ?? ""} ${m.html ?? ""}`.match(/https?:\/\/[^\s<>"']+/g) ?? [];
    if (links.some(link => link.replace(/[.,;:!?)]*$/, "") === url)) { evidence.uploadLinkFound = true; evidence.uploadMessageId = m.id; }
    const files = await ctx.db.select({ hash: document.sha256 }).from(attachment).innerJoin(document, eq(attachment.documentId, document.id)).where(and(eq(attachment.messageId, m.id), eq(attachment.firmId, ctx.firmId), eq(document.firmId, ctx.firmId)));
    if (files.some(f => f.hash && hashes.has(f.hash))) { evidence.invoiceFound = true; evidence.invoiceMessageId = m.id; }
  }
  return evidence;
}

/** The sent-email check only means something once mail went out another way: after a mailbox reply, or when a sent email already carries the invoice or link. */
export function showSentEmailCheck(payload: { replaces?: unknown }, e: { invoiceFound: boolean; uploadLinkFound: boolean } | null) {
  return !!e && (!!payload.replaces || e.invoiceFound || e.uploadLinkFound);
}
