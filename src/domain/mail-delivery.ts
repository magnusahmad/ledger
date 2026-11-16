// Delivery attempts are journalled before the network boundary. Unknown acceptance
// is reconciled or left for staff review; it never becomes an automatic retry.
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { conversation, mailDelivery, message as messageT } from "@/db/schema";
import type { OutboundMail, SentMail } from "@/integrations/types";
import { Crypto } from "@/lib/crypto";
import { isIsoDate } from "./dates";

export type InvoiceDeliveryDates = { invoiceId: string; issuedOn: string; dueOn: string; pdfSha256: string };
type StoredMail = Omit<OutboundMail, "attachments"> & { reconciliationScope?: string; invoiceDates?: InvoiceDeliveryDates; attachments?: { filename: string; mime: string; base64: string }[] };
export class DeliveryUncertain extends Error {}
export class InvoiceDateReviewRequired extends Error {}
function storedMail(ctx: Ctx, row: typeof mailDelivery.$inferSelect): StoredMail {
  const plain = ctx.crypto.decrypt(row.payload);
  if (Crypto.sha256(plain) !== row.payloadHash) throw new Error("Approved delivery snapshot failed its integrity check");
  return JSON.parse(plain) as StoredMail;
}
export function deliveryPayload(ctx: Ctx, row: typeof mailDelivery.$inferSelect): OutboundMail {
  const { reconciliationScope: _scope, invoiceDates: _dates, ...saved } = storedMail(ctx, row);
  void _scope;
  void _dates;
  return { ...saved, attachments: saved.attachments?.map(a => ({ filename: a.filename, mime: a.mime, content: Buffer.from(a.base64, "base64") })) };
}

export function deliveryInvoiceDates(ctx: Ctx, row: typeof mailDelivery.$inferSelect, invoiceId: string): InvoiceDeliveryDates {
  if (row.firmId !== ctx.firmId) throw new Error("Invoice delivery not found");
  const saved = storedMail(ctx, row);
  const dates = saved.invoiceDates;
  if (!dates || dates.invoiceId !== invoiceId || !isIsoDate(dates.issuedOn) || !isIsoDate(dates.dueOn) || !saved.attachments?.some(a => a.mime === "application/pdf" && Crypto.sha256(Buffer.from(a.base64, "base64")) === dates.pdfSha256)) {
    throw new InvoiceDateReviewRequired("Invoice delivery needs review: the approved PDF has no verifiable captured issue and due dates. Review the original invoice before completing this action.");
  }
  return dates;
}

function sameReconciliationScope(ctx: Ctx, row: typeof mailDelivery.$inferSelect) {
  const saved = JSON.parse(ctx.crypto.decrypt(row.payload)) as StoredMail;
  // Legacy fake journals without a source identity cannot establish authoritative absence.
  return row.provider === ctx.mail.name && row.sender === ctx.mail.address && saved.reconciliationScope === ctx.mail.reconciliationScope && (row.provider !== "fake" || !!saved.reconciliationScope);
}

/** Read-only acceptance proof; provider absence never substitutes for delivery. */
export async function acceptedDeliveryReceipt(ctx: Ctx, row: typeof mailDelivery.$inferSelect) {
  if (row.firmId !== ctx.firmId) return null;
  if (row.status === "sent" && row.result?.providerMessageId) return row.result;
  if (!sameReconciliationScope(ctx, row)) return null;
  const proof = await ctx.mail.reconcileDelivery?.(row.correlationId).catch(() => ({ status: "unknown" as const }));
  return proof?.status === "accepted" ? proof.sent : null;
}

/** Closing a card is not proof that its approved invoice never reached the client. */
export async function deliveryConfirmedUnsent(ctx: Ctx, row: typeof mailDelivery.$inferSelect) {
  if (row.status === "sent") return false;
  if (row.status === "prepared") return true; // no durable network-start marker yet
  if (!sameReconciliationScope(ctx, row)) return false;
  const proof = await ctx.mail.reconcileDelivery?.(row.correlationId).catch(() => ({ status: "unknown" as const }));
  return proof?.status === "not_sent";
}

