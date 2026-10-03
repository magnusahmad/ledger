import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { auditEnvironment, resetAuditFixtures } from "./audit-fixtures";
function fixture(env: NodeJS.ProcessEnv, mode: "seed" | "approve_first" | "snapshot", lang = "en") {
  return JSON.parse(execFileSync("node_modules/.bin/tsx", ["e2e/scripts/officer-history-fixture.ts", mode, lang], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
}
async function capture(page: Page, filename: string) {
  // Wait for font/layout painting after responsive resizing, then record the actual page.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await page.screenshot({ path: filename, fullPage: true });
}
test.beforeEach(({}, info) => { resetAuditFixtures(info); });
test.afterEach(({}, info) => { resetAuditFixtures(info); });
for (const lang of ["en", "tc", "sc"]) test(`A4R09 stale register review preserves genuinely filed work and offers fresh register-only approval with ${lang} content at all widths`, async ({ page }, info) => {
  const env = auditEnvironment(info); const f = fixture(env, "seed", lang); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/review/${f.staleProposalId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Update registers", exact: true })).toBeVisible();
  await expect(page.getByText(f.address, { exact: false })).toBeVisible();
  fixture(env, "approve_first"); const before = fixture(env, "snapshot");
  await page.getByRole("button", { name: "Update registers", exact: true }).click();
  const alert = page.locator("form [role=alert]"); await expect(alert).toBeVisible();
  await expect.soft(alert).toContainText(/fresh staff approval|recorded work.*intact/i);
  const after = fixture(env, "snapshot"); expect.soft(after.step).toBe("register"); expect.soft(after.source).toEqual(before.source);
  const fresh = after.proposals.find((p: { id: string; kind: string; status: string }) => p.id !== f.staleProposalId && p.kind === "register_change" && p.status === "pending");
  expect.soft(fresh, "A fresh register-only human preview must replace the stale card").toBeDefined();
  for (const width of [375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await capture(page, path.join(env.STORAGE_DIR!, "shots", `officer-stale-${lang}-${width}.png`));
  }
  if (!fresh) { await page.setViewportSize({ width: 1280, height: 900 }); return; }
  await page.goto(`/tasks/${f.taskId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: /Update registers/ })).toHaveAttribute("href", `/review/${fresh.id}`);
  await expect(page.getByText(before.source.filings[0].reference, { exact: false }).first()).toBeVisible();
  await page.goto(`/review/${fresh.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Update registers", exact: true })).toBeVisible();
  await expect(page.getByText(f.address, { exact: false })).toBeVisible();
  for (const width of [375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await capture(page, path.join(env.STORAGE_DIR!, "shots", `officer-fresh-${lang}-${width}.png`));
  }
  await page.getByRole("button", { name: "Update registers", exact: true }).click(); await expect(page).toHaveURL(/\/$/);
  const final = fixture(env, "snapshot"); expect(final.companyAddress).toBe(f.address);
  for (const key of ["docs", "envelopes", "filings", "bytes", "checklist", "effectiveDate"]) expect(final.source[key]).toEqual(before.source[key]);
  expect(final.step).toBe("confirm"); expect(errors).toEqual([]); await page.setViewportSize({ width: 1280, height: 900 });
});

test("A4R11 dated client officers and controllers show sparse approved names while company B stays unchanged in EN/TC/SC at all widths", async ({ page }, info) => {
  const env = auditEnvironment(info); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const names = ["Sparse Browser Original Officer", "Sparse Backdated September Officer", "Sparse Explicit October Officer", "Sparse Explicit October Officer", "Sparse Explicit October Officer"];
  const dates = ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-03", "2026-10-04"];
  for (const lang of ["en", "tc", "sc"]) {
    const f = JSON.parse(execFileSync("node_modules/.bin/tsx", ["e2e/scripts/sparse-particulars-fixture.ts", lang], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
    await page.setViewportSize({ width: 1280, height: 900 });
    for (let i = 0; i < dates.length; i++) {
      await page.goto(`/clients/${f.aId}?tab=officers&asAt=${dates[i]}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("table").nth(0).getByRole("cell", { name: new RegExp(names[i]) })).toBeVisible();
      await expect(page.locator("table").nth(1).getByRole("cell", { name: names[i], exact: true })).toBeVisible();
      expect(await page.locator("input[name=asAt]").inputValue()).toBe(dates[i]);
      if (i < 3) await capture(page, path.join(env.STORAGE_DIR!, "shots", `officer-date-${lang}-${dates[i]}.png`));
    }
    for (const [companyId, expected, suffix] of [[f.aId, names[3], "a"], [f.bId, names[0], "b"]]) {
      await page.goto(`/clients/${companyId}?tab=officers&asAt=2026-10-03`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("table").nth(0).getByRole("cell", { name: new RegExp(expected) })).toBeVisible();
      await expect(page.locator("table").nth(1).getByRole("cell", { name: expected, exact: true })).toBeVisible();
      for (const width of [375, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        await capture(page, path.join(env.STORAGE_DIR!, "shots", `officer-client-${lang}-${suffix}-${width}.png`));
      }
    }
    for (const pdf of f.pdfs) {
      expect(pdf.text).toContain(pdf.date);
      const expected = pdf.clientId === f.bId ? names[0] : pdf.date === "2026-09-30" ? names[1] : names[3];
      expect(pdf.text).toContain(expected);
      expect(pdf.text).not.toMatch(/particulars reflect the current person record|資料來自現有記錄|资料来自现有记录/);
      if (pdf.clientId === f.aId && pdf.date === "2026-10-03") expect(pdf.text).toContain("October approved fictional address");
      else expect(pdf.text).toContain("Original fictional register address");
    }
  }
  expect(errors).toEqual([]); await page.setViewportSize({ width: 1280, height: 900 });
});
