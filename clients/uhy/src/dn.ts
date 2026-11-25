// Reads UHY's DN ("Debit Note") workbook: its client list and annual-cycle tracker, one company per
// row. Columns are found by header name (clients/uhy/data/dn-columns.json), never by position; missing and
// unknown columns are reported. The sheet is a working notebook, so the reader takes the fields the
// pilot needs and keeps anything else a cell holds as a note against that field. A status staff write
// across the AGM block ("BVI-不用處理", "dereg中") is read once, as the reason no AGM is handled. Only an
// impossible date is reported as a problem, never guessed. The file is read into memory and never written.
// discoverWorkbook describes any workbook's headers and value shapes without returning any values,
// for the first look at a real file.
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import dnColumns from "../data/dn-columns.json";

export type Tick = "yes" | "no" | "not_recorded";
export type MonthDay = { month: number; day: number };
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
export type Mark = { tick: Tick; date: string | null };

type Kind = "text" | "date" | "yearEnd" | "month" | "tick" | "mark" | "emails" | "afs" | "sentOn";
type ColumnDef = { field: string; kind: Kind; required?: boolean; optional?: boolean; nth?: number; headers: string[] };
const COLUMNS = dnColumns.columns as ColumnDef[];
/** Why no AGM is handled for a company: the status staff wrote, and the jurisdiction if they gave one. */
export type NoAgm = { status: string; where: string | null };
const STATUSES = (dnColumns.statuses as { match: string; status: string }[]).map((x) => ({ re: new RegExp(x.match, "i"), status: x.status }));
export function statusOf(s: string): NoAgm | null {
  const t = s.normalize("NFKC").trim();
  for (const x of STATUSES) { const m = x.re.exec(t); if (m) return { status: x.status, where: m[1]?.trim().toUpperCase() || null }; }
  return null;
}

export type Excluded = "struck" | "red" | "blue";
const EXCLUDED_COLOURS = dnColumns.excludedTextColours as Record<string, "red" | "blue">;

export type DnRow = {
  row: number; code: string; nameEn: string | null; nameZh: string | null; groupCode: string | null;
  /** The code or name is struck through in the sheet: the company is no longer a client. */
  struck: boolean;
  /** The text colour of the code or name when it is not ordinary black, as "#RRGGBB". */
  textColour: string | null;
  /** Why staff leave this company out: struck through (a former client), or in red or blue text
   *  (blue is a client taken on for a one-off service). Null for an active client. */
  excluded: Excluded | null;
  lastDn: string | null; serviceUntil: string | null; newDn: string | null; incorporatedOn: string | null; lastAgmDate: string | null;
  significantController: string | null; designatedRep: Tick | null;
  registrySearch: string | null; registrySearchInvoice: string | null; registrySearchDocs: string | null;
  yearEnd: MonthDay | null; agmMonth: number | null; auditor: string | null;
  /** Year end of the audited accounts this year's AGM papers need (e.g. 2025-12-31 for AFS2025). */
  requiredAfs: string | null;
  /** AGM tracker (DN's Done, Sent, By., Received, Scan, File): the date each step happened, or a tick. */
  agmDone: Mark | null; agmAllanCheck: Mark | null; agmSent: Mark | null; agmBy: string | null; agmReceived: Mark | null; agmScan: Mark | null; agmFiled: Mark | null;
  remarks: string | null; agmRemarks: string | null;
  /** Set when staff wrote a status in place of AGM tracking; null when an AGM is handled as usual. */
  noAgm: NoAgm | null;
  /** What a cell held when it was not the kind of value its column is read as, by field. */
  notes: Record<string, string>;
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

/** A date in the DN workbook: a date cell, or day-first text such as 24/08/2022 or 31/12/26. dateLike says the
 *  text was written as a date but isn't one (it is reported); otherwise it is some other text (kept as a note). */
export function parseDnDate(v: unknown): { ok: true; value: string } | { ok: false; error: string; dateLike: boolean } {
  if (v instanceof Date) return isNaN(v.getTime()) ? { ok: false, error: "invalid date", dateLike: true } : { ok: true, value: iso(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate()) };
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})$/.exec(text(v));
  if (!m) return { ok: false, error: "not a date", dateLike: false };
  const d = Number(m[1]), mo = Number(m[2]), y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  if (validDay(y, mo, d)) return { ok: true, value: iso(y, mo, d) };
  return { ok: false, error: validDay(y, d, mo) ? "looks month-first (m/d/yyyy); this workbook writes the day first" : "no such date", dateLike: true };
}

