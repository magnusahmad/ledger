// UHY's DN ("Debit Note") workbook: its client list and annual-cycle tracker. The reader finds
// columns by header name (never position), reports missing and unknown columns, and keeps the
// three tick states apart. Fixtures are built here from fictional companies; real DN files stay
// in the git-ignored private/ folder.
import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { parseTick, parseChineseYearEnd, parseUsDate, parseAgmMonth, splitEmails, readDnWorkbook, discoverWorkbook } from "@/integrations/uhy/dn";

const HEADERS = [
  "CODE", "Company Name", "公司名", "Last DN", "Debit Note Service Until", "New DN (2026)", "Significant Controller", "Designated representative", null, null,
  "新查冊", "新查冊invoice", "新查冊文件", "Year-End-date", "AGM (Month)", "Auditor", "required AFS", "Done", "Sent", "By", "Received", "Scan", "File", "Remarks", null,
  "Engagement letter", "DD form", "Risk Assessment", "ADDRESS", "DIR & MEM", null, "Send $ email", "Contact email", "RO (NR1+IRD form)", "ND2B (rk sec > UHY)",
  "RO≠UHY, 公司文件擺UHY 要NR2", "Correspondence收信 (IRD以外信)", "ND2A 轉comsec",
];

type Cell = string | number | Date | null | { v: string; font: string };
async function workbook(dir: string, name: string, headers: (string | null)[], rows: Record<string, Cell>[], o: { titleRows?: number } = {}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("2026");
  for (let i = 0; i < (o.titleRows ?? 0); i++) ws.addRow(["Debit Note 2026"]);
  ws.addRow(headers);
  for (const r of rows) {
    const row = ws.addRow(headers.map(() => null));
    headers.forEach((h, i) => {
      if (!h || !(h in r)) return;
      const v = r[h];
      const cell = row.getCell(i + 1);
      if (v && typeof v === "object" && !(v instanceof Date)) { cell.value = v.v; cell.font = { name: v.font }; }
      else { cell.value = v as ExcelJS.CellValue; if (v instanceof Date) cell.numFmt = "m/d/yyyy"; }
    });
  }
  const file = path.join(dir, name);
  await wb.xlsx.writeFile(file);
  return file;
}
const wing = (v: string) => ({ v, font: "Wingdings" });

let dir: string;
beforeAll(async () => { dir = await mkdtemp(path.join(tmpdir(), "dn-")); });

describe("DN cell parsing", () => {
  it("a Wingdings ü in DN reads as yes, û as no, blank as not recorded", () => {
    expect(parseTick("ü", "Wingdings")).toEqual({ ok: true, value: "yes" });
    expect(parseTick("û", "Wingdings")).toEqual({ ok: true, value: "no" });
    expect(parseTick("", "Wingdings")).toEqual({ ok: true, value: "not_recorded" });
    expect(parseTick(null, undefined)).toEqual({ ok: true, value: "not_recorded" });
  });

  it("a tick written as a Unicode check mark reads the same as the Wingdings one", () => {
    expect(parseTick("✓", "Calibri")).toEqual({ ok: true, value: "yes" });
    expect(parseTick("✗", "Calibri")).toEqual({ ok: true, value: "no" });
  });

  it("a cell in a tick column that is not a tick is reported, not read as yes or no", () => {
    expect(parseTick("see Ruby", "Calibri").ok).toBe(false);
  });

  it("a Chinese year end 12月31日 parses to 31 December", () => {
    expect(parseChineseYearEnd("12月31日")).toEqual({ ok: true, value: { month: 12, day: 31 } });
    expect(parseChineseYearEnd(" 3月31日 ")).toEqual({ ok: true, value: { month: 3, day: 31 } });
    expect(parseChineseYearEnd("３月３１日")).toEqual({ ok: true, value: { month: 3, day: 31 } });
  });

  it("an impossible year end such as 2月30日 is reported, not adjusted", () => {
    expect(parseChineseYearEnd("2月30日").ok).toBe(false);
    expect(parseChineseYearEnd("13月1日").ok).toBe(false);
  });

  it("US m/d/yyyy dates in DN parse correctly and d/m/yyyy text is not misread", () => {
    expect(parseUsDate("3/4/2026")).toEqual({ ok: true, value: "2026-03-04" });
    expect(parseUsDate("12/31/2025")).toEqual({ ok: true, value: "2025-12-31" });
    expect(parseUsDate(new Date(Date.UTC(2026, 2, 4)))).toEqual({ ok: true, value: "2026-03-04" });
    // 28/7/2022 is day-first; in a US column it is an error, never swapped into 28 July.
    expect(parseUsDate("28/7/2022").ok).toBe(false);
    expect(parseUsDate("2/30/2026").ok).toBe(false);
  });

  it("an AGM month reads in English or Chinese", () => {
    expect(parseAgmMonth("September")).toEqual({ ok: true, value: 9 });
    expect(parseAgmMonth("sept")).toEqual({ ok: true, value: 9 });
    expect(parseAgmMonth("9月")).toEqual({ ok: true, value: 9 });
    expect(parseAgmMonth("Septober").ok).toBe(false);
  });

  it("several contact emails in one DN cell split into separate addresses", () => {
    expect(splitEmails("a@one.example ; B@Two.example;c@three.example")).toEqual({ emails: ["a@one.example", "b@two.example", "c@three.example"], invalid: [] });
    expect(splitEmails("a@one.example, a@one.example\nnot-an-email")).toEqual({ emails: ["a@one.example"], invalid: ["not-an-email"] });
  });
});

