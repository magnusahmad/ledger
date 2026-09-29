// Client, person and officer records. Appointments are effective-dated:
// a person holds office on date d iff fromDate <= d and (toDate is null or d < toDate),
// where toDate is the date the appointment ceased.
import { and, eq, isNull, lte, gt, or } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { mask } from "@/lib/crypto";
import { appointment, client, contact, person, type OfficerRole } from "@/db/schema";
import { audit } from "./audit";

export class RecordError extends Error {}

type ClientInsert = typeof client.$inferInsert;
export async function createClient(ctx: Ctx, data: Omit<ClientInsert, "id" | "firmId"> & { id?: string }) {
  const [row] = await ctx.db.insert(client).values({ id: data.id ?? ctx.ids.next("cli"), firmId: ctx.firmId, ...data }).returning();
  await audit(ctx, "client.create", "client", row.id, { nameEn: row.nameEn });
  return row;
}

export async function updateClient(ctx: Ctx, id: string, patch: Partial<ClientInsert>, reason: string) {
  const [row] = await ctx.db.update(client).set(patch).where(and(eq(client.id, id), eq(client.firmId, ctx.firmId))).returning();
  await audit(ctx, "client.update", "client", id, { patch, reason });
  return row;
}

export async function getClient(ctx: Ctx, id: string) {
  const row = await ctx.db.query.client.findFirst({ where: and(eq(client.id, id), eq(client.firmId, ctx.firmId)) });
  if (!row) throw new RecordError(`Client ${id} not found`);
  return row;
}

export type PersonInput = {
  id?: string;
  kind?: "individual" | "corporate";
  nameEn: string;
  nameZh?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  idCountry?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  residentialAddress?: string | null;
  correspondenceAddress?: string | null;
  email?: string | null;
  phone?: string | null;
};

export async function createPerson(ctx: Ctx, p: PersonInput) {
  const [row] = await ctx.db.insert(person).values({
    id: p.id ?? ctx.ids.next("per"),
    firmId: ctx.firmId,
    kind: p.kind ?? "individual",
    nameEn: p.nameEn,
    nameZh: p.nameZh ?? null,
    idType: p.idType ?? null,
    idNumberEnc: p.idNumber ? ctx.crypto.encrypt(p.idNumber) : null,
    idCountry: p.idCountry ?? null,
    dateOfBirth: p.dateOfBirth ?? null,
    nationality: p.nationality ?? null,
    residentialAddressEnc: p.residentialAddress ? ctx.crypto.encrypt(p.residentialAddress) : null,
    correspondenceAddress: p.correspondenceAddress ?? null,
    email: p.email?.toLowerCase() ?? null,
    phone: p.phone ?? null,
  }).returning();
  await audit(ctx, "person.create", "person", row.id, { nameEn: row.nameEn });
  return row;
}

export async function updatePerson(ctx: Ctx, id: string, p: Partial<PersonInput>, reason: string) {
  const patch: Partial<typeof person.$inferInsert> = {};
  if (p.nameEn !== undefined) patch.nameEn = p.nameEn;
  if (p.nameZh !== undefined) patch.nameZh = p.nameZh;
  if (p.idType !== undefined) patch.idType = p.idType;
  if (p.idNumber !== undefined) patch.idNumberEnc = p.idNumber ? ctx.crypto.encrypt(p.idNumber) : null;
  if (p.idCountry !== undefined) patch.idCountry = p.idCountry;
  if (p.dateOfBirth !== undefined) patch.dateOfBirth = p.dateOfBirth;
  if (p.nationality !== undefined) patch.nationality = p.nationality;
  if (p.residentialAddress !== undefined) patch.residentialAddressEnc = p.residentialAddress ? ctx.crypto.encrypt(p.residentialAddress) : null;
  if (p.correspondenceAddress !== undefined) patch.correspondenceAddress = p.correspondenceAddress;
  if (p.email !== undefined) patch.email = p.email?.toLowerCase() ?? null;
  if (p.phone !== undefined) patch.phone = p.phone;
  const [row] = await ctx.db.update(person).set(patch).where(and(eq(person.id, id), eq(person.firmId, ctx.firmId))).returning();
  await audit(ctx, "person.update", "person", id, { fields: Object.keys(patch), reason });
  return row;
}

