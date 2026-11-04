// The pilot's background cycle: import CSA when a newer restore exists, open cases, read mail, and
// write the status files to the share. One failing step is reported in the health record and does
// not stop the others; the health record holds no client data.
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { resetDb, makeCtx } from "./helpers";
import { firm } from "@/db/schema";
import { runAnnualCycle, readHealth, type CycleDeps } from "@/annual/cycle";
import { SqlCsaSource } from "@/integrations/csa/sql-source";
import { listCases } from "@/annual/cases";
import type { MailboxSource } from "@/annual/mail-sync";

const companies = [{ csaId: "C1", code: "A001", nameEn: "Alpha Limited", nameZh: null, brNumber: "1", companyNumber: "1", incorporatedOn: "2015-11-20", fyeMonth: null, fyeDay: null, registeredOffice: "x", companyType: "private" }];
const csa = () => new SqlCsaSource(async (q) => (q === "companies" ? companies : []), { companies: "companies", officers: "o", members: "m", shareClasses: "s", contacts: "k" });
const emptyMail: MailboxSource = {
  delta: async () => ({ messages: [], cursor: "c" }), headers: async () => ({}),
  full: async () => { throw new Error("unused"); }, createDraft: async () => { throw new Error("unused"); },
};

async function deps(over: Partial<CycleDeps> = {}): Promise<CycleDeps & { restoreStatus: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "uhy-cycle-"));
  const restoreStatus = path.join(dir, "restore-status.json");
  await writeFile(restoreStatus, JSON.stringify({ ok: true, backupTakenAt: "2026-11-05T02:13:00.000Z", restoredAt: "2026-11-05T04:30:00.000Z" }));
  return {
    restoreStatusFile: restoreStatus, openCsa: async () => ({ source: csa(), close: async () => {} }),
    mail: emptyMail, sync: { mailboxes: ["ruby@uhy.example"], firmDomains: ["uhy.example"], lookbackDays: 60 },
    statusDir: path.join(dir, "status"), restoreStatus, withinDays: 60, ...over,
  };
}

describe("pilot background cycle", () => {
  beforeEach(async () => { await resetDb(); });

  it("imports a newer CSA restore, opens cases and writes the status files", async () => {
    const ctx = makeCtx({ now: "2026-11-05T05:00:00Z" });
    await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Firm", invoicePrefix: "F" });
    const d = await deps();
    await runAnnualCycle(ctx, d);
    expect((await listCases(ctx)).map((c) => c.clientCode)).toEqual(["A001"]);
    expect((await readdir(d.statusDir!)).sort()).toEqual(["Harbourline annual returns.xlsx", "Harbourline review log.csv"]);
    const h = await readHealth(ctx);
    expect(h).toMatchObject({ csaBackupTakenAt: "2026-11-05T02:13:00.000Z", errors: {} });
    expect(h?.lastCycleAt).toBe("2026-11-05T05:00:00.000Z");
  });

  it("doesn't import the same restore twice", async () => {
    const ctx = makeCtx({ now: "2026-11-05T05:00:00Z" });
    await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Firm", invoicePrefix: "F" });
    let opened = 0;
    const d = await deps({ openCsa: async () => { opened++; return { source: csa(), close: async () => {} }; } });
    await runAnnualCycle(ctx, d);
    await runAnnualCycle(ctx, d);
    expect(opened).toBe(1);
  });

  it("a failed restore is reported and the last good CSA copy stays in use", async () => {
    const ctx = makeCtx({ now: "2026-11-05T05:00:00Z" });
    await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Firm", invoicePrefix: "F" });
    const d = await deps();
    await writeFile(d.restoreStatus, JSON.stringify({ ok: false, backupTakenAt: "2026-11-06T02:13:00.000Z", error: "disk full" }));
    await runAnnualCycle(ctx, d);
    expect((await readHealth(ctx))?.errors.csa).toMatch(/disk full/);
  });

  it("a failing mail sync is recorded and doesn't stop the status files", async () => {
    const ctx = makeCtx({ now: "2026-11-05T05:00:00Z" });
    await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Firm", invoicePrefix: "F" });
    const d = await deps({ mail: { ...emptyMail, delta: async () => { throw new Error("Microsoft 365 sign-in failed: AADSTS7000215"); } } });
    await runAnnualCycle(ctx, d);
    const h = await readHealth(ctx);
    expect(h?.errors.mail).toMatch(/sign-in failed/);
    expect(await readdir(d.statusDir!)).toHaveLength(2);
  });
});
