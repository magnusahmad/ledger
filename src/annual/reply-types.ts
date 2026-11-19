// What the model returns when it reads a client's reply on an annual-return case, and the values
// staff settle on. Shared by the reader, the review and the frozen test set (eval/ar-reply-cases.ts).
// The model never reports how sure it is: nothing in the pilot uses that (DECISIONS.md #56).
import { z } from "zod";

/** Bump whenever the prompt or schema changes; stored with every reading and every defect. */
export const PROMPT_VERSION = "ar-reply-1";
export const REPLY_TASK = "ar_reply";

export const CHANGE_TYPES = [
  "director_appointed", "director_ceased", "secretary_changed", "officer_particulars", "registered_office",
  "company_name", "shares_allotted", "shares_transferred", "member_particulars", "other",
] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

const text = z.string().trim().min(1);
const optText = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v ?? null), z.string().trim().nullable());
const optDay = z.preprocess((v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : null), z.string().nullable());

export const ChargesZ = z.object({ answer: z.enum(["none", "has_charges", "not_answered"]), details: optText, quote: optText });
export const ChangeZ = z.object({
  changeType: z.enum(CHANGE_TYPES),
  /** The person or thing that changed, as named in the reply. */
  subject: optText,
  detail: text,
  /** YYYY-MM-DD when the reply gives one; null otherwise (never guessed). */
  effectiveDate: optDay,
  /** The client's own words, copied exactly. */
  quote: optText,
  /** "email", or the attachment's file name. */
  source: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : "email"), z.string()),
});
export const SignedPapersZ = z.object({ document: z.enum(["annual_return", "agm_papers", "other"]), filename: optText, quote: optText });
export const DocumentZ = z.object({ docType: z.enum(["id_document", "address_proof", "bank_statement", "other"]), filename: optText, description: text });

export const ReplyReadingZ = z.object({
  about: z.enum(["this_return", "other"]),
  summary: text,
  charges: ChargesZ,
  changes: z.array(ChangeZ),
  signedPapers: z.array(SignedPapersZ),
  documents: z.array(DocumentZ),
});
export type ReplyReading = z.infer<typeof ReplyReadingZ>;
export type Charges = z.infer<typeof ChargesZ>;
export type Change = z.infer<typeof ChangeZ>;

/** The value schema staff edits and additions are checked against, per kind of item. */
export const VALUE_SCHEMA = { charges: ChargesZ, change: ChangeZ, signed_papers: SignedPapersZ, document: DocumentZ } as const;
