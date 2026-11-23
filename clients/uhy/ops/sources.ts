// UHY pilot: look at the DN workbook and the Access database from the pilot machine, over the share.
// Read-only. Discovery output holds headers, column names, types, counts and value shapes, never
// cell values; check-dn prints counts, column problems and row numbers, never values.
//
//   npx tsx clients/uhy/ops/sources.ts discover-dn "\\SERVER\Share\Co-sec\Debit Notes\DN 2025.xlsx"
//   npx tsx clients/uhy/ops/sources.ts discover-access "C:\Clerk\sources\access"   (newest weekly copy)
//   npx tsx clients/uhy/ops/sources.ts discover-access "C:\Clerk\sources\access\Clients.accdb"
//   npx tsx clients/uhy/ops/sources.ts discover-access "C:\Clerk\private\clients-export.xlsx"
//   npx tsx clients/uhy/ops/sources.ts check-dn "\\SERVER\...\DN 2025.xlsx" [--sheet 2026]
//
// Results are written to --out (default private/uhy/discovery, git-ignored).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { discoverWorkbook, readDnWorkbook } from "../src/dn";
import { describeAccess, findAccessCopy, openAccess } from "../src/access";

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
  if (!cmd || !file) { console.error("Usage: sources.ts discover-dn|discover-access|check-dn <file or folder> [--sheet name] [--max-age-days n] [--out dir]"); process.exit(2); }
  if (cmd === "discover-dn" || (cmd === "discover-access" && /\.xlsx?$/i.test(file))) {
    const d = await discoverWorkbook(file);
    for (const s of d.sheets) {
      console.log(`Sheet "${s.name}": header row ${s.headerRow ?? "not found"}, ${s.dataRows} data rows, ${s.columns.length} columns`);
      const f = s.formatting;
      console.log(`  formatting: ${f.struckCells} struck-through cells (${f.struckRows} whole rows), ${f.hiddenRows} hidden rows, ${f.notes} notes`);
      console.log(`  text colours: ${JSON.stringify(f.fontColours)}; cell colours: ${JSON.stringify(f.fillColours)}`);
    }
    await save(`${cmd}-${base(file)}.json`, d);
  } else if (cmd === "discover-access") {
    const copy = await findAccessCopy(file, { now: new Date(), maxAgeDays: opt("max-age-days") ? Number(opt("max-age-days")) : undefined });
    console.log(`Using ${path.basename(copy.file)}, downloaded ${copy.copiedAt.toISOString().slice(0, 10)} (${copy.ageDays} days ago)`);
    if (copy.warning) console.warn(`Warning: ${copy.warning}`);
    const d = describeAccess(await openAccess(copy.file));
    for (const t of d) console.log(`${t.table}: ${t.rowCount} rows, ${t.columns.length} columns`);
    await save(`discover-access-${base(file)}.json`, d);
  } else if (cmd === "check-dn") {
    const r = await readDnWorkbook(file, { sheet: opt("sheet") });
    const live = r.rows.filter((x) => !x.struck);
    const byField: Record<string, { count: number; rows: number[]; errors: string[] }> = {};
    for (const p of r.rows.flatMap((x) => x.problems)) {
      const b = (byField[p.field] ??= { count: 0, rows: [], errors: [] });
      b.count++; if (b.rows.length < 20) b.rows.push(p.row); if (!b.errors.includes(p.error)) b.errors.push(p.error);
    }
    const summary = {
      sheet: r.sheet, headerRow: r.headerRow, companies: r.rows.length, skippedRows: r.skippedRows,
      missingColumns: r.missingColumns, unknownColumns: r.unknownColumns, duplicateColumns: r.duplicateColumns,
      struckThrough: r.rows.filter((x) => x.struck).length,
      // Everything below counts live companies only (code and name not struck through).
      live: live.length, withIncorporationDate: live.filter((x) => x.incorporatedOn).length,
      withYearEnd: live.filter((x) => x.yearEnd).length, withAgmMonth: live.filter((x) => x.agmMonth).length,
      withContactEmail: live.filter((x) => x.contactEmails.length).length,
      noAgm: live.reduce<Record<string, number>>((a, x) => { if (x.noAgm) { const k = x.noAgm.where ? `${x.noAgm.status} (${x.noAgm.where})` : x.noAgm.status; a[k] = (a[k] ?? 0) + 1; } return a; }, {}),
      neitherAgmMonthNorStatus: live.filter((x) => !x.agmMonth && !x.noAgm).length,
      notesByField: live.reduce<Record<string, number>>((a, x) => { for (const f of Object.keys(x.notes)) a[f] = (a[f] ?? 0) + 1; return a; }, {}),
      duplicateCodes: Object.entries(r.rows.reduce<Record<string, number>>((a, x) => ({ ...a, [x.code]: (a[x.code] ?? 0) + 1 }), {})).filter(([, n]) => n > 1).length,
      problemsByField: byField,
    };
    console.log(JSON.stringify(summary, null, 2));
    await save(`check-dn-${base(file)}.json`, summary);
  } else { console.error(`Unknown command ${cmd}`); process.exit(2); }
}
// The message and where in the code it happened (code locations only, never cell values).
main().catch((e) => { console.error(e instanceof Error ? `${e.message}\n${(e.stack ?? "").split("\n").slice(1, 5).join("\n")}` : e); process.exit(1); });
