import type { BankDeposit } from "../types";
import { isIsoDate } from "@/domain/dates";

const currencies = new Set(Intl.supportedValuesOf("currency"));

export function bankTimestamp(value: unknown): Date {
  if (typeof value !== "string") throw new Error("Bank timestamp is missing");
  const parts = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):?(\d{2}))$/.exec(value);
  if (!parts || !isIsoDate(parts[1]) || Number(parts[2]) > 23 || Number(parts[3]) > 59 || Number(parts[4]) > 59 || Number(parts[6] ?? 0) > 23 || Number(parts[7] ?? 0) > 59) throw new Error("Bank timestamp is invalid");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Bank timestamp is invalid");
  return date;
}

/** Convert the documented numeric major-unit amount without rounding money. */
export function bankAmountCents(amount: unknown): number {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) throw new Error("Bank amount must be a positive number");
  const parts = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(amount));
  if (!parts) throw new Error("Bank amount must have at most two decimal places");
  const cents = BigInt(parts[1]) * BigInt(100) + BigInt((parts[2] ?? "").padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Bank amount exceeds safe integer cents");
  return Number(cents);
}

export function validateBankDeposit(d: BankDeposit): void {
  if (!d || typeof d.providerTxId !== "string" || !d.providerTxId.trim() || d.providerTxId.includes("\0")) throw new Error("Bank deposit identity is invalid");
  if (!Number.isSafeInteger(d.amountCents) || d.amountCents <= 0) throw new Error("Bank deposit requires positive safe integer cents");
  if (typeof d.currency !== "string" || !currencies.has(d.currency)) throw new Error("Bank deposit currency is invalid");
  for (const date of [d.receivedAt, ...(d.createdAt === undefined ? [] : [d.createdAt])]) if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error("Bank deposit date is invalid");
  for (const text of [d.reference, d.payerName]) if (text !== null && (typeof text !== "string" || text.includes("\0"))) throw new Error("Bank deposit reference or payer is invalid");
}
