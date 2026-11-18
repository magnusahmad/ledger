// Reads UHY's DN ("Debit Note") workbook: its client list and annual-cycle tracker, one company per
// row. Columns are found by header name (seed/uhy/dn-columns.json), never by position; missing and
// unknown columns are reported. A value that doesn't parse is reported against its row and column
// and the field is left empty, never guessed. The file is read into memory and never written.
// discoverWorkbook describes any workbook's headers and value shapes without returning any values,
// for the first look at a real file.
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import dnColumns from "../../../seed/uhy/dn-columns.json";

export type Tick = "yes" | "no" | "not_recorded";
export type MonthDay = { month: number; day: number };
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
export type Mark = { tick: Tick; date: string | null };

type Kind = "text" | "usDate" | "yearEnd" | "month" | "tick" | "mark" | "emails";
type ColumnDef = { field: string; kind: Kind; required?: boolean; headers: string[] };
const COLUMNS = dnColumns.columns as ColumnDef[];

export type DnRow = {
  row: number; code: string; nameEn: string | null; nameZh: string | null;
  lastDn: string | null; serviceUntil: string | null; newDn: string | null; significantController: string | null; designatedRep: Tick | null;
  registrySearch: string | null; registrySearchInvoice: string | null; registrySearchDocs: string | null;
  yearEnd: MonthDay | null; agmMonth: number | null; auditor: string | null;
  /** Year end of the audited accounts this year's AGM papers need (e.g. 2025-12-31 for AFS2025). */
  requiredAfs: string | null;
  /** AGM tracker (DN's Done, Sent, By., Received, Scan, File): the date each step happened, or a tick. */
  agmDone: Mark | null; agmSent: Mark | null; agmBy: string | null; agmReceived: Mark | null; agmScan: Mark | null; agmFiled: Mark | null; remarks: string | null;
  engagementLetter: Tick | null; ddForm: Tick | null; riskAssessment: Tick | null; addressChecked: Tick | null; dirMemChecked: Tick | null;
  feeEmailSentOn: string | null; contactEmails: string[];
  roNr1: string | null; nd2b: string | null; nr2: string | null; correspondence: string | null; nd2a: string | null;
  problems: DnProblem[];
};
export type DnProblem = { row: number; field: string; header: string; error: string };
export type DnRead = {
  sheet: string; headerRow: number; rows: DnRow[]; skippedRows: number;
  missingColumns: string[]; unknownColumns: string[]; duplicateColumns: string[];
};

// ---------- value parsers ----------

const YES = new Set(["ü", "✓", "✔", "√", "☑"]);
const NO = new Set(["û", "✗", "✘", "×", "☒"]);
const WINGDINGS2: Record<string, Tick> = { P: "yes", O: "no" };

/** A tick cell: Wingdings ü is yes, û is no, blank is not recorded; anything else is an error. */
export function parseTick(v: unknown, font: string | undefined): Parsed<Tick> {
  const s = text(v);
  if (!s) return { ok: true, value: "not_recorded" };
  if (YES.has(s)) return { ok: true, value: "yes" };
  if (NO.has(s)) return { ok: true, value: "no" };
  if (font && /^wingdings\s*2$/i.test(font.trim()) && WINGDINGS2[s]) return { ok: true, value: WINGDINGS2[s] };
  return { ok: false, error: "not a tick (expected ü, û or blank)" };
}

const daysIn = (month: number) => [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];

