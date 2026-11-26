// UHY pilot: counts that explain the annual case list, for support. Run on the pilot machine after
//   . C:\Clerk\deploy\clerk-env.ps1
//   node node_modules\tsx\dist\cli.mjs clients\uhy\ops\annual-check.ts
// Prints counts, settings names and client codes only (the owner confirmed on 25 November that client
// codes hold no personal data): never a company's name or a date belonging to one.
import { eq } from "drizzle-orm";
import { makeRuntimeCtx } from "@/lib/runtime";
import { closePools } from "@/db/client";
import { arCase, client } from "@/db/schema";
import { readClientListReport } from "@/annual/client-list";
import { readHealth } from "@/annual/cycle";
import { readDnWorkbook } from "../src/dn";

const tally = <T>(xs: T[], k: (x: T) => string) => xs.reduce<Record<string, number>>((a, x) => { const key = k(x); a[key] = (a[key] ?? 0) + 1; return a; }, {});
const ctx = makeRuntimeCtx();
const today = ctx.clock.today();
const clients = await ctx.db.select().from(client).where(eq(client.firmId, ctx.firmId));
const cases = await ctx.db.select().from(arCase).where(eq(arCase.firmId, ctx.firmId));
const data = (c: (typeof clients)[number]) => c.jurisdictionData as { lastAnnualReturnOn?: string | null; clientList?: { live: boolean; reason: string | null }; fromRecords?: unknown; csa?: { missingSince?: string } };
const byId = new Map(clients.map((c) => [c.id, c]));
const report = await readClientListReport(ctx);
const overdueAr = cases.filter((k) => k.kind === "AR" && k.dueDate < today && k.stage !== "registered" && k.stage !== "filed");

// How the records' companies line up with the DN workbook: by client code, and by name. Shapes and
// counts only (A = a letter, 9 = a digit), so a mismatch in how codes are written shows without a code.
const shape = (v: string) => v.replace(/[A-Za-z]/g, "A").replace(/[0-9]/g, "9");
const nm = (v: string | null) => (v ?? "").normalize("NFKC").toUpperCase().replace(/\b(LIMITED|LTD|CO|COMPANY)\b\.?/g, "").replace(/[^A-Z0-9\u4e00-\u9fff]+/g, "");
const cd = (v: string | null) => (v ?? "").toUpperCase().replace(/\s+/g, "");
let matching: unknown = null;
if (ctx.config.CLIENT_LIST_FILE) {
  const dn = (await readDnWorkbook(ctx.config.CLIENT_LIST_FILE)).rows;
  const dnByCode = new Map<string, typeof dn>(), dnByName = new Map<string, typeof dn>();
  for (const r of dn) { dnByCode.set(r.code, [...(dnByCode.get(r.code) ?? []), r]); const n = nm(r.nameEn); if (n) dnByName.set(n, [...(dnByName.get(n) ?? []), r]); }
  const relation = (a: string, b: string) => a === b ? "same code" : a.replace(/^([A-Z]*)0+/, "$1") === b.replace(/^([A-Z]*)0+/, "$1") ? "same but for leading zeros" : a.includes(b) || b.includes(a) ? "one contains the other" : a.replace(/[^0-9]/g, "") === b.replace(/[^0-9]/g, "") ? "same digits, different letters" : "unrelated";
  const m = { recordsCodeShapes: tally(clients, (c) => shape(cd(c.code))), workbookCodeShapes: tally(dn, (r) => shape(r.code)),
    sameCode: 0, sameCodeAndSameName: 0, sameCodeButDifferentName: 0, sameName: 0, sameNameAndLiveInWorkbook: 0, sameNameCodeRelation: {} as Record<string, number>, neitherCodeNorName: 0,
    // Examples as [code in the records, code in the workbook]: same company by name with a different code,
    // then a shared code under different names, then codes found on neither side.
    sameNameDifferentCode: [] as [string, string][], sameCodeDifferentName: [] as string[], unmatchedRecordsCodes: [] as string[] };
  for (const c of clients) {
    const byCode = dnByCode.get(cd(c.code)) ?? [], byName = dnByName.get(nm(c.nameEn)) ?? [];
    if (byCode.length) { m.sameCode++; if (byCode.some((r) => nm(r.nameEn) === nm(c.nameEn))) m.sameCodeAndSameName++; else { m.sameCodeButDifferentName++; if (m.sameCodeDifferentName.length < 30) m.sameCodeDifferentName.push(cd(c.code)); } }
    if (byName.length) { m.sameName++; if (byName.some((r) => !r.excluded)) m.sameNameAndLiveInWorkbook++; const other = (byName.find((r) => !r.excluded) ?? byName[0]).code; const rel = relation(cd(c.code), other); m.sameNameCodeRelation[rel] = (m.sameNameCodeRelation[rel] ?? 0) + 1; if (rel !== "same code" && m.sameNameDifferentCode.length < 30) m.sameNameDifferentCode.push([cd(c.code), other]); }
    if (!byCode.length && !byName.length) { m.neitherCodeNorName++; if (m.unmatchedRecordsCodes.length < 30) m.unmatchedRecordsCodes.push(cd(c.code)); }
  }
  matching = m;
}

console.log(JSON.stringify({
  today, matching,
  settings: { CSA_MAPPING_FILE: ctx.config.CSA_MAPPING_FILE ?? null, CLIENT_LIST_FILE: ctx.config.CLIENT_LIST_FILE ?? null, AGM_TRACKER_FILE: ctx.config.AGM_TRACKER_FILE ?? null },
  health: await readHealth(ctx),
  companies: {
    total: clients.length,
    lastReturnFieldImported: clients.filter((c) => "lastAnnualReturnOn" in data(c)).length,
    withLastReturnDate: clients.filter((c) => data(c).lastAnnualReturnOn).length,
    lastReturnByYear: tally(clients.filter((c) => data(c).lastAnnualReturnOn), (c) => data(c).lastAnnualReturnOn!.slice(0, 4)),
    markedByClientList: clients.filter((c) => data(c).clientList).length,
    leftOutByClientList: tally(clients.filter((c) => data(c).clientList?.live === false), (c) => data(c).clientList!.reason ?? "no reason"),
    noLongerInRecords: clients.filter((c) => data(c).csa?.missingSince).length,
  },
  clientList: report ? { label: report.label, appliedAt: report.appliedAt, counts: report.counts, problems: report.problems, differencesByKind: tally(report.differences, (d) => d.kind),
    // The client codes behind each kind of difference, for looking them up by eye. Companies in the
    // workbook that Clerk does not hold (mostly offshore) are counted above and not listed.
    codesByKind: Object.fromEntries(["nameMismatch", "yearEnd", "incorporatedOn", "notInList", "leftOut"].map((k) => [k, report.differences.filter((d) => d.kind === k).map((d) => d.kind === "leftOut" ? `${d.code} (${d.list})` : d.code)])) } : null,
  cases: {
    total: cases.length, byKindAndStage: tally(cases, (k) => `${k.kind} ${k.stage}`),
    overdueAnnualReturns: overdueAr.length,
    // For each overdue annual return: the year of the return, and the year of the last return the records hold.
    overdueByPeriodAndLastReturn: tally(overdueAr, (k) => `return ${k.periodYear}, records' last return ${data(byId.get(k.clientId)!).lastAnnualReturnOn?.slice(0, 4) ?? "none"}`),
    overdueCodes: overdueAr.map((k) => byId.get(k.clientId)!.code).sort(),
    overdueStartedByStaff: overdueAr.filter((k) => k.startedAtStage || k.registryCheck).length,
  },
}, null, 2));
await closePools();
