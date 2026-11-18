// Annual-return and AGM deadlines for the UHY pilot, from playbook data (seed/playbooks/hk.json),
// and the CSA/DN cross-check. The annual return runs from the incorporation anniversary and the AGM
// from the year end: two separate deadlines that coincide only by chance. Statutory rules still
// need company-secretary verification; these tests protect that the code follows the data.
import { describe, it, expect } from "vitest";
import hk from "../seed/playbooks/hk.json";
import type { PlaybookDef } from "@/domain/playbook-types";
import { annualReturnDue, agmDue, type CalendarPlaybooks } from "@/annual/calendar";
import { crossCheckCsaDn } from "@/annual/cross-check";

const pbs = hk as unknown as PlaybookDef[];
const byId = (id: string) => pbs.find((p) => p.id === id)!;
const playbooks: CalendarPlaybooks = { annualReturn: byId("hk.annualReturn"), nonHkAnnualReturn: byId("hk.nonHkAnnualReturn"), agm: byId("hk.agm") };

describe("annual return", () => {
  it("an annual return made up to the incorporation anniversary is due 42 days later, from playbook data", () => {
    expect(annualReturnDue({ companyType: "private", incorporatedOn: "2017-10-10" }, 2026, playbooks)).toMatchObject({ ok: true, form: "NAR1", madeUpDate: "2026-10-10", dueDate: "2026-11-21", playbookId: "hk.annualReturn" });
  });

  it("the annual-return period comes from the playbook, so changing the data changes the date", () => {
    const edited = { ...playbooks, annualReturn: { ...playbooks.annualReturn, deadline: { kind: "anniversary" as const, days: 30, rule: "test" } } };
    expect(annualReturnDue({ companyType: "private", incorporatedOn: "2017-10-10" }, 2026, edited)).toMatchObject({ dueDate: "2026-11-09" });
  });

  it("a company incorporated on 29 February makes up its return to 28 February in other years", () => {
    expect(annualReturnDue({ companyType: "private", incorporatedOn: "2016-02-29" }, 2026, playbooks)).toMatchObject({ madeUpDate: "2026-02-28", dueDate: "2026-04-11" });
  });

  it("a registered non-Hong Kong company gets an NN3 deadline from its registration anniversary", () => {
    const r = annualReturnDue({ companyType: "non_hk", incorporatedOn: "1998-05-01", registeredOn: "2015-06-15" }, 2026, playbooks);
    expect(r).toMatchObject({ ok: true, form: "NN3", madeUpDate: "2026-06-15", dueDate: "2026-07-27", playbookId: "hk.nonHkAnnualReturn" });
  });

  it("a non-Hong Kong company without a registration date gets no deadline rather than one from its overseas incorporation", () => {
    const r = annualReturnDue({ companyType: "non_hk", incorporatedOn: "1998-05-01", registeredOn: null }, 2026, playbooks);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/registration date/);
  });

  it("a company with no incorporation date gets no deadline and says why", () => {
    const r = annualReturnDue({ companyType: "private", incorporatedOn: null }, 2026, playbooks);
    expect(r).toMatchObject({ ok: false });
  });

  it("a public or guarantee company is not given the private-company deadline", () => {
    expect(annualReturnDue({ companyType: "public", incorporatedOn: "2017-10-10" }, 2026, playbooks).ok).toBe(false);
    expect(annualReturnDue({ companyType: "guarantee", incorporatedOn: "2017-10-10" }, 2026, playbooks).ok).toBe(false);
  });

  it("the NN3 playbook carries its own deadline rule and on-time registry fee", () => {
    const nn3 = playbooks.nonHkAnnualReturn;
    expect(nn3.forms).toBe("NN3");
    expect(nn3.deadline).toMatchObject({ kind: "anniversary", days: 42 });
    expect(nn3.statutoryFees?.[0].amountCents).toBeGreaterThan(0);
    expect(nn3.verifyNote).toMatch(/verify/i);
  });
});

describe("AGM", () => {
  it("an AGM for a 31 December year end is due by 30 September, from playbook data", () => {
    expect(agmDue({ companyType: "private", yearEnd: { month: 12, day: 31 } }, 2025, playbooks)).toMatchObject({ ok: true, periodEnd: "2025-12-31", dueDate: "2026-09-30", playbookId: "hk.agm" });
  });

  it("an AGM for a 31 March year end is due by 31 December", () => {
    expect(agmDue({ companyType: "private", yearEnd: { month: 3, day: 31 } }, 2026, playbooks)).toMatchObject({ periodEnd: "2026-03-31", dueDate: "2026-12-31" });
  });

  it("the annual return and AGM are separate deadlines", () => {
    const c = { companyType: "private" as const, incorporatedOn: "2017-10-10", yearEnd: { month: 12, day: 31 } };
    const ar = annualReturnDue(c, 2026, playbooks);
    const agm = agmDue(c, 2025, playbooks);
    expect(ar.ok && agm.ok && ar.dueDate !== agm.dueDate).toBe(true);
  });

  it("a company without a year end gets no AGM deadline", () => {
    expect(agmDue({ companyType: "private", yearEnd: null }, 2025, playbooks).ok).toBe(false);
  });

  it("a registered non-Hong Kong company gets no Hong Kong AGM deadline", () => {
    expect(agmDue({ companyType: "non_hk", yearEnd: { month: 12, day: 31 } }, 2025, playbooks).ok).toBe(false);
  });
});

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
