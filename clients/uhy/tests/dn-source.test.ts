// UHY's client list is two workbooks: the DN workbook, and a copy of it where AGMs are tracked. The
// DN workbook decides who is a client and holds the year end, incorporation date and contact emails.
// The AGM workbook's visible columns hold this year's AGM month (DECISIONS.md #67). Companies are
// matched by client code, and by name where a code is missing from one workbook. Fictional companies.
import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { dnClientList, mergeWorkbooks } from "../src/dn-source";
import { workbookCode } from "../src/codes";
import { clientListFromConfig } from "@/annual/runtime";
import { loadConfig } from "@/lib/config";
import type { DnRow } from "../src/dn";

const row = (o: Partial<DnRow> & { row: number; code: string }): DnRow => ({
  nameEn: `${o.code} Limited`, struck: false, textColour: null, excluded: null, yearEnd: null, agmMonth: null, incorporatedOn: null, noAgm: null, contactEmails: [], notes: {}, problems: [], ...o,
} as DnRow);

describe("UHY's two workbooks as one client list", () => {
  it("the AGM month comes from the AGM workbook; the year end, incorporation date and contact emails from the DN workbook", () => {
    const { entries } = mergeWorkbooks(
      [row({ row: 2, code: "X101", agmMonth: 5, yearEnd: { month: 12, day: 31 }, incorporatedOn: "2015-11-20", contactEmails: ["a@example.com"] })],
      [row({ row: 9, code: "X101", agmMonth: 6, yearEnd: { month: 3, day: 31 }, incorporatedOn: "2001-01-01", contactEmails: ["wrong@example.com"] })],
    );
    expect(entries).toEqual([expect.objectContaining({ code: "X101", agmMonth: 6, yearEnd: { month: 12, day: 31 }, incorporatedOn: "2015-11-20", contactEmails: ["a@example.com"] })]);
  });

  it("a company the AGM workbook has no AGM month for keeps the DN workbook's", () => {
    const { entries } = mergeWorkbooks([row({ row: 2, code: "X101", agmMonth: 5 })], [row({ row: 2, code: "X101" })]);
    expect(entries[0].agmMonth).toBe(5);
  });

  it("the DN workbook decides who is a client, whatever the AGM workbook shows", () => {
    const { entries } = mergeWorkbooks(
      [row({ row: 2, code: "X101", excluded: "struck" }), row({ row: 3, code: "X102" }), row({ row: 4, code: "X103", excluded: "blue" })],
      [row({ row: 2, code: "X101" }), row({ row: 3, code: "X102", excluded: "red" }), row({ row: 4, code: "X103" })],
    );
    expect(entries.map((e) => [e.code, e.live, e.leftOutReason])).toEqual([["X101", false, "struck"], ["X102", true, null], ["X103", false, "blue"]]);
  });

  it("a status written in place of AGM tracking is carried as the reason no AGM is handled", () => {
    const { entries } = mergeWorkbooks([row({ row: 2, code: "X101" })], [row({ row: 2, code: "X101", noAgm: { status: "not_handled", where: "BVI" } })]);
    expect(entries[0].noAgm).toBe("not_handled (BVI)");
  });

  it("a company whose code is in the DN workbook only is matched to the AGM workbook by its name", () => {
    const { entries } = mergeWorkbooks(
      [row({ row: 2, code: "X201", nameEn: "Harbour Lantern Limited" })],
      [row({ row: 5, code: "X101", nameEn: "HARBOUR  LANTERN LIMITED", agmMonth: 9 }), row({ row: 6, code: "X101", nameEn: "Other Limited", agmMonth: 2 })],
    );
    expect(entries[0]).toMatchObject({ code: "X201", agmMonth: 9 });
  });

  it("a code on two rows of the DN workbook uses the row that is a current client", () => {
    const { entries, problems } = mergeWorkbooks(
      [row({ row: 2, code: "X101", nameEn: "Old Name Limited", excluded: "struck" }), row({ row: 3, code: "X101", nameEn: "New Name Limited" })], []);
    expect(entries).toEqual([expect.objectContaining({ code: "X101", nameEn: "New Name Limited", live: true })]);
    expect(problems).toEqual([]);
  });

  it("a code on two current-client rows is left out and reported by row, because either could be the company", () => {
    const { entries, problems } = mergeWorkbooks([row({ row: 2, code: "X101" }), row({ row: 3, code: "X101" }), row({ row: 4, code: "X102" })], []);
    expect(entries.map((e) => e.code)).toEqual(["X102"]);
    expect(problems).toEqual(["The DN workbook has one client code on rows 2 and 3, both current clients; neither was read."]);
  });
});

