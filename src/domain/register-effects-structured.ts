// Register effects that need structured facts: allotments, transfers, buy-backs and the
// significant controllers register. The agent structures the client's instruction once;
// the structured plan is stored on the task so the preview and the applied change match.
import { and, eq, isNull } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { shareClass, significantController, task as taskT } from "@/db/schema";
import type { RegisterEffect } from "./playbook-types";
import type { Task } from "./engine";
import { membersAsAt, issuedAsAt, allot, transfer, buyback, createShareClass } from "./shares";
import { resolvePerson } from "./people";
import { structureMovements, type Movements } from "@/agent/structure";
import { verifiedBuyback } from "./buyback-facts";
import { stampDuty } from "./stamp-duty";

type Planned = { effect: RegisterEffect["kind"]; description: string; apply: () => Promise<void> };
const n = (x: number) => x.toLocaleString("en-US");

export async function movementsFor(ctx: Ctx, t: Task, v: Record<string, string>): Promise<Movements> {
  const cached = (t.params.structured as Movements | undefined);
  if (cached) return cached;
  const instruction = v.allotmentDetails ?? v.transferDetails ?? v.buybackDetails ?? v.cnEquityTransfer ?? v.moQuotaTransfer ?? "";
  const members = (await membersAsAt(ctx, t.clientId, ctx.clock.today())).map((m) => ({ personId: m.personId, name: m.name, className: m.className, quantity: m.quantity }));
  const classes = (await ctx.db.select().from(shareClass).where(eq(shareClass.clientId, t.clientId))).map((c) => c.name);
  const m = instruction ? await structureMovements(ctx, { taskId: t.id, instruction, members, classes }) : { items: [] };
  await ctx.db.update(taskT).set({ params: { ...t.params, structured: m } }).where(eq(taskT.id, t.id));
  return m;
}

async function classId(ctx: Ctx, clientId: string, name: string) {
  const existing = (await ctx.db.select().from(shareClass).where(eq(shareClass.clientId, clientId))).find((c) => c.name.toLowerCase() === name.toLowerCase());
  return existing?.id ?? (await createShareClass(ctx, { clientId, name })).id;
}

export async function planStructured(ctx: Ctx, t: Task, e: RegisterEffect, v: Record<string, string>, eff: string): Promise<Planned[]> {
  if (e.kind === "update_controllers") return planControllers(ctx, t, eff, await movementsFor(ctx, t, v).catch(() => ({ items: [] })));
  if (!["allot_shares", "transfer_shares", "buyback_shares"].includes(e.kind)) return [];
  const m = await movementsFor(ctx, t, v);
  const out: Planned[] = [];
  for (const it of m.items) {
    if (it.kind === "allotment" && e.kind === "allot_shares") {
      out.push({ effect: e.kind, description: `Allot ${n(it.quantity)} ${it.className} shares to ${it.toName} on ${eff}`, apply: async () => {
        const p = await resolvePerson(ctx, t.clientId, { personId: it.toPersonId, nameEn: it.toName, nameZh: it.toNameZh });
        const paid = it.considerationCents ?? (it.pricePerShareCents ?? 0) * it.quantity;
        await allot(ctx, { clientId: t.clientId, shareClassId: await classId(ctx, t.clientId, it.className), date: eff, toPersonId: p.id, quantity: it.quantity, amountPaidCents: paid, sourceTaskId: t.id, note: v.allotmentDetails });
      } });
    }
    if (it.kind === "transfer" && e.kind === "transfer_shares") {
      const consideration = it.considerationCents ?? (it.pricePerShareCents ?? 0) * it.quantity;
      const duty = t.playbookId.startsWith("hk.") ? stampDuty({ considerationCents: consideration }) : { totalCents: 0 };
      out.push({ effect: e.kind, description: `Transfer ${n(it.quantity)} ${it.className} shares from ${it.fromName} to ${it.toName} on ${eff}${duty.totalCents ? ` (stamp duty HK$${n(duty.totalCents / 100)})` : ""}`, apply: async () => {
        const from = await resolvePerson(ctx, t.clientId, { personId: it.fromPersonId, nameEn: it.fromName });
        const to = await resolvePerson(ctx, t.clientId, { personId: it.toPersonId, nameEn: it.toName, nameZh: it.toNameZh });
        await transfer(ctx, { clientId: t.clientId, shareClassId: await classId(ctx, t.clientId, it.className), date: eff, fromPersonId: from.id, toPersonId: to.id, quantity: it.quantity, considerationCents: consideration, stampDutyCents: duty.totalCents || undefined, sourceTaskId: t.id, note: v.transferDetails ?? v.cnEquityTransfer ?? v.moQuotaTransfer });
      } });
    }
    if (it.kind === "buyback" && e.kind === "buyback_shares") {
      const verified = verifiedBuyback(m.items, await issuedAsAt(ctx, t.clientId, eff), await membersAsAt(ctx, t.clientId, eff));
      out.push({ effect: e.kind, description: `Buy back ${n(it.quantity)} ${it.className} shares from ${it.fromName} on ${eff}; reduce capital by ${verified.cls.currency} ${n(verified.capitalReductionCents / 100)} to ${n(verified.postCapitalCents / 100)}`, apply: async () => {
        const from = await resolvePerson(ctx, t.clientId, { personId: it.fromPersonId, nameEn: it.fromName });
        await buyback(ctx, { clientId: t.clientId, shareClassId: await classId(ctx, t.clientId, it.className), date: eff, fromPersonId: from.id, quantity: it.quantity, considerationCents: it.considerationCents ?? undefined, capitalReductionCents: verified.capitalReductionCents, sourceTaskId: t.id });
      } });
    }
  }
  return out;
}