/** The last year end named by a required-AFS range: "31/12/2025-26" and "成立-31/12/26" both end on 31 December 2026. */
export function afsRangeEnd(s: string): string | null {
  const span = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})\s*-\s*(\d{2})$/.exec(s);
  if (span) {
    const d = Number(span[1]), mo = Number(span[2]), y = Math.floor(Number(span[3]) / 100) * 100 + Number(span[4]);
    return validDay(y, mo, d) ? iso(y, mo, d) : null;
  }
  const tail = /-\s*(\d{1,2}[/.]\d{1,2}[/.](?:\d{4}|\d{2}))$/.exec(s);
  const end = tail ? parseDnDate(tail[1]) : null;
  return end?.ok ? end.value : null;
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

/** A year end: a date cell, 12月31日, or a day and month name such as 31/Dec. */
export function parseYearEnd(v: unknown): Parsed<MonthDay> {
  if (v instanceof Date) return isNaN(v.getTime()) ? { ok: false, error: "invalid date" } : { ok: true, value: { month: v.getUTCMonth() + 1, day: v.getUTCDate() } };
  const zh = parseChineseYearEnd(v);
  if (zh.ok) return zh;
  const m = /^(\d{1,2})[/\- ]([A-Za-z]{3,9})\.?$/.exec(text(v));
  const month = m ? MONTHS.findIndex((x) => x.startsWith(m[2].toLowerCase().slice(0, 3)) && m[2].length <= x.length) + 1 : 0;
  if (m && month && Number(m[1]) >= 1 && Number(m[1]) <= daysIn(month)) return { ok: true, value: { month, day: Number(m[1]) } };
  return { ok: false, error: "not a year end" };
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
    const o = v as { richText?: { text: string }[]; text?: unknown; result?: unknown; error?: string; formula?: string; sharedFormula?: string };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    // Staff write some values as a formula holding text, ="3月31日". Its saved result can be missing or,
    // in a date-formatted cell, not a date at all; the text in the formula is what they meant.
    const literal = typeof o.formula === "string" ? /^"(.*)"$/.exec(o.formula.trim()) : null;
    const usable = o.result !== undefined && !(o.result instanceof Date && isNaN(o.result.getTime())) && !(o.result && typeof o.result === "object" && "error" in o.result);
    if (usable) return o.result;
    if (literal) return literal[1];
    if (o.result instanceof Date) return o.result;
    if (o.formula !== undefined || o.sharedFormula !== undefined) return "";
    if (o.text !== undefined) return typeof o.text === "object" ? raw({ value: o.text } as ExcelJS.Cell) : o.text;
    if (o.error) return "";
  }
  return v;
}
function fontOf(cell: ExcelJS.Cell): string | undefined {
  const v = cell.value as { richText?: { font?: { name?: string } }[] } | null;
  return v && typeof v === "object" && v.richText ? v.richText[0]?.font?.name ?? cell.font?.name : cell.font?.name;
}
/** A cell formatted as a date can hold a number outside any calendar; it reads as a Date with no time. */
const INVALID_DATE = "invalid date";
const badDate = (v: unknown): boolean => v instanceof Date && isNaN(v.getTime());
function text(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return badDate(v) ? INVALID_DATE : v.toISOString().slice(0, 10);
  return String(v).trim();
}

