import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { pdfTextRuns } from "./pdf-text-runs";
import { seedDemo } from "@/db/seed-demo";
import { appointment, client, charge, document, invoice, invoiceLine, shareClass } from "@/db/schema";
import { createPerson } from "@/domain/records";
import { createRequest, startTask } from "@/domain/engine";
import { generateForTask } from "@/documents/generate";
import { loadDocContext } from "@/documents/context";
import { buildPdf } from "@/documents/builder";
import { TEMPLATES } from "@/documents/templates";
import { renderInvoicePdf } from "@/documents/invoice-pdf";
import { renderRegisters } from "@/documents/register-export";
import { Crypto } from "@/lib/crypto";
import { money } from "@/domain/labels";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
});

// Exact saved-byte inspection, independent of builder.text/extractedText.
async function inspect(name: string, bytes: Buffer) {
  const result = await pdfTextRuns(bytes);
  if (process.env.AUDIT_OUTPUT_DIR) {
    const dir = process.env.AUDIT_OUTPUT_DIR;
    if (!path.resolve(dir).startsWith("/private/tmp/clerk-")) throw new Error("Audit artifacts require the isolated temporary audit directory");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${name}.pdf`), bytes);
    await writeFile(path.join(dir, `${name}.json`), JSON.stringify({ sha256: Crypto.sha256(bytes), pages: result.pdf.getPageCount(), runs: result.runs }, null, 2));
  }
  expect(result.runs.length).toBeGreaterThan(0);
  return result;
}
function printable(runs: Awaited<ReturnType<typeof pdfTextRuns>>["runs"]) {
  const bad = runs.filter(r => r.x < 48 || r.x + r.width > 547.01 || r.y < 26 || r.y > 812);
  expect(bad, "every saved text run is inside the printable page, without clipped facts").toEqual([]);
}
async function officeTask(lang: "en" | "tc" | "sc", names: { en?: string; zh?: string } = {}, address = "Unit 123, 888 Fictional Road, Hong Kong") {
  await ctx.db.update(client).set({ docLang: lang, ...(names.en ? { nameEn: names.en } : {}), ...(names.zh ? { nameTc: names.zh, nameSc: names.zh } : {}) }).where(eq(client.id, "cli_c1"));
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const t = await startTask(ctx, { clientId: "cli_c1", requestId: req.id, playbookId: "hk.changeOffice", params: { effectiveDate: "2026-10-15" }, extracted: { newAddr: { value: address } } });
  return t;
}
async function officeResolution(lang: "en" | "tc" | "sc", names: { en?: string; zh?: string } = {}, address = "Unit 123, 888 Fictional Road, Hong Kong", resolutionConsumerOnly = false) {
  const t = await officeTask(lang, names, address);
  if (resolutionConsumerOnly) {
    // Preserve the supported resolution consumer independently of fixed-box form refusal.
    // Same task/context/template/layout as generateForTask; no statutory writes.
    const c = await loadDocContext(ctx, t.id);
    const ref = c.pb.documents.find(d => d.template === "tpl:board-resolution")!;
    const built = await buildPdf(TEMPLATES[ref.template](c), { lang: c.lang, header: `${c.client.nameEn} · ${ref.name}`, footer: `Prepared by ${c.firm.legalName} · ${c.task.id}` });
    return { bytes: built.pdf, docs: [] };
  }
  const docs = await generateForTask(ctx, t.id);
  if (process.env.AUDIT_OUTPUT_DIR) {
    const dir = path.resolve(process.env.AUDIT_OUTPUT_DIR);
    if (!dir.startsWith("/private/tmp/clerk-")) throw new Error("Use isolated temporary artifacts");
    const pack = [];
    for (const d of docs) {
      const row = (await ctx.db.query.document.findFirst({ where: eq(document.id, d.id) }))!;
      const bytes = await ctx.storage.get(row.storageKey!);
      const filename = `full-pack-${lang}-${row.sha256!.slice(0, 10)}-${d.template.replace(/:/g, "-")}.pdf`;
      await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, filename), bytes);
      pack.push({ filename, template: d.template, sha256: Crypto.sha256(bytes), recordedSha256: row.sha256 });
    }
    await writeFile(path.join(dir, `full-pack-${lang}-${pack[0].sha256.slice(0, 10)}.json`), JSON.stringify(pack, null, 2));
  }
  const resolution = docs.find(d => d.template === "tpl:board-resolution")!;
  const saved = (await ctx.db.query.document.findFirst({ where: eq(document.id, resolution.id) }))!;
  const bytes = await ctx.storage.get(saved.storageKey!);
  expect(saved.sha256).toBe(Crypto.sha256(bytes));
  return { bytes, docs };
}

describe("Area 8 saved generated packs", () => {
  it("PACK01 a resolution preserves long company names inside printable header and body margins", async () => {
    const company = "FictionalInternationalTradeAndSecretarialServices".repeat(3) + " Limited";
    const { bytes } = await officeResolution("tc", { en: company, zh: "虛構跨境貿易與公司秘書服務".repeat(8) + "有限公司" }, undefined, true);
    const { runs } = await inspect("pack01-long-company-tc", bytes);
    expect(runs.map(r => r.text).join("")).toContain(company);
    printable(runs);
  });

  it("PACK02 an unbroken address identifier wraps without clipping the approved resolution facts", async () => {
    const token = "FictionalBuildingReference" + "X".repeat(140);
    const { bytes } = await officeResolution("sc", {}, `Unit 123, ${token}, 888 Fictional Road, Hong Kong`, true);
    const { runs } = await inspect("pack02-unbroken-address-sc", bytes);
    expect(runs.map(r => r.text).join("")).toContain(token);
    printable(runs);
  });

  it("PACK03 a multi-service invoice retains all thirty service amounts, total and payment details on printable pages", async () => {
    const amounts = Array.from({ length: 30 }, (_, i) => 10001 + i * 101);
    await ctx.db.insert(invoice).values({ id: "inv_pack", firmId: ctx.firmId, clientId: "cli_c1", number: "AUDIT-2026-0001", totalCents: amounts.reduce((a,b) => a+b), issuedOn: "2026-10-03" });
    await ctx.db.insert(invoiceLine).values(amounts.map((amountCents, sort) => ({ id: `line_pack_${sort}`, firmId: ctx.firmId, invoiceId: "inv_pack", description: `Fictional service ${sort + 1} 公司秘書服務`, amountCents, sort })));
    const { runs, pdf } = await inspect("pack03-thirty-line-invoice", await renderInvoicePdf(ctx, "inv_pack"));
    for (let n = 1; n <= 30; n++) expect(runs.map(r => r.text).join("\n")).toContain(`Fictional service ${n} `);
    expect(runs.map(r => r.text).join("\n")).toContain("Total 總額");
    for (const amount of amounts) expect(runs.map(r => r.text)).toContain(money(amount, "HKD"));
    expect(runs.map(r => r.text)).toContain(money(amounts.reduce((a,b) => a+b), "HKD"));
    for (const [key, value] of Object.entries(await ctx.bank.accountDetails())) expect(runs.map(r => r.text)).toContain(`${key}: ${value}`);
    expect(pdf.getPageCount(), "services and payment instructions cannot run below a single page").toBeGreaterThan(1);
    printable(runs);
  });

  it("PACK04 a long multilingual invoice service description remains complete and cannot overlap its amount", async () => {
    const description = "虛構公司秘書服務及核對歷史登記資料".repeat(10) + " 完整服務結尾";
    await ctx.db.insert(invoice).values({ id: "inv_long", firmId: ctx.firmId, clientId: "cli_c1", number: "AUDIT-2026-0002", totalCents: 12345678, issuedOn: "2026-10-03" });
    await ctx.db.insert(invoiceLine).values({ id: "line_long", firmId: ctx.firmId, invoiceId: "inv_long", description, amountCents: 12345678 });
    const { runs } = await inspect("pack04-long-description-invoice", await renderInvoicePdf(ctx, "inv_long"));
    expect(runs.filter(r => r.x >= 64 && r.x < 200 && r.text !== "Description 項目" && r.y > 84 && r.y < 790).map(r => r.text).join("")).toContain(description);
    printable(runs);
  });

  it("PACK05 a register charge row longer than one page continues with all dated facts inside page margins", async () => {
    const description = "虛構押記描述及完整登記資料 ".repeat(140) + " 最後押記事實";
    await ctx.db.insert(charge).values({ id: "chg_pack", firmId: ctx.firmId, clientId: "cli_c1", description, chargee: "Fictional secured party", createdOn: "2026-09-29" });
    const { pdf } = await renderRegisters(ctx, "cli_c1", "2026-10-03", "tc");
    const { runs } = await inspect("pack05-tall-register-row-tc", pdf);
    // Read the complete description column in page order, excluding repeated headers and sibling columns.
    expect(runs.filter(r => r.x > 180 && r.x < 300 && r.y > 84 && r.y < 790 && r.text !== "詳情").map(r => r.text).join("").replace(/\s/g, "")).toContain(description.replace(/\s/g, ""));
    printable(runs);
  });

  it("PACK06 ordinary dated registers preserve the reporting date and holding quantities on printable pages", async () => {
    const { pdf } = await renderRegisters(ctx, "cli_c1", "2026-10-03", "sc");
    const { runs } = await inspect("pack06-ordinary-register-sc", pdf);
    expect(runs.map(r => r.text).join("\n")).toContain("2026-10-03");
    expect(runs.map(r => r.text).join("\n")).toContain("7,000");
    printable(runs);
  });

  it("PACK07 copying or searching an invoice retains its exact reference, financial total and numeric bank account", async () => {
    await ctx.db.insert(invoice).values({ id: "inv_search", firmId: ctx.firmId, clientId: "cli_c1", number: "AUDIT-2026-001234", totalCents: 12345678, issuedOn: "2026-10-03" });
    await ctx.db.insert(invoiceLine).values({ id: "line_search", firmId: ctx.firmId, invoiceId: "inv_search", description: "Fictional statutory work 公司秘書服務", amountCents: 12345678 });
    const bytes = await renderInvoicePdf(ctx, "inv_search");
    await inspect("pack07-searchable-payment-reference", bytes);
    // Poppler reads the saved PDF's standard mappings: no custom glyph repair.
    // This existing audit tool is a fixture prerequisite; absence is a harness error.
    const copied = execFileSync("pdftotext", ["-", "-"], { input: bytes, timeout: 10_000 }).toString();
    expect(copied).toContain("AUDIT-2026-001234");
    expect(copied).toContain(money(12345678, "HKD"));
    for (const value of Object.values(await ctx.bank.accountDetails())) expect(copied).toContain(value);
  });

  it("PACK08 a resolution with eighteen extra directors keeps every signature field and name on continued pages", async () => {
    const people = [];
    for (let i = 0; i < 18; i++) {
      const p = await createPerson(ctx, { nameEn: `Fictional Director ${String(i + 1).padStart(2, "0")}`, nameZh: `虛構董事${i + 1}` });
      await ctx.db.insert(appointment).values({ id: `appt_pack_${i}`, firmId: ctx.firmId, clientId: "cli_c1", personId: p.id, role: "director", fromDate: "2026-01-01" });
      people.push(p);
    }
    const { bytes, docs } = await officeResolution("tc");
    const { pdf, runs } = await inspect("pack08-many-director-resolution", bytes);
    const fields = docs.find(d => d.template === "tpl:board-resolution")!.signatureFields;
    expect(fields).toHaveLength(19);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    for (const p of people) expect(runs.map(r => r.text)).toContain(p.nameEn);
    for (const f of fields) {
      expect(f.page).toBeLessThan(pdf.getPageCount());
      expect(f.x).toBeGreaterThanOrEqual(48); expect(f.x + f.w).toBeLessThanOrEqual(547);
      expect(f.y).toBeGreaterThanOrEqual(48); expect(f.y + f.h).toBeLessThanOrEqual(794);
    }
    printable(runs);
  });

  it("PACK09 a long director name in the signature block remains complete within the resolution margins", async () => {
    const name = "Fictional International Director With All Confirmed Particulars ".repeat(3).trim();
    const p = await createPerson(ctx, { nameEn: name, nameZh: "虛構董事" });
    await ctx.db.insert(appointment).values({ id: "appt_long_name", firmId: ctx.firmId, clientId: "cli_c1", personId: p.id, role: "director", fromDate: "2026-01-01" });
    const { bytes } = await officeResolution("tc");
    const { runs } = await inspect("pack09-long-director-name", bytes);
    expect(runs.map(r => r.text).join(" ").replace(/\s+/g, " ")).toContain(name);
    printable(runs);
  });

  it("PACK10 an unsupported five-class annual return refuses manual continuation before storing a partial pack", async () => {
    // Initial register fixtures only: no invented automatic register mutation.
    await ctx.db.insert(shareClass).values(Array.from({ length: 4 }, (_, i) => ({ id: `sc_extra_${i}`, firmId: ctx.firmId, clientId: "cli_c1", name: `Fictional Class ${i + 1}`, currency: "HKD" })));
    const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.annualReturn", periodYear: 2026 });
    const beforeRows = await ctx.db.select().from(document);
    const beforeKeys = [...ctx.storage.files.keys()];
    await expect(generateForTask(ctx, t.id)).rejects.toThrow(/NAR1: unsupported continuation.*manually/i);
    expect(await ctx.db.select().from(document)).toEqual(beforeRows);
    expect([...ctx.storage.files.keys()]).toEqual(beforeKeys);
  });

  for (const kind of ["company", "building"] as const) {
    it(`PACK${kind === "company" ? "14" : "15"} the existing long ${kind} fixture retains complete visible NR1 facts or refuses the entire pack atomically`, async () => {
      const company = "FictionalInternationalTradeAndSecretarialServices".repeat(3) + " Limited";
      const chinese = "虛構跨境貿易與公司秘書服務".repeat(8) + "有限公司";
      const building = "FictionalBuildingReference" + "X".repeat(140);
      const t = await officeTask(kind === "company" ? "tc" : "sc", kind === "company" ? { en: company, zh: chinese } : {}, kind === "building" ? `Unit 123, ${building}, 888 Fictional Road, Hong Kong` : undefined);
      const beforeRows = await ctx.db.select().from(document);
      const beforeKeys = [...ctx.storage.files.keys()];
      let docs: Awaited<ReturnType<typeof generateForTask>>;
      try { docs = await generateForTask(ctx, t.id); }
      catch (error) {
        expect(String(error), "fixed official boxes require an actionable form/manual-preparation explanation").toMatch(/NR1.*(fit|long|overflow|manual|capacity)/i);
        expect(await ctx.db.select().from(document), "official form refusal cannot leave a partial resolution pack").toEqual(beforeRows);
        expect([...ctx.storage.files.keys()], "official form refusal cannot leave partial storage writes").toEqual(beforeKeys);
        return;
      }
      const nr1 = docs.find(d => d.template === "cr:NR1")!;
      expect(nr1).toBeTruthy();
      const saved = (await ctx.db.query.document.findFirst({ where: eq(document.id, nr1.id) }))!;
      const bytes = await ctx.storage.get(saved.storageKey!);
      expect(saved.sha256).toBe(Crypto.sha256(bytes));
      if (process.env.AUDIT_OUTPUT_DIR) {
        const dir = path.resolve(process.env.AUDIT_OUTPUT_DIR);
        if (!dir.startsWith("/private/tmp/clerk-")) throw new Error("Use isolated temporary artifacts");
        await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, `pack${kind === "company" ? "14" : "15"}-nr1-${kind}.pdf`), bytes);
      }
      // Poppler respects the saved widget's clipping rectangle: unlike AcroForm
      // values or raw appearance operators it sees only the actually visible text.
      const copied = execFileSync("pdftotext", ["-layout", "-", "-"], { input: bytes, timeout: 10_000 }).toString().replace(/\s/g, "");
      for (const value of kind === "company" ? [company, chinese] : [building]) expect(copied, "the original confirmed form value must be complete on visible paper").toContain(value.replace(/\s/g, ""));
    });
  }

});
