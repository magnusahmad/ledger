// Imports CSA's records (UHY pilot). Everything is read and validated before anything is written,
// in one transaction, so a failed import leaves the last good snapshot in use. Companies become
// clients (updated in place, flagged when missing, never deleted); contact emails become contacts
// for the mail gate; officers, members and capital stay in the read-only snapshot (csa_row).
import { and, desc, eq, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { client as clientT, contact, csaImport, csaRow } from "@/db/schema";
import type { CsaSource } from "./sql-source";

type CsaMark = { csaId: string; importId: string; backupTakenAt: string; missingSince?: string };

export async function latestImport(ctx: Ctx) {
  return (await ctx.db.select().from(csaImport).where(eq(csaImport.firmId, ctx.firmId)).orderBy(desc(csaImport.importedAt)).limit(1))[0] ?? null;
}

export async function importCsa(ctx: Ctx, src: CsaSource, o: { backupTakenAt: Date }) {
  const [companies, officers, members, shareClasses, contacts] = [await src.companies(), await src.officers(), await src.members(), await src.shareClasses(), await src.contacts()];
  const importId = ctx.ids.next("csai");
  const backupTakenAt = o.backupTakenAt.toISOString();
  await ctx.db.transaction(async (db) => {
    await db.insert(csaImport).values({ id: importId, firmId: ctx.firmId, backupTakenAt: o.backupTakenAt, importedAt: ctx.clock.now(), counts: { companies: companies.length, officers: officers.length, members: members.length, shareClasses: shareClasses.length, contacts: contacts.length } });
    const rows = [
      ...companies.map((c) => ({ entity: "company" as const, csaId: c.csaId, companyCsaId: c.csaId, data: c })),
      ...officers.map((x) => ({ entity: "officer" as const, csaId: x.csaId, companyCsaId: x.companyCsaId, data: x })),
      ...members.map((x) => ({ entity: "member" as const, csaId: x.csaId, companyCsaId: x.companyCsaId, data: x })),
      ...shareClasses.map((x) => ({ entity: "share_class" as const, csaId: x.csaId, companyCsaId: x.companyCsaId, data: x })),
      ...contacts.map((x) => ({ entity: "contact" as const, csaId: x.csaId, companyCsaId: x.companyCsaId, data: x })),
    ];
    for (let i = 0; i < rows.length; i += 500) await db.insert(csaRow).values(rows.slice(i, i + 500).map((r) => ({ ...r, firmId: ctx.firmId, importId, data: r.data as Record<string, unknown> })));
    await db.delete(csaRow).where(and(eq(csaRow.firmId, ctx.firmId), sql`${csaRow.importId} <> ${importId}`));

    const existing = await db.select().from(clientT).where(eq(clientT.firmId, ctx.firmId));
    const byCsa = new Map(existing.flatMap((c) => { const m = (c.jurisdictionData as { csa?: CsaMark }).csa; return m ? [[m.csaId, c] as const] : []; }));
    const byCode = new Map(existing.filter((c) => c.code).map((c) => [c.code!, c]));
    const clientOf = new Map<string, string>();
    for (const c of companies) {
      const prev = byCsa.get(c.csaId) ?? (c.code ? byCode.get(c.code) : undefined);
      const mark: CsaMark = { csaId: c.csaId, importId, backupTakenAt };
      const fields = {
        code: c.code, nameEn: c.nameEn, nameTc: c.nameZh, companyNumber: c.companyNumber, incorporatedOn: c.incorporatedOn,
        fyeMonth: c.fyeMonth, fyeDay: c.fyeDay, regOfficeEn: c.registeredOffice, companyType: c.companyType,
      };
      if (prev) {
        await db.update(clientT).set({ ...fields, jurisdictionData: { ...prev.jurisdictionData, csa: mark, brNumber: c.brNumber } }).where(eq(clientT.id, prev.id));
        clientOf.set(c.csaId, prev.id);
      } else {
        const id = ctx.ids.next("cl");
        await db.insert(clientT).values({ id, firmId: ctx.firmId, ...fields, jurisdictionData: { csa: mark, brNumber: c.brNumber } });
        clientOf.set(c.csaId, id);
      }
    }
    const seen = new Set(companies.map((c) => c.csaId));
    for (const [csaId, c] of byCsa) {
      const mark = (c.jurisdictionData as { csa: CsaMark }).csa;
      if (!seen.has(csaId) && !mark.missingSince) await db.update(clientT).set({ jurisdictionData: { ...c.jurisdictionData, csa: { ...mark, missingSince: backupTakenAt } } }).where(eq(clientT.id, c.id));
    }

    for (const k of contacts) {
      const clientId = clientOf.get(k.companyCsaId);
      const email = k.email?.toLowerCase() ?? null;
      if (!clientId || !email) continue;
      const prev = await db.query.contact.findFirst({ where: and(eq(contact.firmId, ctx.firmId), eq(contact.clientId, clientId), eq(contact.email, email)) });
      if (prev) await db.update(contact).set({ name: k.name, phone: k.phone, language: k.language }).where(eq(contact.id, prev.id));
      else await db.insert(contact).values({ id: ctx.ids.next("ct"), firmId: ctx.firmId, clientId, name: k.name, email, phone: k.phone, language: k.language, role: "CSA contact" });
    }
  });
  return importId;
}
