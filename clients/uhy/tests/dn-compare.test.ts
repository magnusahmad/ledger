// UHY keeps two copies of its client workbook: the DN workbook, and a copy made from it where AGMs are
// tracked. The comparison matches companies by client code and counts, field by field, where the two
// agree. It reports row numbers and counts only, never a cell's value, so its output can leave the
// firm's machine. The companies here are fictional.
import { describe, it, expect } from "vitest";
import { compareDn } from "../src/dn-compare";
import type { DnRow } from "../src/dn";

const row = (o: Partial<DnRow> & { row: number; code: string }): DnRow => ({
  nameEn: `${o.code} Limited`, struck: false, textColour: null, excluded: null, yearEnd: null, agmMonth: null, incorporatedOn: null,
  lastAgmDate: null, requiredAfs: null, agmDone: null, engagementLetter: null, ddForm: null, contactEmails: [], noAgm: null, notes: {}, problems: [], ...o,
} as DnRow);

describe("comparing the DN workbook with the AGM workbook", () => {
  it("a company is matched between the two workbooks by its code, whatever row it is on", () => {
    const c = compareDn([row({ row: 2, code: "X101" }), row({ row: 3, code: "X102" })], [row({ row: 9, code: "X102" }), row({ row: 4, code: "X101" }), row({ row: 5, code: "X103" })]);
    expect(c.codes).toEqual({ inBoth: 2, onlyInFirst: 0, onlyInSecond: 1, duplicated: 0 });
    expect(c.fields.nameEn).toMatchObject({ same: 2, differ: 0 });
  });

  it("a code that appears twice in either workbook is not matched to anything, and is counted", () => {
    const c = compareDn([row({ row: 2, code: "X101" }), row({ row: 3, code: "X101" }), row({ row: 4, code: "X102" })], [row({ row: 2, code: "X101" }), row({ row: 3, code: "X102" })]);
    expect(c.codes).toEqual({ inBoth: 1, onlyInFirst: 0, onlyInSecond: 0, duplicated: 1 });
  });

  it("a company that is live in one workbook and left out of the other is listed by its row in each", () => {
    const c = compareDn(
      [row({ row: 2, code: "X101" }), row({ row: 3, code: "X102", excluded: "struck" }), row({ row: 4, code: "X103", excluded: "red" })],
      [row({ row: 7, code: "X101", excluded: "blue" }), row({ row: 8, code: "X102" }), row({ row: 9, code: "X103", excluded: "struck" })],
    );
    // Left out of both for different reasons is not a disagreement about who is a client.
    expect(c.live).toEqual({ inBoth: 0, leftOutOfBoth: 1, liveInFirstOnly: [[2, 7]], liveInSecondOnly: [[3, 8]] });
  });

  it("a field that differs is counted and listed by row, never by value", () => {
    const c = compareDn(
      [row({ row: 2, code: "X101", agmMonth: 5, yearEnd: { month: 12, day: 31 } }), row({ row: 3, code: "X102", agmMonth: 6 }), row({ row: 4, code: "X103" })],
      [row({ row: 2, code: "X101", agmMonth: 5, yearEnd: { month: 3, day: 31 } }), row({ row: 3, code: "X102" }), row({ row: 4, code: "X103", agmMonth: 9 })],
    );
    expect(c.fields.agmMonth).toEqual({ same: 1, differ: 0, onlyInFirst: 1, onlyInSecond: 1, emptyInBoth: 0, differRows: [] });
    expect(c.fields.yearEnd).toEqual({ same: 0, differ: 1, onlyInFirst: 0, onlyInSecond: 0, emptyInBoth: 2, differRows: [[2, 2]] });
    expect(JSON.stringify(c)).not.toMatch(/X10\d|Limited/);
  });

  it("a blank tick or tracker cell is empty, so a step ticked in one workbook only is counted as only in that one", () => {
    const blank = { tick: "not_recorded" as const, date: null };
    const c = compareDn(
      [row({ row: 2, code: "X101", agmDone: { tick: "yes", date: "2026-05-04" }, ddForm: "yes" }), row({ row: 3, code: "X102", agmDone: blank, ddForm: "not_recorded" })],
      [row({ row: 2, code: "X101", agmDone: blank, ddForm: "not_recorded" }), row({ row: 3, code: "X102", agmDone: blank, ddForm: "not_recorded" })],
    );
    expect(c.fields.agmDone).toMatchObject({ onlyInFirst: 1, emptyInBoth: 1, differ: 0 });
    expect(c.fields.ddForm).toMatchObject({ onlyInFirst: 1, emptyInBoth: 1, differ: 0 });
  });

  it("contact emails in a different order or case, and a name with different spacing or case, are the same", () => {
    const c = compareDn(
      [row({ row: 2, code: "X101", nameEn: "Harbour  Lantern Limited", contactEmails: ["a@example.com", "B@example.com"] })],
      [row({ row: 2, code: "X101", nameEn: "HARBOUR LANTERN LIMITED", contactEmails: ["b@example.com", "A@example.com"] })],
    );
    expect(c.fields.nameEn.same).toBe(1);
    expect(c.fields.contactEmails.same).toBe(1);
  });
});
