// Writing back to UHY's own systems (UHY pilot brief, "Principles"): generated papers go into the
// client folders on F: under the firm's naming convention, never overwriting anything; a status
// workbook and a review log on the share mean staff keep the record if the pilot is switched off.
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { resetDb, makeCtx } from "./helpers";
import { client, firm } from "@/db/schema";
import { filePaper, writeStatusFiles, type UhyFilingRules } from "@/annual/writeback";
import { syncCases, listCases, recordRegistryCheck, markPrepared, confirmPayment } from "@/annual/cases";

const rules: UhyFilingRules = { clientFolder: "{code}-{client}", annualReturn: "{code}-Annual Return-{madeUp}", agm: "{code}-AGM-{year}" };

describe("filing generated papers", () => {
  it("a generated annual return is saved in the client folder under UHY's naming convention", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "uhy-f-"));
    const p = await filePaper({ root, rules, client: { code: "S3226", name: "Fictional Design Limited" }, kind: "annualReturn", madeUpDate: "2026-10-17", year: 2026, content: Buffer.from("%PDF") });
    expect(path.relative(root, p)).toBe(path.join("S3226-Fictional Design Limited", "S3226-Annual Return-17Oct2026.pdf"));
    expect(await readFile(p)).toEqual(Buffer.from("%PDF"));
  });

  it("an existing file is never overwritten", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "uhy-f-"));
    await mkdir(path.join(root, "A1-Alpha"), { recursive: true });
    await writeFile(path.join(root, "A1-Alpha", "A1-AGM-2026.pdf"), "staff's own file");
    const p = await filePaper({ root, rules, client: { code: "A1", name: "Alpha" }, kind: "agm", madeUpDate: null, year: 2026, content: Buffer.from("new") });
    expect(path.basename(p)).toBe("A1-AGM-2026 (2).pdf");
    expect(await readFile(path.join(root, "A1-Alpha", "A1-AGM-2026.pdf"), "utf8")).toBe("staff's own file");
  });

  it("a client name can't place a file outside the share", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "uhy-f-"));
    const p = await filePaper({ root, rules, client: { code: "..", name: "../../etc" }, kind: "agm", madeUpDate: null, year: 2026, content: Buffer.from("x") });
    expect(p.startsWith(root + path.sep)).toBe(true);
    expect(await readdir(root)).toHaveLength(1);
  });
});

describe("status workbook and review log on the share", () => {
  beforeEach(async () => { await resetDb(); });

  it("the workbook lists every case with its stage and who confirmed payment; the log lists every step", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" });
    await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Firm", invoicePrefix: "F" });
    await ctx.db.insert(client).values({ id: "cl_a", firmId: ctx.firmId, code: "A001", nameEn: "Alpha Limited", incorporatedOn: "2015-11-20" });
    await syncCases(ctx, { withinDays: 60 });
    const [c] = await listCases(ctx);
    await recordRegistryCheck({ ...ctx, userId: "user_ruby" }, c.id, { result: "no_changes" });
    await markPrepared({ ...ctx, userId: "user_ruby" }, c.id, { formSource: "generated" });
    await confirmPayment({ ...ctx, userId: "user_coe" }, c.id);
    const dir = await mkdtemp(path.join(tmpdir(), "uhy-status-"));
    await writeStatusFiles(ctx, dir, { userNames: { user_ruby: "Ruby", user_coe: "Coe" } });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(dir, "Clerk annual returns.xlsx"));
    const ws = wb.getWorksheet("Cases")!;
    const header = (ws.getRow(1).values as string[]).slice(1);
    const row = (ws.getRow(2).values as unknown[]).slice(1);
    const at = (h: string) => row[header.indexOf(h)];
    expect(at("Client code")).toBe("A001");
    expect(at("Stage")).toBe("Payment confirmed");
    expect(at("Payment confirmed by")).toBe("Coe");
    expect(at("Due")).toBe("2027-01-01");

    const raw = await readFile(path.join(dir, "Clerk review log.csv"), "utf8");
    expect(raw.charCodeAt(0)).toBe(0xfeff); // Excel needs the byte-order mark to read Chinese names
    const lines = raw.slice(1).trim().split("\n");
    expect(lines[0]).toBe("When,Who,Client code,Company,Case,Step,Detail");
    expect(lines.slice(1).map((l) => l.split(",")[1])).toEqual(["Ruby", "Ruby", "Coe"]);
    expect(lines[1]).toContain("Registry check");
  });
});