export async function prepareDelivery(ctx: Ctx, sourceKey: string, mail: OutboundMail, invoiceDates?: InvoiceDeliveryDates) {
  const existing = await ctx.db.query.mailDelivery.findFirst({ where: and(eq(mailDelivery.firmId, ctx.firmId), eq(mailDelivery.sourceKey, sourceKey)) });
  if (existing) return existing;
  const correlationId = `<${randomUUID()}@clerk.local>`;
  const plain = JSON.stringify({ ...mail, correlationId, reconciliationScope: ctx.mail.reconciliationScope, invoiceDates, attachments: mail.attachments?.map(a => ({ filename: a.filename, mime: a.mime, base64: a.content.toString("base64") })) });
  await ctx.db.insert(mailDelivery).values({ id: ctx.ids.next("mdl"), firmId: ctx.firmId, sourceKey, provider: ctx.mail.name, sender: ctx.mail.address, correlationId, payload: ctx.crypto.encrypt(plain), payloadHash: Crypto.sha256(plain) }).onConflictDoNothing();
  return (await ctx.db.query.mailDelivery.findFirst({ where: and(eq(mailDelivery.firmId, ctx.firmId), eq(mailDelivery.sourceKey, sourceKey)) }))!;
}
export async function deliverPrepared(ctx: Ctx, id: string): Promise<SentMail> {
  // Commit 'sending' before the provider call so death leaves a recoverable unknown attempt.
  const owner = randomUUID();
  const started = await ctx.db.update(mailDelivery).set({ status: "sending", executionToken: owner }).where(and(eq(mailDelivery.id, id), eq(mailDelivery.firmId, ctx.firmId), eq(mailDelivery.status, "prepared"))).returning();
  return ctx.db.transaction(async db => {
    await db.execute(sql`select id from mail_delivery where id = ${id} and firm_id = ${ctx.firmId} for update`);
    const txCtx = { ...ctx, db: db as unknown as Ctx["db"] };
    const row = await db.query.mailDelivery.findFirst({ where: and(eq(mailDelivery.id, id), eq(mailDelivery.firmId, ctx.firmId)) });
    if (!row) throw new Error("Delivery not found");
    if (row.status === "sent" && row.result) return row.result;
    if (!sameReconciliationScope(ctx, row)) throw new DeliveryUncertain("Delivery needs review: the connected mailbox changed");
    // The authoritative absence proof is available only from providers that explicitly
    // offer it. Gmail absence or delayed indexing is unknown, never 'not sent'.
    const reconciled = await ctx.mail.reconcileDelivery?.(row.correlationId).catch(() => ({ status: "unknown" as const }));
    if (reconciled?.status === "accepted") {
      await db.update(mailDelivery).set({ status: "sent", result: reconciled.sent, error: null }).where(eq(mailDelivery.id, id));
      return reconciled.sent;
    }
    // A newly prepared attempt has not yet crossed the network boundary; track whether
    // this caller won that preparation transition with a durable start marker below.
    if (!started.length || row.executionToken !== owner) {
      if (reconciled?.status !== "not_sent") throw new DeliveryUncertain("Delivery needs review: provider acceptance is unknown; check the mailbox before authorizing a resend");
    }
    const payload = deliveryPayload(ctx, row);
    // Reconciliation is read-only and can await the provider. Observe replies that
    // commit during that lookup, then hold the thread through the network boundary.
    // Mailbox ingestion locks its conversation before proposals, so keep that order.
    if (row.sourceKey.startsWith("message:")) {
      const source = await db.query.message.findFirst({ where: and(eq(messageT.firmId, ctx.firmId), eq(messageT.id, row.sourceKey.slice(8))) });
      if (!source) throw new Error("Message not found");
      const thread = await db.select({ id: conversation.id }).from(conversation).where(and(eq(conversation.firmId, ctx.firmId), eq(conversation.id, source.conversationId))).for("update");
      if (!thread.length) throw new Error("Conversation not found");
    }
    await ctx.assertExecution?.(txCtx);
    try {
      const sent = await ctx.mail.send(payload);
      if (!sent.providerMessageId) throw new DeliveryUncertain("Delivery needs review: provider returned no acceptance identifier");
      await db.update(mailDelivery).set({ status: "sent", result: sent, error: null }).where(eq(mailDelivery.id, id));
      return sent;
    } catch (e) {
      // Commit the uncertainty rather than rolling the network attempt back.
      await db.update(mailDelivery).set({ status: "uncertain", error: (e as Error).message.slice(0, 1000) }).where(eq(mailDelivery.id, id));
      return { failure: e } as unknown as SentMail;
    }
  }).then(result => {
    if ("failure" in result) throw new DeliveryUncertain(`Delivery needs review: ${(result as unknown as { failure: Error }).failure.message}`);
    return result;
  });
}

/** Persist positive acceptance proof independently of replaying any business action. */
export async function reconcileMessageReceipt(ctx: Ctx, messageId: string) {
  const { message } = await import("@/db/schema");
  const row = await ctx.db.query.mailDelivery.findFirst({ where: and(eq(mailDelivery.firmId, ctx.firmId), eq(mailDelivery.sourceKey, `message:${messageId}`)) });
  if (!row) return false;
  let sent = row.status === "sent" ? row.result : null;
  if (!sent) {
    if (!sameReconciliationScope(ctx, row)) return false;
    const proof = await ctx.mail.reconcileDelivery?.(row.correlationId).catch(() => ({ status: "unknown" as const }));
    if (proof?.status !== "accepted") return false;
    sent = proof.sent;
  }
  if (!sent.providerMessageId) return false;
  const approved = deliveryPayload(ctx, row);
  await ctx.db.transaction(async db => {
    await db.update(mailDelivery).set({ status: "sent", result: sent, error: null }).where(and(eq(mailDelivery.id, row.id), eq(mailDelivery.firmId, ctx.firmId)));
    const stored = await db.query.message.findFirst({ where: and(eq(message.id, messageId), eq(message.firmId, ctx.firmId)) });
    if (!stored) throw new Error("Message not found");
    const changed = stored.text !== approved.text || JSON.stringify(stored.toAddrs) !== JSON.stringify(approved.to) || stored.subject !== approved.subject;
    await db.update(message).set({ status: "sent", text: approved.text, subject: approved.subject, toAddrs: approved.to, provider: row.provider,
      providerMessageId: sent!.providerMessageId, rfcMessageId: sent!.rfcMessageId ?? row.correlationId, error: null,
      ...(changed ? { intake: { ...stored.intake, recoveryChangedDraft: { text: stored.text, subject: stored.subject, to: stored.toAddrs } } } : {}),
    }).where(and(eq(message.id, messageId), eq(message.firmId, ctx.firmId)));
  });
  return true;
}
