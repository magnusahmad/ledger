// Fictional data for the annual-return pilot screens (never real client data). Recreates the
// database named in DATABASE_URL's path from scratch: firm, two staff, a CSA snapshot of four
// fictional companies, and cases at different stages.
//   DATABASE_URL=postgres://localhost/clerk_annual_demo npx tsx scripts/annual-demo.ts
import { Client } from "pg";
import { runMigrations } from "@/db/migrate";
import { closePools } from "@/db/client";
import { makeRuntimeCtx } from "@/lib/runtime";
import { loadPlaybookLibrary } from "@/domain/playbooks";
import { firm } from "@/db/schema";
import { createStaffUser } from "@/lib/auth";
import { importCsa } from "@/integrations/csa/import";
import { SqlCsaSource } from "@/integrations/csa/sql-source";
import { syncCases, listCases, recordRegistryCheck, markPrepared, confirmPayment } from "@/annual/cases";
import { kvSet } from "@/domain/kv";

const url = process.env.DATABASE_URL!;
if (!/annual_demo/.test(url)) throw new Error("Refusing: DATABASE_URL must name an annual_demo database");
const admin = new Client({ connectionString: url.replace(/\/[^/]+$/, "/postgres") });
await admin.connect();
const name = url.split("/").pop()!;
await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${name}"`);
await admin.end();
await runMigrations(url);

const ctx = makeRuntimeCtx();
await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Fictional Secretaries Limited", invoicePrefix: "F", address: "Suite 9, 9/F, Firm Tower, 9 Firm Road, Kowloon", email: "cosec@firm.example", phone: "2000 0001" });
await loadPlaybookLibrary(ctx);
await createStaffUser(ctx, { email: "ruby@firm.example", name: "Ruby", initials: "RL", password: "demo password 123", role: "staff" });
await createStaffUser(ctx, { email: "allan@firm.example", name: "Allan", initials: "AL", password: "demo password 123", role: "approver" });

const today = ctx.clock.today();
const inc = (daysUntilDeadline: number, yearsAgo: number) => { const d = new Date(today + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + daysUntilDeadline - 42); d.setUTCFullYear(d.getUTCFullYear() - yearsAgo); return d.toISOString().slice(0, 10); };
const t: Record<string, Record<string, unknown>[]> = {
  companies: [
    { csaId: "C1", code: "F1001", nameEn: "Harbour View Trading Limited", nameZh: "海景貿易有限公司", brNumber: "10000001", companyNumber: "1000001", incorporatedOn: inc(12, 9), fyeMonth: 3, fyeDay: 31, registeredOffice: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", companyType: "private" },
    { csaId: "C2", code: "F1002", nameEn: "Peak Lantern Design Limited", nameZh: null, brNumber: "10000002", companyNumber: "1000002", incorporatedOn: inc(24, 6), fyeMonth: 12, fyeDay: 31, registeredOffice: "Room 2, 2/F, Sample Centre, 2 Sample Street, Kowloon", companyType: "private" },
    { csaId: "C3", code: "F1003", nameEn: "Kowloon Bay Logistics Holdings Limited", nameZh: "九龍灣物流控股有限公司", brNumber: "10000003", companyNumber: "1000003", incorporatedOn: inc(38, 3), fyeMonth: 6, fyeDay: 30, registeredOffice: "Flat 3, 3/F, Test Plaza, 3 Test Avenue, Hong Kong", companyType: "private" },
    { csaId: "C4", code: "F1004", nameEn: "Victoria Ridge Investments Limited", nameZh: null, brNumber: "10000004", companyNumber: "1000004", incorporatedOn: inc(-5, 12), fyeMonth: 12, fyeDay: 31, registeredOffice: "Suite 4, 4/F, Demo House, 4 Demo Road, Hong Kong", companyType: "private" },
  ],
  officers: ["C1", "C2", "C3", "C4"].map((c, i) => ({ csaId: `O${i}`, companyCsaId: c, role: "director", kind: "individual", nameEn: ["CHAN Tai Man", "WONG Siu Ling", "LEE Ka Wai", "CHEUNG Ming"][i], nameZh: null, correspondenceAddress: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", email: null, idNumber: "A1234563", appointedOn: null, ceasedOn: null })),
  members: ["C1", "C2", "C3", "C4"].map((c, i) => ({ csaId: `M${i}`, companyCsaId: c, kind: "individual", nameEn: ["CHAN Tai Man", "WONG Siu Ling", "LEE Ka Wai", "CHEUNG Ming"][i], nameZh: null, address: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", className: "Ordinary", shares: 10000 })),
  shareClasses: ["C1", "C2", "C3", "C4"].map((c, i) => ({ csaId: `S${i}`, companyCsaId: c, className: "Ordinary", currency: "HKD", issuedShares: 10000, totalAmount: 10000, paidUp: 10000 })),
  contacts: [
    { csaId: "K1", companyCsaId: "C1", name: "陳小姐", email: "finance@harbourview.example", phone: null, language: "tc" },
    { csaId: "K2", companyCsaId: "C2", name: "Ms Wong", email: "ops@peaklantern.example", phone: null, language: "en" },
    { csaId: "K3", companyCsaId: "C3", name: "李先生", email: "admin@kblogistics.example", phone: null, language: "sc" },
    { csaId: "K4", companyCsaId: "C4", name: "Mr Cheung", email: "office@victoriaridge.example", phone: null, language: "en" },
  ],
};
const backup = new Date(Date.now() - 3 * 3600_000);
await importCsa(ctx, new SqlCsaSource(async (q) => t[q] ?? [], { companies: "companies", officers: "officers", members: "members", shareClasses: "shareClasses", contacts: "contacts" }), { backupTakenAt: backup });
await syncCases(ctx, { withinDays: 60 });
const cs = (await listCases(ctx)).filter((c) => c.kind === "AR");
const ruby = { ...ctx, userId: (await ctx.db.query.appUser.findFirst())!.id };
const byCode = (code: string) => cs.find((c) => c.clientCode === code)!;
await recordRegistryCheck(ruby, byCode("F1002").id, { result: "no_changes" });
await markPrepared(ruby, byCode("F1002").id, { formSource: "csa" });
await confirmPayment(ruby, byCode("F1002").id);
await kvSet(ctx, "annual.health", { lastCycleAt: new Date().toISOString(), csaBackupTakenAt: backup.toISOString(), csaImportedAt: new Date().toISOString(), lastMailSyncAt: new Date().toISOString(), lastStatusWriteAt: null, errors: {} });
console.log(`Seeded ${cs.length} annual-return cases. Sign in as ruby@firm.example / demo password 123`);
await closePools();
