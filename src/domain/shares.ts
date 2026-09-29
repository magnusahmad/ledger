// Share capital and members are derived from dated movements, so the members register
// is reproducible as at any date and always reconciles to issued capital.
import { and, eq, lte } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { person, shareClass, shareMovement } from "@/db/schema";
import { audit } from "./audit";

export class RegisterError extends Error {}

export async function createShareClass(ctx: Ctx, c: { clientId: string; name: string; nameZh?: string; currency?: string; votingRights?: boolean; unit?: "shares" | "quota" | "capital" }) {
  const [row] = await ctx.db.insert(shareClass).values({ id: ctx.ids.next("shc"), firmId: ctx.firmId, currency: "HKD", ...c }).returning();
  return row;
}

type Movement = typeof shareMovement.$inferSelect;

async function movements(ctx: Ctx, clientId: string, upTo?: string) {
  return ctx.db.select().from(shareMovement)
    .where(and(eq(shareMovement.firmId, ctx.firmId), eq(shareMovement.clientId, clientId), upTo ? lte(shareMovement.date, upTo) : undefined))
    .orderBy(shareMovement.date, shareMovement.createdAt, shareMovement.id);
}

/** Replays movements in date order; throws if any holding would go negative. */
function replay(ms: Movement[]) {
  const holdings = new Map<string, number>(); // `${classId}|${personId}` -> qty
  const issued = new Map<string, { issued: number; paidUpCents: number }>();
  const k = (c: string, p: string) => `${c}|${p}`;
  for (const m of ms) {
    const iss = issued.get(m.shareClassId) ?? { issued: 0, paidUpCents: 0 };
    if (m.kind === "allotment" || (m.kind === "capital_change" && m.quantity > 0)) {
      holdings.set(k(m.shareClassId, m.toPersonId!), (holdings.get(k(m.shareClassId, m.toPersonId!)) ?? 0) + m.quantity);
      iss.issued += m.quantity; iss.paidUpCents += m.amountPaidCents;
    } else if (m.kind === "transfer") {
      const from = holdings.get(k(m.shareClassId, m.fromPersonId!)) ?? 0;
      if (from < m.quantity) throw new RegisterError(`Transfer on ${m.date} of ${m.quantity} exceeds the ${from} held by the transferor`);
      holdings.set(k(m.shareClassId, m.fromPersonId!), from - m.quantity);
      holdings.set(k(m.shareClassId, m.toPersonId!), (holdings.get(k(m.shareClassId, m.toPersonId!)) ?? 0) + m.quantity);
    } else if (m.kind === "buyback" || m.kind === "cancellation" || (m.kind === "capital_change" && m.quantity < 0)) {
      const qty = Math.abs(m.quantity);
      const from = holdings.get(k(m.shareClassId, m.fromPersonId!)) ?? 0;
      if (from < qty) throw new RegisterError(`${m.kind} on ${m.date} of ${qty} exceeds the ${from} held`);
      holdings.set(k(m.shareClassId, m.fromPersonId!), from - qty);
      const ratio = iss.issued ? qty / iss.issued : 0;
      const reduction = m.kind === "buyback" ? m.amountPaidCents : Math.round(iss.paidUpCents * ratio);
      if (reduction < 0 || reduction > iss.paidUpCents) throw new RegisterError("Capital reduction exceeds paid-up share capital");
      iss.paidUpCents -= reduction;
      iss.issued -= qty;
    }
    issued.set(m.shareClassId, iss);
  }
  return { holdings, issued };
}

async function insertChecked(ctx: Ctx, m: Omit<typeof shareMovement.$inferInsert, "id" | "firmId">) {
  const existing = await movements(ctx, m.clientId);
  const candidate = { ...m, id: "candidate", firmId: ctx.firmId, createdAt: ctx.clock.now(), amountPaidCents: m.amountPaidCents ?? 0 } as Movement;
  const all = [...existing, candidate].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  replay(all); // throws RegisterError if any point in history goes negative
  const [row] = await ctx.db.insert(shareMovement).values({ ...m, id: ctx.ids.next("shm"), firmId: ctx.firmId, createdAt: ctx.clock.now() }).returning();
  await audit(ctx, `shares.${m.kind}`, "share_movement", row.id, { ...m });
  return row;
}

export function allot(ctx: Ctx, a: { clientId: string; shareClassId: string; date: string; toPersonId: string; quantity: number; amountPaidCents?: number; sourceTaskId?: string; note?: string; reference?: string }) {
  if (a.quantity <= 0) throw new RegisterError("Allotment quantity must be positive");
  return insertChecked(ctx, { ...a, kind: "allotment", amountPaidCents: a.amountPaidCents ?? 0 });
}

export function transfer(ctx: Ctx, t: { clientId: string; shareClassId: string; date: string; fromPersonId: string; toPersonId: string; quantity: number; considerationCents?: number; stampDutyCents?: number; sourceTaskId?: string; reference?: string; note?: string }) {
  if (t.quantity <= 0) throw new RegisterError("Transfer quantity must be positive");
  if (t.fromPersonId === t.toPersonId) throw new RegisterError("Transferor and transferee must differ");
  return insertChecked(ctx, { ...t, kind: "transfer" });
}

export function buyback(ctx: Ctx, t: { clientId: string; shareClassId: string; date: string; fromPersonId: string; quantity: number; considerationCents?: number; capitalReductionCents: number; sourceTaskId?: string; note?: string }) {
  if (t.quantity <= 0) throw new RegisterError("Buy-back quantity must be positive");
  if (!Number.isSafeInteger(t.capitalReductionCents) || t.capitalReductionCents < 0) throw new RegisterError("Specify the verified capital payment; use zero for a profits-funded buy-back");
  const { capitalReductionCents, ...movement } = t;
  return insertChecked(ctx, { ...movement, amountPaidCents: capitalReductionCents, kind: "buyback" });
}

export async function membersAsAt(ctx: Ctx, clientId: string, date: string) {
  const { holdings } = replay(await movements(ctx, clientId, date));
  const classes = await ctx.db.query.shareClass.findMany({ where: eq(shareClass.clientId, clientId) });
  const people = await ctx.db.query.person.findMany({ where: eq(person.firmId, ctx.firmId) });
  const totals = new Map<string, number>();
  for (const [key, q] of holdings) { const c = key.split("|")[0]; totals.set(c, (totals.get(c) ?? 0) + q); }
  const out = [...holdings.entries()].filter(([, q]) => q > 0).map(([key, quantity]) => {
    const [shareClassId, personId] = key.split("|");
    const p = people.find((x) => x.id === personId);
    const total = totals.get(shareClassId) ?? 0;
    return {
      shareClassId, className: classes.find((c) => c.id === shareClassId)?.name ?? "",
      personId, name: p?.nameEn ?? personId, nameZh: p?.nameZh ?? null,
      quantity, percent: total ? Math.round((quantity / total) * 10000) / 100 : 0,
    };
  });
  return out.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
}

export async function issuedAsAt(ctx: Ctx, clientId: string, date: string) {
  const { issued } = replay(await movements(ctx, clientId, date));
  const classes = await ctx.db.query.shareClass.findMany({ where: eq(shareClass.clientId, clientId) });
  return classes.map((c) => ({ shareClassId: c.id, name: c.name, currency: c.currency, unit: c.unit, ...(issued.get(c.id) ?? { issued: 0, paidUpCents: 0 }) }));
}

export async function movementHistory(ctx: Ctx, clientId: string) {
  return movements(ctx, clientId);
}
