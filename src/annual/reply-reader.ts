// Reads a client's reply on an annual-return or AGM case with the product model (UHY pilot brief,
// "Reply"; DECISIONS.md #56 and #64). The model only proposes: its reading is stored as items for
// staff to accept, edit or reject (src/annual/reply-review.ts) and nothing on the case changes here.
// PDFs and images go to the model with the email; any other attachment is listed as not read, so an
// unread file is never taken as "nothing in it". A failed reading is kept as a failure and retried;
// it never counts as "no changes". Whether an email belongs to a case is decided by the mail gate,
// never by the model.
import { and, asc, desc, eq, isNull, lt, or } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import type { LlmMessage } from "@/integrations/types";
import { arCase, arMail, arReply, arReplyItem, client as clientT, llmCall, type ReplyItemKind } from "@/db/schema";
import { callAgent } from "@/agent/call";
import { particularsFromCsa } from "@/integrations/csa/nar1";
import { arPlaybook } from "./cases";
import { annualReturnDates } from "./dispatch";
import { PROMPT_VERSION, REPLY_TASK, ReplyReadingZ, type ReplyReading } from "./reply-types";

export const MAX_ATTEMPTS = 3;
const MAX_FILES = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const READABLE = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const EARLIER_CHARS = 2500;

export const REPLY_SYSTEM = `You read one email that a client sent to a Hong Kong company secretarial firm about a company's annual return (form NAR1) or AGM papers. The firm had asked the client to: check the annual return and sign it; say whether the company has any mortgages or charges as at the made-up date (Part 9 of the form); and say if any of the company's particulars have changed since last year.

Report only what the NEW EMAIL and its attachments say. Staff check every point against the email, so:
- Copy the client's exact words into "quote" (the original language, no paraphrase). Use null if the point comes only from an attachment you cannot quote.
- Never guess. A date goes in effectiveDate only if the email gives it (YYYY-MM-DD); otherwise null.
- Text quoted from earlier emails (after "From:", ">" or "wrote:") is not new. The EARLIER EMAILS are context only.
- Write summary and detail in plain English, whatever language the client used.

about: "this_return" if the email concerns this annual return or AGM in any way (an answer, a question about it, signed papers, a change to the company). "other" if it is about something else entirely; then leave every list empty and charges "not_answered".

charges: "none" if the client says the company has no mortgages or charges; "has_charges" if it says there are any (put the lender, amount or what was provided in details); "not_answered" if the email does not answer the question. "Nothing has changed" or "all correct" alone does not answer the charges question.

changes: one entry for each change to the company's particulars that the client reports or that an attachment shows, compared with CURRENT PARTICULARS. A client confirming what is already on record is not a change. Types: director_appointed, director_ceased (resigned, removed or died), secretary_changed, officer_particulars (a director's or secretary's name, address, ID or passport), registered_office, company_name, shares_allotted, shares_transferred, member_particulars (a member's name or address), other. When a person who is both a director or secretary and a member (see CURRENT PARTICULARS) changes name or address, report it twice: once as officer_particulars and once as member_particulars, because each register is updated separately. An ID or passport number is officer_particulars only. subject is the person or thing that changed. source is "email" or the attachment's file name.

signedPapers: one entry for each attachment that is a signed copy of the annual return or the AGM papers. Unsigned drafts sent back for correction are not signed papers.

documents: other attachments worth filing: an ID document, an address proof, a bank statement, or other.`;

export type ReplyInput = {
  today: string; caseKind: "AR" | "AGM"; companyName: string; year: number; madeUpDate: string | null;
  particulars: Awaited<ReturnType<typeof particularsFromCsa>>;
  earlier: { direction: "in" | "out"; at: string; from: string; subject: string; text: string }[];
  message: { from: string; fromName: string | null; subject: string; receivedAt: string; text: string };
  /** content is loaded only for the files the model is given (attachmentPlan). */
  attachments: { filename: string; mime: string; bytes: number; content?: Buffer }[];
};

/** Which attachments the model is given, and why the rest are not. */
export function attachmentPlan(files: { filename: string; mime: string; bytes: number }[]) {
  let sent = 0;
  return files.map((f) => {
    if (!READABLE.has(f.mime)) return { filename: f.filename, read: false, reason: /word|document/i.test(f.mime) || /\.docx?$/i.test(f.filename) ? "Word files aren't read" : /sheet|excel/i.test(f.mime) || /\.xlsx?$/i.test(f.filename) ? "Excel files aren't read" : "This file type isn't read" };
    if (f.bytes > MAX_FILE_BYTES) return { filename: f.filename, read: false, reason: "Too large to read (over 8 MB)" };
    if (sent >= MAX_FILES) return { filename: f.filename, read: false, reason: `Only the first ${MAX_FILES} files are read` };
    sent++;
    return { filename: f.filename, read: true };
  });
}

