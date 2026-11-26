// One plain message for UHY's staff: every place Clerk found CSA and the workbooks disagreeing, and
// every annual return CSA does not show as made. Built from the client-list report and the case list
// (ops/review-list.ts); it holds company names, so it is written to a file on the pilot machine and
// never printed.
import type { ClientListDifference } from "@/annual/client-list";

export type ReviewInput = {
  asAt: string; recordsAsAt: string | null;
  differences: ClientListDifference[];
  overdue: { code: string | null; nameEn: string; periodYear: number; dueDate: string; lastReturnOn: string | null }[];
  /** What the workbook reader could not read (repeated codes and the like). */
  problems: string[];
  /** The letters CSA adds after a client code, with how many companies carry each. */
  suffixes: Record<string, number>;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const day = (d: string | null) => (d ? `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}` : "none");
const REASON: Record<string, string> = { struck: "struck through in the DN workbook", red: "in red in the DN workbook", blue: "in blue in the DN workbook (one-off service)" };

export function reviewMessage(i: ReviewInput): string {
  const of = (k: ClientListDifference["kind"]) => i.differences.filter((d) => d.kind === k).sort((a, b) => a.code.localeCompare(b.code));
  const sections: { title: string; ask: string; lines: string[] }[] = [
    { title: "Active in CSA, but not a current client in the DN workbook", ask: "Clerk opens no annual return or AGM for these. Is each one right?",
      lines: of("leftOut").map((d) => `${d.code}  ${d.nameEn ?? ""}: ${REASON[d.list ?? ""] ?? d.list ?? "left out"}`) },
    { title: "Annual returns CSA does not show as made", ask: "Was each one filed? If so, CSA's last annual return date needs updating.",
      lines: [...i.overdue].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((o) => `${o.code ?? ""}  ${o.nameEn}: ${o.periodYear} return was due ${day(o.dueDate)}; CSA's last return is dated ${day(o.lastReturnOn)}`) },
    { title: "Year end differs", ask: "Which is right? Clerk is using the DN workbook's.",
      lines: of("yearEnd").map((d) => `${d.code}  ${d.nameEn ?? ""}: CSA says ${d.records}, the DN workbook says ${d.list}`) },
    { title: "Incorporation date differs", ask: "Which is right? Clerk is using CSA's.",
      lines: of("incorporatedOn").map((d) => `${d.code}  ${d.nameEn ?? ""}: CSA says ${day(d.records)}, the DN workbook says ${day(d.list)}`) },
    { title: "Same client code, different name", ask: "Is it the same company under an old or new name, or two different companies? Clerk has taken nothing from the DN workbook for these.",
      lines: of("nameMismatch").map((d) => `${d.code}  CSA: ${d.records} / DN workbook: ${d.list}`) },
    { title: "Active in CSA, not in the DN workbook at all", ask: "Should each have a row in the DN workbook?",
      lines: of("notInList").map((d) => `${d.code}  ${d.nameEn ?? ""}`) },
    { title: "Rows of the DN workbook Clerk could not read", ask: "", lines: i.problems },
  ].filter((s) => s.lines.length);
  const letters = Object.entries(i.suffixes).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`).join(", ");
  const out = [`Clerk compared CSA (backup of ${day(i.recordsAsAt)}) with the DN workbook on ${day(i.asAt)}. These are the companies where the two do not line up.`, ""];
  sections.forEach((s, n) => { out.push(`${n + 1}. ${s.title} (${s.lines.length})`); if (s.ask) out.push(s.ask); out.push(...s.lines.map((l) => `   ${l}`), ""); });
  if (letters) out.push("One question", `CSA writes some client codes with letters after the number that the DN workbook leaves off. What do they stand for? ${letters}`, "");
  return out.join("\n");
}
