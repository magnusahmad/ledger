// UHY's client list for the annual cycle (src/annual/client-list.ts): two workbooks read as one. The
// DN workbook decides who is a client and holds the year end, incorporation date and contact emails.
// The AGM workbook is a copy where this year's AGMs are tracked; only its visible columns are read,
// because its hidden ones no longer sit against their own companies (DECISIONS.md #67). Both are read
// from .xlsx copies made on the pilot machine; the originals on the share are never opened.
import { stat } from "node:fs/promises";
import type { ClientListEntry, ClientListRead, ClientListSource } from "@/annual/client-list";
import { readDnWorkbook, type DnRow } from "./dn";

const name = (s: string | null) => (s ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
const groupBy = <T>(rows: T[], k: (r: T) => string) => { const m = new Map<string, T[]>(); for (const r of rows) { const key = k(r); if (key) m.set(key, [...(m.get(key) ?? []), r]); } return m; };

export function mergeWorkbooks(dn: DnRow[], agm: DnRow[]): { entries: ClientListEntry[]; problems: string[] } {
  const problems: string[] = [];
  const agmByCode = groupBy(agm, (r) => r.code), agmByName = groupBy(agm, (r) => name(r.nameEn));
  const entries: ClientListEntry[] = [];
  for (const [code, rows] of groupBy(dn, (r) => r.code)) {
    const live = rows.filter((r) => !r.excluded);
    if (live.length > 1) { problems.push(`The DN workbook has one client code on rows ${live.map((r) => r.row).join(" and ")}, both current clients; neither was read.`); continue; }
    const r = live[0] ?? rows[0];
    // The same company in the AGM workbook: by code where that code is on one row there, otherwise by name.
    const sameCode = agmByCode.get(code) ?? [], sameName = agmByName.get(name(r.nameEn)) ?? [];
    const a = sameCode.length === 1 ? sameCode[0] : sameName.length === 1 ? sameName[0] : sameCode.find((x) => name(x.nameEn) === name(r.nameEn)) ?? null;
    const noAgm = a?.noAgm ?? r.noAgm;
    entries.push({
      code, nameEn: r.nameEn, live: !r.excluded, leftOutReason: r.excluded,
      incorporatedOn: r.incorporatedOn, yearEnd: r.yearEnd, agmMonth: a?.agmMonth ?? r.agmMonth,
      noAgm: noAgm ? (noAgm.where ? `${noAgm.status} (${noAgm.where})` : noAgm.status) : null,
      contactEmails: r.contactEmails,
    });
  }
  return { entries, problems };
}

export function dnClientList(o: { dnFile: string; agmFile?: string | null }): ClientListSource {
  const stamp = async (file: string, what: string) => {
    try { const s = await stat(file); return `${s.mtimeMs}:${s.size}`; }
    catch { throw new Error(`${what} is not at ${file}. Check the copy job that converts it, or correct the setting.`); }
  };
  return {
    label: "the DN workbook",
    async read(since): Promise<ClientListRead | null> {
      const version = [await stamp(o.dnFile, "The DN workbook copy"), o.agmFile ? await stamp(o.agmFile, "The AGM workbook copy") : "-"].join("|");
      if (version === since) return null;
      const dn = await readDnWorkbook(o.dnFile);
      const agm = o.agmFile ? await readDnWorkbook(o.agmFile, { visibleOnly: true }) : null;
      const merged = mergeWorkbooks(dn.rows, agm?.rows ?? []);
      const missing = [...dn.missingColumns.map((c) => `The DN workbook has no column for ${c}.`), ...(agm?.missingColumns ?? []).map((c) => `The AGM workbook has no column for ${c}.`)];
      return { version, entries: merged.entries, problems: [...merged.problems, ...missing] };
    },
  };
}
