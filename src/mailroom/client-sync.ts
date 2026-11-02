// The client index is a read-only copy of the firm's own records: its Excel list, its Access
// database and the <code>-<name> client folders on its X: drive. Each is read through a column
// mapping, merged on the client code (the master source wins; disagreements are kept for staff),
// and applied in place so ids never change and letters already in review stay linked.
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import MDBReader from "mdb-reader";
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { mailroomClient, type Lang } from "@/db/schema";
import { normaliseId, normaliseName } from "./match";
import { rematchWaiting, type Mailroom } from "./service";
import { kvGet, kvSet } from "@/domain/kv";

export type ClientRecord = {
  code?: string | null; name: string; nameZh?: string; brNo?: string; irdFileNo?: string; crNo?: string; mpfNo?: string;
  contactName?: string; contactEmail?: string; language?: string; folder?: string;
};
export type ColumnMap = Partial<Record<keyof ClientRecord, string>>;
export type Conflict = { field: string; values: { source: string; value: string }[] };
export type MergedClient = ClientRecord & { sources: string[]; conflicts: Conflict[] };

/** Where the firm keeps client records, in priority order (the first is the master). */
export type ClientSource =
  | { kind: "excel"; name: string; path: string; sheet?: string; columns: ColumnMap }
  | { kind: "access"; name: string; path: string; table: string; columns: ColumnMap }
  | { kind: "csv"; name: string; path: string; columns: ColumnMap }
  | { kind: "folders"; name: string; path: string; pattern: string };

const LANGS: Lang[] = ["en", "tc", "sc"];
const FIELDS: (keyof ClientRecord)[] = ["code", "name", "nameZh", "brNo", "irdFileNo", "crNo", "mpfNo", "contactName", "contactEmail", "language", "folder"];
const ID_FIELDS = new Set<keyof ClientRecord>(["code", "brNo", "irdFileNo", "crNo", "mpfNo"]);

/** A spreadsheet or database cell as plain text (Excel cells may be rich text, links or formulas). */
function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as { text?: unknown; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.text !== undefined) return cellText(o.text);
    if (o.result !== undefined) return cellText(o.result);
    return "";
  }
  return String(v).trim();
}

export function mapRows(records: Record<string, unknown>[], columns: ColumnMap): ClientRecord[] {
  const out: ClientRecord[] = [];
  for (const rec of records) {
    const row: Partial<Record<keyof ClientRecord, string>> = {};
    for (const [field, col] of Object.entries(columns) as [keyof ClientRecord, string][]) {
      let v = cellText(rec[col]);
      if (field === "language") { v = v.toLowerCase(); if (!LANGS.includes(v as Lang)) continue; }
      if (field === "code") v = v.toUpperCase();
      if (v) row[field] = v;
    }
    if (row.name) out.push(row as ClientRecord);
  }
  return out;
}

export function clientsFromFolders(names: string[], pattern: RegExp): ClientRecord[] {
  return names.flatMap((n) => { const m = pattern.exec(n); return m ? [{ code: m[1].toUpperCase(), name: m[2].trim() }] : []; });
}

export async function readExcel(content: Buffer, o: { sheet?: string; columns: ColumnMap }): Promise<ClientRecord[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(content as unknown as ArrayBuffer);
  const ws = o.sheet ? wb.getWorksheet(o.sheet) : wb.worksheets[0];
  if (!ws) throw new Error(`No sheet called ${o.sheet} in the client list`);
  const head: string[] = [];
  ws.getRow(1).eachCell((c, i) => { head[i] = cellText(c.value); });
  const records: Record<string, unknown>[] = [];
  ws.eachRow((r, n) => {
    if (n === 1) return;
    const rec: Record<string, unknown> = {};
    r.eachCell((c, i) => { if (head[i]) rec[head[i]] = c.value; });
    records.push(rec);
  });
  return mapRows(records, o.columns);
}

