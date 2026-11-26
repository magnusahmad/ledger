// The list UHY's staff are asked to check: every place Clerk found CSA and the workbooks disagreeing,
// and every annual return CSA does not show as made, as one plain message. Fictional companies.
import { describe, it, expect } from "vitest";
import { reviewMessage, type ReviewInput } from "../src/review";

const input = (o: Partial<ReviewInput> = {}): ReviewInput => ({ asAt: "2026-11-26", recordsAsAt: "2026-11-25", differences: [], overdue: [], noAgmMonth: [], problems: [], suffixes: {}, ...o });

describe("the review list for UHY's staff", () => {
  it("each company appears with its code, its name and what does not line up", () => {
    const m = reviewMessage(input({
      differences: [
        { code: "A001K", nameEn: "Alpha Limited", kind: "leftOut", records: "current", list: "struck" },
        { code: "B002", nameEn: "Beta Limited", kind: "yearEnd", records: "31 December", list: "31 March" },
        { code: "C003T", nameEn: "Gamma Limited", kind: "nameMismatch", records: "Gamma Limited", list: "Gamma Trading Limited" },
        { code: "D004", nameEn: "Delta Limited", kind: "notInList", records: "Delta Limited", list: null },
      ],
      overdue: [{ code: "E005", nameEn: "Epsilon Limited", periodYear: 2026, dueDate: "2026-10-12", lastReturnOn: "2025-08-31" }],
    }));
    expect(m).toContain("A001K  Alpha Limited: struck through in the DN workbook");
    expect(m).toContain("B002  Beta Limited: CSA says 31 December, the DN workbook says 31 March");
    expect(m).toContain("C003T  CSA: Gamma Limited / DN workbook: Gamma Trading Limited");
    expect(m).toContain("D004  Delta Limited");
    expect(m).toContain("E005  Epsilon Limited: 2026 return was due 12 October 2026; CSA's last return is dated 31 August 2025");
  });

  it("current clients with neither an AGM month nor a reason for having none are listed, so staff can fill one in", () => {
    const m = reviewMessage(input({ noAgmMonth: [{ code: "F006", nameEn: "Zeta Limited" }, { code: "B001", nameEn: "Beta Limited" }] }));
    expect(m).toMatch(/Current clients with no AGM month \(2\)/);
    expect(m.indexOf("B001  Beta Limited")).toBeLessThan(m.indexOf("F006  Zeta Limited"));
  });

  it("a section with nothing in it is left out, and the sections are numbered in order", () => {
    const m = reviewMessage(input({ differences: [{ code: "B002", nameEn: "Beta Limited", kind: "yearEnd", records: "31 December", list: "31 March" }] }));
    expect(m).toMatch(/^1\. Year end differs/m);
    expect(m).not.toMatch(/Annual returns CSA does not show/);
  });

  it("companies the workbook holds and Clerk does not are not listed, since Clerk only takes private Hong Kong companies from CSA", () => {
    const m = reviewMessage(input({ differences: [{ code: "Z999", nameEn: "Offshore Limited", kind: "notInRecords", records: null, list: "Offshore Limited" }] }));
    expect(m).not.toContain("Z999");
  });

  it("asks what the letters CSA adds to a client code stand for, with how often each is used", () => {
    expect(reviewMessage(input({ suffixes: { K: 40, T: 30, UK: 5 } }))).toContain("K (40), T (30), UK (5)");
  });
});
