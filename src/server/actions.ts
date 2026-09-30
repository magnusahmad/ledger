"use server";
// Server actions. Every client-facing, register or filing change goes through
// approveProposal (the approval gate); these actions only collect the human's input.
import { refresh, revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getCtx } from "./ctx";
import { approveProposal, rejectProposal, getProposal } from "@/domain/proposals";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { completeManualStep, tickItem } from "@/domain/step-hooks";
import { setInvoiceNumber, setLineAmount } from "@/domain/invoices";
import { markPaidManually, pollBank } from "@/domain/payments";
import { pollMail } from "@/channels/mail-poller";
import { runJobs } from "@/domain/jobs";
import { runReminders } from "@/domain/reminders";
import { batchStart } from "@/domain/batch";
import { logMailItem } from "@/domain/mail-items";
import { draftEmail, type ReplyFacts } from "@/agent/draft";
import { portalSubmit } from "@/domain/portal";
import { startManualRequest, type ManualItem } from "@/domain/manual";
import { addOffPlatformStep, cancelOffPlatformStep, completeOffPlatformStep, followedUp, putOnHold, releaseHold, type WaitingOn } from "@/domain/off-platform";
import { requestOtp, verifyOtp, signDocuments } from "@/domain/signing";
import { contact, invoice, message, type Lang } from "@/db/schema";
import { resetDemoData } from "@/domain/demo";
import { FakeMail } from "@/integrations/mail/fake";

export type ActionResult = { ok: boolean; error?: string; message?: string; redirectTo?: string };
const fail = (e: unknown): ActionResult => ({ ok: false, error: (e as Error).message });
const done = (message?: string): ActionResult => { refresh(); return { ok: true, message }; };

export async function approveAction(proposalId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = getCtx();
  try {
    const edits: Record<string, unknown> = {};
    for (const [k, v] of form.entries()) {
      if (k.startsWith("$") || k === "shownAt") continue;
      if (k.startsWith("email:")) { edits.emails = { ...(edits.emails as object ?? {}), [k.slice(6)]: String(v) }; continue; }
      edits[k] = k === "feeHkd" ? Number(v) : String(v);
    }
    const shownAt = form.get("shownAt") ? new Date(String(form.get("shownAt"))) : null;
    await approveProposal(ctx, proposalId, { edits, shownAt });
    await runJobs(ctx); // e.g. queue the Xero sync and confirmation drafts straight away
    return done("Done");
  } catch (e) { return fail(e); }
}

export async function rejectAction(proposalId: string): Promise<ActionResult> {
  try { await rejectProposal(getCtx(), proposalId, "Dismissed by staff"); return done("Dismissed"); } catch (e) { return fail(e); }
}

export async function redraftAction(proposalId: string, lang: Lang): Promise<ActionResult> {
  const ctx = getCtx();
  try {
    const p = await getProposal(ctx, proposalId);
    const m = await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) });
    const facts = (m?.intake as { facts?: ReplyFacts } | null)?.facts;
    if (!m || !facts) throw new Error("This draft can't be redrafted");
    const firm = await (await import("@/domain/firm")).getFirm(ctx);
    const d = await draftEmail(ctx, { ...facts, language: lang, signOff: firm.signOff?.[lang] ?? facts.signOff }, { messageId: m.id });
    await ctx.db.update(message).set({ text: d.body, language: lang, intake: { ...(m.intake as object), facts: { ...facts, language: lang } } }).where(eq(message.id, m.id));
    return done(`Redrafted in ${lang === "en" ? "English" : lang === "tc" ? "Traditional Chinese" : "Simplified Chinese"}`);
  } catch (e) { return fail(e); }
}

