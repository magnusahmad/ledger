import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { auditEnvironment, resetAuditFixtures } from "./audit-fixtures";
type Case = { language: string; proposalId: string; invoiceId: string; taskId: string; originalProposalId: string; journalId: string; correlationId: string; pdfSha256: string; issuedOn: string; dueOn: string };
let cases: Case[];
const button = "Approve reviewed dates and complete original action";
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
async function hydrated(page: Page) {
  await page.waitForFunction(button => {
    const form = [...document.querySelectorAll("form")].find(f => [...f.querySelectorAll("button")].some(b => b.textContent === button));
    return !!form && Object.keys(form).some(k => k.startsWith("__reactProps$") && typeof (form as unknown as Record<string, { action?: unknown }>)[k]?.action === "function");
  }, button);
}
test.beforeEach(({}, info) => {
  const env = resetAuditFixtures(info);
  execFileSync("node_modules/.bin/tsx", ["e2e/scripts/seed-temporal-invoice-review.ts"], { env, stdio: "pipe", timeout: 120_000 });
  cases = JSON.parse(readFileSync(path.join(env.STORAGE_DIR!, "temporal-invoice-cases.json"), "utf8"));
});
test.afterAll(({}, info) => { resetAuditFixtures(info); });
for (const width of [375, 768, 1280, 1440]) test(`D01 fresh legacy invoice date review retains original PDF and one send in EN TC SC at ${width}px`, async ({ page }, info) => {
  const env = auditEnvironment(info), db = new Pool({ connectionString: env.DATABASE_URL }), errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width, height: 900 });
  try {
    const initialSeq = (await db.query("select invoice_seq from firm where id='firm_crcs'")).rows[0].invoice_seq;
    const docs = (await db.query("select count(*)::int n from document")).rows[0].n;
    const filings = (await db.query("select count(*)::int n from filing")).rows[0].n;
    const outbox = path.join(env.STORAGE_DIR!, "fake/outbox.json");
    const sentBefore = JSON.parse(readFileSync(outbox, "utf8")); expect(sentBefore).toHaveLength(3);
    for (const c of cases) {
      expect((await db.query("select status,issued_on,due_on from invoice where id=$1", [c.invoiceId])).rows[0]).toEqual({ status: "draft", issued_on: null, due_on: null });
      expect((await db.query("select status from proposal where id=$1", [c.proposalId])).rows[0].status).toBe("recovery");
      await page.goto(`/review/${c.proposalId}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Review original invoice dates", exact: true })).toBeVisible();
      await page.screenshot({ path: path.join(env.STORAGE_DIR!, `shots/date-review-entry-${c.language}-${width}.png`), fullPage: true });
      const original = await page.request.get(`/api/review/${c.proposalId}/invoice`);
      expect(original.status()).toBe(200); expect(original.headers()["content-type"]).toBe("application/pdf");
      const bytes = await original.body(); expect(sha(bytes)).toBe(c.pdfSha256);
      writeFileSync(path.join(env.STORAGE_DIR!, `shots/date-review-original-${c.language}-${width}.pdf`), bytes);
      const text = execFileSync("pdftotext", ["-layout", "-", "-"], { input: bytes, timeout: 10_000 }).toString();
      expect(text).toContain("29 September 2026"); expect(text).toContain("30 days");
      // The supported renderer prints issue date + credit terms, not a due date.
      // Staff instructions must not tell them to copy a field absent from the original PDF.
      if (!/due.*date|到期|到期日/i.test(text)) {
        await expect(page.locator('label[for="original-due-date"]')).not.toHaveText(/on the delivered invoice/i);
        await expect(page.getByRole("heading", { name: "Review original invoice dates", exact: true }).locator(".."))
          .not.toContainText("Enter the dates printed on that PDF.");
      }
      const denied = await page.request.get(`/api/review/${c.originalProposalId}/invoice`); expect(denied.status()).toBe(404);
      await hydrated(page);
      await page.locator('[name="issuedOn"]').fill(c.issuedOn);
      await page.locator('[name="dueOn"]').fill(c.dueOn);
      await page.locator('[name="checkedOriginalInvoice"]').check();
      await page.locator('#invoice-date-note').fill(`Viewed exact original PDF. Issue date 29 September; due 29 October under printed 30-day terms. ${c.language === "tc" ? "已核對原始發票" : c.language === "sc" ? "已核对原始发票" : "Fictional review"}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: path.join(env.STORAGE_DIR!, `shots/date-review-form-${c.language}-${width}.png`), fullPage: true });
      const response = page.waitForResponse(r => r.request().method() === "POST" && !!r.request().headers()["next-action"], { timeout: 120_000 });
      await page.getByRole("button", { name: button, exact: true }).click();
      const finished = await response; expect(finished.ok()).toBe(true); await finished.finished();
      await expect.poll(async () => (await db.query("select status from proposal where id=$1", [c.proposalId])).rows[0].status).toBe("approved");
      expect((await db.query("select status,issued_on::text,due_on::text from invoice where id=$1", [c.invoiceId])).rows[0]).toEqual({ status: "sent", issued_on: c.issuedOn, due_on: c.dueOn });
      expect((await db.query("select step_index from task where id=$1", [c.taskId])).rows[0].step_index).toBe(2);
      const journal = (await db.query("select status,correlation_id from mail_delivery where id=$1", [c.journalId])).rows[0];
      expect(journal).toEqual({ status: "sent", correlation_id: c.correlationId });
      expect(JSON.parse(readFileSync(outbox, "utf8"))).toEqual(sentBefore);
      expect((await db.query("select count(*)::int n from mail_delivery")).rows[0].n).toBe(3);
      expect((await db.query("select count(*)::int n from document")).rows[0].n).toBe(docs);
      expect((await db.query("select count(*)::int n from filing")).rows[0].n).toBe(filings);
      expect((await db.query("select invoice_seq from firm where id='firm_crcs'")).rows[0].invoice_seq).toBe(initialSeq);
      expect((await db.query("select count(*)::int n from audit_log where action='invoice.delivery.dates_reviewed' and entity_id=$1", [c.invoiceId])).rows[0].n).toBe(1);
      await page.goto(`/invoices/${c.invoiceId}`, { waitUntil: "domcontentloaded" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: path.join(env.STORAGE_DIR!, `shots/date-review-complete-${c.language}-${width}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
  } finally { await db.end(); await page.setViewportSize({ width: 1440, height: 900 }); }
});
