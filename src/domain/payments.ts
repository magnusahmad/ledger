// Bank deposit matching (deterministic, not LLM): invoice number in the reference and the
// exact amount -> automatic; anything else -> a proposal for staff, or the unmatched queue.
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { bankTransaction, invoice, payment, request as requestT, task as taskT } from "@/db/schema";
import type { BankDeposit } from "@/integrations/types";
import { createProposal, onApprove } from "./proposals";
import { advance, logEvent } from "./engine";
import { kvGet, kvSet, withLease, type Lease } from "./kv";
import { enqueue } from "./jobs";
import { hkDate, operationalNow } from "@/lib/clock";
import { validateBankDeposit } from "@/integrations/bank/validation";
import { isIsoDate } from "./dates";
import { money } from "./labels";
import { audit } from "./audit";

const squash = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function pollBank(ctx: Ctx) {
  return (await withLease(ctx, "bank", 120, lease => pollBankUnlocked(ctx, lease))) ?? { fetched: 0, matched: 0, proposed: 0, unmatched: 0 };
}

async function pollBankUnlocked(ctx: Ctx, lease: Lease) {
  const stored = await kvGet<string>(ctx, `bank.cursor.${ctx.bank.name}`);
  const since = stored && new Date(stored).getTime() > 0 ? stored : null;
  const overlap = since ? new Date(since).getTime() - 3600_000 : null;
  const window = ctx.bank.reconciliationWindowMs;
  // Preserve an older saved cursor after downtime; a recent cursor also re-reads
  // the provider's documented window so late settlement remains discoverable.
  const lower = overlap === null ? null : window ? Math.min(overlap, operationalNow(ctx.clock).getTime() - window) : overlap;
  const deposits = await ctx.bank.listDeposits(lower === null ? null : new Date(lower));
  // Reject the complete batch before any domain rows or cursor are committed.
  for (const d of deposits) validateBankDeposit(d);
  const out = { fetched: deposits.length, matched: 0, proposed: 0, unmatched: 0 };
  let latest = since ? new Date(since) : new Date(0);
  // Stored retries carry settlement metadata, not a newly observed creation
  // watermark. Only fetched provider facts may advance that cursor.
  for (const d of deposits) if ((d.createdAt ?? d.receivedAt) > latest) latest = d.createdAt ?? d.receivedAt;
  const ignoreBefore = await kvGet<string>(ctx, "bank.ignoreBefore");
  const retry = await ctx.db.query.bankTransaction.findMany({ where: and(eq(bankTransaction.firmId, ctx.firmId), eq(bankTransaction.provider, ctx.bank.name), inArray(bankTransaction.status, ["unmatched", "proposed"])) });
  const pending = new Map(deposits.map(d => [d.providerTxId, d]));
  for (const tx of retry) if (!pending.has(tx.providerTxId)) pending.set(tx.providerTxId, { providerTxId: tx.providerTxId, amountCents: tx.amountCents, currency: tx.currency, reference: tx.reference, payerName: tx.payerName, receivedAt: tx.receivedAt });
  for (const d of pending.values()) {
    await lease.assertCurrent();
    if (ignoreBefore && (d.createdAt ?? d.receivedAt) < new Date(ignoreBefore)) continue;

    const r = await matchDeposit(ctx, d);
    out[r]++;
  }
  await lease.assertCurrent();
  // No cursor until a deposit has been seen: an epoch cursor becomes a pre-1970 query, which Airwallex answers with nothing.
  if (latest.getTime() > 0) await lease.setValue(`bank.cursor.${ctx.bank.name}`, latest.toISOString());
  await kvSet(ctx, "bank.lastPollAt", ctx.clock.now().toISOString());
  return out;
}

async function openInvoices(ctx: Ctx) {
  return ctx.db.select().from(invoice).where(and(eq(invoice.firmId, ctx.firmId), inArray(invoice.status, ["sent", "part_paid"])));
}

