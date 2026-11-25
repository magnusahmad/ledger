// UHY's client list is two workbooks: the DN workbook, and a copy of it where AGMs are tracked. The
// DN workbook decides who is a client and holds the year end, incorporation date and contact emails.
// The AGM workbook's visible columns hold this year's AGM month (DECISIONS.md #67). Companies are
// matched by client code, and by name where a code is missing from one workbook. Fictional companies.
import { describe, it, expect } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { dnClientList, mergeWorkbooks } from "../src/dn-source";
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