/** The request for one reply. Pure, so the frozen test set runs the same prompt as production. */
export function buildReplyPrompt(i: ReplyInput): { system: string; user: Extract<LlmMessage, { content: unknown[] }>["content"]; attachments: ReturnType<typeof attachmentPlan> } {
  const plan = attachmentPlan(i.attachments);
  const p = i.particulars;
  const lines = [
    `Today: ${i.today}.`,
    `CASE: ${i.caseKind === "AR" ? "annual return" : "AGM"} ${i.year} for ${i.companyName}${i.madeUpDate ? `, made up to ${i.madeUpDate}` : ""}.`,
    "",
    "CURRENT PARTICULARS (from the firm's records):",
    p ? `Registered office: ${p.registeredOffice ?? "not recorded"}` : "Not available.",
    ...(p ? p.officers.map((o) => `${o.role === "secretary" ? "Secretary" : o.role === "alternate" ? "Alternate director" : "Director"}: ${o.name}${o.nameZh ? ` (${o.nameZh})` : ""}`) : []),
    ...(p ? p.members.map((m) => `Member: ${m.name}${m.nameZh ? ` (${m.nameZh})` : ""}, ${m.shares} ${m.className} shares`) : []),
    "",
    "EARLIER EMAILS ON THIS CASE (context only, oldest first):",
    ...(i.earlier.length ? i.earlier.map((e) => `--- ${e.direction === "out" ? "From the firm" : `From ${e.from}`}, ${e.at}, "${e.subject}"\n${e.text.slice(0, EARLIER_CHARS)}`) : ["None."]),
    "",
    `NEW EMAIL from ${i.message.fromName ? `${i.message.fromName} <${i.message.from}>` : i.message.from}, ${i.message.receivedAt}, "${i.message.subject}":`,
    i.message.text.slice(0, 20000),
    "",
    `ATTACHMENTS: ${plan.length ? plan.map((a) => `${a.filename} (${a.read ? "provided below" : "not provided"})`).join("; ") : "none"}.`,
  ];
  const user: Extract<LlmMessage, { content: unknown[] }>["content"] = [{ type: "text", text: lines.join("\n") }];
  for (const [n, a] of i.attachments.entries()) {
    if (!plan[n].read || !a.content) continue;
    const url = `data:${a.mime};base64,${a.content.toString("base64")}`;
    user.push(a.mime === "application/pdf" ? { type: "file", file: { filename: a.filename, file_data: url } } : { type: "image_url", image_url: { url } });
  }
  return { system: REPLY_SYSTEM, user, attachments: plan };
}

const squash = (s: string) => s.toLowerCase().replace(/[\s >]+/g, " ").trim();
/** Whether the quoted words appear in the email, ignoring case, spacing and line breaks. */
export function quoteFound(source: string, quote: string | null): boolean | null {
  if (!quote) return null;
  return squash(source).includes(squash(quote));
}

/** The reading as review items. A quote that can be checked against the email text is checked. */
export function itemsFromReading(r: ReplyReading, o: { caseKind: "AR" | "AGM"; emailText: string }): { kind: ReplyItemKind; proposed: Record<string, unknown> }[] {
  if (r.about === "other") return [];
  const q = (quote: string | null, source = "email") => (source === "email" ? quoteFound(o.emailText, quote) : null);
  return [
    ...(o.caseKind === "AR" ? [{ kind: "charges" as const, proposed: { ...r.charges, quoteFound: q(r.charges.quote) } }] : []),
    ...r.changes.map((c) => ({ kind: "change" as const, proposed: { ...c, quoteFound: q(c.quote, c.source) } })),
    ...r.signedPapers.map((s) => ({ kind: "signed_papers" as const, proposed: { ...s } })),
    ...r.documents.map((d) => ({ kind: "document" as const, proposed: { ...d } })),
  ];
}

async function inputFor(ctx: Ctx, mail: typeof arMail.$inferSelect): Promise<ReplyInput> {
  const c = (await ctx.db.query.arCase.findFirst({ where: and(eq(arCase.id, mail.caseId!), eq(arCase.firmId, ctx.firmId)) }))!;
  const cl = (await ctx.db.query.client.findFirst({ where: and(eq(clientT.id, c.clientId), eq(clientT.firmId, ctx.firmId)) }))!;
  const earlier = await ctx.db.select().from(arMail)
    .where(and(eq(arMail.firmId, ctx.firmId), eq(arMail.caseId, c.id), eq(arMail.status, "linked"), lt(arMail.receivedAt, mail.receivedAt))).orderBy(asc(arMail.receivedAt));
  const plan = attachmentPlan(mail.attachments);
  const attachments: ReplyInput["attachments"] = [];
  for (const [n, a] of mail.attachments.entries()) attachments.push({ filename: a.filename, mime: a.mime, bytes: a.bytes, content: plan[n].read ? await ctx.storage.get(a.storageKey) : undefined });
  return {
    today: ctx.clock.today(), caseKind: c.kind, companyName: cl.nameEn, year: c.periodYear,
    madeUpDate: c.kind === "AR" && cl.incorporatedOn ? annualReturnDates({ incorporatedOn: cl.incorporatedOn, year: c.periodYear, playbook: await arPlaybook(ctx) }).madeUpDate : null,
    particulars: await particularsFromCsa(ctx, cl.id),
    earlier: earlier.slice(-6).map((e) => ({ direction: e.direction, at: e.receivedAt.toISOString(), from: e.fromAddr, subject: e.subject, text: e.text })),
    message: { from: mail.fromAddr, fromName: mail.fromName, subject: mail.subject, receivedAt: mail.receivedAt.toISOString(), text: mail.text },
    attachments,
  };
}