describe("DN workbook reader", () => {
  it("reads one company per row by header name, with ticks, year end, AGM month and contacts", async () => {
    const file = await workbook(dir, "dn-full.xlsx", HEADERS, [
      {
        CODE: "x101", "Company Name": "Harbour Lantern Limited", "公司名": "港燈籠有限公司", "Last DN": 260588, "Debit Note Service Until": new Date(Date.UTC(2026, 8, 30)),
        "Designated representative": wing("ü"), "Year-End-date": "12月31日", "AGM (Month)": "September", Auditor: "TK-VC",
        "DD form": wing("ü"), "Risk Assessment": wing("û"), "Send $ email": "10/2/2026", "Contact email": "ops@lantern.example ; boss@lantern.example",
      },
    ]);
    const r = await readDnWorkbook(file);
    expect(r.missingColumns).toEqual([]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      code: "X101", nameEn: "Harbour Lantern Limited", nameZh: "港燈籠有限公司", lastDn: "260588", serviceUntil: "2026-09-30",
      designatedRep: "yes", yearEnd: { month: 12, day: 31 }, agmMonth: 9, auditor: "TK-VC",
      ddForm: "yes", riskAssessment: "no", engagementLetter: "not_recorded", feeEmailSentOn: "2026-10-02",
      contactEmails: ["ops@lantern.example", "boss@lantern.example"], problems: [],
    });
  });

  it("DN's Done, Sent and Received columns are the AGM tracker, read as the dates each step happened (Coe, 18 November)", async () => {
    const file = await workbook(dir, "dn-agm.xlsx", HEADERS, [{ CODE: "X107", "Company Name": "Ap Lei Chau Boats Limited", Done: "10/20/2026", Sent: "11/3/2026", By: "CL", Received: wing("ü") }]);
    const row = (await readDnWorkbook(file)).rows[0];
    expect(row).toMatchObject({ agmDone: { date: "2026-10-20" }, agmSent: { date: "2026-11-03" }, agmBy: "CL", agmReceived: { tick: "yes", date: null } });
    expect(row).not.toHaveProperty("done");
  });

  it("required AFS reads as the year end of the audited accounts this year's AGM papers need", async () => {
    const file = await workbook(dir, "dn-afs.xlsx", HEADERS, [{ CODE: "X108", "Company Name": "Sham Shui Po Fabrics Limited", "required AFS": "12/31/2025" }]);
    expect((await readDnWorkbook(file)).rows[0].requiredAfs).toBe("2025-12-31");
  });

  it("finds the header row below title rows and ignores blank columns", async () => {
    const file = await workbook(dir, "dn-title.xlsx", HEADERS, [{ CODE: "X102", "Company Name": "Kite Street Limited", "Year-End-date": "3月31日" }], { titleRows: 2 });
    const r = await readDnWorkbook(file);
    expect(r.headerRow).toBe(3);
    expect(r.rows[0]).toMatchObject({ code: "X102", yearEnd: { month: 3, day: 31 } });
  });

  it("a DN workbook missing an expected column is reported, not guessed", async () => {
    const headers = HEADERS.filter((h) => h !== "Year-End-date");
    const file = await workbook(dir, "dn-missing.xlsx", headers, [{ CODE: "X103", "Company Name": "Junk Bay Trading Limited", "AGM (Month)": "June" }]);
    const r = await readDnWorkbook(file);
    expect(r.missingColumns).toContain("yearEnd");
    expect(r.rows[0].yearEnd).toBeNull();
    expect(r.rows[0].agmMonth).toBe(6);
  });

  it("a column DN has that the reader does not know is reported", async () => {
    const file = await workbook(dir, "dn-extra.xlsx", [...HEADERS, "Bank chop"], [{ CODE: "X104", "Company Name": "Peak Tram Supplies Limited" }]);
    expect((await readDnWorkbook(file)).unknownColumns).toEqual(["Bank chop"]);
  });

  it("a workbook without CODE and Company Name headers is refused", async () => {
    const file = await workbook(dir, "dn-nohead.xlsx", ["Ref", "Name"], [{ Ref: "X1", Name: "Somewhere Limited" }]);
    await expect(readDnWorkbook(file)).rejects.toThrow(/CODE/);
  });

  it("a bad value is reported against its row and column, and that field is left empty", async () => {
    const file = await workbook(dir, "dn-bad.xlsx", HEADERS, [{ CODE: "X105", "Company Name": "Lamma Ferry Limited", "Send $ email": "28/7/2022", "DD form": "pending" }]);
    const row = (await readDnWorkbook(file)).rows[0];
    expect(row.feeEmailSentOn).toBeNull();
    expect(row.ddForm).toBeNull();
    expect(row.problems.map((p) => p.field).sort()).toEqual(["ddForm", "feeEmailSentOn"]);
    expect(row.problems[0].row).toBe(2);
  });

  it("rows without a company code are skipped and counted", async () => {
    const file = await workbook(dir, "dn-blank.xlsx", HEADERS, [{ CODE: "X106", "Company Name": "Tai O Salt Limited" }, { Remarks: "carried forward" }]);
    const r = await readDnWorkbook(file);
    expect(r.rows).toHaveLength(1);
    expect(r.skippedRows).toBe(1);
  });
});

