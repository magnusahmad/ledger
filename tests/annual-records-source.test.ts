// Where a company's current particulars come from is the installation's choice (DECISIONS.md #64 and
// #65): today a read-only copy of CSA, later Clerk's own registers. The annual module asks a
// RecordsSource and never a named system, so a firm without CSA can run it and nothing depends on
// CSA staying.
import { describe, it, expect, beforeEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { resetDb, makeCtx } from "./helpers";
import { arCase, client, contact, firm, appUser } from "@/db/schema";
import { syncCases, listCases, recordRegistryCheck, confirmPayment } from "@/annual/cases";
import { prepareCase, draftDispatch, type AnnualDeps } from "@/annual/service";
import { runAnnualCycle, readHealth } from "@/annual/cycle";
import type { RecordsSource } from "@/annual/records";
import type { MailboxSource } from "@/annual/mail-sync";

const OFFICE = "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon";
const TEMPLATE = { en: { subjectAr: "{company} - {year} Annual Return", subjectArAgm: "{company} - {year} Annual Return and AGM", greeting: "Dear {salutation},", intro: "Enclosed:", arHeading: "{year} Annual Return", arBody: "Please sign page {page} as {signer} and return by {returnBy}.", charges: "Does the company have any charges as at {statementDate}?", changes: "Tell us of any changes.", closing: "Regards" } };

/** A records system that is not CSA: it answers from memory and has nothing in the snapshot tables. */
function registers(over: Partial<RecordsSource> = {}): RecordsSource & { refreshed: number } {
  const s = {
    label: "the registers", refreshed: 0,
    asAt: async () => new Date("2026-11-05T01:00:00Z"),
    refresh: async () => { s.refreshed++; return { asAt: "2026-11-05T01:00:00.000Z" }; },
    particulars: async () => ({ registeredOffice: OFFICE, asAt: "2026-11-05T01:00:00.000Z", officers: [{ role: "director" as const, name: "WONG Siu Ling", nameZh: null }], members: [{ name: "WONG Siu Ling", nameZh: null, className: "Ordinary", shares: 100 }] }),
    dispatchFacts: async () => ({ signer: "WONG Siu Ling", directors: 1, members: 1, corporateMembers: 0, asAt: "2026-11-05T01:00:00.000Z" }),
    nar1Input: async (_ctx: unknown, _clientId: string, o: Parameters<RecordsSource["nar1Input"]>[2]) => ({
      ok: true as const, asAt: "2026-11-05T01:00:00.000Z",
      input: {
        brNumber: "12345678", companyName: "Gamma Limited", type: "private" as const, madeUpTo: o.madeUpTo, registeredOffice: OFFICE, email: o.email, charges: o.charges ?? "",
        capital: [{ className: "Ordinary", currency: "HKD", totalNumber: 100, totalAmount: 100, paidUp: 100 }],
        directors: [{ capacity: "director" as const, nameEn: "WONG Siu Ling", correspondenceAddress: OFFICE, idNumber: "A1234563" }],
        members: [{ className: "Ordinary", totalInClass: 100, rows: [{ nameEn: "WONG Siu Ling", address: OFFICE, shares: 100 }] }],
        presentor: o.presentor, signer: { name: "WONG Siu Ling", capacity: "director" as const }, signDate: o.signDate,
      },
    }),
    ...over,
  };
  return s;
}

async function setup(records: RecordsSource) {
  const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" });
  await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Fictional Secretaries Limited", invoicePrefix: "F", address: "Suite 9, 9/F, Firm Tower, 9 Firm Road, Kowloon", email: "cosec@firm.example", phone: "2000 0001" });
  await ctx.db.insert(appUser).values({ id: "user_ruby", firmId: ctx.firmId, name: "Ruby", initials: "RL", email: "ruby@firm.example" });
  await ctx.db.insert(client).values({ id: "cl_gamma", firmId: ctx.firmId, code: "G003", nameEn: "Gamma Limited", companyType: "private", incorporatedOn: "2015-11-20" });
  await ctx.db.insert(contact).values({ id: "ct_gamma", firmId: ctx.firmId, clientId: "cl_gamma", name: "Ms Wong", email: "finance@gamma.example", language: "en" });
  await syncCases(ctx, { withinDays: 60 });
  const drafts: { mailbox: string; text: string }[] = [];
  const mail = { createDraft: async (mailbox: string, m: { text: string }) => { drafts.push({ mailbox, text: m.text }); return { draftId: "d1", conversationId: "c1", webLink: "https://outlook.office.com/x" }; } } as unknown as MailboxSource;
  const deps: AnnualDeps = { records, mail, mailboxes: ["ruby@firm.example"], filingRoot: null, filingRules: null, template: TEMPLATE };
  const gamma = (await listCases(ctx)).find((c) => c.clientCode === "G003" && c.kind === "AR")!;
  return { ctx: { ...ctx, userId: "user_ruby" }, deps, drafts, gamma };
}

describe("the annual module and its records source", () => {
  beforeEach(async () => { await resetDb(); });

  it("the annual return is prepared from whichever records source the installation provides", async () => {
    const { ctx, deps, gamma } = await setup(registers());
    await recordRegistryCheck(ctx, gamma.id, { result: "no_changes" });
    expect(await prepareCase(ctx, deps, gamma.id)).toMatchObject({ ok: true });
    const c = await ctx.db.query.arCase.findFirst({ where: eq(arCase.id, gamma.id) });
    expect(c).toMatchObject({ stage: "prepared", formSource: "generated" });
    expect((await ctx.storage.get(c!.formDocumentId!)).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("the dispatch email names the signer the records source gives", async () => {
    const { ctx, deps, drafts, gamma } = await setup(registers());
    await recordRegistryCheck(ctx, gamma.id, { result: "no_changes" });
    await prepareCase(ctx, deps, gamma.id);
    await confirmPayment(ctx, gamma.id);
    await draftDispatch(ctx, deps, gamma.id, {});
    expect(drafts[0].text).toContain("WONG Siu Ling");
  });

  it("a reason shown to staff names the installation's records system, whatever it is", async () => {
    const { ctx, deps, gamma } = await setup(registers({ dispatchFacts: async () => null }));
    await recordRegistryCheck(ctx, gamma.id, { result: "no_changes" });
    await prepareCase(ctx, deps, gamma.id);
    await confirmPayment(ctx, gamma.id);
    await expect(draftDispatch(ctx, deps, gamma.id, {})).rejects.toThrow(/no director to sign in the registers/i);
  });

  it("an installation without a dispatch template cannot draft the client email", async () => {
    const { ctx, deps, drafts, gamma } = await setup(registers());
    await recordRegistryCheck(ctx, gamma.id, { result: "no_changes" });
    await prepareCase(ctx, deps, gamma.id);
    await confirmPayment(ctx, gamma.id);
    await expect(draftDispatch(ctx, { ...deps, template: null }, gamma.id, {})).rejects.toThrow(/template/i);
    expect(drafts).toHaveLength(0);
  });

  it("the background cycle asks the records source for a newer copy and records its as-at time", async () => {
    const records = registers();
    const { ctx } = await setup(records);
    await runAnnualCycle(ctx, { records, mail: null, sync: { mailboxes: [], firmDomains: [], lookbackDays: 60 }, statusDir: null, withinDays: 60 });
    expect(records.refreshed).toBe(1);
    expect(await readHealth(ctx)).toMatchObject({ recordsAsAt: "2026-11-05T01:00:00.000Z", errors: {} });
  });

  it("a records source that cannot refresh is reported and the cycle carries on", async () => {
    const records = registers({ refresh: async () => { throw new Error("The registers are unreachable"); } });
    const { ctx } = await setup(records);
    const h = await runAnnualCycle(ctx, { records, mail: null, sync: { mailboxes: [], firmDomains: [], lookbackDays: 60 }, statusDir: null, withinDays: 60 });
    expect(h.errors.records).toMatch(/unreachable/);
    expect(h.errors.cases).toBeUndefined();
  });
});

describe("the annual module's imports", () => {
  it("only the annual module's wiring file imports a records system", () => {
    const dir = path.resolve(__dirname, "../src/annual");
    const importers = readdirSync(dir).filter((f) => f.endsWith(".ts"))
      .filter((f) => /from\s+["']@\/integrations\/csa\//.test(readFileSync(path.join(dir, f), "utf8")));
    expect(importers).toEqual(["runtime.ts"]);
  });
});
