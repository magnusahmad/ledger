// Compares two readings of UHY's client workbook: the DN workbook and the copy where AGMs are tracked.
// Companies are matched by client code. The result holds counts and row numbers only, never a code,
// a name or a cell's value, so it can be pasted out of the firm's machine.
import type { DnRow } from "./dn";

/** [row in the first workbook, row in the second]. */
export type RowPair = [number, number];
export type FieldComparison = { same: number; differ: number; onlyInFirst: number; onlyInSecond: number; emptyInBoth: number; differRows: RowPair[] };
export type DnComparison = {
  /** duplicated: codes on more than one row of either workbook, which cannot be matched and are left out below. */
  codes: { inBoth: number; onlyInFirst: number; onlyInSecond: number; duplicated: number };
  /** Whether each matched company is a current client (not struck through, not in red or blue) in each workbook. */
  live: { inBoth: number; leftOutOfBoth: number; liveInFirstOnly: RowPair[]; liveInSecondOnly: RowPair[] };
  fields: Record<string, FieldComparison>;
};

export const COMPARED_FIELDS = ["nameEn", "nameZh", "incorporatedOn", "yearEnd", "agmMonth", "auditor", "lastAgmDate", "requiredAfs", "noAgm",
  "agmDone", "agmAllanCheck", "agmSent", "agmBy", "agmReceived", "agmScan", "agmFiled", "engagementLetter", "ddForm", "contactEmails"] as const;
const MAX_ROWS = 40;

/** One comparable form of a cell's reading: null when empty; case, spacing and list order do not matter.
 *  A blank tick ("not_recorded") and a tracker cell holding only a blank tick are empty. */
function canon(v: unknown): string | null {
  if (v === null || v === undefined || v === "not_recorded") return null;
  if (typeof v === "object" && !Array.isArray(v) && (v as { tick?: string }).tick === "not_recorded" && !(v as { date?: string | null }).date) return null;
  if (typeof v === "string") { const s = v.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase(); return s || null; }
  if (Array.isArray(v)) { const parts = v.map(canon).filter((x): x is string => !!x).sort(); return parts.length ? parts.join("|") : null; }
  if (typeof v === "object") return JSON.stringify(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canon(x)]));
  return String(v);
}

export function compareDn(first: DnRow[], second: DnRow[], fields: readonly string[] = COMPARED_FIELDS): DnComparison {
  const index = (rows: DnRow[]) => { const m = new Map<string, DnRow[]>(); for (const r of rows) m.set(r.code, [...(m.get(r.code) ?? []), r]); return m; };
  const a = index(first), b = index(second);
  const codes = { inBoth: 0, onlyInFirst: 0, onlyInSecond: 0, duplicated: 0 };
  const live: DnComparison["live"] = { inBoth: 0, leftOutOfBoth: 0, liveInFirstOnly: [], liveInSecondOnly: [] };
  const out: Record<string, FieldComparison> = Object.fromEntries(fields.map((f) => [f, { same: 0, differ: 0, onlyInFirst: 0, onlyInSecond: 0, emptyInBoth: 0, differRows: [] }]));
  for (const code of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(code) ?? [], y = b.get(code) ?? [];
    if (x.length > 1 || y.length > 1) { codes.duplicated++; continue; }
    if (!y.length) { codes.onlyInFirst++; continue; }
    if (!x.length) { codes.onlyInSecond++; continue; }
    codes.inBoth++;
    const [p, q] = [x[0], y[0]];
    const pair: RowPair = [p.row, q.row];
    if (!p.excluded && !q.excluded) live.inBoth++;
    else if (p.excluded && q.excluded) live.leftOutOfBoth++;
    else (p.excluded ? live.liveInSecondOnly : live.liveInFirstOnly).push(pair);
    for (const f of fields) {
      const u = canon((p as unknown as Record<string, unknown>)[f]), v = canon((q as unknown as Record<string, unknown>)[f]);
      const c = out[f];
      if (u === null && v === null) c.emptyInBoth++;
      else if (u === null) c.onlyInSecond++;
      else if (v === null) c.onlyInFirst++;
      else if (u === v) c.same++;
      else { c.differ++; if (c.differRows.length < MAX_ROWS) c.differRows.push(pair); }
    }
  }
  const byRow = (m: RowPair, n: RowPair) => m[0] - n[0];
  live.liveInFirstOnly.sort(byRow); live.liveInSecondOnly.sort(byRow);
  for (const c of Object.values(out)) c.differRows.sort(byRow);
  return { codes, live, fields: out };
}
