// Sparse company-approved changes replay by effective date. An unrelated later
// email/address patch must not undo a backdated name change.
import { and, eq, lte, or, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { client, person, registerPersonChange, type RegisterPersonPatch } from "@/db/schema";
import { isIsoDate } from "./dates";
import type { Task } from "./engine";

/** Existing references and explicit future parties all contribute to the facts
 * reviewed by staff, even before a new company has enrolled that person. */
type RegisterTaskActors = Pick<Task, "clientId" | "personId" | "params" | "playbookId">;
export async function registerActorIds(ctx: Ctx, task: RegisterTaskActors) {
  const refs = await ctx.db.execute(sql`
    select person_id as id from appointment where firm_id = ${ctx.firmId} and client_id = ${task.clientId}
    union select person_id from significant_controller where firm_id = ${ctx.firmId} and client_id = ${task.clientId}
    union select from_person_id from share_movement where firm_id = ${ctx.firmId} and client_id = ${task.clientId}
    union select to_person_id from share_movement where firm_id = ${ctx.firmId} and client_id = ${task.clientId}`);
  const ids = new Set(refs.rows.map(r => r.id).filter((id): id is string => typeof id === "string" && !!id));
  if (task.personId) ids.add(task.personId);
  // These existing effects select the firm's corporate secretary even when no
  // subject or prior company reference exists. Capture that prospective actor.
  if (["hk.changeSecretary", "hk.transferIn"].includes(task.playbookId)) {
    const secretaries = await ctx.db.select({ id: person.id }).from(person).where(and(eq(person.firmId, ctx.firmId), or(eq(person.id, "per_firm"), eq(person.id, `${ctx.firmId}:per_firm`))));
    for (const secretary of secretaries) ids.add(secretary.id);
  }
  for (const [key, fields] of [["structured", ["fromPersonId", "toPersonId"]], ["controllerPlan", ["personId"]]] as const) {
    const plan = task.params[key];
    if (!plan || typeof plan !== "object" || !("items" in plan) || !Array.isArray(plan.items)) continue;
    for (const item of plan.items) {
      if (!item || typeof item !== "object") continue;
      for (const field of fields) if (typeof item[field] === "string" && item[field]) ids.add(item[field]);
    }
  }
  return [...ids].sort();
}

export async function lockRegisterPeople(ctx: Ctx, task: RegisterTaskActors) {
  const ids = await registerActorIds(ctx, task);
  if (ids.length) await ctx.db.execute(sql`select id from person where firm_id = ${ctx.firmId} and id in (${sql.join(ids.map(id => sql`${id}`), sql`, `)}) order by id for update`);
}

export async function registerPeopleAsAt(ctx: Ctx, clientId: string, date: string) {
  if (!isIsoDate(date)) throw new Error("Choose a valid register date");
  const company = await ctx.db.query.client.findFirst({ where: and(eq(client.id, clientId), eq(client.firmId, ctx.firmId)) });
  if (!company) throw new Error("Company not found for this firm");
  const people = await ctx.db.select().from(person).where(eq(person.firmId, ctx.firmId));
  const changes = await ctx.db.select().from(registerPersonChange).where(and(eq(registerPersonChange.firmId, ctx.firmId), eq(registerPersonChange.clientId, clientId), lte(registerPersonChange.fromDate, date)))
    .orderBy(registerPersonChange.fromDate, registerPersonChange.sequence);
  const dated = new Map(people.map(p => [p.id, p]));
  for (const change of changes) {
    const p = dated.get(change.personId);
    if (p) dated.set(p.id, { ...p, ...change.patch });
  }
  return [...dated.values()];
}

export async function registerPersonAsAt(ctx: Ctx, clientId: string, personId: string, date: string) {
  const p = (await registerPeopleAsAt(ctx, clientId, date)).find(p => p.id === personId);
  if (!p) throw new Error("Person not found for this firm");
  return p;
}

/** Called under a person row lock before a working profile changes. Existing
 * references retain the known prior facts without needing another firm's click. */
export async function preserveRegisterBaselines(ctx: Ctx, personId: string, includeClientId?: string) {
  await ctx.db.execute(sql`select id from person where id = ${personId} and firm_id = ${ctx.firmId} for update`);
  const p = await ctx.db.query.person.findFirst({ where: and(eq(person.id, personId), eq(person.firmId, ctx.firmId)) });
  if (!p) throw new Error("Person not found for this firm");
  const refs = await ctx.db.execute(sql`
    select client_id as "clientId" from appointment where firm_id = ${ctx.firmId} and person_id = ${personId}
    union select client_id from significant_controller where firm_id = ${ctx.firmId} and person_id = ${personId}
    union select client_id from share_movement where firm_id = ${ctx.firmId} and (from_person_id = ${personId} or to_person_id = ${personId})`);
  const clientIds = new Set(refs.rows.map(r => String(r.clientId)));
  if (includeClientId) clientIds.add(includeClientId);
  const patch = Object.fromEntries(Object.entries(p).filter(([key]) => !["id", "firmId", "createdAt"].includes(key))) as RegisterPersonPatch;
  for (const clientId of clientIds) {
    const owned = await ctx.db.query.client.findFirst({ where: and(eq(client.id, clientId), eq(client.firmId, ctx.firmId)) });
    if (!owned) throw new Error("Registered company does not belong to this firm");
    await ctx.db.insert(registerPersonChange).values({ id: ctx.ids.next("rpc"), firmId: ctx.firmId, clientId, personId, fromDate: "0001-01-01", patch, sourceTaskId: null }).onConflictDoNothing();
  }
  return p;
}

export async function recordRegisterPersonPatch(ctx: Ctx, clientId: string, personId: string, fromDate: string, patch: RegisterPersonPatch, sourceTaskId: string) {
  if (!isIsoDate(fromDate)) throw new Error("Choose a valid effective date");
  await preserveRegisterBaselines(ctx, personId, clientId);
  await ctx.db.insert(registerPersonChange).values({ id: ctx.ids.next("rpc"), firmId: ctx.firmId, clientId, personId, fromDate, patch, sourceTaskId }).onConflictDoNothing();
}
