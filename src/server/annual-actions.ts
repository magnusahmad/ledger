"use server";
// Annual-return pilot actions. Each runs as the signed-in staff member (src/server/pilot.ts) and
// calls the tested domain functions in src/annual; nothing here sends email.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getCtx } from "./ctx";
import { pilotCtx } from "./pilot";
import type { ActionResult } from "./actions";
import { signIn, signOut } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/auth-cookie";
import { AR_STAGES, type ArStage } from "@/db/schema";
import * as cases from "@/annual/cases";
import { draftDispatch, prepareCase } from "@/annual/service";
import { annualDeps } from "@/annual/runtime";
import { resolveAsk } from "@/annual/mail-sync";
import { isIsoDate } from "@/domain/dates";
import * as replies from "@/annual/reply-review";
import { CHANGE_TYPES } from "@/annual/reply-types";

const fail = (e: unknown): ActionResult => ({ ok: false, error: (e as Error).message });
const done = (message?: string): ActionResult => { refresh(); return { ok: true, message }; };
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const date = (f: FormData, k: string) => { const v = s(f, k); if (!isIsoDate(v)) throw new Error("Enter a valid date"); return v; };

export async function signInAction(_p: ActionResult | null, f: FormData): Promise<ActionResult> {
  const ctx = getCtx();
  const r = await signIn(ctx, s(f, "email"), String(f.get("password") ?? ""));
  if (!r.ok) return { ok: false, error: r.error };
  (await cookies()).set(SESSION_COOKIE, r.token, { httpOnly: true, secure: ctx.config.APP_URL.startsWith("https://"), sameSite: "strict", path: "/", expires: r.expiresAt });
  const next = s(f, "next");
  return { ok: true, redirectTo: next.startsWith("/") && !next.startsWith("//") ? next : "/" };
}

export async function signOutAction() {
  const jar = await cookies();
  const t = jar.get(SESSION_COOKIE)?.value;
  if (t) await signOut(getCtx(), t);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

async function run(f: (ctx: Awaited<ReturnType<typeof pilotCtx>>["ctx"]) => Promise<unknown>, message?: string): Promise<ActionResult> {
  try { const { ctx } = await pilotCtx(); await f(ctx); return done(message); } catch (e) { return fail(e); }
}

export async function startAtStageAction(id: string, _p: ActionResult | null, f: FormData) {
  const stage = s(f, "stage") as ArStage;
  if (!AR_STAGES.includes(stage)) return fail(new Error("Choose a stage"));
  return run((ctx) => cases.startAtStage(ctx, id, stage));
}
export async function registryCheckAction(id: string, _p: ActionResult | null, f: FormData) {
  const result = s(f, "result");
  if (result !== "no_changes" && result !== "changes_found") return fail(new Error("Choose what the Registry shows"));
  if (result === "changes_found" && !s(f, "note")) return fail(new Error("Say what changed"));
  return run((ctx) => cases.recordRegistryCheck(ctx, id, { result, note: s(f, "note") || undefined }));
}
export async function prepareAction(id: string, _p: ActionResult | null, f: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await pilotCtx();
    const deps = annualDeps(ctx.config);
    const r = await prepareCase(ctx, deps, id, { returnBy: s(f, "returnBy") || undefined });
    if (!r.ok) return { ok: false, error: r.reason };
    return done(r.filedPath ? "Prepared and saved to the client folder." : "Prepared.");
  } catch (e) { return fail(e); }
}
export async function useCsaFormAction(id: string) { return run((ctx) => cases.markPrepared(ctx, id, { formSource: "csa" }), "Marked as prepared in CSA."); }
export async function compareAction(id: string, _p: ActionResult | null, f: FormData) {
  const same = s(f, "same");
  if (same !== "yes" && same !== "no") return fail(new Error("Say whether they match"));
  if (same === "no" && !s(f, "notes")) return fail(new Error("Say what differs"));
  return run((ctx) => cases.recordFormCompare(ctx, id, { same: same === "yes", notes: s(f, "notes") || undefined }));
}
export async function confirmPaymentAction(id: string) { return run((ctx) => cases.confirmPayment(ctx, id), "Payment confirmed."); }
export async function draftAction(id: string, _p: ActionResult | null, f: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await pilotCtx();
    const deps = annualDeps(ctx.config);
    await draftDispatch(ctx, deps, id, { returnBy: s(f, "returnBy") || undefined, includeAgm: f.get("includeAgm") === "on" });
    return done("Draft saved in your Outlook Drafts folder. Review and send it from Outlook.");
  } catch (e) { return fail(e); }
}
export async function markSentAction(id: string) { return run((ctx) => cases.markSent(ctx, id, { via: "staff", at: ctx.clock.now() })); }
export async function signedAction(id: string) { return run((ctx) => cases.markSignedReceived(ctx, id, { via: "staff" })); }
export async function filedAction(id: string, _p: ActionResult | null, f: FormData) { return run((ctx) => cases.markFiled(ctx, id, { filedOn: date(f, "filedOn") })); }
export async function registeredAction(id: string, _p: ActionResult | null, f: FormData) { return run((ctx) => cases.markRegistered(ctx, id, { registeredOn: date(f, "registeredOn"), reference: s(f, "reference") || undefined })); }
export async function resolveAskAction(mailId: string, _p: ActionResult | null, f: FormData) {
  const choice = s(f, "caseId");
  return run((ctx) => resolveAsk(ctx, mailId, choice === "none" ? null : choice));
}

