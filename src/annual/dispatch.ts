// Annual-return dates, Registry fees and the client dispatch email (UHY pilot brief, "The annual
// cycle"). Every date in the email comes from one computed record; fees come from playbook data;
// wording comes from the firm's template (the installation's DISPATCH_TEMPLATE). Statutory rules here
// need company-secretary verification.
import type { PlaybookDef } from "@/domain/playbook-types";
import type { Lang } from "@/db/schema";
import { addDays, addMonths, fmtDate } from "@/domain/dates";

export const RETURN_BUFFER_DAYS = 14;
/** When the buffer has already passed: give the client at least this long. */
export const MIN_RETURN_DAYS = 3;
/** After the deadline (late filing, higher fee): a week from today. */
export const OVERDUE_RETURN_DAYS = 7;
export const COMBINE_WINDOW_DAYS = 30;

export type ArDates = { madeUpDate: string; deadline: string; returnBy: string; chargesStatementDate: string };

/** The anniversary in `year` (29 February falls back to 28 February). */
export function anniversary(incorporatedOn: string, year: number): string {
  const md = incorporatedOn.slice(5);
  const d = `${year}-${md}`;
  return md === "02-29" && new Date(`${d}T00:00:00Z`).getUTCMonth() !== 1 ? `${year}-02-28` : d;
}

export function annualReturnDates(o: { incorporatedOn: string; year: number; playbook: PlaybookDef; returnBufferDays?: number; today?: string }): ArDates {
  const rule = o.playbook.deadline as { kind: string; days?: number };
  if (rule.kind !== "anniversary" || !rule.days) throw new Error("This playbook has no anniversary deadline");
  const madeUpDate = anniversary(o.incorporatedOn, o.year);
  const deadline = addDays(madeUpDate, rule.days);
  let returnBy = addDays(deadline, -(o.returnBufferDays ?? RETURN_BUFFER_DAYS));
  if (o.today && deadline < o.today) returnBy = addDays(o.today, OVERDUE_RETURN_DAYS);
  else if (o.today && returnBy < addDays(o.today, MIN_RETURN_DAYS)) returnBy = addDays(o.today, MIN_RETURN_DAYS) < deadline ? addDays(o.today, MIN_RETURN_DAYS) : deadline;
  if (returnBy <= madeUpDate) returnBy = addDays(madeUpDate, 1);
  const chargesStatementDate = addDays(`${madeUpDate.slice(0, 8)}01`, -1);
  return { madeUpDate, deadline, returnBy, chargesStatementDate };
}

/** Why a return-by date can't be used, or null. Rule pending company-secretary verification.
 *  After the deadline the return can still go (with the higher fee), so only "today or later" applies. */
export function checkReturnBy(d: ArDates, returnBy: string, today?: string): string | null {
  if (returnBy <= d.madeUpDate) return "The return-by date must be after the made-up date";
  if (today && returnBy < today) return "The return-by date must be today or later";
  if (returnBy > d.deadline && !(today && d.deadline < today)) return "The return-by date must be on or before the filing deadline";
  return null;
}

function bandEnd(madeUp: string, within: string): string {
  const m = /^(\d+)([dm])$/.exec(within);
  if (!m) throw new Error(`Unreadable fee band "${within}"`);
  return m[2] === "d" ? addDays(madeUp, Number(m[1])) : addMonths(madeUp, Number(m[1]));
}

export function registryFeeOn(pb: PlaybookDef, madeUpDate: string, deliveredOn: string): number {
  const bands = pb.registryFeeBands;
  if (!bands?.length) throw new Error(`Playbook ${pb.id} has no Registry fee bands`);
  for (const b of bands) if (b.within === null || deliveredOn <= bandEnd(madeUpDate, b.within)) return b.amountCents;
  return bands[bands.length - 1].amountCents;
}

export const maxRegistryFee = (pb: PlaybookDef) => Math.max(...(pb.registryFeeBands ?? []).map((b) => b.amountCents));

/** One email when the AGM falls due within the annual return's preparation window. */
export function shouldCombine(o: { arDeadline: string; agmDeadline: string | null; windowDays?: number }): boolean {
  if (!o.agmDeadline) return false;
  const w = o.windowDays ?? COMBINE_WINDOW_DAYS;
  return o.agmDeadline >= addDays(o.arDeadline, -w) && o.agmDeadline <= addDays(o.arDeadline, w);
}

export type DispatchTemplate = Record<Lang, Record<string, string>>;
export type DispatchInput = {
  /** Today in Hong Kong, for the return-by checks. */
  today?: string;
  lang: Lang; template: DispatchTemplate | Record<string, unknown>; salutation: string; companyName: string; year: number;
  dates: ArDates; returnBy: string; signer: { name: string; page: number };
  standardFeeCents: number; maxFeeCents: number; firmAddress: string;
  agm: { directors: number; members: number; corporateMembers: number } | null;
  cddItems: { person: string; items: string[] }[];
};

const money = (cents: number) => `HK$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function buildDispatchEmail(i: DispatchInput): { subject: string; text: string } {
  const problem = checkReturnBy(i.dates, i.returnBy, i.today);
  if (problem) throw new Error(problem);
  const t = (i.template as DispatchTemplate)[i.lang];
  if (!t) throw new Error(`The email template has no ${i.lang} wording`);
  const v: Record<string, string> = {
    company: i.companyName, year: String(i.year), salutation: i.salutation, signer: i.signer.name, page: String(i.signer.page),
    madeUpDate: fmtDate(i.dates.madeUpDate, i.lang), returnBy: fmtDate(i.returnBy, i.lang), statementDate: fmtDate(i.dates.chargesStatementDate, i.lang),
    maxFee: money(i.maxFeeCents), standardFee: money(i.standardFeeCents), firmAddress: i.firmAddress,
  };
  const f = (k: string) => {
    const s = t[k];
    if (s === undefined) throw new Error(`The email template is missing "${k}"`);
    return s.replace(/\{(\w+)\}/g, (_, n: string) => { if (!(n in v)) throw new Error(`Unknown template field {${n}}`); return v[n]; });
  };
  const out = [f("greeting"), "", f("intro"), "", f("arHeading"), f("arBody"), "", f("charges"), "", f("changes")];
  if (i.agm) {
    const enc = [i.agm.directors > 1 ? f("directorsMany") : f("directorsSole"), i.agm.members > 1 ? f("membersMany") : f("membersSole")];
    if (i.agm.corporateMembers > 0) enc.push(i.agm.corporateMembers > 1 ? f("authLetters") : f("authLetter"));
    out.push("", f("agmHeading"), f("agmBody"), "");
    enc.forEach((e, n) => out.push(`${n + 1}. ${e}`, f("signHere"), ""));
    out.push(f("agmNote"));
  }
  if (i.cddItems.length) {
    out.push("", f("cddHeading"), f("cddIntro"));
    for (const c of i.cddItems) out.push(`- ${c.person}: ${c.items.join("; ")}`);
  }
  out.push("", f("closing"));
  return { subject: f(i.agm ? "subjectArAgm" : "subjectAr"), text: out.join("\n") };
}