/** Holding over 25% of the issued shares makes someone registrable (Cap. 622 Sch. 5A, simplified to shareholding). */
async function planControllers(ctx: Ctx, t: Task, eff: string, m: Movements): Promise<Planned[]> {
  const current = await membersAsAt(ctx, t.clientId, eff);
  const hold = new Map<string, { name: string; q: number }>();
  for (const x of current) hold.set(x.personId, { name: x.name, q: (hold.get(x.personId)?.q ?? 0) + x.quantity });
  const key = (id: string | null, name: string | null) => id ?? `new:${name}`;
  for (const it of m.items) {
    const to = key(it.toPersonId, it.toName), from = key(it.fromPersonId, it.fromName);
    if (it.kind !== "buyback") hold.set(to, { name: it.toName ?? to, q: (hold.get(to)?.q ?? 0) + it.quantity });
    if (it.kind !== "allotment") hold.set(from, { name: it.fromName ?? from, q: (hold.get(from)?.q ?? 0) - it.quantity });
  }
  const total = [...hold.values()].reduce((s, x) => s + Math.max(0, x.q), 0);
  const registrable = new Set([...hold.entries()].filter(([, x]) => total && x.q / total > 0.25).map(([id]) => id));
  const existing = await ctx.db.select().from(significantController).where(and(eq(significantController.clientId, t.clientId), isNull(significantController.ceasedOn)));
  const out: Planned[] = [];
  for (const id of registrable) {
    if (existing.some((s) => s.personId === id)) continue;
    const h = hold.get(id)!;
    const pct = Math.round((h.q / total) * 1000) / 10;
    out.push({ effect: "update_controllers", description: `Enter ${h.name} in the significant controllers register (holds ${pct}% of the issued shares)`, apply: async () => {
      const p = await resolvePerson(ctx, t.clientId, { personId: id.startsWith("new:") ? null : id, nameEn: h.name });
      await ctx.db.insert(significantController).values({ id: ctx.ids.next("scr"), firmId: ctx.firmId, clientId: t.clientId, personId: p.id, nature: `Holds more than 25% of the issued shares (${pct}%)`, registrableFrom: eff, sourceTaskId: t.id });
    } });
  }
  for (const s of existing) {
    if (registrable.has(s.personId)) continue;
    const h = hold.get(s.personId);
    out.push({ effect: "update_controllers", description: `Record that ${h?.name ?? s.personId} ceased to be a significant controller on ${eff}`, apply: async () => {
      await ctx.db.update(significantController).set({ ceasedOn: eff }).where(eq(significantController.id, s.id));
    } });
  }
  return out;
}