/** Reads one inbound email linked to a case. Safe to call again: a finished reading is left alone. */
export async function readReply(ctx: Ctx, mailId: string) {
  const mail = await ctx.db.query.arMail.findFirst({ where: and(eq(arMail.id, mailId), eq(arMail.firmId, ctx.firmId)) });
  if (!mail) throw new Error("Email not found");
  if (mail.direction !== "in" || mail.status !== "linked" || !mail.caseId) throw new Error("Only a client's email linked to a case is read");
  const prev = await ctx.db.query.arReply.findFirst({ where: and(eq(arReply.firmId, ctx.firmId), eq(arReply.mailId, mailId)) });
  if (prev && (prev.status === "read" || prev.reviewedAt || prev.attempts >= MAX_ATTEMPTS)) return prev;
  const input = await inputFor(ctx, mail);
  const prompt = buildReplyPrompt(input);
  const id = prev?.id ?? ctx.ids.next("arr");
  const base = { firmId: ctx.firmId, mailId, caseId: mail.caseId, attachments: prompt.attachments, promptVersion: PROMPT_VERSION, attempts: (prev?.attempts ?? 0) + 1, readAt: ctx.clock.now() };
  const save = async (row: Partial<typeof arReply.$inferInsert> & { status: "read" | "failed" }) => {
    if (prev) await ctx.db.update(arReply).set({ ...base, ...row }).where(eq(arReply.id, id));
    else await ctx.db.insert(arReply).values({ id, ...base, ...row });
  };
  let reading: ReplyReading;
  try { reading = await callAgent(ctx, { agent: REPLY_TASK, system: prompt.system, user: prompt.user, schema: ReplyReadingZ }); }
  catch (e) {
    await save({ status: "failed", about: null, summary: null, model: null, error: (e as Error).message.slice(0, 500) });
    return (await ctx.db.query.arReply.findFirst({ where: eq(arReply.id, id) }))!;
  }
  const model = (await lastModel(ctx)) ?? ctx.config.LLM_MODEL;
  await ctx.db.transaction(async (db) => {
    const tx = { ...ctx, db: db as unknown as Ctx["db"] };
    if (prev) await tx.db.update(arReply).set({ ...base, status: "read", about: reading.about, summary: reading.summary, model, error: null }).where(eq(arReply.id, id));
    else await tx.db.insert(arReply).values({ id, ...base, status: "read", about: reading.about, summary: reading.summary, model, error: null });
    const items = itemsFromReading(reading, { caseKind: input.caseKind, emailText: mail.text });
    if (items.length) await tx.db.insert(arReplyItem).values(items.map((it) => ({ id: ctx.ids.next("ari"), firmId: ctx.firmId, replyId: id, caseId: mail.caseId!, mailId, kind: it.kind, origin: "model" as const, proposed: it.proposed })));
  });
  return (await ctx.db.query.arReply.findFirst({ where: eq(arReply.id, id) }))!;
}

/** The model that answered the last reply reading (recorded by callAgent). */
async function lastModel(ctx: Ctx) {
  const [row] = await ctx.db.select({ model: llmCall.model }).from(llmCall).where(and(eq(llmCall.firmId, ctx.firmId), eq(llmCall.agent, REPLY_TASK), isNull(llmCall.error))).orderBy(desc(llmCall.at), desc(llmCall.id)).limit(1);
  return row?.model ?? null;
}

/** Reads every client email on a case that hasn't been read yet, oldest first; failures are retried up to MAX_ATTEMPTS. */
export async function readPendingReplies(ctx: Ctx, o: { limit?: number } = {}) {
  const rows = await ctx.db.select({ id: arMail.id }).from(arMail)
    .leftJoin(arReply, and(eq(arReply.mailId, arMail.id), eq(arReply.firmId, arMail.firmId)))
    .where(and(
      eq(arMail.firmId, ctx.firmId), eq(arMail.direction, "in"), eq(arMail.status, "linked"),
      or(isNull(arReply.id), and(eq(arReply.status, "failed"), lt(arReply.attempts, MAX_ATTEMPTS), isNull(arReply.reviewedAt))),
    )).orderBy(asc(arMail.receivedAt)).limit(o.limit ?? 20);
  let read = 0, failed = 0;
  for (const r of rows) { const out = await readReply(ctx, r.id); if (out.status === "read") read++; else failed++; }
  return { read, failed };
}
