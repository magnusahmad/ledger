// What the model returns when it reads a client's reply on an annual-return case, and the values
// staff settle on. Shared by the reader, the review and the frozen test set (eval/ar-reply-cases.ts).
// The model never reports how sure it is: nothing in the pilot uses that (DECISIONS.md #56).
import { z } from "zod";
import { isIsoDate } from "@/domain/dates";
import { hkDate } from "@/lib/clock";

/** Bump whenever the prompt or schema changes; stored with every reading and every defect. */
export const PROMPT_VERSION = "ar-reply-3";
export const REPLY_TASK = "ar_reply";

export const CHANGE_TYPES = [
  "director_appointed", "director_ceased", "secretary_changed", "officer_particulars", "registered_office",
  "company_name", "shares_allotted", "shares_transferred", "member_particulars", "other",
] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

const text = z.string().trim().min(1);
const optText = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v ?? null), z.string().trim().nullable());
const FULL = /^\d{4}-\d{2}-\d{2}$/;
const NO_YEAR = /^(?:--)?(\d{1,2})-(\d{1,2})$/;
/** What the model may return for a date: a full date, "--MM-DD" when the client gave no year, or nothing. */
const modelDay = z.preprocess((v) => {
  if (typeof v !== "string") return null;
  const t = v.trim(), m = NO_YEAR.exec(t);
  if (FULL.test(t)) return isIsoDate(t) ? t : null;
  return m ? `--${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}, z.string().nullable());
/** A date staff record: the full date with its year, or none. A day and month alone is refused. */
const fullDay = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v ?? null),
  z.string().nullable().superRefine((v, c) => {
    if (v === null) return;
    if (!FULL.test(v)) c.addIssue({ code: "custom", message: "Enter the full date, with the year" });
    else if (!isIsoDate(v)) c.addIssue({ code: "custom", message: "Enter a valid date" });
  }));

export const ChargesZ = z.object({ answer: z.enum(["none", "has_charges", "not_answered"]), details: optText, quote: optText });
const changeShape = {
  changeType: z.enum(CHANGE_TYPES),
  /** The person or thing that changed, as named in the reply. */
  subject: optText,
  detail: text,
  /** The client's own words, copied exactly. */
  quote: optText,
  /** "email", or the attachment's file name. */
  source: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : "email"), z.string()),
};
/** As the model returns it: effectiveDate is YYYY-MM-DD, or --MM-DD when the client wrote no year. */
export const ModelChangeZ = z.object({ ...changeShape, effectiveDate: modelDay });
/** As stored and as staff enter it: effectiveDate always carries its year, or is empty. */
export const ChangeZ = z.object({ ...changeShape, effectiveDate: fullDay });
export const SignedPapersZ = z.object({ document: z.enum(["annual_return", "agm_papers", "other"]), filename: optText, quote: optText });
export const DocumentZ = z.object({ docType: z.enum(["id_document", "address_proof", "bank_statement", "other"]), filename: optText, description: text });

export const ReplyReadingZ = z.object({
  about: z.enum(["this_return", "other"]),
  summary: text,
  charges: ChargesZ,
  changes: z.array(ModelChangeZ),
  signedPapers: z.array(SignedPapersZ),
  documents: z.array(DocumentZ),
});
export type ReplyReading = z.infer<typeof ReplyReadingZ>;
export type Charges = z.infer<typeof ChargesZ>;
export type Change = z.infer<typeof ChangeZ>;

/**
 * Gives every date its year, once, when the email is read. A date the client wrote without a year
 * takes the year the email arrived (Hong Kong time) and is marked yearAssumed, so staff see it was
 * assumed; the stored date is never worked out again later. A day that doesn't exist in that year
 * is left empty.
 */
export function resolveReading(r: ReplyReading, receivedAt: Date): ReplyReading & { changes: (ReplyReading["changes"][number] & { yearAssumed: boolean })[] } {
  const year = hkDate(receivedAt).slice(0, 4);
  return { ...r, changes: r.changes.map((c) => {
    if (!c.effectiveDate?.startsWith("--")) return { ...c, yearAssumed: false };
    const d = `${year}${c.effectiveDate.slice(1)}`;
    return isIsoDate(d) ? { ...c, effectiveDate: d, yearAssumed: true } : { ...c, effectiveDate: null, yearAssumed: false };
  }) };
}

/** The value schema staff edits and additions are checked against, per kind of item. */
export const VALUE_SCHEMA = { charges: ChargesZ, change: ChangeZ, signed_papers: SignedPapersZ, document: DocumentZ } as const;
