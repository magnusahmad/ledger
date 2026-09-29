// An approval is for a particular set of facts, not a task id whose contents may change.
// Store only the digest: protected person fields never appear in the proposal payload.
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { Crypto } from "@/lib/crypto";
import { appointment, businessRegistration, client, person, shareClass, shareMovement, significantController, proposal, firm } from "@/db/schema";
import { getTask, invalidatePreparation, advance } from "./engine";
import { getPlaybook } from "./playbooks";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}

export async function approvalState(ctx: Ctx, taskId: string) {
  const t = await getTask(ctx, taskId);
  const [company, subject, pb, officers, classes, movements, controllers, br] = await Promise.all([
    ctx.db.query.client.findFirst({ where: and(eq(client.id, t.clientId), eq(client.firmId, ctx.firmId)) }),
    t.personId ? ctx.db.query.person.findFirst({ where: and(eq(person.id, t.personId), eq(person.firmId, ctx.firmId)) }) : null,
    getPlaybook(ctx, t.playbookId, t.playbookVersion),
    ctx.db.select().from(appointment).where(and(eq(appointment.clientId, t.clientId), eq(appointment.firmId, ctx.firmId))).orderBy(asc(appointment.id)),
    ctx.db.select().from(shareClass).where(and(eq(shareClass.clientId, t.clientId), eq(shareClass.firmId, ctx.firmId))).orderBy(asc(shareClass.id)),
    ctx.db.select().from(shareMovement).where(and(eq(shareMovement.clientId, t.clientId), eq(shareMovement.firmId, ctx.firmId))).orderBy(asc(shareMovement.id)),
    ctx.db.select().from(significantController).where(and(eq(significantController.clientId, t.clientId), eq(significantController.firmId, ctx.firmId))).orderBy(asc(significantController.id)),
    ctx.db.select().from(businessRegistration).where(and(eq(businessRegistration.clientId, t.clientId), eq(businessRegistration.firmId, ctx.firmId))).orderBy(asc(businessRegistration.id)),
  ]);
  const ids = [...new Set([...officers.map(o => o.personId), ...controllers.map(c => c.personId), ...movements.flatMap(m => [m.fromPersonId, m.toPersonId])].filter((id): id is string => !!id))];
  const [linkedPeople, presentor] = await Promise.all([
    ids.length ? ctx.db.select().from(person).where(and(eq(person.firmId, ctx.firmId), inArray(person.id, ids))).orderBy(asc(person.id)) : [],
    ctx.db.select({ legalName: firm.legalName, legalNameZh: firm.legalNameZh, address: firm.address, email: firm.email, phone: firm.phone, tcspLicence: firm.tcspLicence, settings: firm.settings }).from(firm).where(eq(firm.id, ctx.firmId)),
  ]);
  const facts = { clientId: t.clientId, personId: t.personId, effectiveDate: t.effectiveDate, periodKey: t.periodKey, checklist: t.checklist, extracted: t.extracted, params: t.params, stepIndex: t.stepIndex, stepState: t.stepState, company, subject, pb, officers, classes, movements, controllers, br, linkedPeople, presentor };
  return Crypto.sha256(JSON.stringify(canonical(facts)));
}

export async function expireApproval(ctx: Ctx, taskId: string, proposalId: string) {
  await invalidatePreparation(ctx, taskId, "The facts changed after the approval preview");
  // approveProposal already claimed this card; preserve its superseded state on failure.
  await ctx.db.update(proposal).set({ status: "superseded", decidedAt: ctx.clock.now() }).where(and(eq(proposal.id, proposalId), eq(proposal.firmId, ctx.firmId)));
  await advance(ctx, taskId);
}

export async function assertApprovalState(ctx: Ctx, taskId: string, expected: unknown, proposalId: string) {
  if (typeof expected !== "string" || expected !== await approvalState(ctx, taskId)) {
    await expireApproval(ctx, taskId, proposalId);
    throw new Error("The task or company facts have changed since this preview. Preparation has restarted for a fresh approval.");
  }
}
