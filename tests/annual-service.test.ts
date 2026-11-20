// Preparing papers and drafting the dispatch email for a case (UHY pilot brief, "The annual cycle"):
// the NAR1 comes from the CSA snapshot and is filed to F:; the draft is in the contact's language,
// uses the case's computed dates, attaches the generated form, and lands in the preparer's own mailbox.
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { resetDb, makeCtx } from "./helpers";
import { arCase, firm, appUser } from "@/db/schema";
import { importCsa } from "@/integrations/csa/import";
import { SqlCsaSource } from "@/integrations/csa/sql-source";
import { csaRecords } from "@/integrations/csa/records";
import { syncCases, listCases, recordRegistryCheck, confirmPayment, markPrepared } from "@/annual/cases";
import { prepareCase, draftDispatch, type AnnualDeps } from "@/annual/service";
import type { MailboxSource } from "@/annual/mail-sync";
import template from "../clients/uhy/data/dispatch-template.json";

const t: Record<string, Record<string, unknown>[]> = {
  companies: [
    { csaId: "C1", code: "A001", nameEn: "Alpha Limited", nameZh: null, brNumber: "12345678", companyNumber: "1234567", incorporatedOn: "2015-11-20", fyeMonth: 12, fyeDay: 31, registeredOffice: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", companyType: "private" },
    { csaId: "C2", code: "B002", nameEn: "Beta Limited", nameZh: null, brNumber: "87654321", companyNumber: "7654321", incorporatedOn: "2015-11-21", fyeMonth: 3, fyeDay: 31, registeredOffice: "Room 2, Sample Centre, 2 Sample Street, Kowloon", companyType: "private" },
  ],
  officers: [
    { csaId: "O1", companyCsaId: "C1", role: "director", kind: "individual", nameEn: "CHAN Tai Man", nameZh: "陳大文", correspondenceAddress: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", email: null, idNumber: "A1234563", appointedOn: null, ceasedOn: null },
    { csaId: "O2", companyCsaId: "C2", role: "director", kind: "corporate", nameEn: "Holding Co Ltd", nameZh: null, correspondenceAddress: "BVI", email: null, idNumber: null, appointedOn: null, ceasedOn: null },
  ],
  members: [{ csaId: "M1", companyCsaId: "C1", kind: "individual", nameEn: "CHAN Tai Man", nameZh: null, address: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", className: "Ordinary", shares: 100 }],
  shareClasses: [{ csaId: "S1", companyCsaId: "C1", className: "Ordinary", currency: "HKD", issuedShares: 100, totalAmount: 100, paidUp: 100 }],
  contacts: [{ csaId: "K1", companyCsaId: "C1", name: "陳小姐", email: "finance@alpha.example", phone: null, language: "tc" }],
};
const src = new SqlCsaSource(async (q) => t[q] ?? [], { companies: "companies", officers: "officers", members: "members", shareClasses: "shareClasses", contacts: "contacts" });

class DraftSpy implements Pick<MailboxSource, "createDraft"> {
  drafts: { mailbox: string; m: Parameters<MailboxSource["createDraft"]>[1] }[] = [];
  async createDraft(mailbox: string, m: Parameters<MailboxSource["createDraft"]>[1]) { this.drafts.push({ mailbox, m }); return { draftId: "draft-1", conversationId: "conv-1", webLink: "https://outlook.office.com/x" }; }
}

async function setup() {
  const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" });
  await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Fictional Secretaries Limited", invoicePrefix: "F", address: "Suite 9, 9/F, Firm Tower, 9 Firm Road, Kowloon", email: "cosec@firm.example", phone: "2000 0001" });
  await ctx.db.insert(appUser).values([{ id: "user_ruby", firmId: ctx.firmId, name: "Ruby", initials: "RL", email: "ruby@uhy.example" }, { id: "user_out", firmId: ctx.firmId, name: "Outsider", initials: "OU", email: "someone@uhy.example" }]);
  await importCsa(ctx, src, { backupTakenAt: new Date("2026-11-05T02:13:00Z") });
  await syncCases(ctx, { withinDays: 60 });
  const root = await mkdtemp(path.join(tmpdir(), "uhy-svc-"));
  const spy = new DraftSpy();
  const deps: AnnualDeps = { records: csaRecords(), mail: spy as unknown as MailboxSource, mailboxes: ["ruby@uhy.example", "coe@uhy.example"], filingRoot: root, filingRules: { clientFolder: "{code}-{client}", annualReturn: "{code}-Annual Return-{madeUp}", agm: "{code}-AGM-{year}" }, template };
  const cases = await listCases(ctx);
  return { ctx, deps, spy, root, alpha: cases.find((c) => c.clientCode === "A001" && c.kind === "AR")!, beta: cases.find((c) => c.clientCode === "B002" && c.kind === "AR")! };
}

describe("preparing and drafting", () => {
  beforeEach(async () => { await resetDb(); });

  it("preparing generates the NAR1 from the CSA snapshot and files it in the client's folder on F:", async () => {
    const { ctx, deps, root, alpha } = await setup();
    await recordRegistryCheck(ctx, alpha.id, { result: "no_changes" });
    const r = await prepareCase({ ...ctx, userId: "user_ruby" }, deps, alpha.id);
    expect(r).toMatchObject({ ok: true });
    expect(await readdir(path.join(root, "A001-Alpha Limited"))).toEqual(["A001-Annual Return-20Nov2026.pdf"]);
    const c = await ctx.db.query.arCase.findFirst({ where: eq(arCase.id, alpha.id) });
    expect(c).toMatchObject({ stage: "prepared", formSource: "generated" });
    expect((await ctx.storage.get(c!.formDocumentId!)).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("a company the generator can't handle is not prepared, and the reason says to use CSA's form", async () => {
    const { ctx, deps, beta } = await setup();
    await recordRegistryCheck(ctx, beta.id, { result: "no_changes" });
    const r = await prepareCase(ctx, deps, beta.id);
    expect(r).toEqual({ ok: false, reason: expect.stringMatching(/CSA's form/) });
    expect((await ctx.db.query.arCase.findFirst({ where: eq(arCase.id, beta.id) }))?.stage).toBe("due");
  });

  it("the draft is in the contact's language, uses the case's dates, attaches the NAR1 and lands in the preparer's mailbox", async () => {
    const { ctx, deps, spy, alpha } = await setup();
    const ruby = { ...ctx, userId: "user_ruby" };
    await recordRegistryCheck(ruby, alpha.id, { result: "no_changes" });
    await prepareCase(ruby, deps, alpha.id);
    await confirmPayment(ruby, alpha.id);
    await draftDispatch(ruby, deps, alpha.id, {});
    expect(spy.drafts).toHaveLength(1);
    const d = spy.drafts[0];
    expect(d.mailbox).toBe("ruby@uhy.example");
    expect(d.m.to).toEqual(["finance@alpha.example"]);
    expect(d.m.text).toContain("周年申報表");
    expect(d.m.text).toContain("2026年11月20日");
    expect(d.m.text).toContain("CHAN Tai Man");
    expect(d.m.attachments?.map((a) => a.filename)).toEqual(["A001-Annual Return-20Nov2026.pdf"]);
    expect((await ctx.db.query.arCase.findFirst({ where: eq(arCase.id, alpha.id) }))).toMatchObject({ stage: "draft_ready", draft: { mailbox: "ruby@uhy.example", draftId: "draft-1", conversationId: "conv-1" } });
  });

  it("someone whose mailbox isn't one of the team mailboxes can't draft", async () => {
    const { ctx, deps, alpha } = await setup();
    await recordRegistryCheck(ctx, alpha.id, { result: "no_changes" });
    await markPrepared(ctx, alpha.id, { formSource: "csa" });
    await confirmPayment(ctx, alpha.id);
    await expect(draftDispatch({ ...ctx, userId: "user_out" }, deps, alpha.id, {})).rejects.toThrow(/team mailboxes/);
  });

  it("drafting before payment is confirmed is refused and nothing reaches the mailbox", async () => {
    const { ctx, deps, spy, alpha } = await setup();
    await recordRegistryCheck(ctx, alpha.id, { result: "no_changes" });
    await markPrepared(ctx, alpha.id, { formSource: "csa" });
    await expect(draftDispatch({ ...ctx, userId: "user_ruby" }, deps, alpha.id, {})).rejects.toThrow(/payment/i);
    expect(spy.drafts).toHaveLength(0);
  });
});
