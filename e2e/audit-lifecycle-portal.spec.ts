import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { auditEnvironment, resetAuditFixtures } from "./audit-fixtures";

function fixture(env: NodeJS.ProcessEnv, mode: "seed" | "switch" | "snapshot") {
  return JSON.parse(execFileSync("node_modules/.bin/tsx", ["e2e/scripts/lifecycle-portal-fixture.ts", mode], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
}
test.beforeAll(({}, info) => { resetAuditFixtures(info); });
test.afterAll(({}, info) => { resetAuditFixtures(info); });

test("LREC02 public stale-person upload asks for a localized reload without changing bytes or replacement facts, and the same link accepts fresh context", async ({ page }, info) => {
  const env = auditEnvironment(info); const shots = path.join(env.STORAGE_DIR!, "shots"); mkdirSync(shots, { recursive: true });
  const labels = {
    en: { old: "Lifecycle Browser Original", current: "Lifecycle Browser Replacement", send: "Send", refresh: /details changed.*reload/i, reload: /reload/i, received: "Received. Thank you." },
    tc: { old: "測試原董事", current: "測試新董事", send: "提交", refresh: /資料.*更.*重新載入|資料.*變更.*重新/i, reload: /重新載入/, received: "已收到，謝謝。" },
    sc: { old: "測試原董事", current: "測試新董事", send: "提交", refresh: /资料.*更.*重新加载|资料.*变更.*重新/i, reload: /重新加载/, received: "已收到，谢谢。" },
  };
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  for (const lang of ["en", "tc", "sc"] as const) {
    const f = fixture(env, "seed"); const t = labels[lang];
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/u/${f.token}?lang=${lang}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h2").filter({ hasText: t.old })).toBeVisible();
    const input = page.locator(`input[type=file][name="f:${f.taskId}:idCopy"]`);
    await expect(input).toBeVisible();
    const oldPdf = await PDFDocument.create(); oldPdf.addPage().drawText("Fictional OLD person's ID");
    await input.setInputFiles({ name: "old-person-delayed.pdf", mimeType: "application/pdf", buffer: Buffer.from(await oldPdf.save()) });
    expect(fixture(env, "switch").personId).toBe(f.replacementId);
    const before = fixture(env, "snapshot");
    await page.getByRole("button", { name: t.send, exact: true }).click();
    const alert = page.locator(".portal-send [role=alert]");
    await expect.soft(alert).toContainText(t.refresh);
    expect.soft(fixture(env, "snapshot")).toEqual(before);
    // Stop after an already recorded business failure on the baseline; the repaired
    // acceptance path below requires the refresh gate and is not replaced by a fallback.
    if (!await alert.isVisible()) return;
    const reload = page.getByRole("link", { name: t.reload }); await expect(reload).toBeVisible();
    await expect(input).toHaveValue("");
    for (const width of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: path.join(shots, `lifecycle-stale-${lang}-${width}.png`), fullPage: true });
    }
    await reload.click();
    await expect(page.locator("h2").filter({ hasText: t.current })).toBeVisible();
    expect(await input.inputValue()).toBe("");
    const freshPdf = await PDFDocument.create(); freshPdf.addPage().drawText("Fictional CURRENT replacement ID");
    await input.setInputFiles({ name: "replacement-current.pdf", mimeType: "application/pdf", buffer: Buffer.from(await freshPdf.save()) });
    await page.getByRole("button", { name: t.send, exact: true }).click();
    await expect(page.getByRole("status")).toContainText(t.received);
    const after = fixture(env, "snapshot");
    expect(after.docs).toEqual([expect.objectContaining({ personId: f.replacementId, title: "replacement-current.pdf", source: "upload" })]);
    expect(after.task.checklist.find((e: { key: string }) => e.key === "idCopy")).toMatchObject({ personId: f.replacementId, status: "received", documentId: after.docs[0].id });
    expect(after.sibling).toEqual(before.sibling);
    for (const width of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: path.join(shots, `lifecycle-current-${lang}-${width}.png`), fullPage: true });
    }
  }
  expect(errors).toEqual([]); await page.setViewportSize({ width: 1280, height: 900 });
});
