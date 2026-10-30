// The three model calls in the mail room. The model reads; it never decides the client,
// the folder or what is sent (match.ts, rules.ts and staff approval do).
import { z } from "zod";
import type { Ctx } from "@/lib/ctx";
import type { Lang, MailroomRead } from "@/db/schema";
import { callAgent } from "@/agent/call";
import type { FilingRules } from "./rules";
import type { PageRange } from "./split";

const pdfPart = (filename: string, content: Buffer) => ({ type: "file" as const, file: { filename, file_data: `data:application/pdf;base64,${content.toString("base64")}` } });

export const SplitZ = z.object({ letters: z.array(z.object({ fromPage: z.number().int(), toPage: z.number().int() })) });
const SPLIT_SYSTEM = `You split a batch scan of incoming post at a Hong Kong accounting firm into separate letters. Pages are numbered from 1. A new letter starts where a new sender's letterhead, a new addressee or a new first page ("Page 1 of n", a new date and reference) begins. Continuation pages, enclosures and payment slips belong to the letter before them. Return every page exactly once, in order, as letters with fromPage and toPage.`;

export async function readSplit(ctx: Ctx, filename: string, content: Buffer, pages: number): Promise<PageRange[]> {
  const r = await callAgent(ctx, { agent: "mailroom_split", system: SPLIT_SYSTEM, schema: SplitZ, user: [{ type: "text", text: `This scan has ${pages} pages.` }, pdfPart(filename, content)] });
  return r.letters;
}

const Id = z.string().nullable();
export const ReadZ = z.object({
  type: z.string(),
  sender: z.string(),
  addressee: z.string(),
  identifiers: z.object({ irdFileNo: Id, brNo: Id, crNo: Id, mpfNo: Id }),
  summaryEn: z.string(),
  actionNeeded: z.string().nullable(),
  dueDate: z.string().nullable(),
  amountHkd: z.number().nullable(),
  taxYear: z.string().nullable(),
});

function readSystem(rules: FilingRules) {
  const types = Object.entries(rules.types).map(([k, v]) => `- ${k}: ${v.label}`).join("\n");
  return `You read one letter received by post at a Hong Kong accounting firm, addressed to one of its client companies. Read only what is printed on the letter.
type: one of these keys, or "other" if none fits:
${types}
sender: the organisation that sent it, short (e.g. "Inland Revenue Department", "Companies Registry", "HSBC").
addressee: the company the letter is addressed to, exactly as printed (English name if both are printed).
identifiers: copy exactly as printed, or null: irdFileNo (IRD file number, e.g. 61/12345678), brNo (Business Registration number, 8 digits), crNo (Companies Registry company number), mpfNo (MPF employer or scheme membership number).
summaryEn: one plain English sentence on what the letter is.
actionNeeded: what the client needs to do, with amount and date, or null if nothing.
dueDate: YYYY-MM-DD for the payment, reply or filing date, or null.
amountHkd: amount payable in HKD as a number, or null.
taxYear: the year of assessment written as 2025-26, or null.`;
}

export async function readLetter(ctx: Ctx, rules: FilingRules, filename: string, content: Buffer): Promise<MailroomRead> {
  return callAgent(ctx, { agent: "mailroom_read", system: readSystem(rules), schema: ReadZ, user: [{ type: "text", text: "Read this letter." }, pdfPart(filename, content)] });
}

export const EmailZ = z.object({ subject: z.string(), body: z.string() });
const EMAIL_SYSTEM = `You draft a short email from a Hong Kong accounting firm to its client, telling them a letter has arrived for their company. Write in the language given: en English, tc Traditional Chinese (Hong Kong usage), sc Simplified Chinese. Greet the contact using contactName exactly as given; never add or guess a title such as Mr, Ms, 先生 or 女士 that is not in it (if contactName is null, use a neutral greeting). Say who the letter is from and what it is, in one or two sentences. If action is needed, state exactly what, the amount and the date from the facts; never invent or change a figure or date. Say the scan is attached. Offer to help where natural (for example to arrange payment or prepare the return). End with a closing line in the same language (Best regards / 順祝 商祺 / 顺祝 商祺) and then the firm's name from firmName on its own line. Plain text, no markdown.`;

export type EmailFacts = { language: Lang; contactName: string | null; clientName: string; firmName: string; receivedOn: string; letter: { type: string; sender: string; summary: string; actionNeeded: string | null; dueDate: string | null; amountHkd: number | null; taxYear: string | null } };

export async function draftClientEmail(ctx: Ctx, facts: EmailFacts) {
  return callAgent(ctx, { agent: "mailroom_email", system: EMAIL_SYSTEM, schema: EmailZ, user: `FACTS:\n${JSON.stringify(facts)}` });
}
