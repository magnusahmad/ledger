// Deterministic sender lookup: which clients is this address linked to (as a contact or
// as an officer/member's email)? The intake agent confirms or overrides the match.
import { and, eq, isNull, or, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { appointment, client, contact, person } from "@/db/schema";

export async function findClientsBySenderEmail(ctx: Ctx, email: string) {
  const e = email.trim().toLowerCase();
  const out = new Map<string, { client: typeof client.$inferSelect; personId: string | null; contactId: string | null; via: string }>();
  const contacts = await ctx.db.select({ c: contact, cl: client }).from(contact).innerJoin(client, eq(client.id, contact.clientId))
    .where(and(eq(contact.firmId, ctx.firmId), sql`lower(${contact.email}) = ${e}`));
  for (const { c, cl } of contacts) out.set(cl.id, { client: cl, personId: c.personId, contactId: c.id, via: `contact (${c.role ?? "contact"})` });
  const officers = await ctx.db.select({ p: person, cl: client }).from(person)
    .innerJoin(appointment, eq(appointment.personId, person.id)).innerJoin(client, eq(client.id, appointment.clientId))
    .where(and(eq(person.firmId, ctx.firmId), sql`lower(${person.email}) = ${e}`, or(isNull(appointment.toDate), sql`${appointment.toDate} > ${ctx.clock.today()}`)));
  for (const { p, cl } of officers) if (!out.has(cl.id)) out.set(cl.id, { client: cl, personId: p.id, contactId: null, via: "officer" });
    else if (!out.get(cl.id)!.personId) out.get(cl.id)!.personId = p.id;
  return [...out.values()];
}
