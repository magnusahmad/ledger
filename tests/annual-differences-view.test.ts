// The page where staff see what the firm's client list and the records system disagree on
// (src/annual/client-list.ts). Each difference says which source Clerk is using, so staff know what
// is already in effect and which source to correct.
import { describe, it, expect } from "vitest";
import { differencesView } from "@/annual/client-list-view";
import type { ClientListReport } from "@/annual/client-list";

const report = (o: Partial<ClientListReport> = {}): ClientListReport => ({
  label: "the DN workbook", version: "v1", appliedAt: "2026-11-26T04:07:02.170Z",
  counts: { entries: 10, live: 6, leftOut: 4, matched: 5, yearEndsFilled: 2, contactsAdded: 3 }, problems: [], differences: [], ...o,
});

describe("differences between the records and the firm's client list", () => {
  it("each kind of difference is its own section, most consequential first, saying which source Clerk is using", () => {
    const v = differencesView(report({ differences: [
      { code: "D004", nameEn: "Delta Limited", kind: "notInList", records: "Delta Limited", list: null },
      { code: "B002", nameEn: "Beta Limited", kind: "yearEnd", records: "31 December", list: "31 March" },
      { code: "A001K", nameEn: "Alpha Limited", kind: "leftOut", records: "current", list: "struck through" },
    ] }), "CSA");
    expect(v.sections.map((s) => s.title)).toEqual(["Not a current client in the DN workbook", "Year end differs", "In CSA, not in the DN workbook"]);
    expect(v.sections[0]).toMatchObject({ note: "Clerk opens no annual return or AGM for these.", rows: [{ code: "A001K", name: "Alpha Limited", detail: "Struck through" }] });
    expect(v.sections[1]).toMatchObject({ note: "Clerk is using the DN workbook's.", rows: [{ code: "B002", name: "Beta Limited", detail: "CSA 31 December · DN workbook 31 March" }] });
    expect(v.total).toBe(3);
  });

  it("a code that matches under a different name shows both names, and says nothing was taken", () => {
    const v = differencesView(report({ differences: [{ code: "C003T", nameEn: "Gamma Limited", kind: "nameMismatch", records: "Gamma Limited", list: "Gamma Trading Limited" }] }), "CSA");
    expect(v.sections[0]).toMatchObject({ title: "Same code, different name", note: "Clerk has taken nothing from the DN workbook for these.", rows: [{ code: "C003T", name: "Gamma Limited", detail: "DN workbook: Gamma Trading Limited" }] });
  });

  it("an incorporation date that differs shows both dates, and Clerk keeps the records' one", () => {
    const v = differencesView(report({ differences: [{ code: "A001", nameEn: "Alpha Limited", kind: "incorporatedOn", records: "2015-11-20", list: "2015-11-02" }] }), "CSA");
    expect(v.sections[0]).toMatchObject({ note: "Clerk is using CSA's.", rows: [{ detail: "CSA 20 Nov 2015 · DN workbook 2 Nov 2015" }] });
  });

  it("clients the list holds and the records do not are counted, not listed", () => {
    const v = differencesView(report({ differences: [{ code: "Z999", nameEn: "Offshore Limited", kind: "notInRecords", records: null, list: "Offshore Limited" }] }), "CSA");
    expect(v.sections).toEqual([]);
    expect(v.total).toBe(0);
    expect(v.onlyInList).toBe(1);
  });

  it("what could not be read from the list is shown last, in the reader's own words", () => {
    const v = differencesView(report({ problems: ["The DN workbook has one client code on rows 2 and 3."] }), "CSA");
    expect(v.sections).toEqual([{ title: "Could not be read", note: "", rows: [{ code: "", name: "The DN workbook has one client code on rows 2 and 3.", detail: "" }] }]);
  });

  it("rows are in client-code order within a section", () => {
    const v = differencesView(report({ differences: ["C3", "A1", "B2"].map((code) => ({ code, nameEn: `${code} Limited`, kind: "notInList" as const, records: null, list: null })) }), "CSA");
    expect(v.sections[0].rows.map((r) => r.code)).toEqual(["A1", "B2", "C3"]);
  });
});