describe("reading the two workbook copies", () => {
  async function book(file: string, rows: (string | null)[][], hide: number[] = []) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Sheet1");
    ws.addRow(["CODE", "Company Name", "AGM (Month)", "Done", "Contact email"]);
    for (const r of rows) ws.addRow(r);
    for (const c of hide) ws.getColumn(c).hidden = true;
    await wb.xlsx.writeFile(file);
    return file;
  }

  it("takes nothing from a hidden column of the AGM workbook, and is not read again until a copy changes", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "dn-source-"));
    const dnFile = await book(path.join(dir, "dn.xlsx"), [["X101", "Harbour Lantern Limited", "May", null, "a@example.com"]]);
    const agmFile = await book(path.join(dir, "agm.xlsx"), [["X101", "Harbour Lantern Limited", "June", "done", "someone@else.example"]], [5]);
    const src = dnClientList({ dnFile, agmFile });
    const first = await src.read(null);
    expect(first!.entries).toEqual([expect.objectContaining({ code: "X101", agmMonth: 6, contactEmails: ["a@example.com"], live: true })]);
    expect(await src.read(first!.version)).toBeNull();
  });

  it("a copy that is not where the settings say fails with its path, so the health page says what to fix", async () => {
    await expect(dnClientList({ dnFile: "/nonexistent/clerk-test/dn.xlsx" }).read(null)).rejects.toThrow(/DN workbook copy is not at .*dn\.xlsx/);
  });
});

