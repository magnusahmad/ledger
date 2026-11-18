// Reads UHY's Access admin database, which issues client codes (about 1,100 rows; a returning
// client gets a new code). The file is read into memory with mdb-reader, which cannot write, so
// the database and Access's lock on it are untouched. describeAccess lists tables, columns, types
// and row counts for the first look; readAccessClients maps one table by column name once that
// mapping is known. The .laccdb/.ldb lock file is never opened as a database.
import { readFile } from "node:fs/promises";
import MDBReader from "mdb-reader";

export type AccessTable = { columns: { name: string; type: string }[]; rowCount: number; rows(): Record<string, unknown>[] };
export interface AccessDb { tableNames(): string[]; table(name: string): AccessTable }

export async function openAccess(file: string): Promise<AccessDb> {
  const lock = /\.(laccdb|ldb)$/i.exec(file);
  if (lock) {
    const db = file.slice(0, -lock[0].length) + (lock[1].toLowerCase() === "laccdb" ? ".accdb" : ".mdb");
    throw new Error(`${file} is Access's lock file, not the database. Use ${db.split(/[\\/]/).pop()} beside it.`);
  }
  const reader = new MDBReader(await readFile(file));
  return {
    tableNames: () => reader.getTableNames(),
    table: (name) => {
      const t = reader.getTable(name);
      return { columns: t.getColumns().map((c) => ({ name: c.name, type: String(c.type) })), rowCount: t.rowCount, rows: () => t.getData() as Record<string, unknown>[] };
    },
  };
}

export function describeAccess(db: AccessDb) {
  return db.tableNames().map((table) => { const t = db.table(table); return { table, rowCount: t.rowCount, columns: t.columns }; });
}

export type AccessClient = { code: string; nameEn: string; nameZh?: string; openedOn?: string };
export type AccessMapping = { table: string; columns: { code: string; nameEn: string; nameZh?: string; openedOn?: string } };

const text = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v === null || v === undefined ? "" : String(v).trim());

export function readAccessClients(db: AccessDb, m: AccessMapping) {
  const t = db.table(m.table);
  const have = new Set(t.columns.map((c) => c.name));
  for (const f of ["code", "nameEn"] as const) if (!have.has(m.columns[f])) throw new Error(`Table ${m.table} has no column "${m.columns[f]}" (mapped as ${f}). Columns: ${[...have].join(", ")}`);
  const missingColumns = (Object.entries(m.columns) as [keyof AccessClient, string][]).filter(([, c]) => !have.has(c)).map(([f, c]) => `${f} (${c})`);
  const rows: AccessClient[] = [];
  let skippedRows = 0;
  for (const r of t.rows()) {
    const code = text(r[m.columns.code]).toUpperCase().replace(/\s+/g, "");
    const nameEn = text(r[m.columns.nameEn]);
    if (!code || !nameEn) { skippedRows++; continue; }
    const row: AccessClient = { code, nameEn };
    for (const f of ["nameZh", "openedOn"] as const) { const c = m.columns[f]; if (c && have.has(c)) { const v = text(r[c]); if (v) row[f] = v; } }
    rows.push(row);
  }
  const byName = new Map<string, string[]>();
  for (const r of rows) { const k = r.nameEn.toLowerCase().replace(/\s+/g, " "); byName.set(k, [...(byName.get(k) ?? []), r.code]); }
  const sameNameCodes = [...byName.entries()].filter(([, c]) => c.length > 1).map(([, codes]) => ({ nameEn: rows.find((r) => r.code === codes[0])!.nameEn, codes }));
  return { rows, skippedRows, missingColumns, sameNameCodes };
}
