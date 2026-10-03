import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { resetAuditFixtures } from "./audit-fixtures";

test.afterAll(({}, info) => { resetAuditFixtures(info); });

for (const lang of ["en", "tc", "sc"] as const) test(`the supplied cessation date shows the 15-day filing deadline on task and Today with ${lang} content`, async ({ page }, info) => {
  const env = resetAuditFixtures(info);
  const f = JSON.parse(execFileSync("node_modules/.bin/tsx", ["e2e/scripts/model-deadline-fixture.ts", lang], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })) as { taskId: string; title: string; dueDate: string | null; expectedDueDate: string; playbookVersion: number; playbookNames: { en: string; tc: string; sc: string } };
  expect(f.dueDate).toBe(f.expectedDueDate);
  expect(f.playbookVersion).toBe(3);
  expect(f.playbookNames).toEqual({ en: "Director resignation", tc: "董事辭任", sc: "董事辞任" });
  if (lang === "sc") expect(f.title).toBe("董事辞任: 陈大文");
  const pageErrors: string[] = []; page.on("pageerror", error => pageErrors.push(error.message));
  for (const width of [375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/tasks/${f.taskId}`, { waitUntil: "domcontentloaded" });
    // Layout clock synchronization can finish alongside server component rendering.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: f.title, exact: true })).toBeVisible();
    await expect(page.locator('.top [title="Due in 14 day(s)"]')).toContainText("14d left");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `model-deadline-task-${lang}-${width}.png`), fullPage: true });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const row = page.locator("li").filter({ has: page.getByRole("link", { name: f.title, exact: true }) });
    await expect(row).toBeVisible();
    await expect(row.locator('[title="Due in 14 day(s)"]')).toContainText("14d left");
    await expect(row.locator(".seal")).toHaveText("限");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `model-deadline-today-${lang}-${width}.png`), fullPage: true });
  }
  expect(pageErrors).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 900 });
});