type PersonRow = typeof person.$inferSelect;

/** Safe view for the UI and for LLM prompts: protected fields are masked. */
export function publicPerson(row: PersonRow, crypto: { decrypt(s: string): string }) {
  const { idNumberEnc, residentialAddressEnc, ...rest } = row;
  const idNumberMasked = idNumberEnc ? mask(crypto.decrypt(idNumberEnc)) : null;
  return { ...rest, idNumberMasked, hasIdNumber: !!idNumberEnc, hasResidentialAddress: !!residentialAddressEnc };
}

export async function getPersonProtected(ctx: Ctx, id: string) {
  const row = await ctx.db.query.person.findFirst({ where: and(eq(person.id, id), eq(person.firmId, ctx.firmId)) });
  if (!row) throw new RecordError(`Person ${id} not found`);
  await audit(ctx, "person.read_protected", "person", id);
  return {
    ...row,
    idNumber: row.idNumberEnc ? ctx.crypto.decrypt(row.idNumberEnc) : null,
    residentialAddress: row.residentialAddressEnc ? ctx.crypto.decrypt(row.residentialAddressEnc) : null,
  };
}

export async function appoint(ctx: Ctx, a: { clientId: string; personId: string; role: OfficerRole; fromDate: string; sourceTaskId?: string | null; extra?: Record<string, unknown> }) {
  const [row] = await ctx.db.insert(appointment).values({
    id: ctx.ids.next("apt"), firmId: ctx.firmId, clientId: a.clientId, personId: a.personId, role: a.role,
    fromDate: a.fromDate, sourceTaskId: a.sourceTaskId ?? null, extra: a.extra ?? {},
  }).returning();
  await audit(ctx, "appointment.create", "appointment", row.id, a);
  return row;
}

export async function ceaseAppointment(ctx: Ctx, appointmentId: string, toDate: string, sourceTaskId?: string | null) {
  const a = await ctx.db.query.appointment.findFirst({ where: and(eq(appointment.id, appointmentId), eq(appointment.firmId, ctx.firmId)) });
  if (!a) throw new RecordError("Appointment not found");
  if (toDate < a.fromDate) throw new RecordError(`Cessation date ${toDate} is before the appointment date ${a.fromDate}`);
  const [row] = await ctx.db.update(appointment).set({ toDate }).where(eq(appointment.id, appointmentId)).returning();
  await audit(ctx, "appointment.cease", "appointment", appointmentId, { toDate, sourceTaskId });
  return row;
}

export async function officersAsAt(ctx: Ctx, clientId: string, date: string, role?: OfficerRole) {
  const rows = await ctx.db.select({ a: appointment, p: person }).from(appointment)
    .innerJoin(person, eq(person.id, appointment.personId))
    .where(and(
      eq(appointment.firmId, ctx.firmId), eq(appointment.clientId, clientId),
      role ? eq(appointment.role, role) : undefined,
      lte(appointment.fromDate, date),
      or(isNull(appointment.toDate), gt(appointment.toDate, date)),
    ))
    .orderBy(appointment.fromDate);
  return rows.map(({ a, p }) => ({ ...a, personId: p.id, person: publicPerson(p, ctx.crypto) }));
}

export async function appointmentHistory(ctx: Ctx, clientId: string) {
  const rows = await ctx.db.select({ a: appointment, p: person }).from(appointment)
    .innerJoin(person, eq(person.id, appointment.personId))
    .where(and(eq(appointment.firmId, ctx.firmId), eq(appointment.clientId, clientId)))
    .orderBy(appointment.fromDate);
  return rows.map(({ a, p }) => ({ ...a, person: publicPerson(p, ctx.crypto) }));
}

export async function contactsFor(ctx: Ctx, clientId: string) {
  return ctx.db.query.contact.findMany({ where: and(eq(contact.firmId, ctx.firmId), eq(contact.clientId, clientId)) });
}

export async function addContact(ctx: Ctx, c: Omit<typeof contact.$inferInsert, "id" | "firmId">) {
  const [row] = await ctx.db.insert(contact).values({ id: ctx.ids.next("con"), firmId: ctx.firmId, ...c, email: c.email?.toLowerCase() ?? null }).returning();
  return row;
}
