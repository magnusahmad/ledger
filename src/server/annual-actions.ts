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
