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
import { parseTick, parseChineseYearEnd, parseDnDate, parseAgmMonth, splitEmails, readDnWorkbook, discoverWorkbook } from "../src/dn";

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

  it("dates in DN are written day first; a date that only works month-first is reported, never swapped", () => {
    // The real workbook (23 November) formats its dates dd/mm/yyyy, unlike the October sample.
    expect(parseDnDate("3/4/2026")).toEqual({ ok: true, value: "2026-04-03" });
    expect(parseDnDate("24/08/2022")).toEqual({ ok: true, value: "2022-08-24" });
    expect(parseDnDate("31/12/26")).toEqual({ ok: true, value: "2026-12-31" });
    expect(parseDnDate(new Date(Date.UTC(2026, 2, 4)))).toEqual({ ok: true, value: "2026-03-04" });
    expect(parseDnDate("12/31/2025")).toMatchObject({ ok: false, dateLike: true });
    expect(parseDnDate("30/2/2026")).toMatchObject({ ok: false, dateLike: true });
    expect(parseDnDate("done")).toMatchObject({ ok: false, dateLike: false });
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
      ddForm: "yes", riskAssessment: "no", engagementLetter: "not_recorded", feeEmailSentOn: "2026-02-10",
      contactEmails: ["ops@lantern.example", "boss@lantern.example"], problems: [],
    });
  });

  it("DN's Done, Sent and Received columns are the AGM tracker, read as the dates each step happened (Coe, 18 November)", async () => {
    const file = await workbook(dir, "dn-agm.xlsx", HEADERS, [{ CODE: "X107", "Company Name": "Ap Lei Chau Boats Limited", Done: "20/10/2026", Sent: "3/11/2026", By: "CL", Received: wing("ü") }]);
    const row = (await readDnWorkbook(file)).rows[0];
    expect(row).toMatchObject({ agmDone: { date: "2026-10-20" }, agmSent: { date: "2026-11-03" }, agmBy: "CL", agmReceived: { tick: "yes", date: null } });
    expect(row).not.toHaveProperty("done");
  });

  it("required AFS reads as the year end of the audited accounts this year's AGM papers need", async () => {
    const file = await workbook(dir, "dn-afs.xlsx", HEADERS, [{ CODE: "X108", "Company Name": "Sham Shui Po Fabrics Limited", "required AFS": "31/12/2025" }]);
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

  it("an impossible date is reported against its row and column and left empty; words in a tick column are kept as a note", async () => {
    const file = await workbook(dir, "dn-bad.xlsx", HEADERS, [{ CODE: "X105", "Company Name": "Lamma Ferry Limited", "Debit Note Service Until": "31/2/2026", "DD form": "pending" }]);
    const row = (await readDnWorkbook(file)).rows[0];
    expect(row.serviceUntil).toBeNull();
    expect(row.problems.map((p) => p.field)).toEqual(["serviceUntil"]);
    expect(row.problems[0].row).toBe(2);
    expect(row.ddForm).toBeNull();
    expect(row.notes.ddForm).toBe("pending");
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

describe("the real workbook's conventions (23 November)", () => {
  // UHY's sheet is a working notebook: a few columns hold clean data and the rest hold whatever staff
  // needed to write. The reader takes what the pilot needs and keeps everything else as a note.
  const H = ["CODE", "Company Name", "Group Code", "Com Kit", "Bank Charge", "Incorp. Date", "Remarks", "Year-End-date", "AGM (Month)", "required AFS",
    "Done", "Allan check", "Sent", "By.", "Received", "Scan", "File", "Remarks", "Send $ email", "Contact email"];
  async function sheet(name: string, rows: (ws: ExcelJS.Worksheet) => void) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Sheet1");
    ws.addRow(H);
    rows(ws);
    const file = path.join(dir, name);
    await wb.xlsx.writeFile(file);
    return file;
  }
  const at = (h: string, nth = 1) => { let n = 0; return H.findIndex((x) => x === h && ++n === nth) + 1; };
  const add = (ws: ExcelJS.Worksheet, v: Record<string, ExcelJS.CellValue>) => {
    const row = ws.addRow(H.map(() => null));
    for (const [h, val] of Object.entries(v)) { const [name, nth] = h.split("#"); row.getCell(at(name, Number(nth ?? 1))).value = val; }
    return row;
  };
  const BLOCK = ["AGM (Month)", "Done", "Allan check", "Sent", "By.", "Received", "Scan", "File", "Remarks#2"];
  const across = (text: string) => Object.fromEntries(BLOCK.map((h) => [h, text]));

  it("a company whose code and name are struck through is read as no longer a client", async () => {
    const r = await readDnWorkbook(await sheet("real-struck.xlsx", (ws) => {
      add(ws, { CODE: "X801", "Company Name": "Live Limited" });
      const gone = add(ws, { CODE: "X802", "Company Name": "Gone Limited" });
      gone.getCell(1).font = { strike: true }; gone.getCell(2).font = { strike: true };
    }));
    expect(r.rows.map((x) => [x.code, x.struck])).toEqual([["X801", false], ["X802", true]]);
  });

  // Coe, 24 November: struck through means no longer a client; blue text marks a client taken on for
  // a one-off service; staff always leave out clients in red and blue. Any other colour, or none, is
  // an active client.
  const colour = (row: ExcelJS.Row, argb: string) => { row.getCell(1).font = { color: { argb } }; row.getCell(2).font = { color: { argb } }; };

  it("a company whose code and name are in red text is left out, even when it is not struck through", async () => {
    const r = await readDnWorkbook(await sheet("real-red.xlsx", (ws) => {
      add(ws, { CODE: "X811", "Company Name": "Active Limited" });
      colour(add(ws, { CODE: "X812", "Company Name": "Red Limited" }), "FFFF0000");
    }));
    expect(r.rows.map((x) => [x.code, x.excluded])).toEqual([["X811", null], ["X812", "red"]]);
  });

  it("a company in blue text is a one-off service client and is left out, whichever blue staff used", async () => {
    const r = await readDnWorkbook(await sheet("real-blue.xlsx", (ws) => {
      colour(add(ws, { CODE: "X821", "Company Name": "Light Blue Limited" }), "FF00CCFF");
      colour(add(ws, { CODE: "X822", "Company Name": "Blue Limited" }), "FF0000FF");
      // Only the name is coloured: staff do not always colour both cells.
      add(ws, { CODE: "X823", "Company Name": "Name Only Limited" }).getCell(2).font = { color: { argb: "FF00CCFF" } };
    }));
    expect(r.rows.map((x) => x.excluded)).toEqual(["blue", "blue", "blue"]);
  });

  it("a company in any other text colour, or with a coloured cell, is still an active client, and its colour is kept for the check", async () => {
    const r = await readDnWorkbook(await sheet("real-other-colours.xlsx", (ws) => {
      colour(add(ws, { CODE: "X831", "Company Name": "Green Limited" }), "FF008000");
      const yellow = add(ws, { CODE: "X832", "Company Name": "Highlighted Limited" });
      yellow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
      // Red text elsewhere on the row says nothing about the client.
      add(ws, { CODE: "X833", "Company Name": "Red Remark Limited", Remarks: "chase payment" }).getCell(7).font = { color: { argb: "FFFF0000" } };
    }));
    expect(r.rows.map((x) => [x.excluded, x.textColour])).toEqual([[null, "#008000"], [null, null], [null, null]]);
  });

  it("a struck-through company is reported as struck through, whatever colour it is also in", async () => {
    const r = await readDnWorkbook(await sheet("real-struck-red.xlsx", (ws) => {
      const gone = add(ws, { CODE: "X841", "Company Name": "Gone Red Limited" });
      gone.getCell(1).font = { strike: true, color: { argb: "FFFF0000" } }; gone.getCell(2).font = { strike: true, color: { argb: "FFFF0000" } };
    }));
    expect(r.rows[0]).toMatchObject({ struck: true, excluded: "struck", textColour: "#FF0000" });
  });

  it("the AGM month is a month name; a status written there means no AGM is handled, and says why", async () => {
    const r = await readDnWorkbook(await sheet("real-month.xlsx", (ws) => {
      add(ws, { CODE: "X811", "Company Name": "A Limited", "AGM (Month)": "September " });
      add(ws, { CODE: "X812", "Company Name": "B Limited", ...across("BVI-\u4e0d\u7528\u8655\u7406") });
      add(ws, { CODE: "X813", "Company Name": "C Limited", ...across("\u4e0d\u7528\u8655\u7406") });
      add(ws, { CODE: "X814", "Company Name": "D Limited", "AGM (Month)": "September", Done: "dereg\u4e2d" });
    }));
    expect(r.rows.map((x) => [x.agmMonth, x.noAgm])).toEqual([
      [9, null], [null, { status: "not_handled", where: "BVI" }], [null, { status: "not_handled", where: null }], [9, { status: "deregistering", where: null }],
    ]);
  });

  it("a status repeated across the AGM block is one status, not nine notes or nine errors", async () => {
    const row = (await readDnWorkbook(await sheet("real-block.xlsx", (ws) => { add(ws, { CODE: "X821", "Company Name": "E Limited", ...across("BAHAMAS-\u4e0d\u7528\u8655\u7406") }); }))).rows[0];
    expect(row.problems).toEqual([]);
    expect(row.notes).toEqual({});
    expect(row).toMatchObject({ agmDone: null, agmSent: null, agmFiled: null, agmRemarks: null, noAgm: { status: "not_handled", where: "BAHAMAS" } });
  });

  it("the tracker reads done, a day-first date or a tick; anything else is kept as a note, not an error", async () => {
    const row = (await readDnWorkbook(await sheet("real-tracker.xlsx", (ws) => {
      add(ws, { CODE: "X831", "Company Name": "F Limited", Done: "done ", "Allan check": "24/08/2022", Sent: new Date(Date.UTC(2026, 9, 5)), Received: "should be done by client, wait for email" });
    }))).rows[0];
    expect(row).toMatchObject({ agmDone: { tick: "yes", date: null }, agmAllanCheck: { tick: "yes", date: "2022-08-24" }, agmSent: { tick: "yes", date: "2026-10-05" }, agmReceived: null });
    expect(row.notes).toEqual({ agmReceived: "should be done by client, wait for email" });
    expect(row.problems).toEqual([]);
  });

  it("the year end reads from a date cell, 31/Dec, 12\u670831\u65e5, or a formula holding that text; 'no accounts yet' is a note", async () => {
    const r = await readDnWorkbook(await sheet("real-yearend.xlsx", (ws) => {
      add(ws, { CODE: "X841", "Company Name": "G Limited", "Year-End-date": new Date(Date.UTC(2026, 11, 31)) });
      add(ws, { CODE: "X842", "Company Name": "H Limited", "Year-End-date": "31/Dec" });
      add(ws, { CODE: "X843", "Company Name": "I Limited", "Year-End-date": "12\u670831\u65e5" });
      add(ws, { CODE: "X844", "Company Name": "J Limited", "Year-End-date": { formula: '"3\u670831\u65e5"', result: "3\u670831\u65e5" } });
      add(ws, { CODE: "X845", "Company Name": "K Limited", "Year-End-date": { formula: '"3\u670831\u65e5"' } as ExcelJS.CellValue });
      add(ws, { CODE: "X846", "Company Name": "L Limited", "Year-End-date": "1st AGM \u7121\u505a\u904eaccount" });
      add(ws, { CODE: "X847", "Company Name": "M Limited", "Year-End-date": "N/A" });
    }));
    const dec = { month: 12, day: 31 }, mar = { month: 3, day: 31 };
    expect(r.rows.map((x) => x.yearEnd)).toEqual([dec, dec, dec, mar, mar, null, null]);
    expect(r.rows[5].notes).toEqual({ yearEnd: "1st AGM \u7121\u505a\u904eaccount" });
    expect(r.rows.flatMap((x) => x.problems)).toEqual([]);
  });

  it("required AFS: a date is the year end needed, x means none, and a range keeps its last year end with the text as a note", async () => {
    const r = await readDnWorkbook(await sheet("real-afs.xlsx", (ws) => {
      for (const [i, v] of ["31/12/2026", "x", "31/12/2025-26", "2022-2026", "\u6210\u7acb-31/12/26"].entries()) add(ws, { CODE: `X85${i}`, "Company Name": "N Limited", "required AFS": v });
    }));
    expect(r.rows.map((x) => x.requiredAfs)).toEqual(["2026-12-31", null, "2026-12-31", null, "2026-12-31"]);
    expect(r.rows.map((x) => x.notes.requiredAfs ?? null)).toEqual([null, null, "31/12/2025-26", "2022-2026", "\u6210\u7acb-31/12/26"]);
    expect(r.rows.flatMap((x) => x.problems)).toEqual([]);
  });

  it("Send $ email: a date is when the fee email went out, and X means it did not", async () => {
    const r = await readDnWorkbook(await sheet("real-sent.xlsx", (ws) => {
      for (const [i, v] of ["17/09/2024", "X", "x", "X joined in 2024"].entries()) add(ws, { CODE: `X86${i}`, "Company Name": "O Limited", "Send $ email": v });
    }));
    expect(r.rows.map((x) => x.feeEmailSentOn)).toEqual(["2024-09-17", null, null, null]);
    expect(r.rows.map((x) => x.notes.feeEmailSentOn ?? null)).toEqual([null, null, null, "X joined in 2024"]);
  });

  it("reads the incorporation date and group code, and tells the general remarks from the AGM remarks", async () => {
    const row = (await readDnWorkbook(await sheet("real-new.xlsx", (ws) => {
      add(ws, { CODE: "X871", "Company Name": "P Limited", "Group Code": "ABC", "Incorp. Date": new Date(Date.UTC(2015, 10, 20)), Remarks: "general", "Remarks#2": "about the AGM" });
    }))).rows[0];
    expect(row).toMatchObject({ groupCode: "ABC", incorporatedOn: "2015-11-20", remarks: "general", agmRemarks: "about the AGM" });
  });

  it("columns the pilot does not use are left alone, and are not reported as unknown", async () => {
    const r = await readDnWorkbook(await sheet("real-ignored.xlsx", (ws) => { add(ws, { CODE: "X881", "Company Name": "Q Limited", "Com Kit": "ABC", "Bank Charge": 50 }); }));
    expect(r.unknownColumns).toEqual([]);
    expect(r.duplicateColumns).toEqual([]);
  });
});

describe("text the reader does not recognise", () => {
  // The real workbook (23 November) writes year ends, AGM months and tracker columns in ways the
  // sample did not show. Discovery reports the pattern of such text, with every letter, digit and
  // Chinese character replaced, so the column rules can be written without seeing any value.
  it("reports the pattern of unrecognised text per column, never the text itself", async () => {
    const file = await workbook(dir, "dn-patterns.xlsx", HEADERS, [
      { CODE: "X601", "Company Name": "Queen Road Limited", "Year-End-date": "\u6bcf\u5e7412\u670831\u65e5", "AGM (Month)": "N/A", Done: "\u4e0d\u7528\u958b\u6703" },
      { CODE: "X602", "Company Name": "Kings Road Limited", "Year-End-date": "\u6bcf\u5e743\u670831\u65e5", "AGM (Month)": "n/a", Done: "5/8 done" },
    ]);
    const d = await discoverWorkbook(file);
    const col = (h: string) => d.sheets[0].columns.find((c) => c.header === h)!;
    expect(col("Year-End-date").patterns).toEqual({ "\u4e2d+9+\u4e2d9+\u4e2d": 1, "\u4e2d+9\u4e2d9+\u4e2d": 1 });
    expect(col("AGM (Month)").patterns).toEqual({ "A/A": 1, "a/a": 1 });
    expect(col("Done").patterns).toEqual({ "\u4e2d+": 1, "9/9 a+": 1 });
    const json = JSON.stringify(d);
    for (const secret of ["Queen Road", "X601", "\u4e0d\u7528\u958b\u6703", "5/8 done"]) expect(json).not.toContain(secret);
  });

  it("keeps only the twelve most common patterns in a column", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ CODE: `X7${String(i).padStart(2, "0")}`, "Company Name": "Any Limited", Remarks: `${"a".repeat(1)}${"-".repeat(i + 1)}b` }));
    const d = await discoverWorkbook(await workbook(dir, "dn-many-patterns.xlsx", HEADERS, rows));
    expect(Object.keys(d.sheets[0].columns.find((c) => c.header === "Remarks")!.patterns)).toHaveLength(12);
  });
});

