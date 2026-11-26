// What staff see of the client-list report (client-list.ts): one section per kind of difference,
// most consequential first, each saying which source Clerk is using so staff know what is already in
// effect and which source to correct.
import type { ClientListDifference, ClientListReport } from "./client-list";

export type DifferenceRow = { code: string; name: string; detail: string };
export type DifferenceSection = { title: string; note: string; rows: DifferenceRow[] };
export type DifferencesView = {
  sections: DifferenceSection[];
  /** Differences staff are asked to look at. */
  total: number;
  /** Current clients the list holds and the records do not: counted, since an installation may take only some companies from its records. */
  onlyInList: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}` : d ?? "none");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** `records` is what staff call the records system ("CSA"); the list's name comes from its report. */
export function differencesView(r: ClientListReport, records: string): DifferencesView {
  const list = r.label, short = cap(r.label.replace(/^the\s+/i, ""));
  const of = (k: ClientListDifference["kind"]) => r.differences.filter((d) => d.kind === k).sort((a, b) => a.code.localeCompare(b.code));
  const row = (d: ClientListDifference, detail: string): DifferenceRow => ({ code: d.code, name: d.nameEn ?? "", detail });
  const sections: DifferenceSection[] = [
    { title: `Not a current client in ${list}`, note: "Clerk opens no annual return or AGM for these.", rows: of("leftOut").map((d) => row(d, cap(d.list ?? "left out"))) },
    { title: "Year end differs", note: `Clerk is using ${list}'s.`, rows: of("yearEnd").map((d) => row(d, `${records} ${d.records} · ${short} ${d.list}`)) },
    { title: "Incorporation date differs", note: `Clerk is using ${records}'s.`, rows: of("incorporatedOn").map((d) => row(d, `${records} ${day(d.records)} · ${short} ${day(d.list)}`)) },
    { title: "Same code, different name", note: `Clerk has taken nothing from ${list} for these.`, rows: of("nameMismatch").map((d) => row(d, `${short}: ${d.list}`)) },
    { title: `In ${records}, not in ${list}`, note: "", rows: of("notInList").map((d) => row(d, "")) },
  ].filter((s) => s.rows.length);
  const total = sections.reduce((n, s) => n + s.rows.length, 0);
  if (r.problems.length) sections.push({ title: "Could not be read", note: "", rows: r.problems.map((p) => ({ code: "", name: p, detail: "" })) });
  return { sections, total, onlyInList: r.differences.filter((d) => d.kind === "notInRecords").length };
}