// ---- Client replies read by the model (src/annual/reply-review.ts). Each action is one decision by
// the signed-in person; nothing here accepts several points at once.
const changeValue = (f: FormData) => {
  const changeType = s(f, "changeType");
  if (!(CHANGE_TYPES as readonly string[]).includes(changeType)) throw new Error("Choose the kind of change");
  if (!s(f, "detail")) throw new Error("Say what changed");
  const effectiveDate = s(f, "effectiveDate");
  if (effectiveDate && !isIsoDate(effectiveDate)) throw new Error("Enter a valid date");
  return { changeType, subject: s(f, "subject") || null, detail: s(f, "detail"), effectiveDate: effectiveDate || null, quote: s(f, "quote") || null, source: s(f, "source") || "email" };
};
export async function openSourceAction(replyId: string) { return run((ctx) => replies.openSource(ctx, replyId)); }
export async function acceptItemAction(itemId: string) { return run((ctx) => replies.decideItem(ctx, itemId, { action: "accept" })); }
export async function rejectItemAction(itemId: string) { return run((ctx) => replies.decideItem(ctx, itemId, { action: "reject" })); }
export async function editChangeAction(itemId: string, _p: ActionResult | null, f: FormData) {
  return run(async (ctx) => replies.decideItem(ctx, itemId, { action: "edit", value: changeValue(f) }));
}
export async function answerChargesAction(itemId: string, _p: ActionResult | null, f: FormData) {
  return run((ctx) => replies.answerCharges(ctx, itemId, { answer: s(f, "answer"), details: s(f, "details") }));
}
export async function addMissedAction(replyId: string, _p: ActionResult | null, f: FormData) {
  const kind = s(f, "kind");
  return run(async (ctx) => {
    if (kind === "change") await replies.addMissed(ctx, replyId, { kind, value: changeValue(f) });
    else if (kind === "charges") await replies.addMissed(ctx, replyId, { kind, value: { answer: s(f, "answer"), details: s(f, "details") } });
    else if (kind === "signed_papers") await replies.addMissed(ctx, replyId, { kind, value: { document: s(f, "document") || "annual_return", filename: s(f, "filename") || null, quote: null } });
    else throw new Error("Choose what to add");
  }, "Added.");
}
export async function finishReviewAction(caseId: string, replyId: string, _p?: ActionResult | null, _f?: FormData): Promise<ActionResult> {
  void _p; void _f;
  try { const { ctx } = await pilotCtx(); await replies.finishReview(ctx, replyId); return { ok: true, redirectTo: `/annual/${caseId}` }; } catch (e) { return fail(e); }
}
export async function settleChangeAction(itemId: string, _p: ActionResult | null, f: FormData) { return run((ctx) => replies.settleChange(ctx, itemId, { reason: s(f, "reason") })); }
export async function prepareAgainAction(id: string, useCsaForm: boolean): Promise<ActionResult> {
  try {
    const { ctx } = await pilotCtx();
    const r = await replies.prepareAgain(ctx, annualDeps(ctx.config), id, { useCsaForm });
    if (!r.ok) return { ok: false, error: r.reason };
    return done(useCsaForm ? "Marked as prepared again in CSA." : r.filedPath ? "Prepared again and saved to the client folder." : "Prepared again.");
  } catch (e) { return fail(e); }
}
