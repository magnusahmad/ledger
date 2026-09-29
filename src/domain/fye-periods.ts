type Company = { fyeMonth: number | null; fyeDay: number | null; jurisdictionData: Record<string, unknown> };
type Change = { previousMonth: number; previousDay: number; effectiveFrom: string; firstPeriodEnd: string };
const end = (year: number, month: number, day: number) => `${year}-${String(month).padStart(2,"0")}-${String(Math.min(day, new Date(Date.UTC(year, month, 0)).getUTCDate())).padStart(2,"0")}`;
export function financialYearEnds(c: Company, year: number): string[] {
  if (!c.fyeMonth || !c.fyeDay) return [];
  const change = c.jurisdictionData.fyeChange as Change | undefined;
  if (!change) return [end(year, c.fyeMonth, c.fyeDay)];
  const out: string[] = [];
  const old = end(year, change.previousMonth, change.previousDay);
  if (old < change.effectiveFrom && old < change.firstPeriodEnd) out.push(old);
  const current = end(year, c.fyeMonth, c.fyeDay);
  if (current >= change.firstPeriodEnd) out.push(current);
  return [...new Set(out)].sort();
}
export function financialPeriodKey(c: Company, date: string) {
  return c.jurisdictionData.fyeChange ? `AGM:${date}` : `AGM:${date.slice(0,4)}`;
}
