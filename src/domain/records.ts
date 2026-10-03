// Client, person and officer records. Appointments are effective-dated:
// a person holds office on date d iff fromDate <= d and (toDate is null or d < toDate),
// where toDate is the date the appointment ceased.
import { and, eq, isNull, lte, gt, or, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { mask } from "@/lib/crypto";
import { appointment, client, contact, person, type OfficerRole } from "@/db/schema";
import { audit } from "./audit";
import { isIsoDate } from "./dates";
import { preserveRegisterBaselines, recordRegisterPersonPatch, registerPeopleAsAt, registerPersonAsAt } from "./register-person";
import { sameValue } from "./names";

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

function personPatch(ctx: Ctx, p: Partial<PersonInput>) {
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
  return patch;
}

export async function updatePerson(ctx: Ctx, id: string, p: Partial<PersonInput>, reason: string) {
  return ctx.db.transaction(async db => {
    const txCtx = { ...ctx, db: db as unknown as Ctx["db"] };
    await preserveRegisterBaselines(txCtx, id);
    const patch = personPatch(ctx, p);
    const [row] = await db.update(person).set(patch).where(and(eq(person.id, id), eq(person.firmId, ctx.firmId))).returning();
    await audit(txCtx, "person.update", "person", id, { fields: Object.keys(patch), reason });
    return row;
  });
}

export async function updateRegisteredPerson(ctx: Ctx, clientId: string, id: string, p: Partial<PersonInput>, date: string, sourceTaskId: string) {
  return ctx.db.transaction(async db => {
    const txCtx = { ...ctx, db: db as unknown as Ctx["db"] };
    await recordRegisterPersonPatch(txCtx, clientId, id, date, personPatch(ctx, p), sourceTaskId);
    return updatePerson(txCtx, id, p, `Approved task ${sourceTaskId}, effective ${date}`);
  });
}

type PersonRow = typeof person.$inferSelect;

/** Safe view for the UI and for LLM prompts: protected fields are masked. */
export function publicPerson(row: PersonRow, crypto: { decrypt(s: string): string }) {
  const { idNumberEnc, residentialAddressEnc, ...rest } = row;
  const idNumberMasked = idNumberEnc ? mask(crypto.decrypt(idNumberEnc)) : null;
  return { ...rest, idNumberMasked, hasIdNumber: !!idNumberEnc, hasResidentialAddress: !!residentialAddressEnc };
}

export async function getPersonProtected(ctx: Ctx, id: string, scope?: { clientId: string; date: string }) {
  const row = scope ? await registerPersonAsAt(ctx, scope.clientId, id, scope.date) : await ctx.db.query.person.findFirst({ where: and(eq(person.id, id), eq(person.firmId, ctx.firmId)) });
  if (!row) throw new RecordError(`Person ${id} not found`);
  await audit(ctx, "person.read_protected", "person", id);
  return {
    ...row,
    idNumber: row.idNumberEnc ? ctx.crypto.decrypt(row.idNumberEnc) : null,
    residentialAddress: row.residentialAddressEnc ? ctx.crypto.decrypt(row.residentialAddressEnc) : null,
  };
}

export async function appoint(ctx: Ctx, a: { clientId: string; personId: string; role: OfficerRole; fromDate: string; sourceTaskId?: string | null; extra?: Record<string, unknown> }) {
  if (!isIsoDate(a.fromDate)) throw new RecordError("Choose a valid appointment date");
  return ctx.db.transaction(async db => {
  const txCtx = { ...ctx, db: db as unknown as Ctx["db"] };
  await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`shares:${ctx.firmId}:${a.clientId}`}, 0))`);
  await preserveRegisterBaselines(txCtx, a.personId, a.clientId);
  const overlap = await db.query.appointment.findFirst({ where: and(eq(appointment.firmId, ctx.firmId), eq(appointment.clientId, a.clientId), eq(appointment.personId, a.personId), eq(appointment.role, a.role), or(isNull(appointment.toDate), gt(appointment.toDate, a.fromDate))) });
  if (overlap) throw new RecordError("This appointment overlaps an existing office period; review the current or historical appointment");
  const [row] = await db.insert(appointment).values({
    id: ctx.ids.next("apt"), firmId: ctx.firmId, clientId: a.clientId, personId: a.personId, role: a.role,
    fromDate: a.fromDate, sourceTaskId: a.sourceTaskId ?? null, extra: a.extra ?? {},
  }).returning();
  await audit(txCtx, "appointment.create", "appointment", row.id, a);
  return row;
  });
}

export async function ceaseAppointment(ctx: Ctx, appointmentId: string, toDate: string, sourceTaskId?: string | null) {
  if (!isIsoDate(toDate)) throw new RecordError("Choose a valid cessation date");
  return ctx.db.transaction(async db => {
  const a = await ctx.db.query.appointment.findFirst({ where: and(eq(appointment.id, appointmentId), eq(appointment.firmId, ctx.firmId)) });
  if (!a) throw new RecordError("Appointment not found");
  await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`shares:${ctx.firmId}:${a.clientId}`}, 0))`);
  const [locked] = await db.select().from(appointment).where(and(eq(appointment.id, appointmentId), eq(appointment.firmId, ctx.firmId))).for("update");
  if (locked.toDate === toDate) return locked;
  if (locked.toDate) throw new RecordError("This appointment already ceased; use separately reviewed corrective work");
  if (toDate < locked.fromDate) throw new RecordError(`Cessation date ${toDate} is before the appointment date ${locked.fromDate}`);
  const [row] = await db.update(appointment).set({ toDate }).where(and(eq(appointment.id, appointmentId), eq(appointment.firmId, ctx.firmId))).returning();
  await audit({ ...ctx, db: db as unknown as Ctx["db"] }, "appointment.cease", "appointment", appointmentId, { toDate, sourceTaskId });
  return row;
  });
}

