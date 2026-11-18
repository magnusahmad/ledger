// CSA and DN both describe each client company. Where they disagree on the year end, where DN's
// AGM month falls after the AGM deadline, or where a company is in one and not the other, staff
// are shown the difference; nothing is resolved silently or filled in from the other source.
import { agmDue, type CalendarPlaybooks, type CompanyType } from "./calendar";

export type CsaSide = { code: string | null; nameEn: string; fyeMonth: number | null; fyeDay: number | null; companyType: CompanyType };
export type DnSide = { code: string; nameEn: string | null; yearEnd: { month: number; day: number } | null; agmMonth: number | null };
export type Discrepancy = {
  code: string; nameEn: string | null; field: "yearEnd" | "agmMonth" | "missingInDn" | "missingInCsa";
  csa: string | null; dn: string | null; message: string;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const md = (m: number | null | undefined, d: number | null | undefined) => (m && d ? `${d} ${MONTHS[m - 1]}` : null);
const key = (code: string | null) => (code ?? "").toUpperCase().replace(/\s+/g, "");

export function crossCheckCsaDn(csa: CsaSide[], dn: DnSide[], pbs: CalendarPlaybooks): Discrepancy[] {
  const out: Discrepancy[] = [];
  const dnBy = new Map(dn.map((r) => [key(r.code), r]));
  const csaCodes = new Set<string>();
  for (const c of csa) {
    const k = key(c.code);
    if (!k) continue;
    csaCodes.add(k);
    const d = dnBy.get(k);
    if (!d) { out.push({ code: k, nameEn: c.nameEn, field: "missingInDn", csa: c.nameEn, dn: null, message: "In CSA but not in the DN workbook." }); continue; }
    const a = md(c.fyeMonth, c.fyeDay), b = md(d.yearEnd?.month, d.yearEnd?.day);
    if (a !== b) out.push({ code: k, nameEn: c.nameEn, field: "yearEnd", csa: a, dn: b, message: `Year end differs: CSA ${a ?? "has none"}, DN ${b ?? "has none"}. Check which is right before relying on the AGM date.` });
    else if (a && d.agmMonth && c.fyeMonth && c.fyeDay) {
      // DN's AGM month should fall on or before the month the AGM is due (compare by month after the year end).
      const due = agmDue({ companyType: c.companyType, yearEnd: { month: c.fyeMonth, day: c.fyeDay } }, 2001, pbs);
      if (due.ok) {
        const dueMonth = Number(due.dueDate.slice(5, 7));
        const after = (m: number) => (m - c.fyeMonth! + 12) % 12 || 12;
        if (after(d.agmMonth) > after(dueMonth)) out.push({ code: k, nameEn: c.nameEn, field: "agmMonth", csa: MONTHS[dueMonth - 1], dn: MONTHS[d.agmMonth - 1], message: `DN's AGM month (${MONTHS[d.agmMonth - 1]}) is after the AGM deadline month (${MONTHS[dueMonth - 1]}).` });
      }
    }
  }
  for (const d of dn) if (!csaCodes.has(key(d.code))) out.push({ code: key(d.code), nameEn: d.nameEn, field: "missingInCsa", csa: null, dn: d.nameEn, message: "In the DN workbook but not in CSA." });
  return out;
}
