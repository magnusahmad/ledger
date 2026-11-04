// Annual-return and AGM cases (UHY pilot brief, "The annual cycle"). Steps run in order and each
// records the person who did it. Creating a draft is not sending: a case reaches "sent" only when
// the sent email is seen in the mailbox or staff record it. "Registered" writes the filing, so the
// deadline engine treats the period as done.
import { and, asc, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { AR_STAGES, arCase, arCaseEvent, client as clientT, filing, type ArStage } from "@/db/schema";
import { upcomingDeadlines } from "@/domain/deadlines";
import { addDays } from "@/domain/dates";
import { allPlaybookFiles, getPlaybook } from "@/domain/playbooks";
import type { PlaybookDef } from "@/domain/playbook-types";
import { annualReturnDates } from "./dispatch";

/** Overdue periods older than this are left out of a new case list (likely done by hand before the pilot). */
export const OVERDUE_GRACE_DAYS = 30;

const rank = (s: ArStage) => AR_STAGES.indexOf(s);
const now = (ctx: Ctx) => ctx.clock.now();

/** The firm's annual-return playbook, or the library version before the firm's playbooks are loaded. */
export async function arPlaybook(ctx: Ctx): Promise<PlaybookDef> {
  try { return await getPlaybook(ctx, "hk.annualReturn"); }
  catch { return allPlaybookFiles().filter((p) => p.id === "hk.annualReturn").sort((a, b) => b.version - a.version)[0]; }
}

/**
 * Opens a case for each annual return and AGM due between OVERDUE_GRACE_DAYS ago and `withinDays`
 * ahead. Annual returns are worked out from the playbook rule per year rather than the deadline
 * engine's "last unfiled period", so a new installation without filing history starts on the
 * current cycle instead of last year's.
 */
export async function syncCases(ctx: Ctx, o: { withinDays: number }) {
  const today = ctx.clock.today();
  const from = addDays(today, -OVERDUE_GRACE_DAYS), to = addDays(today, o.withinDays);
  const pb = await arPlaybook(ctx);
  const found: { clientId: string; kind: "AR" | "AGM"; periodKey: string; periodYear: number; dueDate: string }[] = [];
  const clients = await ctx.db.select().from(clientT).where(eq(clientT.firmId, ctx.firmId));
  const filed = new Set((await ctx.db.select({ c: filing.clientId, k: filing.periodKey }).from(filing).where(eq(filing.firmId, ctx.firmId))).map((f) => `${f.c} ${f.k}`));
  const Y = Number(today.slice(0, 4));
  for (const c of clients) {
    if (c.jurisdiction !== "HK" || !c.incorporatedOn || c.lifecycle === "prospect" || c.lifecycle === "ceased" || ["not_incorporated", "deregistering", "struck_off"].includes(c.operatingStatus)) continue;
    for (const y of [Y - 1, Y, Y + 1]) {
      if (`${y}${c.incorporatedOn.slice(4)}` <= c.incorporatedOn) continue;
      const d = annualReturnDates({ incorporatedOn: c.incorporatedOn, year: y, playbook: pb });
      const periodKey = `NAR1:${y}`;
      if (d.deadline >= from && d.deadline <= to && !filed.has(`${c.id} ${periodKey}`)) found.push({ clientId: c.id, kind: "AR", periodKey, periodYear: y, dueDate: d.deadline });
    }
  }
  for (const d of await upcomingDeadlines(ctx, { withinDays: o.withinDays, includeCovered: true }))
    if (d.key === "AGM" && d.periodKey && d.dueDate >= from) found.push({ clientId: d.clientId, kind: "AGM", periodKey: d.periodKey, periodYear: d.periodYear, dueDate: d.dueDate });
  for (const f of found) {
    await ctx.db.insert(arCase).values({ id: ctx.ids.next("arc"), firmId: ctx.firmId, ...f })
      .onConflictDoNothing({ target: [arCase.firmId, arCase.clientId, arCase.periodKey] });
  }
}

export type CaseRow = typeof arCase.$inferSelect & { clientName: string; clientCode: string | null };

export async function listCases(ctx: Ctx): Promise<CaseRow[]> {
  const rows = await ctx.db.select({ c: arCase, name: clientT.nameEn, code: clientT.code }).from(arCase)
    .innerJoin(clientT, and(eq(clientT.id, arCase.clientId), eq(clientT.firmId, arCase.firmId)))
    .where(eq(arCase.firmId, ctx.firmId)).orderBy(asc(arCase.dueDate), asc(clientT.nameEn));
  return rows.map((r) => ({ ...r.c, clientName: r.name, clientCode: r.code }));
}

async function load(ctx: Ctx, id: string) {
  const c = await ctx.db.query.arCase.findFirst({ where: and(eq(arCase.id, id), eq(arCase.firmId, ctx.firmId)) });
  if (!c) throw new Error("Case not found");
  return c;
}

async function step(ctx: Ctx, id: string, kind: string, patch: Partial<typeof arCase.$inferInsert>, detail: Record<string, unknown> = {}) {
  await ctx.db.transaction(async (db) => {
    await db.update(arCase).set({ ...patch, updatedAt: now(ctx) }).where(and(eq(arCase.id, id), eq(arCase.firmId, ctx.firmId)));
    await db.insert(arCaseEvent).values({ id: ctx.ids.next("arce"), firmId: ctx.firmId, caseId: id, at: now(ctx), userId: ctx.userId, kind, detail });
  });
}

function need(c: { stage: ArStage }, at: ArStage, what: string) {
  if (c.stage !== at) throw new Error(`${what} (the case is at "${c.stage}")`);
}

export async function startAtStage(ctx: Ctx, id: string, stage: ArStage) {
  const c = await load(ctx, id);
  const events = await ctx.db.select({ id: arCaseEvent.id }).from(arCaseEvent).where(and(eq(arCaseEvent.caseId, id), eq(arCaseEvent.firmId, ctx.firmId))).limit(1);
  if (events.length || c.stage !== "due") throw new Error("This case has already started; its stage can't be set again");
  if (!AR_STAGES.includes(stage)) throw new Error(`Unknown stage ${stage}`);
  await step(ctx, id, "started_at_stage", { stage, startedAtStage: stage }, { stage });
}

export async function recordRegistryCheck(ctx: Ctx, id: string, r: { result: "no_changes" | "changes_found"; note?: string }) {
  const c = await load(ctx, id);
  if (rank(c.stage) > rank("payment_confirmed")) throw new Error("The Registry check belongs before the papers go to the client");
  await step(ctx, id, "registry_check", { registryCheck: { ...r, by: ctx.userId, at: now(ctx).toISOString() } }, r);
}

export async function markPrepared(ctx: Ctx, id: string, o: { formSource: "generated" | "csa"; documentId?: string; returnBy?: string }) {
  const c = await load(ctx, id);
  need(c, "due", "Only a due case can be prepared");
  if (c.kind === "AR" && !c.registryCheck) throw new Error("Record the Registry check first");
  await step(ctx, id, "prepared", { stage: "prepared", formSource: o.formSource, formDocumentId: o.documentId ?? null, returnBy: o.returnBy ?? c.returnBy }, o);
}

export async function recordFormCompare(ctx: Ctx, id: string, o: { same: boolean; notes?: string }) {
  await load(ctx, id);
  await step(ctx, id, "form_compare", { formCompare: { ...o, by: ctx.userId, at: now(ctx).toISOString() } }, o);
}

export async function confirmPayment(ctx: Ctx, id: string) {
  const c = await load(ctx, id);
  need(c, "prepared", "Payment is confirmed after the papers are prepared");
  await step(ctx, id, "payment_confirmed", { stage: "payment_confirmed", paymentConfirmedBy: ctx.userId, paymentConfirmedAt: now(ctx) });
}

export async function recordDraft(ctx: Ctx, id: string, d: { mailbox: string; draftId: string; conversationId: string | null }) {
  const c = await load(ctx, id);
  if (c.stage !== "payment_confirmed" && c.stage !== "draft_ready") throw new Error("Confirm payment before drafting the email to the client");
  await step(ctx, id, "draft_created", { stage: "draft_ready", draft: { ...d, by: ctx.userId, at: now(ctx).toISOString() } }, d);
}

export async function markSent(ctx: Ctx, id: string, o: { via: "seen_in_sent_items" | "staff"; at: Date }) {
  const c = await load(ctx, id);
  need(c, "draft_ready", "Only a drafted email can be marked sent");
  await step(ctx, id, "sent", { stage: "sent", sentAt: o.at }, { via: o.via });
}

export async function markSignedReceived(ctx: Ctx, id: string, o: { via?: "scan" | "email" | "staff" } = {}) {
  const c = await load(ctx, id);
  need(c, "sent", "Signed papers come back after the email is sent");
  await step(ctx, id, "signed_received", { stage: "signed_received" }, { via: o.via ?? "staff" });
}

export async function markFiled(ctx: Ctx, id: string, o: { filedOn: string }) {
  const c = await load(ctx, id);
  need(c, "signed_received", "File after the signed papers are back");
  await step(ctx, id, "filed", { stage: "filed", filedOn: o.filedOn }, o);
}

export async function markRegistered(ctx: Ctx, id: string, o: { registeredOn: string; reference?: string }) {
  const c = await load(ctx, id);
  need(c, "filed", "Registration follows filing");
  await ctx.db.transaction(async (db) => {
    const tx = { ...ctx, db: db as unknown as Ctx["db"] };
    await step(tx, id, "registered", { stage: "registered", registeredOn: o.registeredOn }, o);
    await db.insert(filing).values({
      id: ctx.ids.next("fil"), firmId: ctx.firmId, clientId: c.clientId, form: c.kind === "AR" ? "NAR1" : "AGM",
      description: c.kind === "AR" ? `Annual return ${c.periodYear}` : `AGM ${c.periodYear}`, filedOn: c.filedOn ?? o.registeredOn,
      reference: o.reference ?? null, periodKey: c.periodKey,
    });
  });
}

export async function caseEvents(ctx: Ctx, id: string) {
  return ctx.db.select().from(arCaseEvent).where(and(eq(arCaseEvent.caseId, id), eq(arCaseEvent.firmId, ctx.firmId))).orderBy(asc(arCaseEvent.at), asc(arCaseEvent.id));
}
