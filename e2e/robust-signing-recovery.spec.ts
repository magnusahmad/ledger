import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { auditEnvironment, resetAuditFixtures } from "./audit-fixtures";

let fixture: { proposalId: string; envelopeId: string; recipients: { name: string; email: string; status: string }[]; documentTitles: string[]; attempts: number };
test.beforeAll(({}, info) => {
  const env = resetAuditFixtures(info);
  execFileSync("node_modules/.bin/tsx", ["e2e/scripts/seed-signing-recovery.ts"], { env, stdio: "pipe", timeout: 60_000 });
  fixture = JSON.parse(readFileSync(path.join(env.STORAGE_DIR!, "signing-recovery-case.json"), "utf8"));
});
test.afterAll(({}, info) => { resetAuditFixtures(info); });

for (const width of [375, 768, 1280, 1440]) test(`partial signing recovery shows original approved recipients and documents with invitation states and redacted links at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  const env = auditEnvironment(info);
  const db = new Pool({ connectionString: env.DATABASE_URL });
  try {
    const firmId = env.FIRM_ID ?? "firm_crcs";
    const journal = async () => (await db.query("SELECT id, source_key, status FROM mail_delivery WHERE firm_id = $1 AND source_key LIKE $2 ORDER BY id", [firmId, `signer:${fixture.envelopeId}:%`])).rows;
    const before = await journal();
    expect(before.map(d => d.status).sort()).toEqual(["sent", "uncertain"]);
    expect(fixture.attempts).toBe(2);
    await page.goto(`/review/${fixture.proposalId}`, { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: `storage/e2e/shots/signing-recovery-${width}.png`, fullPage: true });
    for (const title of fixture.documentTitles) await expect(page.getByText(title, { exact: true })).toBeVisible();
    for (const recipient of fixture.recipients) {
      const row = page.locator(".signer-recovery").filter({ hasText: recipient.email });
      await expect(row).toBeVisible();
      await expect(row.getByText(recipient.name, { exact: true })).toBeVisible();
      await expect(row.getByText(recipient.status, { exact: true })).toBeVisible();
    }
    await expect(page.getByText("UNAPPROVED SIGNING DOCUMENT EDIT", { exact: true })).toHaveCount(0);
    expect(await page.content()).not.toMatch(/\/sign\/[A-Za-z0-9]{12,}/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.waitForTimeout(1100);
    await expect(page).toHaveURL(new RegExp(`/review/${fixture.proposalId}$`));
    expect(await journal()).toEqual(before);
    const outboxPath = path.join(env.STORAGE_DIR!, "fake/outbox.json");
    expect(existsSync(outboxPath) ? JSON.parse(readFileSync(outboxPath, "utf8")) : []).toHaveLength(0);
  } finally { await db.end(); await page.setViewportSize({ width: 1280, height: 900 }); }
});
