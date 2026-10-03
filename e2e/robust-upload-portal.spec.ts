import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { auditEnvironment, resetAuditFixtures } from "./audit-fixtures";
let cases: { width: number; language: string; personId: string; taskId: string; token: string }[];
test.beforeAll(({}, info) => {
  const env = resetAuditFixtures(info);
  execFileSync("node_modules/.bin/tsx", ["e2e/scripts/seed-upload-portal.ts"], { env, stdio: "pipe", timeout: 60_000 });
  cases = JSON.parse(readFileSync(path.join(env.STORAGE_DIR!, "upload-portal-cases.json"), "utf8"));
});
test.afterAll(({}, info) => { resetAuditFixtures(info); });
async function ready(page: Page) {
  await page.waitForFunction(() => [...document.querySelectorAll("form")].some(f => Object.keys(f).some(k => k.startsWith("__reactProps$") && typeof (f as unknown as Record<string, {action?: unknown}>)[k]?.action === "function")));
}
for (const width of [375, 768, 1280, 1440]) test(`real EN TC SC unreadable uploads retain exact long-named originals and staff fallback without identity writes at ${width}px`, async ({ page }, info) => {
  const env = auditEnvironment(info);
  const db = new Pool({ connectionString: env.DATABASE_URL });
  const jpeg = readFileSync("tests/fixtures/upload-corpus/small-scan.jpg");
  const corrupt = Buffer.from("fictional corrupt PNG, no external content");
  const filename = `香港身份證-${"x".repeat(235)}.jpg`;
  try {
    await page.setViewportSize({ width, height: 900 });
    const statutory = (await db.query("SELECT * FROM appointment ORDER BY id")).rows;
    for (const c of cases.filter(c => c.width === width)) {
      const value = c.language === "en" ? "Fictional correspondence address: Suite 1201, Harbour Building, Kowloon, Hong Kong. Staff can enter clearer scan details." : c.language === "tc" ? "香港九龍虛構海港大廈一二〇一室，請保留原有文件並由職員補充清晰資料。".repeat(4) : "香港九龙虚构海港大厦一二〇一室，请保留原有文件并由职员补充清晰资料。".repeat(4);
      await page.goto(`/u/${c.token}?lang=${c.language}`, { waitUntil: "domcontentloaded" });
      await ready(page);
      await page.locator(`input[name="v:${c.taskId}:corrAddr"]`).fill(value);
      await page.locator(`input[name="f:${c.taskId}:idCopy"]`).setInputFiles({ name: filename, mimeType: "image/jpeg", buffer: jpeg });
      await page.locator(`input[name="f:${c.taskId}:addrProof"]`).setInputFiles({ name: "虛構损坏地址文件.png", mimeType: "image/png", buffer: corrupt });
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: info.outputPath(`portal-selected-${c.language}-${width}.png`), fullPage: true });
      const posted = page.waitForResponse(r => r.request().method() === "POST" && new URL(r.url()).pathname === `/u/${c.token}`);
      await page.getByRole("button", { name: c.language === "en" ? "Send" : "提交", exact: true }).click();
      const response = await posted; expect(response.ok()).toBe(true); await response.finished();
      await expect(page.getByRole("status")).toBeVisible();
      const p = (await db.query("SELECT id_number_enc,correspondence_address FROM person WHERE id=$1", [c.personId])).rows[0];
      expect(p.id_number_enc).toBeNull(); expect(p.correspondence_address).toBe(value);
      const t = (await db.query("SELECT checklist FROM task WHERE id=$1", [c.taskId])).rows[0];
      expect(t.checklist.find((e: {key: string}) => e.key === "idNo").status).toBe("needed");
      const docs = (await db.query("SELECT title,storage_key,sha256 FROM document WHERE task_id=$1 AND source='upload'", [c.taskId])).rows;
      expect(docs).toHaveLength(2);
      for (const [name, bytes] of [[filename, jpeg], ["虛構损坏地址文件.png", corrupt]] as const) {
        const d = docs.find(d => d.title === name)!;
        expect(d.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
        expect(readFileSync(path.join(env.STORAGE_DIR!, d.storage_key)).equals(bytes)).toBe(true);
      }
      expect((await db.query("SELECT * FROM task_event WHERE task_id=$1 AND kind='extract.failed'", [c.taskId])).rows).toHaveLength(2);
      expect((await db.query("SELECT * FROM llm_call WHERE task_id=$1 AND agent='extract'", [c.taskId])).rows).toHaveLength(0);
      await page.goto(`/tasks/${c.taskId}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/staff can enter the details/).first()).toBeVisible();
      await page.screenshot({ path: info.outputPath(`staff-upload-fallback-${c.language}-${width}.png`), fullPage: true });
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      const outbox = path.join(env.STORAGE_DIR!, "fake/outbox.json");
      expect(existsSync(outbox) ? JSON.parse(readFileSync(outbox, "utf8")) : []).toHaveLength(0);
    }
    expect((await db.query("SELECT * FROM appointment ORDER BY id")).rows).toEqual(statutory);
  } finally { await db.end(); if (!page.isClosed()) await page.setViewportSize({ width: 1280, height: 900 }); }
});
