// Date helpers on ISO YYYY-MM-DD strings (statutory dates have no time zone).
export function addDays(d: string, n: number): string {
  const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10);
}
export function addMonths(d: string, n: number): string {
  const t = new Date(d + "T00:00:00Z");
  const day = t.getUTCDate();
  t.setUTCDate(1); t.setUTCMonth(t.getUTCMonth() + n);
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, last));
  return t.toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400_000);
}
export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s) || s.startsWith("0000")) return false;
  const t = new Date(s + "T00:00:00Z");
  return !isNaN(t.getTime()) && t.toISOString().slice(0, 10) === s;
}
export function fmtDate(d: string | null | undefined, lang: "en" | "tc" | "sc" = "en"): string {
  if (!d) return "";
  const t = new Date(d + "T00:00:00Z");
  if (lang === "en") return t.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `${t.getUTCFullYear()}年${t.getUTCMonth() + 1}月${t.getUTCDate()}日`;
}