// The copies are made by a scheduled job on the pilot machine (ops/dn-copy.ps1), which records how
// its last run went beside them. The workbooks are renamed each year, so the job will one day stop
// finding one: that has to reach the health page with the path it looked for, not leave Clerk
// quietly reading last week's copy.
describe("the scheduled copy of the workbooks", () => {
  const dir = () => mkdtemp(path.join(tmpdir(), "dn-copy-"));
  const book = async (file: string) => { const wb = new ExcelJS.Workbook(); wb.addWorksheet("Sheet1").addRows([["CODE", "Company Name"], ["X101", "Harbour Lantern Limited"]]); await wb.xlsx.writeFile(file); return file; };
  const status = (d: string, o: object) => writeFile(path.join(d, "copy-status.json"), JSON.stringify(o));

  it("a copy job that failed is reported with its own message, and the old copy is not read as if it were current", async () => {
    const d = await dir(); const dnFile = await book(path.join(d, "dn.xlsx"));
    await status(d, { ok: false, finishedAt: "2026-12-05T01:00:00Z", error: "The DN workbook was not found at \\\\SERVER\\Share\\2025 DN.xls." });
    await expect(dnClientList({ dnFile, now: () => new Date("2026-12-05T02:00:00Z") }).read(null)).rejects.toThrow(/copy of the workbooks failed.*was not found at/i);
  });

  it("a copy job that has not run for four days is reported, because the copies may be out of date", async () => {
    const d = await dir(); const dnFile = await book(path.join(d, "dn.xlsx"));
    await status(d, { ok: true, finishedAt: "2026-12-01T01:00:00Z", error: null });
    await expect(dnClientList({ dnFile, now: () => new Date("2026-12-05T02:00:00Z") }).read(null)).rejects.toThrow(/has not run since 1 December/);
  });

  it("a recent successful copy is read, and so are copies made by hand with no job yet", async () => {
    const d = await dir(); const dnFile = await book(path.join(d, "dn.xlsx"));
    expect((await dnClientList({ dnFile, now: () => new Date("2026-12-05T02:00:00Z") }).read(null))!.entries.length).toBe(1);
    await status(d, { ok: true, finishedAt: "2026-12-04T10:00:00Z", error: null });
    expect((await dnClientList({ dnFile, now: () => new Date("2026-12-05T02:00:00Z") }).read(null))!.entries.length).toBe(1);
  });

  const root = path.resolve(__dirname, "../../..");
  const code = async (f: string) => (await readFile(path.join(root, f), "utf8")).split("\n").filter((l) => !l.trim().startsWith("#")).join("\n");

  it("the copy job only copies the originals on the share; it converts and reads its own copies", async () => {
    const ps = await code("clients/uhy/ops/dn-copy.ps1");
    // The one thing done to a source path is Copy-Item; LibreOffice is given the local copy.
    expect(ps).toMatch(/Copy-Item -LiteralPath \$s\.Source/);
    expect(ps).not.toMatch(/soffice[^\n]*\$s\.Source/);
    expect(ps).not.toMatch(/(Remove-Item|Move-Item|Set-Content|Out-File)[^\n]*\$s\.Source/);
  });

  it("the copy job writes fixed file names, so a workbook renamed for the new year changes one setting and nothing else", async () => {
    const ps = await code("clients/uhy/ops/dn-copy.ps1");
    expect(ps).toMatch(/'dn'/); expect(ps).toMatch(/'agm'/);
    expect(await code("deploy/windows/env.production.example")).not.toMatch(/COSEC/);
  });

  it("the copy job keeps the last good copy when a run fails, and records the failure without a byte-order mark", async () => {
    const ps = await code("clients/uhy/ops/dn-copy.ps1");
    expect(ps).toMatch(/\[IO\.File\]::WriteAllText\(\$StatusFile,[^\n]*UTF8Encoding \$false/);
    // Converted into a working folder first; the copy Clerk reads is replaced only by a finished file.
    expect(ps.indexOf("Move-Item")).toBeGreaterThan(ps.indexOf("soffice"));
  });

  it("the job's scripts are plain ASCII, and the task points at the script where the installer puts it", async () => {
    for (const f of ["clients/uhy/ops/dn-copy.ps1", "clients/uhy/ops/register-dn-copy.ps1"]) expect(/[^\x00-\x7F]/.test(await readFile(path.join(root, f), "utf8")), f).toBe(false);
    expect(await code("clients/uhy/ops/register-dn-copy.ps1")).toMatch(/C:\\Clerk\\app\\clients\\uhy\\ops\\dn-copy\.ps1/);
  });
});

// CSA writes a client code with one or two letters after it (A0873K, B3066UK) that the DN workbook
// leaves off (A0873, B3066). Seen on the pilot machine on 25 November, where it left 92 of 193
// companies unmatched.
describe("UHY's client codes in CSA and in the workbooks", () => {
  it("the letters CSA adds after the number are dropped to find the company in the workbook", () => {
    expect(["A0873K", "B3066UK", "E3056I", "V3057", "a3079t"].map(workbookCode)).toEqual(["A0873", "B3066", "E3056", "V3057", "A3079"]);
  });

  it("a code of another shape is left as it is", () => {
    expect(["D000001", "", "X12"].map(workbookCode)).toEqual(["D000001", "", "X12"]);
  });

  it("the installation's client list reads CSA's codes this way", () => {
    const src = clientListFromConfig(loadConfig({ INSTALLATION_PROFILE: "uhy", CLIENT_LIST_FILE: "C:\\Clerk\\sources\\dn\\dn.xlsx" }));
    expect(src!.codeKey!("C3209K")).toBe("C3209");
  });
});