/** Header text compared without case, spaces, hyphens, dots or width differences. */
export const normHeader = (h: string) => h.normalize("NFKC").toLowerCase().replace(/[\s\-_.]+/g, "");
/** The columns a header can mean, in the order they appear in the sheet (nth): "Remarks" is the general one, then the AGM one. */
const BY_HEADER = new Map<string, ColumnDef[]>();
for (const c of COLUMNS) for (const h of c.headers) BY_HEADER.set(normHeader(h), [...(BY_HEADER.get(normHeader(h)) ?? []), c].sort((a, b) => (a.nth ?? 1) - (b.nth ?? 1)));
const ALIASES = new Map<string, ColumnDef>([...BY_HEADER].map(([h, defs]) => [h, defs[0]] as const));
const IGNORED = new Set((dnColumns.ignore as string[]).map(normHeader));
const REQUIRED = COLUMNS.filter((c) => c.required);
/** Where a status may be written, in the order it is looked for. */
const AGM_BLOCK = ["agmMonth", "yearEnd", "agmDone", "agmAllanCheck", "agmSent", "agmBy", "agmReceived", "agmScan", "agmFiled", "agmRemarks"];

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
  const seen = new Map<string, number>();
  ws.getRow(headerRow).eachCell((cell, col) => {
    const header = text(raw(cell));
    if (!header) return;
    const key = normHeader(header);
    const defs = BY_HEADER.get(key);
    if (!defs) { if (!IGNORED.has(key)) unknownColumns.push(header); return; }
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    const def = defs[n];
    if (!def || colOf.has(def.field)) { duplicateColumns.push(header); return; }
    colOf.set(def.field, { col, header });
  });
  const missingColumns = COLUMNS.filter((c) => !c.optional && !colOf.has(c.field)).map((c) => c.field);

  const rows: DnRow[] = [];
  let skippedRows = 0;
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const xr = ws.getRow(r);
    let blank = true;
    xr.eachCell((cell) => { if (text(raw(cell)) !== "") blank = false; });
    if (blank) continue;
    const problems: DnProblem[] = [];
    const notes: Record<string, string> = {};
    const statuses: Record<string, NoAgm> = {};
    const out: Record<string, unknown> = { row: r, problems, notes };
    for (const def of COLUMNS) {
      const at = colOf.get(def.field);
      if (!at) { out[def.field] = def.kind === "emails" ? [] : null; continue; }
      const cell = xr.getCell(at.col);
      const v = raw(cell);
      const fail = (error: string) => { problems.push({ row: r, field: def.field, header: at.header, error }); return null; };
      // A date-formatted cell that isn't a real date is reported, whatever the column holds.
      if (badDate(v)) { out[def.field] = def.kind === "emails" ? [] : fail(INVALID_DATE); continue; }
      const s = text(v);
      const status = s ? statusOf(s) : null;
      /** The cell isn't the kind of value this column is read as: it is a status, or it is kept as a note. */
      const keep = () => { if (status) statuses[def.field] = status; else if (s) notes[def.field] = s; return null; };
      /** A date, a problem if it was written as a date but isn't one, otherwise a status or a note. */
      const date = () => { const d = parseDnDate(v); return d.ok ? d.value : d.dateLike ? fail(d.error) : keep(); };
      switch (def.kind) {
        case "text": out[def.field] = status ? keep() : s || null; break;
        case "date": out[def.field] = s ? date() : null; break;
        case "sentOn": out[def.field] = !s || /^x$/i.test(s) ? null : date(); break;
        case "afs": {
          if (!s || /^x$/i.test(s)) { out[def.field] = null; break; }
          const d = parseDnDate(v);
          if (d.ok) { out[def.field] = d.value; break; }
          if (d.dateLike) { out[def.field] = fail(d.error); break; }
          keep();
          out[def.field] = status ? null : afsRangeEnd(s);
          break;
        }
        case "yearEnd": { const y = s ? parseYearEnd(v) : null; out[def.field] = y?.ok ? y.value : keep(); break; }
        case "month": { const m = s ? parseAgmMonth(v) : null; out[def.field] = m?.ok ? m.value : keep(); break; }
        case "tick": { const t = parseTick(v, fontOf(cell)); out[def.field] = t.ok ? t.value : keep(); break; }
        case "mark": {
          const t = parseTick(v, fontOf(cell));
          if (t.ok) { out[def.field] = { tick: t.value, date: null }; break; }
          if (/^done$/i.test(s)) { out[def.field] = { tick: "yes", date: null }; break; }
          const d = parseDnDate(v);
          out[def.field] = d.ok ? { tick: "yes", date: d.value } : d.dateLike ? fail(d.error) : keep();
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
    const identity = ["code", "nameEn"].flatMap((f) => { const at = colOf.get(f); return at ? [xr.getCell(at.col)] : []; });
    const colours = identity.map(textColour).filter((c): c is string => !!c);
    out.struck = identity.some(isStruck);
    // A colour that excludes is the one reported, so a row with a second, harmless colour still shows why.
    out.textColour = colours.find((c) => EXCLUDED_COLOURS[c]) ?? colours[0] ?? null;
    out.excluded = out.struck ? "struck" : EXCLUDED_COLOURS[out.textColour as string] ?? null;
    out.noAgm = AGM_BLOCK.map((f) => statuses[f]).find(Boolean) ?? null;
    rows.push(out as DnRow);
  }
  return { sheet: ws.name, headerRow, rows, skippedRows, missingColumns, unknownColumns, duplicateColumns };
}

// ---------- discovery ----------

/** How much formatting a sheet uses that staff may mean something by. Counts only, for filled cells. */
export type SheetFormatting = {
  struckCells: number;
  /** Rows where every filled cell is struck through. */
  struckRows: number;
  hiddenRows: number; notes: number;
  /** Text and cell colours by "#RRGGBB" (or the workbook's own "theme 4"); plain black text is left out. */
  fontColours: Record<string, number>; fillColours: Record<string, number>;
};
export type WorkbookDiscovery = {
  sheets: { name: string; headerRow: number | null; dataRows: number; formatting: SheetFormatting; columns: DiscoveredColumn[] }[];
};
/** patterns: the twelve most common patterns of text the reader has no rule for (see valuePattern). */
export type DiscoveredColumn = { column: string; header: string; filled: number; struck: number; /** Text colours used in this column, by count. */ colours?: Record<string, number>; shapes: Record<string, number>; patterns: Record<string, number> };

/** The pattern of a piece of text, never the text: digits become 9, letters A or a, Chinese characters
 *  \u4e2d, and a run of the same kind is written once with "+". "\u6bcf\u5e7412\u670831\u65e5" is "\u4e2d+9+\u4e2d9+\u4e2d"; "N/A" is "A/A". */
export function valuePattern(s: string): string {
  const kinds = [...s.trim()].map((ch) => (/\d/.test(ch) ? "9" : /[A-Z]/.test(ch) ? "A" : /[a-z]/.test(ch) ? "a" : /[\u3400-\u9fff]/.test(ch) ? "\u4e2d" : /\s/.test(ch) ? " " : ch));
  let out = "";
  for (let i = 0; i < kinds.length; i++) {
    const k = kinds[i];
    if (!["9", "A", "a", "\u4e2d", " "].includes(k)) { out += k; continue; }
    let n = 1;
    while (kinds[i + n] === k) n++;
    out += k === " " ? " " : n > 1 ? `${k}+` : k;
    i += n - 1;
  }
  return out.length > 40 ? `${out.slice(0, 40)}...` : out;
}

type Colour = { argb?: string; theme?: number; indexed?: number } | undefined;
const colourKey = (c: Colour): string | null => (!c ? null : c.argb ? `#${c.argb.slice(-6).toUpperCase()}` : c.theme !== undefined ? `theme ${c.theme}` : c.indexed !== undefined ? `indexed ${c.indexed}` : null);
// Black, the default dark theme colour and the two "automatic" palette entries are ordinary text.
const PLAIN_TEXT = new Set(["#000000", "theme 1", "indexed 8", "indexed 64"]);
/** A cell's text colour when it is not ordinary black. Mixed colours within one cell count as none. */
function textColour(cell: ExcelJS.Cell): string | null {
  const v = cell.value as { richText?: { font?: { color?: Colour } }[] } | null;
  const own = cell.font?.color as Colour;
  const keys = v && typeof v === "object" && v.richText?.length ? v.richText.map((r) => colourKey(r.font?.color ?? own)) : [colourKey(own)];
  const k = keys[0];
  return k && !PLAIN_TEXT.has(k) && keys.every((x) => x === k) ? k : null;
}
function isStruck(cell: ExcelJS.Cell): boolean {
  const v = cell.value as { richText?: { font?: { strike?: boolean } }[] } | null;
  if (v && typeof v === "object" && v.richText?.length) return v.richText.every((r) => !!r.font?.strike);
  return !!cell.font?.strike;
}

/** The shape of a value, never the value: "date cell (m/d/yyyy)", "tick ü (Wingdings)", "email list (2)". */
export function valueShape(v: unknown, cell?: { font?: string; numFmt?: string; formula?: boolean }): string {
  const prefix = cell?.formula ? "formula: " : "";
  if (v instanceof Date) return `${prefix}${badDate(v) ? "invalid date cell" : "date cell"} (${cell?.numFmt || "no format"})`;
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
      const columns = new Map<number, DiscoveredColumn>();
      if (headerRow) ws.getRow(headerRow).eachCell((cell, col) => { columns.set(col, { column: letter(col), header: text(raw(cell)), filled: 0, struck: 0, shapes: {}, patterns: {} }); });
      const formatting: SheetFormatting = { struckCells: 0, struckRows: 0, hiddenRows: 0, notes: 0, fontColours: {}, fillColours: {} };
      const count = (m: Record<string, number>, k: string | null) => { if (k) m[k] = (m[k] ?? 0) + 1; };
      let dataRows = 0;
      for (let r = (headerRow ?? 0) + 1; r <= ws.rowCount; r++) {
        let filled = 0, struck = 0;
        const row = ws.getRow(r);
        row.eachCell((cell, col) => {
          const v = raw(cell);
          if (cell.note) formatting.notes++;
          if (text(v) === "") return;
          filled++;
          const c = columns.get(col) ?? { column: letter(col), header: "", filled: 0, struck: 0, shapes: {}, patterns: {} };
          columns.set(col, c);
          c.filled++;
          if (isStruck(cell)) { struck++; c.struck++; formatting.struckCells++; }
          const fc = colourKey(cell.font?.color as Colour);
          if (fc && !PLAIN_TEXT.has(fc)) { count(formatting.fontColours, fc); count((c.colours ??= {}), fc); }
          const fill = cell.fill as { type?: string; pattern?: string; fgColor?: Colour } | undefined;
          if (fill?.type === "pattern" && fill.pattern !== "none") count(formatting.fillColours, colourKey(fill.fgColor));
          const shape = valueShape(v, { font: fontOf(cell), numFmt: cell.numFmt, formula: cell.type === ExcelJS.ValueType.Formula });
          c.shapes[shape] = (c.shapes[shape] ?? 0) + 1;
          if (/(^|: )(text|digits as text)/.test(shape)) count(c.patterns, valuePattern(text(v)));
        });
        if (!filled) continue;
        dataRows++;
        if (struck === filled) formatting.struckRows++;
        if (row.hidden) formatting.hiddenRows++;
      }
      const top = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 12));
      return { name: ws.name, headerRow, dataRows, formatting, columns: [...columns.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => ({ ...c, patterns: top(c.patterns) })) };
    }),
  };
}
