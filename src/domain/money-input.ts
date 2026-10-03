/** Staff enter dollars; preserve the sign and reject ambiguous precision before writing cents. */
export function parseMoneyCents(value: unknown): number {
  if (typeof value !== "string") throw new Error("Enter a valid amount");
  const text = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) throw new Error("Enter a nonnegative amount with at most two decimal places");
  const [whole, fraction = ""] = text.replace(/,/g, "").split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Amount is too large");
  return Number(cents);
}
