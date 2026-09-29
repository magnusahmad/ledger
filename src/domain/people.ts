// Resolving the person an instruction is about, without creating duplicates.
import { and, eq, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { appointment, contact, person, shareMovement } from "@/db/schema";
import { createPerson } from "./records";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9㐀-鿿]/g, "");

export async function peopleLinkedToClient(ctx: Ctx, clientId: string) {
  const ids = new Set<string>();
  for (const r of await ctx.db.select({ id: appointment.personId }).from(appointment).where(eq(appointment.clientId, clientId))) ids.add(r.id);
  for (const r of await ctx.db.select({ a: shareMovement.toPersonId, b: shareMovement.fromPersonId }).from(shareMovement).where(eq(shareMovement.clientId, clientId))) { if (r.a) ids.add(r.a); if (r.b) ids.add(r.b); }
  for (const r of await ctx.db.select({ id: contact.personId }).from(contact).where(eq(contact.clientId, clientId))) if (r.id) ids.add(r.id);
  if (ids.size === 0) return [];
  const rows = await ctx.db.select().from(person).where(and(eq(person.firmId, ctx.firmId), sql`${person.id} in ${[...ids]}`));
  return rows;
}

export async function resolvePerson(ctx: Ctx, clientId: string, p: { personId?: string | null; nameEn?: string | null; nameZh?: string | null; email?: string | null }) {
  if (p.personId) {
    const row = await ctx.db.query.person.findFirst({ where: and(eq(person.id, p.personId), eq(person.firmId, ctx.firmId)) });
    if (row) return row;
  }
  const linked = await peopleLinkedToClient(ctx, clientId);
  const byName = linked.find((x) => (p.nameEn && norm(x.nameEn) === norm(p.nameEn)) || (p.nameZh && x.nameZh && norm(x.nameZh) === norm(p.nameZh)));
  if (byName) return byName;
  if (p.email) {
    const byEmail = await ctx.db.query.person.findFirst({ where: and(eq(person.firmId, ctx.firmId), sql`lower(${person.email}) = ${p.email.toLowerCase()}`) });
    if (byEmail && (!p.nameEn || norm(byEmail.nameEn) === norm(p.nameEn))) return byEmail;
  }
  return createPerson(ctx, { nameEn: p.nameEn || p.nameZh || "Unnamed person", nameZh: p.nameZh ?? null, email: p.email ?? null });
}