/** A Chinese year end such as 12月31日 (full-width digits allowed). */
export function parseChineseYearEnd(v: unknown): Parsed<MonthDay> {
  const s = text(v).normalize("NFKC").replace(/\s+/g, "");
  const m = /^(\d{1,2})月(\d{1,2})日?$/.exec(s);
  if (!m) return { ok: false, error: "not a month-day like 12月31日" };
  const month = Number(m[1]), day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > daysIn(month)) return { ok: false, error: "no such day" };
  return { ok: true, value: { month, day } };
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
function validDay(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** A date in a US-format DN column: a date cell, or m/d/yyyy text. Day-first text is an error, never swapped. */
export function parseUsDate(v: unknown): Parsed<string> {
  if (v instanceof Date) return isNaN(v.getTime()) ? { ok: false, error: "invalid date" } : { ok: true, value: iso(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate()) };
  const s = text(v);
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return { ok: false, error: "not a date in m/d/yyyy" };
  const [mo, d, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!validDay(y, mo, d)) return { ok: false, error: mo > 12 ? "looks day-first (d/m/yyyy); this column is m/d/yyyy" : "no such date" };
  return { ok: true, value: iso(y, mo, d) };
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
/** An AGM month: an English name (or its first three or four letters) or 9月. */
export function parseAgmMonth(v: unknown): Parsed<number> {
  const s = text(v).normalize("NFKC").toLowerCase().replace(/\.$/, "");
  const zh = /^(\d{1,2})月$/.exec(s);
  if (zh && Number(zh[1]) >= 1 && Number(zh[1]) <= 12) return { ok: true, value: Number(zh[1]) };
  const i = s.length >= 3 ? MONTHS.findIndex((m) => m === s || (m.startsWith(s) && s.length <= 4)) : -1;
  return i >= 0 ? { ok: true, value: i + 1 } : { ok: false, error: "not a month name" };
}

const EMAIL = /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/;
/** Several addresses in one cell, separated by semicolons, commas or line breaks. */
export function splitEmails(v: unknown): { emails: string[]; invalid: string[] } {
  const emails: string[] = [], invalid: string[] = [];
  for (const part of text(v).split(/[;,\n\r]+/).map((p) => p.trim()).filter(Boolean)) {
    if (!EMAIL.test(part)) { invalid.push(part); continue; }
    const e = part.toLowerCase();
    if (!emails.includes(e)) emails.push(e);
  }
  return { emails, invalid };
}

// ---------- cells ----------

/** The cell's value with rich text, hyperlinks and formula results unwrapped. */
function raw(cell: ExcelJS.Cell): unknown {
  const v = cell.value as unknown;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const o = v as { richText?: { text: string }[]; text?: unknown; result?: unknown; error?: string };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.result !== undefined) return o.result;
    if (o.text !== undefined) return typeof o.text === "object" ? raw({ value: o.text } as ExcelJS.Cell) : o.text;
    if (o.error) return "";
  }
  return v;
}
function fontOf(cell: ExcelJS.Cell): string | undefined {
  const v = cell.value as { richText?: { font?: { name?: string } }[] } | null;
  return v && typeof v === "object" && v.richText ? v.richText[0]?.font?.name ?? cell.font?.name : cell.font?.name;
}
function text(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

/** Header text compared without case, spaces, hyphens, dots or width differences. */
export const normHeader = (h: string) => h.normalize("NFKC").toLowerCase().replace(/[\s\-_.]+/g, "");
const ALIASES = new Map<string, ColumnDef>(COLUMNS.flatMap((c) => c.headers.map((h) => [normHeader(h), c] as const)));
const REQUIRED = COLUMNS.filter((c) => c.required);

function findHeaderRow(ws: ExcelJS.Worksheet): number | null {
  const last = Math.min(ws.rowCount, 15);
  for (let r = 1; r <= last; r++) {
    const found = new Set<string>();
    ws.getRow(r).eachCell((cell) => { const c = ALIASES.get(normHeader(text(raw(cell)))); if (c) found.add(c.field); });
    if (REQUIRED.every((c) => found.has(c.field))) return r;
  }
  return null;
}

async function load(file: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await readFile(file)) as unknown as ArrayBuffer);
  return wb;
}

// ---------- reader ----------

export async function readDnWorkbook(file: string, o: { sheet?: string } = {}): Promise<DnRead> {
  const wb = await load(file);
  const sheets = o.sheet ? [wb.getWorksheet(o.sheet)].filter(Boolean) as ExcelJS.Worksheet[] : wb.worksheets;
  if (o.sheet && !sheets.length) throw new Error(`The DN workbook has no sheet named "${o.sheet}"`);
  let ws: ExcelJS.Worksheet | undefined, headerRow: number | null = null;
  for (const s of sheets) { headerRow = findHeaderRow(s); if (headerRow) { ws = s; break; } }
  if (!ws || !headerRow) throw new Error(`No sheet has a header row with ${REQUIRED.map((c) => c.headers[0]).join(" and ")} in its first 15 rows`);

  const colOf = new Map<string, { col: number; header: string }>();
  const unknownColumns: string[] = [], duplicateColumns: string[] = [];
  ws.getRow(headerRow).eachCell((cell, col) => {
    const header = text(raw(cell));
    if (!header) return;
    const def = ALIASES.get(normHeader(header));
    if (!def) { unknownColumns.push(header); return; }
    if (colOf.has(def.field)) { duplicateColumns.push(header); return; }
    colOf.set(def.field, { col, header });
  });
  const missingColumns = COLUMNS.filter((c) => !colOf.has(c.field)).map((c) => c.field);

  const rows: DnRow[] = [];
  let skippedRows = 0;
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const xr = ws.getRow(r);
    let blank = true;
    xr.eachCell((cell) => { if (text(raw(cell)) !== "") blank = false; });
    if (blank) continue;
    const problems: DnProblem[] = [];
    const out: Record<string, unknown> = { row: r, problems };
    for (const def of COLUMNS) {
      const at = colOf.get(def.field);
      if (!at) { out[def.field] = def.kind === "emails" ? [] : null; continue; }
      const cell = xr.getCell(at.col);
      const v = raw(cell);
      const fail = (error: string) => { problems.push({ row: r, field: def.field, header: at.header, error }); return null; };
      const from = <T>(p: Parsed<T>) => (p.ok ? p.value : fail(p.error));
      switch (def.kind) {
        case "text": out[def.field] = text(v) || null; break;
        case "usDate": out[def.field] = text(v) ? from(parseUsDate(v)) : null; break;
        case "yearEnd": out[def.field] = v instanceof Date ? { month: v.getUTCMonth() + 1, day: v.getUTCDate() } : text(v) ? from(parseChineseYearEnd(v)) : null; break;
        case "month": out[def.field] = text(v) ? from(parseAgmMonth(v)) : null; break;
        case "tick": out[def.field] = from(parseTick(v, fontOf(cell))); break;
        case "mark": {
          const t = parseTick(v, fontOf(cell));
          if (t.ok) { out[def.field] = { tick: t.value, date: null }; break; }
          const d = parseUsDate(v);
          out[def.field] = d.ok ? { tick: "yes", date: d.value } : fail("not a tick or an m/d/yyyy date");
          break;
        }
        case "emails": {
          const e = splitEmails(v);
          if (e.invalid.length) fail(`${e.invalid.length} part(s) are not email addresses`);
          out[def.field] = e.emails;
          break;
        }
      }
    }
    const code = typeof out.code === "string" ? out.code.toUpperCase().replace(/\s+/g, "") : "";
    if (!code) { skippedRows++; continue; }
    out.code = code;
    rows.push(out as DnRow);
  }
  return { sheet: ws.name, headerRow, rows, skippedRows, missingColumns, unknownColumns, duplicateColumns };
}

