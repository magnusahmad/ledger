import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resetAuditFixtures } from './audit-fixtures';
let links: { portal: string; signing: string };
test.beforeAll(({}, testInfo) => {
  const env = resetAuditFixtures(testInfo);
  execFileSync('node_modules/.bin/tsx', ['e2e/scripts/seed-records-audit.ts'], { env });
  links = JSON.parse(readFileSync(path.join(env.STORAGE_DIR ?? 'storage/e2e', 'audit-links.json'), 'utf8'));
});
test.afterAll(({}, info) => { resetAuditFixtures(info); });
for (const width of [375, 768, 1280, 1440]) test(`records and public upload remain readable in EN/TC/SC at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const tab of ['company', 'officers', 'shares', 'records', 'overview']) {
    const response = await page.goto(`/clients/cli_c1?tab=${tab}&asAt=2025-03-01`, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Kowloon Bay Trading Limited", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), tab).toBeLessThanOrEqual(1);
    if (tab === 'officers') await page.screenshot({ path: `storage/e2e/shots/audit-officers-${width}.png`, fullPage: true });
  }
  for (const lang of ['en', 'tc', 'sc']) {
    await page.goto(`/u/${links.portal}?lang=${lang}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole('heading', { name: lang === 'en' ? 'Details and documents' : lang === 'tc' ? '所需資料及文件' : '所需资料及文件' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `storage/e2e/shots/audit-portal-${lang}-${width}.png`, fullPage: true });
  }
  await page.goto(`/sign/${links.signing}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole('button', { name: 'Email me a code' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: `storage/e2e/shots/audit-sign-${width}.png`, fullPage: true });
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 900 });
});
test('historical register exports reject invalid dates and unknown document tokens', async ({ request }) => {
  for (const date of ['2025-02-30', '2026-02-29', '2026-13-01', '0000-99-99', '<script>', '2026-01-01T00:00:00Z']) expect((await request.get(`/api/clients/cli_c1/registers?asAt=${encodeURIComponent(date)}`)).status()).toBe(400);
  expect((await request.get('/api/clients/cli_c1/registers?asAt=2024-02-29')).status()).toBe(200);
  expect((await request.get('/api/sign/not-a-token/doc/anything')).status()).toBe(404);
});
