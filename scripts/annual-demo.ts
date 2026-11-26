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
import { csaRecords } from "@/integrations/csa/records";
import { syncCases, listCases, recordRegistryCheck, markPrepared, confirmPayment } from "@/annual/cases";
import { kvSet } from "@/domain/kv";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { arMail } from "@/db/schema";
import { startAtStage } from "@/annual/cases";
import { ScriptedLlm } from "@/integrations/llm/scripted";
import { readPendingReplies } from "@/annual/reply-reader";
import * as review from "@/annual/reply-review";

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

// Two client replies, read with a scripted model answer (no live model in the demo): one waiting for
// review with an attachment the model wasn't given, one already reviewed with a change to settle.
const pdf = await PDFDocument.create();
pdf.addPage().drawText("Fictional signed annual return (demo)", { x: 50, y: 760, size: 14, font: await pdf.embedFont(StandardFonts.Helvetica) });
const signed = Buffer.from(await pdf.save());
async function inbound(caseId: string, o: { id: string; from: string; fromName: string; subject: string; text: string; attachments?: { filename: string; mime: string; content: Buffer }[] }) {
  const attachments = [];
  for (const [i, a] of (o.attachments ?? []).entries()) { const storageKey = `annual-mail/${o.id}/${i}-${a.filename}`; await ctx.storage.put(storageKey, a.content); attachments.push({ filename: a.filename, mime: a.mime, storageKey, bytes: a.content.length }); }
  await ctx.db.insert(arMail).values({ id: o.id, firmId: ctx.firmId, caseId, status: "linked", via: "thread", mailbox: "ruby@firm.example", graphId: o.id, folder: "inbox", direction: "in", conversationId: `cv-${o.id}`, internetMessageId: `<${o.id}@demo>`, fromAddr: o.from, fromName: o.fromName, toAddrs: ["ruby@firm.example"], subject: o.subject, text: o.text, attachments, receivedAt: new Date(Date.now() - 2 * 3600_000) });
}
await startAtStage(ruby, byCode("F1003").id, "sent");
await inbound(byCode("F1003").id, {
  id: "arm_demo1", from: "admin@kblogistics.example", fromName: "李先生", subject: "回复：九龍灣物流控股有限公司 - 周年申报表",
  text: "Ruby 你好，\n\n周年申报表已签署，扫描件见附件，正本今天寄出。\n\n公司没有任何按揭或押记。\n\n另外，公司注册办事处已于10月15日迁至香港测试大道8号测试广场12楼1203室，新地址证明见附件。\n\n谢谢。\n李",
  attachments: [{ filename: "signed-annual-return.pdf", mime: "application/pdf", content: signed }, { filename: "新地址证明.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", content: Buffer.from("PK demo") }],
});
await startAtStage(ruby, byCode("F1001").id, "sent");
await inbound(byCode("F1001").id, { id: "arm_demo2", from: "finance@harbourview.example", fromName: "陳小姐", subject: "RE: Harbour View Trading Limited - Annual Return", text: "Dear Ruby,\n\nNo mortgages or charges.\n\nPlease note Mr Chan moved last month. His new address is Flat 5, 5/F, Garden Court, 5 Garden Road, Hong Kong.\n\nRegards,\nMs Chan" });
const scripted = new ScriptedLlm()
  .on("ar_reply", (req: { messages: { content: unknown }[] }) => JSON.stringify(req.messages).includes("kblogistics") ? {
    about: "this_return", summary: "Signed return attached, no charges, and the registered office moved on 15 October.",
    charges: { answer: "none", details: null, quote: "公司没有任何按揭或押记。" },
    changes: [{ changeType: "registered_office", subject: null, detail: "Registered office moved to Room 1203, 12/F, Test Plaza, 8 Test Avenue, Hong Kong.", effectiveDate: `${today.slice(0, 4)}-10-15`, quote: "公司注册办事处已于10月15日迁至香港测试大道8号测试广场12楼1203室", source: "email" }],
    signedPapers: [{ document: "annual_return", filename: "signed-annual-return.pdf", quote: "周年申报表已签署，扫描件见附件" }], documents: [],
  } : {
    about: "this_return", summary: "No charges; a director's address changed.",
    charges: { answer: "none", details: null, quote: "No mortgages or charges." },
    changes: [{ changeType: "officer_particulars", subject: "CHAN Tai Man", detail: "New residential address: Flat 5, 5/F, Garden Court, 5 Garden Road, Hong Kong.", effectiveDate: null, quote: "His new address is Flat 5, 5/F, Garden Court, 5 Garden Road, Hong Kong.", source: "email" }],
    signedPapers: [], documents: [],
  });
await readPendingReplies({ ...ctx, llm: scripted }, csaRecords());
const done = await review.repliesToReview(ruby, byCode("F1001").id);
const full = await review.replyForReview(ruby, done[0].reply.id);
await review.openSource(ruby, full.reply.id);
await review.answerCharges(ruby, full.items.find((i) => i.kind === "charges")!.id, { answer: "none" });
await review.decideItem(ruby, full.items.find((i) => i.kind === "change")!.id, { action: "accept" });
await review.finishReview(ruby, full.reply.id);

await kvSet(ctx, "annual.health", { lastCycleAt: new Date().toISOString(), recordsAsAt: backup.toISOString(), recordsImportedAt: new Date().toISOString(), lastMailSyncAt: new Date().toISOString(), lastStatusWriteAt: null, errors: {} });
// What the firm's own client list disagrees with the records on (fictional), for the Differences page.
await kvSet(ctx, "annual.clientList", {
  label: "the DN workbook", version: "demo", appliedAt: new Date().toISOString(), build: null,
  counts: { entries: 12, live: 8, leftOut: 4, matched: 4, yearEndsFilled: 1, contactsAdded: 3 },
  problems: ["The DN workbook has one client code on rows 14 and 37, both current clients under different names; neither was read."],
  differences: [
    { code: "F1009K", nameEn: "Lantern Quay Consultants Limited", kind: "leftOut", records: "current", list: "struck through" },
    { code: "F1012T", nameEn: "九龍灣物流控股有限公司 Kowloon Bay Logistics (Asia Pacific) Holdings Limited", kind: "leftOut", records: "current", list: "in blue (one-off service)" },
    { code: "F1003", nameEn: "Kowloon Bay Logistics Holdings Limited", kind: "yearEnd", records: "30 June", list: "31 March" },
    { code: "F1002", nameEn: "Peak Lantern Design Limited", kind: "incorporatedOn", records: "2024-06-18", list: "2024-06-08" },
    { code: "F1015", nameEn: "Victoria Ridge Investments Limited", kind: "nameMismatch", records: "Victoria Ridge Investments Limited", list: "Victoria Ridge Property Management Limited" },
    { code: "F1020UK", nameEn: "Harbour View Trading Limited", kind: "notInList", records: "Harbour View Trading Limited", list: null },
    { code: "F1031", nameEn: "Offshore Lantern Holdings Inc.", kind: "notInRecords", records: null, list: "Offshore Lantern Holdings Inc." },
  ],
});
console.log(`Seeded ${cs.length} annual-return cases. Sign in as ruby@firm.example / demo password 123`);
await closePools();
