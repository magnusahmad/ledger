// Annual-return dates, Registry fees and the dispatch email (UHY pilot brief, "The annual cycle").
// UHY's sample email gave three different dates for one made-up date; every date here comes
// from one computed record, and fees come from playbook data, not code.
import { describe, it, expect } from "vitest";
import hk from "../seed/playbooks/hk.json";
import type { PlaybookDef } from "@/domain/playbook-types";
import { annualReturnDates, checkReturnBy, registryFeeOn, maxRegistryFee, shouldCombine, buildDispatchEmail, type DispatchInput } from "@/annual/dispatch";

const ar = (hk as unknown as PlaybookDef[]).find((p) => p.id === "hk.annualReturn")!;
const template = (await import("../seed/uhy/dispatch-template.json")).default;

describe("annual-return dates", () => {
  it("the made-up date is the incorporation anniversary and the deadline 42 days later, from playbook data", () => {
    const d = annualReturnDates({ incorporatedOn: "2017-10-10", year: 2026, playbook: ar });
    expect(d.madeUpDate).toBe("2026-10-10");
    expect(d.deadline).toBe("2026-11-21");
  });

  it("the default return-by date is 14 days before the deadline", () => {
    const d = annualReturnDates({ incorporatedOn: "2017-10-10", year: 2026, playbook: ar });
    expect(d.returnBy).toBe("2026-11-07");
  });

  it("the bank-statement date for the charges question is the last month end before the made-up date", () => {
    expect(annualReturnDates({ incorporatedOn: "2011-09-11", year: 2026, playbook: ar }).chargesStatementDate).toBe("2026-08-31");
  });

  it("a return-by date on or before the made-up date, or after the deadline, is refused", () => {
    const d = annualReturnDates({ incorporatedOn: "2017-10-10", year: 2026, playbook: ar });
    expect(checkReturnBy(d, "2026-10-10")).toMatch(/after the made-up date/);
    expect(checkReturnBy(d, "2026-11-22")).toMatch(/before the filing deadline/);
    expect(checkReturnBy(d, "2026-11-01")).toBeNull();
  });
});

describe("Registry fees from playbook data", () => {
  it("the fee depends on how long after the anniversary the return is delivered", () => {
    expect(registryFeeOn(ar, "2026-10-10", "2026-11-21")).toBe(10500);
    expect(registryFeeOn(ar, "2026-10-10", "2026-11-22")).toBe(87000);
    expect(registryFeeOn(ar, "2026-10-10", "2027-02-11")).toBe(174000);
    expect(registryFeeOn(ar, "2026-10-10", "2027-04-11")).toBe(348000);
  });

  it("the late-fee warning quotes the highest band", () => {
    expect(maxRegistryFee(ar)).toBe(348000);
  });
});

describe("combining the annual return and AGM", () => {
  it("they go in one email when the AGM falls due within the annual return's preparation window", () => {
    expect(shouldCombine({ arDeadline: "2026-11-21", agmDeadline: "2026-12-10" })).toBe(true);
    expect(shouldCombine({ arDeadline: "2026-11-21", agmDeadline: "2027-03-31" })).toBe(false);
    expect(shouldCombine({ arDeadline: "2026-11-21", agmDeadline: null })).toBe(false);
  });
});

function input(over: Partial<DispatchInput> = {}): DispatchInput {
  const dates = annualReturnDates({ incorporatedOn: "2017-10-10", year: 2026, playbook: ar });
  return {
    lang: "en", template, salutation: "Ms Chan", companyName: "Fictional Trading Limited", year: 2026, dates, returnBy: dates.returnBy,
    signer: { name: "CHAN Tai Man", page: 8 }, standardFeeCents: 10500, maxFeeCents: 348000,
    firmAddress: "Suite 1, 1/F, Example Tower, 1 Example Road, Kowloon, Hong Kong",
    agm: null, cddItems: [], ...over,
  };
}

describe("dispatch email", () => {
  it("the made-up date is written once, the same way, wherever it appears", () => {
    const e = buildDispatchEmail(input());
    expect(e.text.match(/10 October 2026/g)?.length).toBe(2);
    expect(e.text).toContain("7 November 2026");
    expect(e.text).toContain("30 September 2026"); // statement date: month end before the made-up date
    expect(e.text).not.toMatch(/\b(11|17) (September|October) 2026\b/);
  });

  it("fees in the email come from the input, never hard-coded", () => {
    const e = buildDispatchEmail(input({ standardFeeCents: 10500, maxFeeCents: 348000 }));
    expect(e.text).toContain("HK$3,480.00");
    expect(e.text).toContain("HK$105.00");
  });

  it("an invalid return-by date stops the draft", () => {
    expect(() => buildDispatchEmail(input({ returnBy: "2026-10-09" }))).toThrow(/after the made-up date/);
  });

  it("the AGM section appears only when the AGM goes in the same email", () => {
    expect(buildDispatchEmail(input()).text).not.toContain("Annual General Meeting");
    const both = buildDispatchEmail(input({ agm: { directors: 1, members: 1, corporateMembers: 0 } }));
    expect(both.text).toContain("in lieu of an Annual General Meeting");
    expect(both.subject).toMatch(/Annual Return and AGM/);
  });

  it("sole versus plural director and member wording follows the counts", () => {
    const sole = buildDispatchEmail(input({ agm: { directors: 1, members: 1, corporateMembers: 0 } })).text;
    expect(sole).toContain("Written Resolutions of the Sole Director");
    expect(sole).toContain("Written Resolutions of the Sole Member");
    const many = buildDispatchEmail(input({ agm: { directors: 3, members: 2, corporateMembers: 0 } })).text;
    expect(many).toContain("Written Resolutions of the Directors");
    expect(many).toContain("Written Resolutions of the Members");
  });

  it("an authorisation letter is listed only when a member is a corporation, and enclosures are numbered in order", () => {
    expect(buildDispatchEmail(input({ agm: { directors: 1, members: 1, corporateMembers: 0 } })).text).not.toContain("Authorization letter");
    const t = buildDispatchEmail(input({ agm: { directors: 1, members: 1, corporateMembers: 1 } })).text;
    expect(t).toMatch(/1\. Written Resolutions of the Sole Director[\s\S]*2\. Written Resolutions of the Sole Member[\s\S]*3\. Authorization letter/);
  });

  it("outstanding CDD items are added only for flagged companies", () => {
    expect(buildDispatchEmail(input()).text).not.toMatch(/proof of address/i);
    const t = buildDispatchEmail(input({ cddItems: [{ person: "CHAN Tai Man", items: ["passport or HKID", "proof of address issued within the last 3 months"] }] })).text;
    expect(t).toContain("CHAN Tai Man");
    expect(t).toMatch(/proof of address issued within the last 3 months/);
  });

  it("the email is written in the contact's language", () => {
    const tc = buildDispatchEmail(input({ lang: "tc" }));
    expect(tc.text).toContain("周年申報表");
    expect(tc.text).toContain("2026年10月10日");
    const sc = buildDispatchEmail(input({ lang: "sc" }));
    expect(sc.text).toContain("周年申报表");
  });
});
