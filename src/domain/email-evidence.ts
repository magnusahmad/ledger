import type { IntakeAction } from "@/agent/schemas";
import { isIsoDate } from "./dates";

const normalized = (s: string) => s.normalize("NFKC").replace(/[\s，,。.;；:：]/g, "").toLowerCase();
// Recognize unambiguous full dates only. This is a consistency check, not an
// interpreter for relative dates, quoted history or ambiguous numeric formats.
function dates(s: string): string[] {
  const found = [...s.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b|([0-9]{4})年([0-9]{1,2})月([0-9]{1,2})[日號号]/g)]
    .map(m => `${m[1] ?? m[4]}-${(m[2] ?? m[5]).padStart(2, "0")}-${(m[3] ?? m[6]).padStart(2, "0")}`);
  return [...new Set(found.filter(isIsoDate))];
}
export function actionEvidenceProblems(a: IntakeAction, source: string, dateKey: string | null): string[] {
  const problems: string[] = [];
  const sourceText = normalized(source);
  // Check dated field evidence without rejecting ordinary free-text paraphrases.
  for (const f of a.fields.filter(f => f.key === dateKey || /Date$|^lastDay$/.test(f.key))) {
    if (f.quote && !sourceText.includes(normalized(f.quote))) problems.push(`The quoted evidence for ${f.key} is absent from the new message.`);
    const quotedDates = f.quote ? dates(f.quote) : [];
    if (quotedDates.length === 1 && isIsoDate(f.value) && quotedDates[0] !== f.value) problems.push(`The date in ${f.key} disagrees with its quoted evidence.`);
  }
  if (a.effectiveDate && !isIsoDate(a.effectiveDate)) problems.push("The effective date is invalid.");
  if (dateKey && a.type === "start_request") {
    const explicit = dates(a.evidence ?? "");
    const selected = a.effectiveDate ?? a.fields.find(f => f.key === dateKey)?.value;
    if (explicit.length === 1 && !selected) problems.push("An explicit date in the action evidence was omitted from the structured fields.");
    if (explicit.length === 1 && selected && explicit[0] !== selected) problems.push("The selected date disagrees with the action evidence.");
  }
  const fieldDate = dateKey ? a.fields.find(f => f.key === dateKey)?.value : null;
  if (fieldDate && a.effectiveDate && fieldDate !== a.effectiveDate) problems.push("Two structured representations of the effective date disagree.");
  return problems;
}
