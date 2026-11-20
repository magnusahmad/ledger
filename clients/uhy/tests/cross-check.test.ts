// UHY keeps each client company in two places, CSA and its DN workbook. Where they disagree on the
// year end, where DN's AGM month falls after the AGM deadline, or where a company is in one and not
// the other, staff are shown the difference; nothing is resolved silently or filled in from the
// other source. Deadlines come from playbook data (seed/playbooks/hk.json).
import { describe, it, expect } from "vitest";
import hk from "../../../seed/playbooks/hk.json";
import type { PlaybookDef } from "@/domain/playbook-types";
import type { CalendarPlaybooks } from "@/annual/calendar";
import { crossCheckCsaDn } from "../src/cross-check";

const pbs = hk as unknown as PlaybookDef[];
const byId = (id: string) => pbs.find((p) => p.id === id)!;
const playbooks: CalendarPlaybooks = { annualReturn: byId("hk.annualReturn"), nonHkAnnualReturn: byId("hk.nonHkAnnualReturn"), agm: byId("hk.agm") };

describe("CSA and DN cross-check", () => {
  const csa = (o: Partial<{ code: string; nameEn: string; fyeMonth: number | null; fyeDay: number | null }> = {}) => ({ code: "X101", nameEn: "Harbour Lantern Limited", fyeMonth: 12, fyeDay: 31, companyType: "private" as const, ...o });
  const dn = (o: Partial<{ code: string; nameEn: string; yearEnd: { month: number; day: number } | null; agmMonth: number | null; requiredAfs: string | null }> = {}) => ({ code: "X101", nameEn: "Harbour Lantern Limited", yearEnd: { month: 12, day: 31 }, agmMonth: 9, requiredAfs: null, ...o });

  it("matching year ends raise nothing", () => {
    expect(crossCheckCsaDn([csa()], [dn()], playbooks)).toEqual([]);
  });

  it("a year end that differs between CSA and DN is flagged for staff", () => {
    const d = crossCheckCsaDn([csa()], [dn({ yearEnd: { month: 3, day: 31 } })], playbooks);
    expect(d).toEqual([expect.objectContaining({ code: "X101", field: "yearEnd", csa: "31 December", dn: "31 March" })]);
  });

  it("a year end missing on one side is flagged, not filled in from the other", () => {
    expect(crossCheckCsaDn([csa({ fyeMonth: null, fyeDay: null })], [dn()], playbooks)).toEqual([expect.objectContaining({ field: "yearEnd", csa: null, dn: "31 December" })]);
  });

  it("an AGM month in DN after the AGM deadline is flagged", () => {
    expect(crossCheckCsaDn([csa()], [dn({ agmMonth: 11 })], playbooks)).toEqual([expect.objectContaining({ field: "agmMonth", dn: "November" })]);
  });

  it("a required AFS on the DN year end raises nothing", () => {
    expect(crossCheckCsaDn([csa()], [dn({ requiredAfs: "2025-12-31" })], playbooks)).toEqual([]);
  });

  it("a required AFS that isn't on the year end is flagged, since it should name the accounts for that year end", () => {
    expect(crossCheckCsaDn([csa()], [dn({ requiredAfs: "2025-03-31" })], playbooks)).toEqual([expect.objectContaining({ field: "requiredAfs", csa: "31 December", dn: "31 March 2025" })]);
  });

  it("a company in CSA but not DN, or in DN but not CSA, is listed", () => {
    const d = crossCheckCsaDn([csa(), csa({ code: "X999" })], [dn(), dn({ code: "X555" })], playbooks);
    expect(d.map((x) => `${x.code} ${x.field}`).sort()).toEqual(["X555 missingInCsa", "X999 missingInDn"]);
  });

  it("codes are matched ignoring case and spaces", () => {
    expect(crossCheckCsaDn([csa({ code: "x101 " })], [dn()], playbooks)).toEqual([]);
  });
});
