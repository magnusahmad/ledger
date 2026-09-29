// Bank deposit matching (deterministic, not LLM): invoice number in the reference and the
// exact amount -> automatic; anything else -> a proposal for staff, or the unmatched queue.
import { and, eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { bankTransaction, invoice, payment, request as requestT, task as taskT } from "@/db/schema";
import type { BankDeposit } from "@/integrations/types";
import { createProposal, onApprove } from "./proposals";
import { advance, logEvent } from "./engine";
import { kvGet, kvSet } from "./kv";
import { enqueue } from "./jobs";
import { hkDate } from "@/lib/clock";
import { money } from "./labels";
import { audit } from "./audit";

const squash = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function pollBank(ctx: Ctx) {
  const since = await kvGet<string>(ctx, `bank.cursor.${ctx.bank.name}`);
  const deposits = await ctx.bank.listDeposits(since ? new Date(new Date(since).getTime() - 3600_000) : null);
  const out = { fetched: deposits.length, matched: 0, proposed: 0, unmatched: 0 };
  let latest = since ? new Date(since) : new Date(0);
  for (const d of deposits) {
    if (d.receivedAt > latest) latest = d.receivedAt;
    const exists = await ctx.db.query.bankTransaction.findFirst({ where: and(eq(bankTransaction.provider, ctx.bank.name), eq(bankTransaction.providerTxId, d.providerTxId)) });
    if (exists) continue;
    const r = await matchDeposit(ctx, d);
    out[r]++;
  }
  await kvSet(ctx, `bank.cursor.${ctx.bank.name}`, latest.toISOString());
  await kvSet(ctx, "bank.lastPollAt", ctx.clock.now().toISOString());
  return out;
}

async function openInvoices(ctx: Ctx) {
  return ctx.db.select().from(invoice).where(and(eq(invoice.firmId, ctx.firmId), inArray(invoice.status, ["sent", "part_paid"])));
}

export async function matchDeposit(ctx: Ctx, d: BankDeposit): Promise<"matched" | "proposed" | "unmatched"> {
  const [tx] = await ctx.db.insert(bankTransaction).values({
    id: ctx.ids.next("btx"), firmId: ctx.firmId, provider: ctx.bank.name, providerTxId: d.providerTxId, amountCents: d.amountCents,
    currency: d.currency, reference: d.reference, payerName: d.payerName, receivedAt: d.receivedAt, raw: d.raw ?? null,
  }).onConflictDoNothing().returning();
  if (!tx) return "unmatched";
  const open = await openInvoices(ctx);
  const ref = squash(d.reference ?? "");
  const byRef = ref ? open.filter((i) => ref.includes(squash(i.number))).sort((a, b) => b.number.length - a.number.length)[0] : undefined;
  if (byRef) {
    const due = byRef.totalCents - byRef.paidCents;
    if (d.amountCents === due && d.currency === byRef.currency) {
      await recordPayment(ctx, { invoiceId: byRef.id, bankTransactionId: tx.id, amountCents: d.amountCents, receivedOn: hkDate(d.receivedAt), method: "bank_auto" });
      await ctx.db.update(bankTransaction).set({ status: "matched", matchNote: `Invoice number and amount match ${byRef.number}` }).where(eq(bankTransaction.id, tx.id));
      return "matched";
    }
    const diff = d.amountCents - due;
    await ctx.db.update(bankTransaction).set({ status: "proposed", matchNote: `Quotes ${byRef.number} but amount differs` }).where(eq(bankTransaction.id, tx.id));
    await createProposal(ctx, {
      kind: "match_payment", title: `Check payment for ${byRef.number}`, clientId: byRef.clientId, requestId: byRef.requestId,
      summary: `${money(d.amountCents, d.currency)} from ${d.payerName ?? "unknown payer"} quotes ${byRef.number}, ${diff < 0 ? `${money(-diff)} less than` : `${money(diff)} more than`} the ${money(due)} due.`,
      payload: { bankTransactionId: tx.id, invoiceId: byRef.id, amountCents: Math.min(d.amountCents, due) },
    });
    return "proposed";
  }
  const byAmount = open.filter((i) => i.totalCents - i.paidCents === d.amountCents && i.currency === d.currency);
  if (byAmount.length === 1) {
    const inv = byAmount[0];
    await ctx.db.update(bankTransaction).set({ status: "proposed", matchNote: `Amount matches ${inv.number}; no invoice number in the reference` }).where(eq(bankTransaction.id, tx.id));
    await createProposal(ctx, {
      kind: "match_payment", title: `Is this payment for ${inv.number}?`, clientId: inv.clientId, requestId: inv.requestId,
      summary: `${money(d.amountCents, d.currency)} from ${d.payerName ?? "unknown payer"} (reference "${d.reference ?? ""}") matches the amount due on ${inv.number}.`,
      payload: { bankTransactionId: tx.id, invoiceId: inv.id, amountCents: d.amountCents },
    });
    return "proposed";
  }
  return "unmatched";
}

export async function recordPayment(ctx: Ctx, p: { invoiceId: string; bankTransactionId?: string | null; amountCents: number; receivedOn: string; method: "bank_auto" | "bank_approved" | "manual" }) {
  const inv = (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, p.invoiceId) }))!;
  const [pay] = await ctx.db.insert(payment).values({ id: ctx.ids.next("pay"), firmId: ctx.firmId, invoiceId: p.invoiceId, bankTransactionId: p.bankTransactionId ?? null, amountCents: p.amountCents, receivedOn: p.receivedOn, method: p.method, createdAt: ctx.clock.now() }).returning();
  const paid = inv.paidCents + p.amountCents;
  const status = paid >= inv.totalCents ? "paid" : "part_paid";
  await ctx.db.update(invoice).set({ paidCents: paid, status }).where(eq(invoice.id, inv.id));
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
  const tx = (await ctx.db.query.bankTransaction.findFirst({ where: eq(bankTransaction.id, bankTransactionId) }))!;
  await recordPayment(ctx, { invoiceId, bankTransactionId, amountCents, receivedOn: hkDate(tx.receivedAt), method: "bank_approved" });
  await ctx.db.update(bankTransaction).set({ status: "matched" }).where(eq(bankTransaction.id, bankTransactionId));
});

export async function markPaidManually(ctx: Ctx, invoiceId: string, note: string) {
  const inv = (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, invoiceId) }))!;
  return recordPayment(ctx, { invoiceId, amountCents: inv.totalCents - inv.paidCents, receivedOn: ctx.clock.today(), method: "manual" }).then(async (p) => { await audit(ctx, "payment.manual", "invoice", invoiceId, { note }); return p; });
}

void requestT;