export async function pasteRequestAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = getCtx();
  try {
    const clientId = String(form.get("clientId") ?? "") || null;
    const text = String(form.get("text") ?? "").trim();
    if (!text) throw new Error("Paste the client's message first");
    let from = { email: "paste@local", name: "Pasted message" };
    if (clientId) {
      const c = await ctx.db.query.contact.findFirst({ where: (x, { and, eq }) => and(eq(x.clientId, clientId), eq(x.isInstructing, true)) }) ?? await ctx.db.query.contact.findFirst({ where: eq(contact.clientId, clientId) });
      if (c?.email) from = { email: c.email, name: c.name };
    }
    const m = await ingestMessage(ctx, { channel: "paste", provider: "paste", providerMessageId: `paste-${Date.now()}`, from, to: [], cc: [], subject: String(form.get("subject") ?? "Pasted message"), text, receivedAt: ctx.clock.now(), attachments: [], clientId });
    await processInbound(ctx, m.id);
    revalidatePath("/", "layout");
    return { ok: true, message: "Harbourline has read the message; the draft is in your intray." };
  } catch (e) { return fail(e); }
}

export async function manualRequestAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const items = JSON.parse(String(form.get("items") ?? "[]")) as ManualItem[];
    const r = await startManualRequest(getCtx(), { clientId: String(form.get("clientId") ?? ""), items, notes: String(form.get("notes") ?? ""), confirm: form.get("confirm") === "on" });
    revalidatePath("/", "layout");
    return { ok: true, redirectTo: r.proposalId ? `/review/${r.proposalId}` : `/tasks/${r.taskIds[0]}` };
  } catch (e) { return fail(e); }
}

// ---------- Off-platform steps and holds ----------
const str = (f: FormData, k: string) => String(f.get(k) ?? "");
export async function addStepAction(taskId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const before = str(form, "beforeStep");
    await addOffPlatformStep(getCtx(), taskId, { title: str(form, "title"), waitingOn: (str(form, "waitingOn") || "us") as WaitingOn, partyId: str(form, "partyId") || null, dueDate: str(form, "dueDate") || null, followUpOn: str(form, "followUpOn") || null, beforeStep: before === "" ? null : Number(before) });
    return done("Added");
  } catch (e) { return fail(e); }
}
export async function completeStepAction(actionId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const f = form.get("file");
    const file = f instanceof File && f.size ? { filename: f.name, mime: f.type || "application/octet-stream", content: Buffer.from(await f.arrayBuffer()) } : null;
    await completeOffPlatformStep(getCtx(), actionId, { note: str(form, "note"), reference: str(form, "reference"), file });
    return done();
  } catch (e) { return fail(e); }
}
export async function dropStepAction(actionId: string): Promise<ActionResult> {
  try { await cancelOffPlatformStep(getCtx(), actionId, ""); return done(); } catch (e) { return fail(e); }
}
export async function holdAction(taskId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try { await putOnHold(getCtx(), taskId, { reason: str(form, "reason"), waitingOn: (str(form, "waitingOn") || "third_party") as WaitingOn, partyId: str(form, "partyId") || null, followUpOn: str(form, "followUpOn") }); return done(); } catch (e) { return fail(e); }
}
export async function releaseHoldAction(taskId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try { await releaseHold(getCtx(), taskId, str(form, "note")); return done(); } catch (e) { return fail(e); }
}
export async function followedUpAction(kind: "step" | "hold", id: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try { await followedUp(getCtx(), { kind, id, nextFollowUpOn: str(form, "next"), note: str(form, "note") }); return done("Noted"); } catch (e) { return fail(e); }
}