describe("cells formatted as dates that are not dates", () => {
  // Found on the real workbook, 23 November: a cell formatted as a date can hold a number far outside
  // any calendar. It must be reported for staff to fix, never stop the whole read.
  async function withImpossibleDate() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("2026");
    ws.addRow(["CODE", "Company Name", "Debit Note Service Until", "Year-End-date", "Remarks"]);
    const bad = ws.addRow(["X501", "Peak Tram Limited", 1e12, 1e12, 1e12]);
    for (const c of [3, 4, 5]) bad.getCell(c).numFmt = "m/d/yyyy";
    ws.addRow(["X502", "Star Ferry Limited", new Date(Date.UTC(2026, 11, 31)), "12月31日", "fine"]).getCell(3).numFmt = "m/d/yyyy";
    const file = path.join(dir, "dn-impossible-date.xlsx");
    await wb.xlsx.writeFile(file);
    return file;
  }

  it("discovery counts them as invalid date cells and still reports the rest of the sheet", async () => {
    const sheet = (await discoverWorkbook(await withImpossibleDate())).sheets[0];
    const col = (h: string) => sheet.columns.find((c) => c.header === h)!;
    expect(sheet.dataRows).toBe(2);
    expect(col("Debit Note Service Until").shapes).toEqual({ "invalid date cell (m/d/yyyy)": 1, "date cell (m/d/yyyy)": 1 });
  });

  it("the reader reports each one against its row and column, leaves that field empty, and reads the other rows", async () => {
    const r = await readDnWorkbook(await withImpossibleDate());
    expect(r.rows.map((x) => x.code)).toEqual(["X501", "X502"]);
    expect(r.rows[0].yearEnd).toBeNull();
    expect(r.rows[1].yearEnd).toEqual({ month: 12, day: 31 });
    const bad = r.rows[0].problems;
    expect(bad.map((p) => p.field)).toContain("yearEnd");
    expect(bad.every((p) => p.row === 2 && p.error === "invalid date")).toBe(true);
    expect(r.rows[1].problems).toEqual([]);
  });
});

