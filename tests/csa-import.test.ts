// CSA import for the UHY pilot: CSA's records are read from a restored copy of its own backup, never
// the live database. Companies and contacts become clients and contacts; officers, members and share
// capital stay a read-only snapshot, so the effective-dated registers never get invented history.
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { resetDb, makeCtx } from "./helpers";
import { appointment, client, contact, csaImport, firm, shareMovement } from "@/db/schema";
import { importCsa, latestImport } from "@/integrations/csa/import";
import { SqlCsaSource, type CsaMapping } from "@/integrations/csa/sql-source";
import { nar1InputFromCsa, dispatchFactsFromCsa } from "@/integrations/csa/nar1";

const mapping: CsaMapping = {
  companies: "SELECT * FROM companies", officers: "SELECT * FROM officers", members: "SELECT * FROM members",
  shareClasses: "SELECT * FROM classes", contacts: "SELECT * FROM contacts",
};

function tables(over: Record<string, Record<string, unknown>[]> = {}) {
  const t: Record<string, Record<string, unknown>[]> = {
    companies: [
      { csaId: "C1", code: "A001", nameEn: "Alpha Limited", nameZh: "阿爾法有限公司", brNumber: "12345678", companyNumber: "1234567", incorporatedOn: "2015-11-20", fyeMonth: 12, fyeDay: 31, registeredOffice: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", companyType: "private" },
      { csaId: "C2", code: "B002", nameEn: "Beta Limited", nameZh: null, brNumber: "87654321", companyNumber: "7654321", incorporatedOn: "2019-03-01", fyeMonth: 3, fyeDay: 31, registeredOffice: "Room 2, 2/F, Sample Centre, 2 Sample Street, Kowloon", companyType: "private" },
    ],
    officers: [
      { csaId: "O1", companyCsaId: "C1", role: "director", kind: "individual", nameEn: "CHAN Tai Man", nameZh: "陳大文", correspondenceAddress: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", email: "tm@alpha.example", idNumber: "A1234563", appointedOn: "2015-11-20", ceasedOn: null },
      { csaId: "O2", companyCsaId: "C1", role: "secretary", kind: "corporate", nameEn: "Fictional Secretaries Limited", nameZh: null, correspondenceAddress: "Suite 9, 9/F, Firm Tower, 9 Firm Road, Kowloon", email: "cosec@firm.example", idNumber: null, brNumber: "11112222", appointedOn: "2015-11-20", ceasedOn: null, tcspLicence: "TC001234" },
      { csaId: "O3", companyCsaId: "C1", role: "director", kind: "individual", nameEn: "LEE Former", nameZh: null, correspondenceAddress: "x", email: null, idNumber: null, appointedOn: "2015-11-20", ceasedOn: "2020-01-01" },
      { csaId: "O4", companyCsaId: "C2", role: "director", kind: "corporate", nameEn: "Holding Co Ltd", nameZh: null, correspondenceAddress: "BVI", email: null, idNumber: null, appointedOn: "2019-03-01", ceasedOn: null },
    ],
    members: [
      { csaId: "M1", companyCsaId: "C1", kind: "individual", nameEn: "CHAN Tai Man", nameZh: "陳大文", address: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", className: "Ordinary", shares: 9000 },
      { csaId: "M2", companyCsaId: "C1", kind: "corporate", nameEn: "Parent Holdings Limited", nameZh: null, address: "PO Box 1, Road Town, BVI", className: "Ordinary", shares: 1000 },
    ],
    shareClasses: [{ csaId: "S1", companyCsaId: "C1", className: "Ordinary", currency: "HKD", issuedShares: 10000, totalAmount: 10000, paidUp: 10000 }],
    contacts: [
      { csaId: "K1", companyCsaId: "C1", name: "Ms Chan", email: "Finance@Alpha.example", phone: "+852 2000 0000", language: "tc" },
      { csaId: "K2", companyCsaId: "C2", name: "Mr Lee", email: "lee@beta.example", phone: null, language: "en" },
    ],
  };
  return { ...t, ...over };
}

const sourceFor = (t: ReturnType<typeof tables>) => new SqlCsaSource(async (q) => t[{ "SELECT * FROM companies": "companies", "SELECT * FROM officers": "officers", "SELECT * FROM members": "members", "SELECT * FROM classes": "shareClasses", "SELECT * FROM contacts": "contacts" }[q]!] ?? [], mapping);
const presentor = { name: "Fictional Secretaries Limited", address: "Suite 9, 9/F, Firm Tower, 9 Firm Road, Kowloon", tel: "2000 0001", email: "cosec@firm.example", reference: "" };

async function seedFirm(ctx: ReturnType<typeof makeCtx>) { await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Firm", invoicePrefix: "F" }); }

describe("CSA import", () => {
  beforeEach(async () => { await resetDb(); });

  it("creates clients and contacts from CSA, marked with the backup time", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seedFirm(ctx);
    await importCsa(ctx, sourceFor(tables()), { backupTakenAt: new Date("2026-11-05T02:13:00Z") });
    const cs = await ctx.db.select().from(client).orderBy(client.code);
    expect(cs.map((c) => [c.code, c.nameEn, c.incorporatedOn, c.fyeMonth])).toEqual([["A001", "Alpha Limited", "2015-11-20", 12], ["B002", "Beta Limited", "2019-03-01", 3]]);
    expect((cs[0].jurisdictionData as { csa: { backupTakenAt: string } }).csa.backupTakenAt).toBe("2026-11-05T02:13:00.000Z");
    const k = await ctx.db.select().from(contact).where(eq(contact.clientId, cs[0].id));
    expect(k).toMatchObject([{ email: "finance@alpha.example", language: "tc", name: "Ms Chan" }]);
  });

  it("a registered non-Hong Kong company keeps its Hong Kong registration date from CSA, for the NN3 deadline", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seedFirm(ctx);
    const t = tables();
    t.companies = [...t.companies, { csaId: "C3", code: "N003", nameEn: "Overseas Gamma Inc.", nameZh: null, brNumber: null, companyNumber: "F0001234", incorporatedOn: "1998-05-01", registeredOn: "2015-06-15", fyeMonth: 12, fyeDay: 31, registeredOffice: null, companyType: "non_hk" }];
    await importCsa(ctx, sourceFor(t), { backupTakenAt: new Date("2026-11-05T02:13:00Z") });
    const [c] = await ctx.db.select().from(client).where(eq(client.code, "N003"));
    expect(c.companyType).toBe("non_hk");
    expect((c.jurisdictionData as { registeredOn?: string }).registeredOn).toBe("2015-06-15");
  });

  it("re-importing updates in place, and a company missing from CSA is flagged, never deleted", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seedFirm(ctx);
    await importCsa(ctx, sourceFor(tables()), { backupTakenAt: new Date("2026-11-05T02:13:00Z") });
    const renamed = tables();
    renamed.companies = [{ ...renamed.companies[0], nameEn: "Alpha Holdings Limited" }];
    await importCsa(ctx, sourceFor(renamed), { backupTakenAt: new Date("2026-11-06T02:13:00Z") });
    const cs = await ctx.db.select().from(client).orderBy(client.code);
    expect(cs).toHaveLength(2);
    expect(cs[0].nameEn).toBe("Alpha Holdings Limited");
    expect((cs[1].jurisdictionData as { csa: { missingSince?: string } }).csa.missingSince).toBe("2026-11-06T02:13:00.000Z");
    expect(await ctx.db.select().from(contact)).toHaveLength(2);
  });

  it("officers and members stay a snapshot and are never written into the effective-dated registers", async () => {
    const ctx = makeCtx(); await seedFirm(ctx);
    await importCsa(ctx, sourceFor(tables()), { backupTakenAt: new Date("2026-11-05T02:13:00Z") });
    expect(await ctx.db.select().from(appointment)).toHaveLength(0);
    expect(await ctx.db.select().from(shareMovement)).toHaveLength(0);
  });

  it("a mapping query with a missing or wrongly typed column is refused, naming the field", async () => {
    const ctx = makeCtx(); await seedFirm(ctx);
    const bad = tables();
    bad.members = [{ ...bad.members[0], shares: "lots" }];
    await expect(importCsa(ctx, sourceFor(bad), { backupTakenAt: new Date() })).rejects.toThrow(/members.*shares/);
  });

  it("a failed import leaves the last good snapshot in use", async () => {
    const ctx = makeCtx(); await seedFirm(ctx);
    await importCsa(ctx, sourceFor(tables()), { backupTakenAt: new Date("2026-11-05T02:13:00Z") });
    const good = await latestImport(ctx);
    const bad = tables(); bad.officers = [{ nope: 1 }];
    await expect(importCsa(ctx, sourceFor(bad), { backupTakenAt: new Date("2026-11-06T02:13:00Z") })).rejects.toThrow();
    expect((await latestImport(ctx))?.id).toBe(good?.id);
    expect(await ctx.db.select().from(csaImport)).toHaveLength(1);
  });
});

describe("annual-return facts from the CSA snapshot", () => {
  beforeEach(async () => { await resetDb(); });

  it("the NAR1 input lists current directors, the secretary, members by class and capital, as at the backup", async () => {
    const ctx = makeCtx(); await seedFirm(ctx);
    await importCsa(ctx, sourceFor(tables()), { backupTakenAt: new Date("2026-11-05T02:13:00Z") });
    const [a] = await ctx.db.select().from(client).where(eq(client.code, "A001"));
    const r = await nar1InputFromCsa(ctx, a.id, { madeUpTo: "2026-11-20", presentor, signDate: "2026-11-21", email: "cosec@firm.example" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.directors.map((d) => d.nameEn)).toEqual(["CHAN Tai Man"]);
    expect(r.input.secretary).toMatchObject({ corporate: true, nameEn: "Fictional Secretaries Limited", brNumber: "11112222" });
    // A corporate secretary that is a licensed company service provider must show its licence number.
    expect(r.input.secretary?.tcspLicence).toBe("TC001234");
    expect(r.input.members).toEqual([{ className: "Ordinary", totalInClass: 10000, rows: [
      { nameEn: "CHAN Tai Man", nameZh: "陳大文", corporate: false, address: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", shares: 9000 },
      { nameEn: "Parent Holdings Limited", nameZh: null, corporate: true, address: "PO Box 1, Road Town, BVI", shares: 1000 },
    ] }]);
    expect(r.input.capital).toEqual([{ className: "Ordinary", currency: "HKD", totalNumber: 10000, totalAmount: 10000, paidUp: 10000 }]);
    expect(r.input.signer).toEqual({ name: "CHAN Tai Man", capacity: "director" });
    expect(r.asAt).toBe("2026-11-05T02:13:00.000Z");
  });

  it("a corporate director stops the automatic NAR1 and says to use CSA's form", async () => {
    const ctx = makeCtx(); await seedFirm(ctx);
    await importCsa(ctx, sourceFor(tables()), { backupTakenAt: new Date("2026-11-05T02:13:00Z") });
    const [b] = await ctx.db.select().from(client).where(eq(client.code, "B002"));
    const r = await nar1InputFromCsa(ctx, b.id, { madeUpTo: "2027-03-01", presentor, signDate: "2027-03-02", email: "cosec@firm.example" });
    expect(r).toEqual({ ok: false, reason: expect.stringMatching(/corporate director.*CSA/i) });
  });

  it("members whose holdings don't add up to the issued shares stop the automatic NAR1", async () => {
    const ctx = makeCtx(); await seedFirm(ctx);
    const t = tables(); t.members = [t.members[0]];
    await importCsa(ctx, sourceFor(t), { backupTakenAt: new Date("2026-11-05T02:13:00Z") });
    const [a] = await ctx.db.select().from(client).where(eq(client.code, "A001"));
    expect(await nar1InputFromCsa(ctx, a.id, { madeUpTo: "2026-11-20", presentor, signDate: "2026-11-21", email: "e" })).toEqual({ ok: false, reason: expect.stringMatching(/9,000.*10,000/) });
  });

  it("dispatch facts give the signing director and the counts that choose sole or plural wording", async () => {
    const ctx = makeCtx(); await seedFirm(ctx);
    await importCsa(ctx, sourceFor(tables()), { backupTakenAt: new Date("2026-11-05T02:13:00Z") });
    const [a] = await ctx.db.select().from(client).where(eq(client.code, "A001"));
    expect(await dispatchFactsFromCsa(ctx, a.id)).toEqual({ signer: "CHAN Tai Man", directors: 1, members: 2, corporateMembers: 1, asAt: "2026-11-05T02:13:00.000Z" });
  });
});