/** Reads a copy of the Access file's bytes; the live database and its lock file are never opened. */
export function readAccess(content: Buffer, o: { table: string; columns: ColumnMap }): ClientRecord[] {
  const db = new MDBReader(content);
  return mapRows(db.getTable(o.table).getData() as Record<string, unknown>[], o.columns);
}

const same = (field: keyof ClientRecord, a: string, b: string) =>
  ID_FIELDS.has(field) ? normaliseId(a) === normaliseId(b) : field === "name" ? normaliseName(a) === normaliseName(b) && a.trim() === b.trim() : a.trim() === b.trim();

/** One record per client, keyed on the client code (or the name when a source has no codes). */
export function mergeSources(sources: { source: string; rows: ClientRecord[] }[]): MergedClient[] {
  const byKey = new Map<string, { c: MergedClient; from: Partial<Record<keyof ClientRecord, string>> }>();
  for (const { source, rows } of sources) {
    for (const row of rows) {
      const key = row.code ? `code:${normaliseId(row.code)}` : `name:${normaliseName(row.name)}`;
      let e = byKey.get(key);
      if (!e) { e = { c: { name: row.name, sources: [], conflicts: [] }, from: {} }; byKey.set(key, e); }
      if (!e.c.sources.includes(source)) e.c.sources.push(source);
      for (const f of FIELDS) {
        const v = row[f];
        if (!v) continue;
        const cur = e.c[f];
        if (!cur || !e.from[f]) { (e.c as Record<string, unknown>)[f] = v; e.from[f] = source; continue; }
        if (same(f, cur, v)) continue;
        let k = e.c.conflicts.find((x) => x.field === f);
        if (!k) { k = { field: f, values: [{ source: e.from[f]!, value: cur }] }; e.c.conflicts.push(k); }
        if (!k.values.some((x) => x.source === source && x.value === v)) k.values.push({ source, value: v });
      }
    }
  }
  return [...byKey.values()].map((e) => e.c);
}

/** Updates the index in place (ids never change), adds new clients, switches off missing ones
 *  and, given the mail room, re-matches letters that were waiting for their client. */
export async function applyClients(ctx: Ctx, mr: Mailroom | null, merged: MergedClient[], o: { deactivateMissing: boolean }) {
  const existing = await ctx.db.select().from(mailroomClient).where(eq(mailroomClient.firmId, ctx.firmId));
  const seen = new Set<string>();
  let added = 0, updated = 0, deactivated = 0;
  for (const m of merged) {
    const found = (m.code && existing.find((c) => c.code && normaliseId(c.code) === normaliseId(m.code!)))
      || existing.find((c) => !seen.has(c.id) && normaliseName(c.name) === normaliseName(m.name) && (!c.code || !m.code));
    const code = m.code ?? found?.code ?? null;
    const fields = {
      name: m.name, code, nameZh: m.nameZh ?? found?.nameZh ?? null,
      brNo: m.brNo ?? found?.brNo ?? null, irdFileNo: m.irdFileNo ?? found?.irdFileNo ?? null, crNo: m.crNo ?? found?.crNo ?? null, mpfNo: m.mpfNo ?? found?.mpfNo ?? null,
      contactName: m.contactName ?? found?.contactName ?? null, contactEmail: m.contactEmail ?? found?.contactEmail ?? null,
      language: (m.language as Lang | undefined) ?? found?.language ?? "en",
      folder: m.folder ?? (code ? `${code}-${m.name}` : m.name),
      active: true, sources: m.sources, conflicts: m.conflicts,
    };
    if (found) {
      seen.add(found.id);
      await ctx.db.update(mailroomClient).set(fields).where(and(eq(mailroomClient.firmId, ctx.firmId), eq(mailroomClient.id, found.id)));
      updated++;
    } else {
      await ctx.db.insert(mailroomClient).values({ id: ctx.ids.next("mrc"), firmId: ctx.firmId, ...fields });
      added++;
    }
  }
  if (o.deactivateMissing) {
    for (const c of existing) if (!seen.has(c.id) && c.active) {
      await ctx.db.update(mailroomClient).set({ active: false }).where(eq(mailroomClient.id, c.id));
      deactivated++;
    }
  }
  const rematched = mr ? await rematchWaiting(ctx, mr) : 0;
  return { added, updated, deactivated, rematched };
}