export async function tickAction(taskId: string, key: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try { await tickItem(getCtx(), taskId, key, String(form.get("value") ?? "") || null); return done(); } catch (e) { return fail(e); }
}
export async function manualStepAction(taskId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try { await completeManualStep(getCtx(), taskId, String(form.get("note") ?? "") || undefined); return done(); } catch (e) { return fail(e); }
}
export async function invoiceNumberAction(invoiceId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try { await setInvoiceNumber(getCtx(), invoiceId, String(form.get("number") ?? "")); return done("Invoice number updated"); } catch (e) { return fail(e); }
}
export async function lineAmountAction(lineId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try { await setLineAmount(getCtx(), lineId, Math.round(Number(String(form.get("amount")).replace(/[^\d.]/g, "")) * 100)); return done(); } catch (e) { return fail(e); }
}
export async function markPaidAction(invoiceId: string): Promise<ActionResult> {
  try { await markPaidManually(getCtx(), invoiceId, "Marked paid by staff"); return done("Marked paid"); } catch (e) { return fail(e); }
}
export async function checkBankAction(): Promise<ActionResult> {
  try { const r = await pollBank(getCtx()); return done(`${r.fetched} deposit(s) checked: ${r.matched} matched, ${r.proposed} to review, ${r.unmatched} unmatched`); } catch (e) { return fail(e); }
}
export async function checkMailAction(): Promise<ActionResult> {
  try { const r = await pollMail(getCtx()); return done(`${r.processed} new message(s)`); } catch (e) { return fail(e); }
}
export async function remindersAction(): Promise<ActionResult> {
  try { const n = await runReminders(getCtx()); return done(`${n} reminder(s) drafted`); } catch (e) { return fail(e); }
}
export async function batchAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const r = await batchStart(getCtx(), { playbookId: String(form.get("playbookId")), clientIds: form.getAll("clientId").map(String), periodYear: form.get("periodYear") ? Number(form.get("periodYear")) : undefined });
    return done(`Started ${r.created} task(s)${r.skipped.length ? `; skipped ${r.skipped.length} already in progress` : ""}. Drafts are in your intray.`);
  } catch (e) { return fail(e); }
}
export async function logMailAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const f = form.get("file") as File | null;
    if (!f || !f.size) throw new Error("Choose a scan");
    await logMailItem(getCtx(), { filename: f.name, mime: f.type || "application/pdf", content: Buffer.from(await f.arrayBuffer()), receivedOn: String(form.get("receivedOn") || new Date().toISOString().slice(0, 10)) });
    return done("Letter logged; the client notification is in your intray");
  } catch (e) { return fail(e); }
}

// ---------- Demo panel ----------
export async function simulatePaymentAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = getCtx();
  try {
    const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, String(form.get("invoiceId"))) });
    if (!inv) throw new Error("Pick an invoice");
    const amount = form.get("amount") ? Math.round(Number(form.get("amount")) * 100) : inv.totalCents - inv.paidCents;
    await ctx.bank.simulateDeposit!({ amountCents: amount, currency: inv.currency, reference: String(form.get("reference") || inv.number), payerName: String(form.get("payer") || "Demo client") });
    const r = await pollBank(ctx);
    await runJobs(ctx);
    return done(`Deposit sent to ${ctx.bank.name === "airwallex" ? "the Airwallex sandbox" : "the demo bank"}; ${r.matched} matched automatically`);
  } catch (e) { return fail(e); }
}

export async function simulateEmailAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = getCtx();
  try {
    const fake = ctx.mail as FakeMail;
    if (typeof (fake as Partial<FakeMail>).deliver !== "function") throw new Error("A real mailbox is connected: send a real email to it instead");
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    // "As the firm": simulates staff replying from the mailbox (e.g. Gmail); From becomes the recipient.
    const asFirm = form.get("asFirm") === "on";
    // A firm reply without a chosen thread answers that client's latest email.
    const latestFromClient = asFirm && !form.get("inReplyTo")
      ? (await ctx.db.select().from(message).where(eq(message.fromAddr, String(form.get("from")).toLowerCase()))).filter((m) => m.direction === "in").sort((a, b) => b.at.getTime() - a.at.getTime())[0]
      : null;
    fake.deliver({
      from: asFirm ? { email: ctx.mail.address, name: "Karen Yip" } : { email: String(form.get("from")), name: String(form.get("fromName") || "") || null },
      to: asFirm ? [String(form.get("from"))] : undefined, subject: String(form.get("subject") || "(no subject)"), text: String(form.get("text") || ""),
      inReplyTo: String(form.get("inReplyTo") || "") || latestFromClient?.rfcMessageId || null,
      attachments: await Promise.all(files.map(async (f) => ({ filename: f.name, mime: f.type || "application/octet-stream", content: Buffer.from(await f.arrayBuffer()) }))),
    });
    const r = await pollMail(ctx);
    return done(asFirm ? "Recorded as a reply from the mailbox" : `Delivered; ${r.processed} message(s) processed`);
  } catch (e) { return fail(e); }
}