describe("formatting that carries meaning", () => {
  // Staff mark things in the DN workbook with strikethrough, coloured text, coloured cells and
  // hidden rows. Discovery reports how much of each there is, so the firm can say what each means
  // before the reader relies on a row. It never reports the cells' values.
  async function formatted() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("2026");
    ws.addRow(["CODE", "Company Name", "Remarks"]);
    const live = ws.addRow(["X401", "Live Secret Limited", "ok"]);
    live.getCell(3).font = { color: { argb: "FFFF0000" } };
    live.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
    live.getCell(3).note = "ask the client";
    const gone = ws.addRow(["X402", "Gone Secret Limited", "left in 2025"]);
    gone.eachCell((c) => { c.font = { strike: true }; });
    const part = ws.addRow(["X403", "Part Secret Limited", "old remark"]);
    part.getCell(3).font = { strike: true, color: { argb: "FFFF0000" } };
    const hidden = ws.addRow(["X404", "Hidden Secret Limited", null]);
    hidden.hidden = true;
    const file = path.join(dir, "dn-formatting.xlsx");
    await wb.xlsx.writeFile(file);
    return file;
  }

  it("counts struck-through cells by column, and rows where every filled cell is struck through", async () => {
    const sheet = (await discoverWorkbook(await formatted())).sheets[0];
    expect(sheet.formatting).toMatchObject({ struckCells: 4, struckRows: 1 });
    const col = (h: string) => sheet.columns.find((c) => c.header === h)!;
    expect(col("CODE").struck).toBe(1);
    expect(col("Remarks").struck).toBe(2);
  });

  it("counts text colours by column, so the colours staff put on the code and name can be told from colours elsewhere", async () => {
    const sheet = (await discoverWorkbook(await formatted())).sheets[0];
    const col = (h: string) => sheet.columns.find((c) => c.header === h)!;
    expect(col("Remarks").colours).toEqual({ "#FF0000": 2 });
    expect(col("CODE").colours).toBeUndefined();
  });

  it("counts the text colours and cell colours in use, leaving out plain black text", async () => {
    const sheet = (await discoverWorkbook(await formatted())).sheets[0];
    expect(sheet.formatting.fontColours).toEqual({ "#FF0000": 2 });
    expect(sheet.formatting.fillColours).toEqual({ "#FFFF00": 1 });
  });

  it("counts hidden rows and cell notes", async () => {
    const sheet = (await discoverWorkbook(await formatted())).sheets[0];
    expect(sheet.formatting).toMatchObject({ hiddenRows: 1, notes: 1 });
  });

  it("reports the formatting without any cell value or note text", async () => {
    const json = JSON.stringify(await discoverWorkbook(await formatted()));
    for (const secret of ["X402", "Gone Secret", "left in 2025", "ask the client"]) expect(json).not.toContain(secret);
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