/** Reads every configured source; a source that can't be read stops the sync (no half-updates). */
export async function readSources(sources: ClientSource[]): Promise<{ source: string; rows: ClientRecord[]; hash: string }[]> {
  const out = [];
  for (const s of sources) {
    if (s.kind === "folders") {
      const names = (await readdir(s.path, { withFileTypes: true }).catch((e: Error) => { throw new Error(`Couldn't read ${s.name} (${s.path}): ${e.message}`); })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
      out.push({ source: s.name, rows: clientsFromFolders(names, new RegExp(s.pattern)), hash: createHash("sha256").update(names.join("\n")).digest("hex") });
      continue;
    }
    const content = await readFile(path.resolve(s.path)).catch((e: NodeJS.ErrnoException) => {
      throw new Error(`Couldn't read ${s.name} (${s.path}): ${e.code === "ENOENT" ? "file not found" : e.code === "EBUSY" || e.code === "EPERM" ? "the file is locked" : e.message}`);
    });
    const hash = createHash("sha256").update(content).digest("hex");
    const rows = s.kind === "excel" ? await readExcel(content, s)
      : s.kind === "access" ? readAccess(content, s)
      : csvRows(content.toString("utf8"), s.columns);
    out.push({ source: s.name, rows, hash });
  }
  return out;
}

export function csvRows(csv: string, columns: ColumnMap): ClientRecord[] {
  const [head, ...rows] = parseCsv(csv.replace(/^﻿/, ""));
  return mapRows(rows.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i]]))), columns);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** The plain CSV the demo and tests use: the same headings as the demo client list. */
export const CSV_COLUMNS: ColumnMap = {
  code: "client_code", name: "name", nameZh: "name_zh", brNo: "br_no", irdFileNo: "ird_file_no", crNo: "cr_no", mpfNo: "mpf_no",
  contactName: "contact_name", contactEmail: "contact_email", language: "language", folder: "folder",
};

export type SyncResult = { applied: boolean; added?: number; updated?: number; deactivated?: number; rematched?: number; conflicts?: number; error?: string };
const SYNC_KEY = "mailroom.clientSync";
type SyncState = SyncResult & { at: string; clients: number; hash?: string };

/** Reads the firm's sources and applies them when anything has changed since the last sync.
 *  Clients missing from every source are switched off only when all sources were read. */
export async function syncClients(ctx: Ctx, mr: Mailroom, sources: ClientSource[]): Promise<SyncResult> {
  const prev = await kvGet<SyncState>(ctx, SYNC_KEY);
  let read: Awaited<ReturnType<typeof readSources>>;
  try { read = await readSources(sources); }
  catch (e) {
    const error = (e as Error).message;
    await kvSet(ctx, SYNC_KEY, { ...(prev ?? { clients: 0 }), applied: false, error, at: ctx.clock.now().toISOString() });
    return { applied: false, error };
  }
  const hash = createHash("sha256").update(read.map((r) => `${r.source}:${r.hash}`).join("|")).digest("hex");
  if (prev?.hash === hash && !prev.error) return { applied: false };
  const merged = mergeSources(read);
  const r = await applyClients(ctx, mr, merged, { deactivateMissing: true });
  const result = { applied: true, ...r, conflicts: merged.filter((m) => m.conflicts.length).length };
  await kvSet(ctx, SYNC_KEY, { ...result, hash, at: ctx.clock.now().toISOString(), clients: merged.length });
  return result;
}

export async function lastSync(ctx: Ctx): Promise<SyncState | null> {
  return kvGet<SyncState>(ctx, SYNC_KEY);
}