export async function matchDeposit(ctx: Ctx, d: BankDeposit): Promise<"matched" | "proposed" | "unmatched"> {
  validateBankDeposit(d);
  const [created] = await ctx.db.insert(bankTransaction).values({
    id: ctx.ids.next("btx"), firmId: ctx.firmId, provider: ctx.bank.name, providerTxId: d.providerTxId, amountCents: d.amountCents,
    currency: d.currency, reference: d.reference, payerName: d.payerName, receivedAt: d.receivedAt, raw: d.raw ?? null,
  }).onConflictDoNothing().returning();
  const tx = created ?? await ctx.db.query.bankTransaction.findFirst({ where: and(eq(bankTransaction.firmId, ctx.firmId), eq(bankTransaction.provider, ctx.bank.name), eq(bankTransaction.providerTxId, d.providerTxId)) });
  if (!tx) return "unmatched";
  await openInvoices(ctx); // Durable ingestion precedes matching; a crash here is replayable.
  return ctx.db.transaction(async db => {
    await db.execute(sql`select id from bank_transaction where id = ${tx.id} and firm_id = ${ctx.firmId} for update`);
    const txCtx = { ...ctx, db: db as unknown as Ctx["db"] };
    const stored = (await db.query.bankTransaction.findFirst({ where: and(eq(bankTransaction.id, tx.id), eq(bankTransaction.firmId, ctx.firmId)) }))!;
    if (stored.status === "ignored") return "unmatched" as const;
    const receipt = await db.query.payment.findFirst({ where: and(eq(payment.firmId, ctx.firmId), eq(payment.bankTransactionId, tx.id)) });
    if (receipt) { await db.update(bankTransaction).set({ status: "matched" }).where(eq(bankTransaction.id, tx.id)); return "matched" as const; }
    if (stored.status === "matched") return "matched" as const;
    const prior = await db.query.proposal.findFirst({ where: (p, { and, eq, sql }) => and(eq(p.firmId, ctx.firmId), eq(p.kind, "match_payment"), sql`${p.status} in ('pending', 'processing', 'recovery')`, sql`${p.payload}->>'bankTransactionId' = ${tx.id}`) });
    if (prior) return "proposed" as const;
    return matchStoredDeposit(txCtx, { providerTxId: stored.providerTxId, amountCents: stored.amountCents, currency: stored.currency, reference: stored.reference, payerName: stored.payerName, receivedAt: stored.receivedAt }, tx.id, await openInvoices(txCtx));
  });
}

async function matchStoredDeposit(ctx: Ctx, d: BankDeposit, txId: string, open: Awaited<ReturnType<typeof openInvoices>>): Promise<"matched" | "proposed" | "unmatched"> {
  const ref = squash(d.reference ?? "");
  const references = ref ? open.filter(i => !!squash(i.number) && ref.includes(squash(i.number))) : [];
  if (references.length > 1) return "unmatched";
  const byRef = references[0];
  if (byRef) {
    const due = byRef.totalCents - byRef.paidCents;
    if (d.amountCents === due && d.currency === byRef.currency) {
      await recordPayment(ctx, { invoiceId: byRef.id, bankTransactionId: txId, amountCents: d.amountCents, receivedOn: hkDate(d.receivedAt), method: "bank_auto" });
      await ctx.db.update(bankTransaction).set({ status: "matched", matchNote: `Invoice number and amount match ${byRef.number}` }).where(eq(bankTransaction.id, txId));
      return "matched";
    }
    const diff = d.amountCents - due;
    await ctx.db.update(bankTransaction).set({ status: "proposed", matchNote: `Quotes ${byRef.number} but amount differs` }).where(eq(bankTransaction.id, txId));
    await createProposal(ctx, {
      kind: "match_payment", title: `Check payment for ${byRef.number}`, clientId: byRef.clientId, requestId: byRef.requestId,
      summary: `${money(d.amountCents, d.currency)} from ${d.payerName ?? "unknown payer"} quotes ${byRef.number}, ${diff < 0 ? `${money(-diff)} less than` : `${money(diff)} more than`} the ${money(due)} due.`,
      payload: { bankTransactionId: txId, invoiceId: byRef.id, amountCents: Math.min(d.amountCents, due) },
    });
    return "proposed";
  }
  const byAmount = open.filter((i) => i.totalCents - i.paidCents === d.amountCents && i.currency === d.currency);
  if (byAmount.length === 1) {
    const inv = byAmount[0];
    await ctx.db.update(bankTransaction).set({ status: "proposed", matchNote: `Amount matches ${inv.number}; no invoice number in the reference` }).where(eq(bankTransaction.id, txId));
    await createProposal(ctx, {
      kind: "match_payment", title: `Is this payment for ${inv.number}?`, clientId: inv.clientId, requestId: inv.requestId,
      summary: `${money(d.amountCents, d.currency)} from ${d.payerName ?? "unknown payer"} (reference "${d.reference ?? ""}") matches the amount due on ${inv.number}.`,
      payload: { bankTransactionId: txId, invoiceId: inv.id, amountCents: d.amountCents },
    });
    return "proposed";
  }
  return "unmatched";
}

