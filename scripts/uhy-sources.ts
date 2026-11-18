// UHY pilot: look at the DN workbook and the Access database from the pilot machine, over the share.
// Read-only. Discovery output holds headers, column names, types, counts and value shapes, never
// cell values; check-dn prints counts, column problems and row numbers, never values.
//
//   npx tsx scripts/uhy-sources.ts discover-dn "\\SERVER\Share\Co-sec\Debit Notes\DN 2025.xlsx"
//   npx tsx scripts/uhy-sources.ts discover-access "\\SERVER\Share\Co-sec\Admin\Clients.accdb"
//   npx tsx scripts/uhy-sources.ts discover-access "C:\Clerk\private\clients-export.xlsx"
//   npx tsx scripts/uhy-sources.ts check-dn "\\SERVER\...\DN 2025.xlsx" [--sheet 2026]
//
// Results are written to --out (default private/uhy/discovery, git-ignored).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { discoverWorkbook, readDnWorkbook } from "@/integrations/uhy/dn";
import { describeAccess, openAccess } from "@/integrations/uhy/access";

const [cmd, file, ...rest] = process.argv.slice(2);
const opt = (k: string) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : undefined; };
const outDir = opt("out") ?? path.join("private", "uhy", "discovery");

async function save(name: string, data: unknown) {
  await mkdir(outDir, { recursive: true });
  const f = path.join(outDir, name);
  await writeFile(f, JSON.stringify(data, null, 2));
  console.log(`Saved ${f}`);
}
const base = (f: string) => f.split(/[\\/]/).pop()!.replace(/\.[^.]+$/, "");

async function main() {
  if (!cmd || !file) { console.error("Usage: uhy-sources.ts discover-dn|discover-access|check-dn <file> [--sheet name] [--out dir]"); process.exit(2); }
  if (cmd === "discover-dn" || (cmd === "discover-access" && /\.xlsx?$/i.test(file))) {
    const d = await discoverWorkbook(file);
    for (const s of d.sheets) console.log(`Sheet "${s.name}": header row ${s.headerRow ?? "not found"}, ${s.dataRows} data rows, ${s.columns.length} columns`);
    await save(`${cmd}-${base(file)}.json`, d);
  } else if (cmd === "discover-access") {
    const d = describeAccess(await openAccess(file));
    for (const t of d) console.log(`${t.table}: ${t.rowCount} rows, ${t.columns.length} columns`);
    await save(`discover-access-${base(file)}.json`, d);
  } else if (cmd === "check-dn") {
    const r = await readDnWorkbook(file, { sheet: opt("sheet") });
    const byField: Record<string, { count: number; rows: number[]; errors: string[] }> = {};
    for (const p of r.rows.flatMap((x) => x.problems)) {
      const b = (byField[p.field] ??= { count: 0, rows: [], errors: [] });
      b.count++; if (b.rows.length < 20) b.rows.push(p.row); if (!b.errors.includes(p.error)) b.errors.push(p.error);
    }
    const summary = {
      sheet: r.sheet, headerRow: r.headerRow, companies: r.rows.length, skippedRows: r.skippedRows,
      missingColumns: r.missingColumns, unknownColumns: r.unknownColumns, duplicateColumns: r.duplicateColumns,
      withYearEnd: r.rows.filter((x) => x.yearEnd).length, withAgmMonth: r.rows.filter((x) => x.agmMonth).length,
      withContactEmail: r.rows.filter((x) => x.contactEmails.length).length,
      duplicateCodes: Object.entries(r.rows.reduce<Record<string, number>>((a, x) => ({ ...a, [x.code]: (a[x.code] ?? 0) + 1 }), {})).filter(([, n]) => n > 1).length,
      problemsByField: byField,
    };
    console.log(JSON.stringify(summary, null, 2));
    await save(`check-dn-${base(file)}.json`, summary);
  } else { console.error(`Unknown command ${cmd}`); process.exit(2); }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
