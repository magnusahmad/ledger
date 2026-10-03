import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { auditEnvironment, resetAuditFixtures } from "./audit-fixtures";

let cases: { language: string; clientId: string; className: string; proposalId: string }[];
test.beforeAll(({}, info) => {
  const env = resetAuditFixtures(info);
  execFileSync("node_modules/.bin/tsx", ["e2e/scripts/seed-historical-shares.ts"], { env, stdio: "pipe", timeout: 120_000 });
  cases = JSON.parse(readFileSync(path.join(env.STORAGE_DIR!, "historical-share-cases.json"), "utf8"));
});
test.afterAll(({}, info) => { resetAuditFixtures(info); });

for (const width of [375, 768, 1280, 1440]) test(`approved USD share history and separate human previews remain readable in EN TC SC at ${width}px`, async ({ page }, info) => {
  const env = auditEnvironment(info), errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width, height: 900 });
  for (const c of cases) {
    await page.goto(`/clients/${c.clientId}?tab=shares&asAt=2026-09-02`, { waitUntil: "domcontentloaded" });
    const capital = page.locator(".card").filter({ has: page.getByRole("heading", { name: "Share capital", exact: true }) });
    await expect(capital.getByRole("row").nth(1).getByRole("cell")).toContainText([c.className, "USD", "10"]);
    const members = page.locator(".card").filter({ has: page.getByRole("heading", { name: /^Members as at 2 Sep(?:t)? 2026$/ }) });
    await expect(members.getByRole("row").nth(1).getByRole("cell")).toContainText(["CHAN Tai Man", c.className, "6", "60%"]);
    await expect(members.getByRole("row").nth(2).getByRole("cell")).toContainText(["LEE Siu Ling", c.className, "4", "40%"]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(env.STORAGE_DIR!, `shots/share-register-${c.language}-${width}.png`), fullPage: true });
    if (width === 375) {
      const moved = await capital.evaluate(el => { el.scrollLeft = el.scrollWidth - el.clientWidth; return el.scrollLeft; });
      expect(moved, "mobile staff can scroll to the issued and paid-up capital columns").toBeGreaterThan(0);
      await expect(capital.getByRole("row").nth(1).getByRole("cell").last()).toBeInViewport();
      const holdingsMoved = await members.evaluate(el => { el.scrollLeft = el.scrollWidth - el.clientWidth; return el.scrollLeft; });
      expect(holdingsMoved, "mobile staff can scroll to dated member holdings").toBeGreaterThan(0);
      await expect(members.getByRole("row").nth(1).getByRole("cell").last()).toBeInViewport();
      await page.screenshot({ path: path.join(env.STORAGE_DIR!, `shots/share-register-scrolled-${c.language}-${width}.png`), fullPage: true });
      await capital.evaluate(el => { el.scrollLeft = 0; });
      await members.evaluate(el => { el.scrollLeft = 0; });
    }
    await page.goto(`/review/${c.proposalId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(`Allot 15 ${c.className} shares to CHAN Tai Man on 2026-10-01`, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Update registers", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(env.STORAGE_DIR!, `shots/share-review-${c.language}-${width}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 900 });
});