export async function recordPayment(ctx: Ctx, p: { invoiceId: string; bankTransactionId?: string | null; amountCents: number; receivedOn: string; method: "bank_auto" | "bank_approved" | "manual" }) {
  if (!Number.isSafeInteger(p.amountCents) || p.amountCents <= 0 || !isIsoDate(p.receivedOn)) throw new Error("Payment requires positive integer cents and a valid date");
  return ctx.db.transaction(async db => {
    // A deposit is one available source of money even when competing receipts
    // name different invoices. Match polling uses this same bank -> invoice order.
    if (p.bankTransactionId) await db.execute(sql`select id from bank_transaction where id = ${p.bankTransactionId} and firm_id = ${ctx.firmId} for update`);
    await db.execute(sql`select id from invoice where id = ${p.invoiceId} and firm_id = ${ctx.firmId} for update`);
    return recordPaymentAtomic({ ...ctx, db: db as unknown as Ctx["db"] }, p);
  });
}

async function recordPaymentAtomic(ctx: Ctx, p: Parameters<typeof recordPayment>[1]) {
  const inv = await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.id, p.invoiceId), eq(invoice.firmId, ctx.firmId)) });
  if (!inv || !["sent", "part_paid"].includes(inv.status) || p.amountCents > inv.totalCents - inv.paidCents) throw new Error("Invoice is not payable for this amount");
  let bank: typeof bankTransaction.$inferSelect | undefined;
  if (p.bankTransactionId) {
    const tx = await ctx.db.query.bankTransaction.findFirst({ where: and(eq(bankTransaction.id, p.bankTransactionId), eq(bankTransaction.firmId, ctx.firmId)) });
    const existing = await ctx.db.query.payment.findFirst({ where: and(eq(payment.bankTransactionId, p.bankTransactionId), eq(payment.firmId, ctx.firmId)) });
    if (!tx || tx.status === "matched" || tx.currency !== inv.currency || p.amountCents > tx.amountCents || existing) throw new Error("Bank payment is no longer available or has a different currency");
    bank = tx;
  }
  const [pay] = await ctx.db.insert(payment).values({ id: ctx.ids.next("pay"), firmId: ctx.firmId, invoiceId: p.invoiceId, bankTransactionId: p.bankTransactionId ?? null, amountCents: p.amountCents, receivedOn: p.receivedOn, method: p.method, createdAt: ctx.clock.now() }).returning();
  const paid = inv.paidCents + p.amountCents;
  const status = paid >= inv.totalCents ? "paid" : "part_paid";
  await ctx.db.update(invoice).set({ paidCents: paid, status }).where(eq(invoice.id, inv.id));
  if (bank) {
    const excess = bank.amountCents - p.amountCents;
    await ctx.db.update(bankTransaction).set({ status: "matched", matchNote: excess > 0
      ? `${money(p.amountCents, bank.currency)} allocated to ${inv.number}; ${money(excess, bank.currency)} overpayment remains unallocated. Staff review required.`
      : bank.matchNote }).where(and(eq(bankTransaction.id, bank.id), eq(bankTransaction.firmId, ctx.firmId)));
  }
  await audit(ctx, "payment.record", "invoice", inv.id, { amount: p.amountCents, method: p.method, status }, p.method === "bank_auto" ? "system" : ctx.userId);
  await enqueue(ctx, "xero.sync_payment", { paymentId: pay.id }, `xero.payment:${pay.id}`);
  if (inv.requestId) {
    const tasks = await ctx.db.select().from(taskT).where(and(eq(taskT.requestId, inv.requestId), eq(taskT.status, "open")));
    for (const t of tasks) {
      await logEvent(ctx, t.id, "payment.received", `${money(p.amountCents, inv.currency)} received against ${inv.number}${status === "paid" ? " (paid in full)" : " (part payment)"}`, { paymentId: pay.id, method: p.method });
      await advance(ctx, t.id);
    }
  }
  return pay;
}

onApprove("match_payment", async (ctx, p) => {
  const { bankTransactionId, invoiceId, amountCents } = p.payload as { bankTransactionId: string; invoiceId: string; amountCents: number };
  const tx = await ctx.db.query.bankTransaction.findFirst({ where: and(eq(bankTransaction.id, bankTransactionId), eq(bankTransaction.firmId, ctx.firmId)) });
  if (!tx) throw new Error("Bank deposit not found");
  await recordPayment(ctx, { invoiceId, bankTransactionId, amountCents, receivedOn: hkDate(tx.receivedAt), method: "bank_approved" });
});

export async function markPaidManually(ctx: Ctx, invoiceId: string, note: string) {
  const inv = await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.id, invoiceId), eq(invoice.firmId, ctx.firmId)) });
  if (!inv) throw new Error("Invoice not found");
  return recordPayment(ctx, { invoiceId, amountCents: inv.totalCents - inv.paidCents, receivedOn: ctx.clock.today(), method: "manual" }).then(async (p) => { await audit(ctx, "payment.manual", "invoice", invoiceId, { note }); return p; });
}

void requestT;