export async function officersAsAt(ctx: Ctx, clientId: string, date: string, role?: OfficerRole) {
  const rows = await ctx.db.select({ a: appointment, p: person }).from(appointment)
    .innerJoin(person, and(eq(person.id, appointment.personId), eq(person.firmId, ctx.firmId)))
    .where(and(
      eq(appointment.firmId, ctx.firmId), eq(appointment.clientId, clientId),
      role ? eq(appointment.role, role) : undefined,
      lte(appointment.fromDate, date),
      or(isNull(appointment.toDate), gt(appointment.toDate, date)),
    ))
    .orderBy(appointment.fromDate);
  const dated = rows.length ? await registerPeopleAsAt(ctx, clientId, date) : [];
  return rows.map(({ a, p }) => ({ ...a, personId: p.id, person: publicPerson(dated.find(d => d.id === p.id) ?? p, ctx.crypto) }));
}

export async function appointmentHistory(ctx: Ctx, clientId: string, date = ctx.clock.today()) {
  const rows = await ctx.db.select({ a: appointment, p: person }).from(appointment)
    .innerJoin(person, and(eq(person.id, appointment.personId), eq(person.firmId, ctx.firmId)))
    .where(and(eq(appointment.firmId, ctx.firmId), eq(appointment.clientId, clientId)))
    .orderBy(appointment.fromDate);
  const dated = rows.length ? await registerPeopleAsAt(ctx, clientId, date) : [];
  return rows.map(({ a, p }) => ({ ...a, person: publicPerson(dated.find(d => d.id === p.id) ?? p, ctx.crypto) }));
}

export async function contactsFor(ctx: Ctx, clientId: string) {
  return ctx.db.query.contact.findMany({ where: and(eq(contact.firmId, ctx.firmId), eq(contact.clientId, clientId)) });
}

export async function addContact(ctx: Ctx, c: Omit<typeof contact.$inferInsert, "id" | "firmId">) {
  const [row] = await ctx.db.insert(contact).values({ id: ctx.ids.next("con"), firmId: ctx.firmId, ...c, email: c.email?.toLowerCase() ?? null }).returning();
  return row;
}

/** Email and phone read from a free-text "email and mobile" answer, filling only what isn't on file. */
function contactParts(ci: string) {
  const emailPattern = /[\w.+-]+@[\w.-]+/g;
  const phonePattern = /\+?\d[\d\s-]{6,}/g;
  const emails = ci.match(emailPattern) ?? [];
  // Remove complete addresses before looking for phones: digits in an email's
  // local part or domain are not a second contact channel.
  const withoutEmails = ci.replace(emailPattern, " ");
  const phones = (withoutEmails.match(phonePattern) ?? []).map(phone => phone.trim());
  const ambiguous = new Set(emails.map(email => email.toLowerCase())).size > 1 || new Set(phones.map(phone => phone.replace(/\D/g, ""))).size > 1;
  return { email: emails[0] ?? null, phone: phones[0] ?? null, ambiguous, remainder: withoutEmails.replace(phonePattern, "").replace(/[\s/,;:]/g, "") };
}

/** Compare the provided components; omission isn't a request to erase a contact. */
export function compatibleContactInfo(onFile: string, incoming: string): boolean {
  const old = contactParts(onFile), next = contactParts(incoming);
  if (old.ambiguous || next.ambiguous) return false;
  if ((!next.email && !next.phone) || (!old.email && !old.phone)) return sameValue(onFile, incoming);
  if (old.email && next.email && old.email.toLowerCase() !== next.email.toLowerCase()) return false;
  if (old.phone && next.phone && old.phone.replace(/\D/g, "") !== next.phone.replace(/\D/g, "")) return false;
  // A new component alone may supplement the recorded one, but unrelated prose
  // containing a number must not be mistaken for a missing mobile number.
  if (!(old.email && next.email) && !(old.phone && next.phone)) {
    if (next.remainder) return false;
  }
  return true;
}

export function contactInfoPatch(ci: string | null | undefined, p: { email: string | null; phone: string | null }) {
  const patch: { email?: string; phone?: string } = {};
  if (!ci) return patch;
  const { email, phone, ambiguous } = contactParts(ci);
  if (ambiguous) return patch;
  if (email && !p.email) patch.email = email;
  if (phone && !p.phone) patch.phone = phone;
  return patch;
}

/** The library's contactInfo requirement needs both channels, not any contact value. */
export function completeContactInfo(ci: string | null | undefined): boolean {
  const parts = contactParts(ci ?? "");
  return !parts.ambiguous && !!parts.email && !!parts.phone;
}
