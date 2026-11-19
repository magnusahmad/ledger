// Scores one model reading of a client reply against the expected answer agreed beforehand
// (eval/ar-reply-cases.ts). Three kinds of problem, kept apart because they matter differently:
// "missed" (something in the reply the model didn't report: only staff review would catch it),
// "extra" (something reported that isn't there: staff reject it) and "wrong" (found, but with the
// wrong value). A case passes only with none of them. Document items are checked only where the
// case lists them, and extra documents are ignored: they are filing aids, not facts on the return.
import type { ChangeType, ReplyReading } from "../src/annual/reply-types";

export type ExpectedChange = { types: ChangeType[]; /** case-insensitive pattern the subject or detail must match */ subject?: string; /** set (or null) to check the date */ effectiveDate?: string | null };
export type Expected = {
  about: "this_return" | "other"; charges: "none" | "has_charges" | "not_answered";
  changes: ExpectedChange[]; signedPapers: ("annual_return" | "agm_papers" | "other")[];
  documents?: ("id_document" | "address_proof" | "bank_statement" | "other")[];
};
export type Problem = { kind: "missed" | "extra" | "wrong"; what: string };
export type Score = { pass: boolean; problems: Problem[] };

export function scoreReply(want: Expected, got: ReplyReading): Score {
  const problems: Problem[] = [];
  if (want.about !== got.about) problems.push({ kind: "wrong", what: `about: expected ${want.about}, read ${got.about}` });
  if (want.about === "other") {
    const n = got.changes.length + got.signedPapers.length;
    if (n || got.charges.answer !== "not_answered") problems.push({ kind: "wrong", what: "proposals on a reply about something else" });
    return { pass: !problems.length, problems };
  }
  if (want.charges !== got.charges.answer) problems.push({ kind: got.charges.answer === "not_answered" ? "missed" : "wrong", what: `charges: expected ${want.charges}, read ${got.charges.answer}` });
  const left = [...got.changes];
  for (const w of want.changes) {
    const re = w.subject ? new RegExp(w.subject, "i") : null;
    const i = left.findIndex((g) => w.types.includes(g.changeType) && (!re || re.test(`${g.subject ?? ""} ${g.detail}`)));
    if (i < 0) { problems.push({ kind: "missed", what: `change ${w.types.join("/")}${w.subject ? ` (${w.subject})` : ""}` }); continue; }
    const [g] = left.splice(i, 1);
    if (w.effectiveDate !== undefined && w.effectiveDate !== g.effectiveDate) problems.push({ kind: "wrong", what: `date of ${g.changeType}: expected ${w.effectiveDate ?? "none"}, read ${g.effectiveDate ?? "none"}` });
  }
  for (const g of left) problems.push({ kind: "extra", what: `change ${g.changeType}${g.subject ? ` (${g.subject})` : ""}` });
  const papers = got.signedPapers.map((p) => p.document);
  for (const w of want.signedPapers) { const i = papers.indexOf(w); if (i < 0) problems.push({ kind: "missed", what: `signed ${w}` }); else papers.splice(i, 1); }
  for (const p of papers) problems.push({ kind: "extra", what: `signed ${p}` });
  if (want.documents) {
    const docs = got.documents.map((d) => d.docType);
    for (const w of want.documents) { const i = docs.indexOf(w); if (i < 0) problems.push({ kind: "missed", what: `document ${w}` }); else docs.splice(i, 1); }
  }
  return { pass: !problems.length, problems };
}

/** score null = the model gave no usable reading for the case. */
export function summarise(results: { id: string; score: Score | null }[]) {
  const count = (k: Problem["kind"]) => results.reduce((n, r) => n + (r.score?.problems.filter((p) => p.kind === k).length ?? 0), 0);
  return { cases: results.length, passed: results.filter((r) => r.score?.pass).length, failedToRead: results.filter((r) => !r.score).length, missed: count("missed"), extra: count("extra"), wrong: count("wrong") };
}
