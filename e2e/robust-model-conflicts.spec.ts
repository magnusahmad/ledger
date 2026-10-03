import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { auditEnvironment, resetAuditFixtures } from "./audit-fixtures";

let cases: { language: string; taskId: string; proposalId: string; oldValue: string; incomingValue: string }[];
test.beforeAll(({}, info) => {
  const env = resetAuditFixtures(info);
  execFileSync("node_modules/.bin/tsx", ["e2e/scripts/seed-model-conflicts.ts"], { env, stdio: "pipe", timeout: 60_000 });
  cases = JSON.parse(readFileSync(path.join(env.STORAGE_DIR!, "model-conflict-cases.json"), "utf8"));
});
test.afterAll(({}, info) => { resetAuditFixtures(info); });

function outbox(env: NodeJS.ProcessEnv) {
  const file = path.join(env.STORAGE_DIR!, "fake/outbox.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
}
async function hydratedReview(page: Page) {
  await page.waitForFunction(() => {
    const form = [...document.querySelectorAll("form")].find(f => [...f.querySelectorAll("button")].some(b => b.textContent === "Use the new value"));
    return !!form && Object.keys(form).some(key => key.startsWith("__reactProps$") && typeof (form as unknown as Record<string, { action?: unknown }>)[key]?.action === "function");
  });
}
for (const width of [375, 768, 1280, 1440]) test(`real EN TC SC address conflicts retain original task values before approval and remain readable at ${width}px`, async ({ page }, info) => {
  const env = auditEnvironment(info);
  const db = new Pool({ connectionString: env.DATABASE_URL });
  await page.setViewportSize({ width, height: 900 });
  try {
    for (const c of cases) {
      await page.goto(`/tasks/${c.taskId}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(c.oldValue, { exact: false }).first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `model-conflict-task-${c.language}-${width}.png`), fullPage: true });
      await page.goto(`/review/${c.proposalId}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(c.oldValue, { exact: true })).toBeVisible();
      await expect(page.getByText(c.incomingValue, { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Use the new value", exact: true })).toBeVisible();
      const t = (await db.query("SELECT checklist,extracted FROM task WHERE id=$1", [c.taskId])).rows[0];
      expect(t.checklist.find((e: { key: string }) => e.key === "newAddr").value).toBe(c.oldValue);
      expect(t.extracted.newAddr.value).toBe(c.oldValue);
      expect((await db.query("SELECT status FROM proposal WHERE id=$1", [c.proposalId])).rows[0].status).toBe("pending");
      expect(outbox(env)).toHaveLength(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `model-conflict-review-${c.language}-${width}.png`), fullPage: true });
    }
  } finally { await db.end(); if (!page.isClosed()) await page.setViewportSize({ width: 1280, height: 900 }); }
});

test("staff genuinely approves incoming EN TC SC conflict values once without sending or changing statutory registers", async ({ page }, info) => {
  const env = auditEnvironment(info);
  const db = new Pool({ connectionString: env.DATABASE_URL });
  try {
    const before = (await db.query("SELECT * FROM appointment ORDER BY id")).rows;
    const people = (await db.query("SELECT * FROM person ORDER BY id")).rows;
    for (const [index, c] of cases.entries()) {
      await page.setViewportSize({ width: [375, 768, 1280][index], height: 900 });
      await page.goto(`/review/${c.proposalId}`, { waitUntil: "domcontentloaded" });
      await hydratedReview(page);
      const t = (await db.query("SELECT checklist,extracted FROM task WHERE id=$1", [c.taskId])).rows[0];
      expect(t.checklist.find((e: { key: string }) => e.key === "newAddr").value).toBe(c.oldValue);
      expect(t.extracted.newAddr.value).toBe(c.oldValue);
      const done = page.waitForResponse(r => r.request().method() === "POST" && new URL(r.url()).pathname === `/review/${c.proposalId}`);
      await page.getByRole("button", { name: "Use the new value", exact: true }).click();
      const response = await done;
      expect(response.ok()).toBe(true); await response.finished();
      await expect.poll(async () => (await db.query("SELECT status FROM proposal WHERE id=$1", [c.proposalId])).rows[0]?.status).toBe("approved");
      const after = (await db.query("SELECT checklist,extracted FROM task WHERE id=$1", [c.taskId])).rows[0];
      expect(after.checklist.find((e: { key: string }) => e.key === "newAddr").value).toBe(c.incomingValue);
      expect(after.extracted.newAddr.value).toBe(c.incomingValue);
      await page.goto(`/tasks/${c.taskId}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(c.incomingValue, { exact: false }).first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `model-conflict-resolved-${c.language}.png`), fullPage: true });
      expect(outbox(env)).toHaveLength(0);
    }
    expect((await db.query("SELECT * FROM appointment ORDER BY id")).rows).toEqual(before);
    expect((await db.query("SELECT * FROM person ORDER BY id")).rows).toEqual(people);
    expect(outbox(env)).toHaveLength(0);
  } finally { await db.end(); if (!page.isClosed()) await page.setViewportSize({ width: 1280, height: 900 }); }
});
