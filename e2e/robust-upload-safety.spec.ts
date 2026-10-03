import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { resetAuditFixtures } from "./audit-fixtures";
// Full Chromium supplies the native PDF viewer; headless-shell downloads PDFs.
test.use({ channel: "chromium" });
let cases: { documentId: string; filename: string; mime: string; sha256: string }[];
test.beforeAll(({}, info) => {
  const env = resetAuditFixtures(info);
  execFileSync("node_modules/.bin/tsx", ["e2e/scripts/seed-upload-safety.ts"], { env, stdio: "pipe", timeout: 60_000 });
  cases = JSON.parse(readFileSync(path.join(env.STORAGE_DIR!, "upload-safety-cases.json"), "utf8"));
});
test.afterAll(({}, info) => { resetAuditFixtures(info); });
test("staff opening an uploaded HTML or SVG scan cannot execute its script while ordinary PDF and PNG bytes remain viewable", async ({ page, request }, info) => {
  try {
    // Safe controls are exercised even when either unsafe format fails.
    for (const c of cases.filter(c => ["application/pdf", "image/png"].includes(c.mime))) {
      const response = await request.get(`/api/docs/${c.documentId}`);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain(c.mime);
      expect(createHash("sha256").update(await response.body()).digest("hex")).toBe(c.sha256);
      expect(response.headers()["content-disposition"]).toMatch(/^inline/);
      await page.goto(`/api/docs/${c.documentId}`, { waitUntil: "load" });
      if (c.mime === "image/png") await expect.poll(() => page.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      else {
        // Chromium's native viewer is a browser guest, outside page locators.
        // Retain its painted screenshot for explicit readable-page inspection.
        await expect(page).toHaveURL(new RegExp(`/api/docs/${c.documentId}$`));
        await page.waitForTimeout(1000);
      }
      await page.screenshot({ path: info.outputPath(`viewable-${c.filename}.png`) });
    }
    for (const c of cases.filter(c => ["text/html", "image/svg+xml"].includes(c.mime))) {
      const response = await request.get(`/api/docs/${c.documentId}`);
      expect(response.ok()).toBe(true);
      expect(createHash("sha256").update(await response.body()).digest("hex")).toBe(c.sha256);
      if (/attachment/i.test(response.headers()["content-disposition"] ?? "")) continue;
      await page.goto(`/api/docs/${c.documentId}`, { waitUntil: "load" });
      await page.screenshot({ path: info.outputPath(`uploaded-active-${c.filename}.png`) });
      expect.soft(await page.locator("#audit-marker").textContent(), c.filename).not.toBe("UPLOAD_SCRIPT_EXECUTED");
    }
  } finally { if (!page.isClosed()) await page.setViewportSize({ width: 1280, height: 900 }); }
});