describe("workbook discovery (headers and formats only)", () => {
  it("reports every sheet's headers, fill counts and value shapes without any cell values", async () => {
    const file = await workbook(dir, "dn-discover.xlsx", HEADERS, [
      { CODE: "X201", "Company Name": "Secret Name Limited", "Year-End-date": "12月31日", "DD form": wing("ü"), "Send $ email": "10/2/2026", "Contact email": "hidden@secret.example ; two@secret.example", "新查冊": "28/7/2022 sent" },
      { CODE: "X202", "Company Name": "Other Secret Limited", "Debit Note Service Until": new Date(Date.UTC(2026, 0, 31)) },
    ]);
    const d = await discoverWorkbook(file);
    const json = JSON.stringify(d);
    for (const secret of ["X201", "Secret Name", "hidden@secret.example", "12月31日", "28/7/2022"]) expect(json).not.toContain(secret);
    const sheet = d.sheets[0];
    expect(sheet.headerRow).toBe(1);
    const col = (h: string) => sheet.columns.find((c) => c.header === h)!;
    expect(col("CODE").filled).toBe(2);
    expect(col("Year-End-date").shapes).toEqual({ "Chinese month-day": 1 });
    expect(col("DD form").shapes).toEqual({ "tick ü (Wingdings)": 1 });
    expect(col("Send $ email").shapes).toEqual({ "date text, month-first possible": 1 });
    expect(col("Contact email").shapes).toEqual({ "email list (2)": 1 });
    expect(col("新查冊").shapes).toEqual({ "text starting with a day-first date": 1 });
    expect(col("Debit Note Service Until").shapes).toEqual({ "date cell (m/d/yyyy)": 1 });
  });
});

describe("read-only", () => {
  it("reading a DN workbook leaves the file byte-for-byte unchanged", async () => {
    const file = await workbook(dir, "dn-ro.xlsx", HEADERS, [{ CODE: "X301", "Company Name": "Stanley Market Limited" }]);
    const before = { hash: createHash("sha256").update(await readFile(file)).digest("hex"), mtime: (await stat(file)).mtimeMs };
    await readDnWorkbook(file);
    await discoverWorkbook(file);
    expect({ hash: createHash("sha256").update(await readFile(file)).digest("hex"), mtime: (await stat(file)).mtimeMs }).toEqual(before);
  });
});
