// Shared fixtures for the reply reader and review tests: a fictional firm, a CSA snapshot of one
// company with two directors, an annual-return case already sent to the client, and helpers to add
// an inbound email and script the model's reading. Everything here is fictional.
import { eq } from "drizzle-orm";
import { makeCtx, type TestCtx } from "./helpers";
import { appUser, arCase, arMail, firm } from "@/db/schema";
import { importCsa } from "@/integrations/csa/import";
import { SqlCsaSource } from "@/integrations/csa/sql-source";
import { listCases, startAtStage, syncCases } from "@/annual/cases";
import type { ReplyReading } from "@/annual/reply-types";

export const csaTables: Record<string, Record<string, unknown>[]> = {
  companies: [{ csaId: "C1", code: "A001", nameEn: "Alpha Limited", nameZh: null, brNumber: "12345678", companyNumber: "1234567", incorporatedOn: "2015-11-20", fyeMonth: 12, fyeDay: 31, registeredOffice: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", companyType: "private" }],
  officers: [
    { csaId: "O1", companyCsaId: "C1", role: "director", kind: "individual", nameEn: "CHAN Tai Man", nameZh: "陳大文", correspondenceAddress: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", email: null, idNumber: "A1234563", appointedOn: null, ceasedOn: null },
    { csaId: "O2", companyCsaId: "C1", role: "director", kind: "individual", nameEn: "LEE Siu Ming", nameZh: null, correspondenceAddress: "Flat 2, 2/F, Sample Court, 2 Sample Road, Hong Kong", email: null, idNumber: "B7654321", appointedOn: null, ceasedOn: null },
  ],
  members: [{ csaId: "M1", companyCsaId: "C1", kind: "individual", nameEn: "CHAN Tai Man", nameZh: null, address: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", className: "Ordinary", shares: 100 }],
  shareClasses: [{ csaId: "S1", companyCsaId: "C1", className: "Ordinary", currency: "HKD", issuedShares: 100, totalAmount: 100, paidUp: 100 }],
  contacts: [{ csaId: "K1", companyCsaId: "C1", name: "Ms Chan", email: "finance@alpha.example", phone: null, language: "en" }],
};
export const csaSource = () => new SqlCsaSource(async (q) => csaTables[q] ?? [], { companies: "companies", officers: "officers", members: "members", shareClasses: "shareClasses", contacts: "contacts" });

export async function setupSentCase(o: { firmId?: string } = {}) {
  const base = makeCtx({ now: "2026-11-05T02:00:00Z" });
  // A second firm in the same test needs its own ids, as the test id sequence restarts per context.
  const ids = o.firmId ? { next: (p: string) => `${base.ids.next(p)}_${o.firmId}`, token: () => base.ids.token() } : base.ids;
  const ctx: TestCtx = { ...base, ids, firmId: o.firmId ?? base.firmId, userId: o.firmId ? `user_ruby_${o.firmId}` : "user_ruby" };
  await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Fictional Secretaries Limited", invoicePrefix: ctx.firmId.slice(-4), address: "Suite 9, 9/F, Firm Tower, 9 Firm Road, Kowloon", email: "cosec@firm.example", phone: "2000 0001" });
  await ctx.db.insert(appUser).values([
    { id: `user_ruby${o.firmId ? "_" + o.firmId : ""}`, firmId: ctx.firmId, name: "Ruby", initials: "RL", email: `ruby@${ctx.firmId}.example` },
    { id: `user_coe${o.firmId ? "_" + o.firmId : ""}`, firmId: ctx.firmId, name: "Coe", initials: "CC", email: `coe@${ctx.firmId}.example` },
  ]);
  await importCsa(ctx, csaSource(), { backupTakenAt: new Date("2026-11-05T01:00:00Z") });
  await syncCases(ctx, { withinDays: 60 });
  const c = (await listCases(ctx)).find((x) => x.kind === "AR")!;
  await startAtStage(ctx, c.id, "sent");
  return { ctx, caseId: c.id, clientId: c.clientId };
}

let seq = 0;
export async function addInbound(ctx: TestCtx, caseId: string, o: Partial<{ text: string; subject: string; attachments: { filename: string; mime: string; content: Buffer }[]; direction: "in" | "out"; status: "linked" | "ask"; receivedAt: string; from: string }> = {}) {
  const id = `arm_t${++seq}`;
  const attachments = [];
  for (const [i, a] of (o.attachments ?? []).entries()) {
    const storageKey = `annual-mail/${id}/${i}-${a.filename}`;
    await ctx.storage.put(storageKey, a.content);
    attachments.push({ filename: a.filename, mime: a.mime, storageKey, bytes: a.content.length });
  }
  await ctx.db.insert(arMail).values({
    id, firmId: ctx.firmId, caseId: o.status === "ask" ? null : caseId, status: o.status ?? "linked", via: "thread", mailbox: "ruby@firm.example", graphId: id,
    folder: o.direction === "out" ? "sentitems" : "inbox", direction: o.direction ?? "in", conversationId: "cv1", internetMessageId: `<${id}@x>`,
    fromAddr: o.from ?? "finance@alpha.example", fromName: "Ms Chan", toAddrs: ["ruby@firm.example"], subject: o.subject ?? "RE: Alpha Limited - 2026 Annual Return",
    text: o.text ?? "Dear Ruby,\n\nNo charges. Nothing has changed.\n\nRegards,\nMs Chan", attachments, receivedAt: new Date(o.receivedAt ?? "2026-11-05T01:30:00Z"),
  });
  return id;
}

export const reading = (o: Partial<ReplyReading> = {}): ReplyReading => ({
  about: "this_return", summary: "No charges and no changes.",
  charges: { answer: "none", details: null, quote: "No charges." },
  changes: [], signedPapers: [], documents: [], ...o,
});

export const resignation = { changeType: "director_ceased" as const, subject: "LEE Siu Ming", detail: "Resigned as director", effectiveDate: "2026-10-31", quote: "Mr Lee resigned as director on 31 October", source: "email", yearAssumed: false };

export const caseRow = async (ctx: TestCtx, id: string) => (await ctx.db.select().from(arCase).where(eq(arCase.id, id)))[0];