export async function resetDemoAction(): Promise<ActionResult> {
  try { await resetDemoData(getCtx()); revalidatePath("/", "layout"); return { ok: true, message: "Demo data reset" }; } catch (e) { return fail(e); }
}

export async function workerTickAction(): Promise<ActionResult> {
  const ctx = getCtx();
  try { const m = await pollMail(ctx); const b = await pollBank(ctx); const j = await runJobs(ctx); return done(`Mail ${m.processed}, bank ${b.matched} matched, ${j} job(s)`); } catch (e) { return fail(e); }
}

// ---------- Public: upload link ----------
export async function portalSubmitAction(token: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const fields: { taskId: string; key: string; value: string }[] = [];
    const files: { taskId: string; key: string; filename: string; mime: string; content: Buffer }[] = [];
    for (const [name, v] of form.entries()) {
      const [kind, taskId, key] = name.split(":");
      if (kind === "v" && typeof v === "string") fields.push({ taskId, key, value: v });
      if (kind === "f" && typeof v !== "string" && v.size) files.push({ taskId, key, filename: v.name, mime: v.type || "application/octet-stream", content: Buffer.from(await v.arrayBuffer()) });
    }
    await portalSubmit(getCtx(), token, { fields, files });
    return done();
  } catch (e) { return fail(e); }
}

// ---------- Public: signing ----------
export async function requestOtpAction(token: string): Promise<ActionResult> {
  try { await requestOtp(getCtx(), token); return { ok: true, message: "We've emailed you a 6-digit code" }; } catch (e) { return fail(e); }
}
export async function verifyOtpAction(token: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try { await verifyOtp(getCtx(), token, String(form.get("code") ?? "")); return done("Verified"); } catch (e) { return fail(e); }
}
export async function signAction(token: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "127.0.0.1";
    const drawn = String(form.get("drawn") ?? "");
    await signDocuments(getCtx(), token, drawn ? { kind: "drawn", data: drawn, ip, userAgent: h.get("user-agent") ?? "" } : { kind: "typed", data: String(form.get("typed") ?? ""), ip, userAgent: h.get("user-agent") ?? "" });
    return done("Signed. Thank you.");
  } catch (e) { return fail(e); }
}

export async function batchOfficerAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const r = await batchStart(getCtx(), { playbookId: "hk.resignDirector", clientIds: form.getAll("clientId").map(String), personId: String(form.get("personId") ?? ""), effectiveDate: String(form.get("effectiveDate") ?? "") });
    return done(`Prepared ${r.created} resignation task(s). Each request and invoice awaits approval.${r.skipped.length ? ` Skipped: ${r.skipped.map(s => s.reason).join("; ")}.` : ""}`);
  } catch (e) { return fail(e); }
}

export async function batchGenerateAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const { batchGenerate } = await import("@/domain/batch");
    const r = await batchGenerate(getCtx(), form.getAll("taskId").map(String));
    return done(`Prepared documents for ${r.generated.length} task(s). Review each signing or filing request in your intray.${r.skipped.length ? ` ${r.skipped.length} task(s) skipped: ${r.skipped.map(s => s.reason).join("; ")}.` : ""}`);
  } catch (e) { return fail(e); }
}