// ---------- discovery ----------

export type WorkbookDiscovery = {
  sheets: { name: string; headerRow: number | null; dataRows: number; columns: { column: string; header: string; filled: number; shapes: Record<string, number> }[] }[];
};

/** The shape of a value, never the value: "date cell (m/d/yyyy)", "tick ü (Wingdings)", "email list (2)". */
export function valueShape(v: unknown, cell?: { font?: string; numFmt?: string; formula?: boolean }): string {
  const prefix = cell?.formula ? "formula: " : "";
  if (v instanceof Date) return `${prefix}date cell (${cell?.numFmt || "no format"})`;
  if (typeof v === "number") return `${prefix}number`;
  if (typeof v === "boolean") return `${prefix}true/false`;
  const s = text(v);
  if (YES.has(s) || NO.has(s) || (cell?.font && /wingdings/i.test(cell.font) && s.length === 1)) return `${prefix}tick ${s}${cell?.font ? ` (${cell.font})` : ""}`;
  if (parseChineseYearEnd(s).ok) return `${prefix}Chinese month-day`;
  if (parseAgmMonth(s).ok && /^[a-z]+\.?$/i.test(s)) return `${prefix}English month name`;
  const d = /^(\d{1,2})\/(\d{1,2})\/(\d{4})([\s\S]*)$/.exec(s);
  if (d) {
    const order = Number(d[1]) > 12 ? "day-first" : Number(d[2]) > 12 ? "month-first" : "month-first possible";
    return d[4].trim() ? `${prefix}text starting with a ${order === "day-first" ? "day-first date" : "date"}` : `${prefix}date text, ${order}`;
  }
  if (s.includes("@")) { const e = splitEmails(s); return `${prefix}email list (${e.emails.length}${e.invalid.length ? `, ${e.invalid.length} invalid` : ""})`; }
  if (/^\d+$/.test(s)) return `${prefix}digits as text`;
  if (/[㐀-鿿]/.test(s)) return `${prefix}text with Chinese`;
  return `${prefix}text`;
}

const letter = (n: number) => { let s = ""; for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

export async function discoverWorkbook(file: string): Promise<WorkbookDiscovery> {
  const wb = await load(file);
  return {
    sheets: wb.worksheets.map((ws) => {
      let headerRow = findHeaderRow(ws);
      if (!headerRow) for (let r = 1; r <= Math.min(ws.rowCount, 15) && !headerRow; r++) if (ws.getRow(r).actualCellCount >= 3) headerRow = r;
      const columns = new Map<number, { column: string; header: string; filled: number; shapes: Record<string, number> }>();
      if (headerRow) ws.getRow(headerRow).eachCell((cell, col) => { columns.set(col, { column: letter(col), header: text(raw(cell)), filled: 0, shapes: {} }); });
      let dataRows = 0;
      for (let r = (headerRow ?? 0) + 1; r <= ws.rowCount; r++) {
        let any = false;
        ws.getRow(r).eachCell((cell, col) => {
          const v = raw(cell);
          if (text(v) === "") return;
          any = true;
          const c = columns.get(col) ?? { column: letter(col), header: "", filled: 0, shapes: {} };
          columns.set(col, c);
          c.filled++;
          const shape = valueShape(v, { font: fontOf(cell), numFmt: cell.numFmt, formula: cell.type === ExcelJS.ValueType.Formula });
          c.shapes[shape] = (c.shapes[shape] ?? 0) + 1;
        });
        if (any) dataRows++;
      }
      return { name: ws.name, headerRow, dataRows, columns: [...columns.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c) };
    }),
  };
}
