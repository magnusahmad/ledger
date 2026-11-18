// Annual-return and AGM deadlines for one company, from playbook data (seed/playbooks/hk.json).
// The annual return runs from the incorporation anniversary (NAR1) or, for a registered non-Hong
// Kong company, the anniversary of its registration in Hong Kong (NN3); the AGM runs from the year
// end. They are separate deadlines. Company types the playbooks don't cover get no date and a
// reason, never a borrowed rule. All statutory rules need company-secretary verification.
import type { PlaybookDef } from "@/domain/playbook-types";
import { addDays, addMonths } from "@/domain/dates";
import { anniversary } from "./dispatch";

export type CompanyType = "private" | "public" | "guarantee" | "non_hk";
export type CalendarPlaybooks = { annualReturn: PlaybookDef; nonHkAnnualReturn: PlaybookDef; agm: PlaybookDef };
export type ArDue =
  | { ok: true; form: string; madeUpDate: string; dueDate: string; playbookId: string; rule: string }
  | { ok: false; reason: string };
export type AgmDue = { ok: true; periodEnd: string; dueDate: string; playbookId: string; rule: string } | { ok: false; reason: string };

/** Annual return for the anniversary falling in `year`. */
export function annualReturnDue(c: { companyType: CompanyType; incorporatedOn: string | null; registeredOn?: string | null }, year: number, pbs: CalendarPlaybooks): ArDue {
  let pb: PlaybookDef, from: string | null | undefined;
  if (c.companyType === "private") { pb = pbs.annualReturn; from = c.incorporatedOn; if (!from) return { ok: false, reason: "No incorporation date; CSA should hold it." }; }
  else if (c.companyType === "non_hk") { pb = pbs.nonHkAnnualReturn; from = c.registeredOn; if (!from) return { ok: false, reason: "A registered non-Hong Kong company files NN3 from its Hong Kong registration date, which is not recorded." }; }
  else return { ok: false, reason: `No annual-return rule for a ${c.companyType} company in the playbooks; work it out by hand.` };
  const rule = pb.deadline;
  if (rule.kind !== "anniversary") return { ok: false, reason: `Playbook ${pb.id} has no anniversary deadline.` };
  if (Number(from.slice(0, 4)) >= year) return { ok: false, reason: `No anniversary in ${year}.` };
  const madeUpDate = anniversary(from, year);
  return { ok: true, form: pb.forms ?? "", madeUpDate, dueDate: addDays(madeUpDate, rule.days), playbookId: pb.id, rule: rule.rule };
}

/** AGM for the financial year ending in `year`. */
export function agmDue(c: { companyType: CompanyType; yearEnd: { month: number; day: number } | null }, year: number, pbs: CalendarPlaybooks): AgmDue {
  if (c.companyType !== "private") return { ok: false, reason: c.companyType === "non_hk" ? "A registered non-Hong Kong company holds no Hong Kong AGM." : `No AGM rule for a ${c.companyType} company in the playbooks; work it out by hand.` };
  if (!c.yearEnd) return { ok: false, reason: "No year end recorded." };
  const rule = pbs.agm.deadline;
  if (rule.kind !== "fye") return { ok: false, reason: `Playbook ${pbs.agm.id} has no year-end deadline.` };
  const last = new Date(Date.UTC(year, c.yearEnd.month, 0)).getUTCDate();
  const periodEnd = `${year}-${String(c.yearEnd.month).padStart(2, "0")}-${String(Math.min(c.yearEnd.day, last)).padStart(2, "0")}`;
  // Same day N months later, clamped to the month's last day (31 December + 9 months = 30 September),
  // as the deadline engine does. Whether 30 June gives 30 or 31 March is for the company secretary.
  const dueDate = addMonths(periodEnd, rule.months);
  return { ok: true, periodEnd, dueDate, playbookId: pbs.agm.id, rule: rule.rule };
}
