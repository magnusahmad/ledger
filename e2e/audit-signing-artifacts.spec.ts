import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { auditEnvironment, resetAuditFixtures } from "./audit-fixtures";

function fixture(env: NodeJS.ProcessEnv, mode: string, language?: string) {
  return JSON.parse(execFileSync("node_modules/.bin/tsx", ["e2e/scripts/signing-artifact-fixture.ts", mode, ...(language ? [language] : [])], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 90_000 }));
}
async function capture(page: Page, filename: string) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
  await page.screenshot({ path: filename, fullPage: true });
}
async function actionComplete(page: Page, invoke: () => Promise<void>) {
  const response = page.waitForResponse(r => r.request().method() === "POST" && !!r.request().headers()["next-action"], { timeout: 120_000 });
  await invoke();
  const completed = await response; await completed.finished(); expect(completed.status()).toBe(200);
}
test.beforeAll(({}, info) => { resetAuditFixtures(info); });
test.afterAll(({}, info) => { resetAuditFixtures(info); });

for (const language of ["en", "tc", "sc"]) test(`SART05 public ${language} signing refuses changed PDF bytes and retries the exact approved original, with consistent downloadable artifacts`, async ({ page }, info) => {
  const env = auditEnvironment(info); const shots = path.join(env.STORAGE_DIR!, "shots"); mkdirSync(shots, { recursive: true });
  fixture(env, "seed", language);
  const f = JSON.parse(readFileSync(path.join(env.STORAGE_DIR!, "signing-artifact.json"), "utf8")) as { token: string; email: string; name: string; originalId: string; originalHash: string };
  const pageErrors: string[] = []; page.on("pageerror", error => pageErrors.push(error.message));
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/sign/${f.token}`, { waitUntil: "domcontentloaded" }); await expect(page.getByText(f.name, { exact: false }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await actionComplete(page, () => page.getByRole("button", { name: "Email me a code", exact: true }).click());
    await expect(page.getByRole("button", { name: "Send again", exact: true })).toBeVisible();
    const outbox = JSON.parse(readFileSync(path.join(env.STORAGE_DIR!, "fake/outbox.json"), "utf8")) as { to: string[]; subject: string; text: string }[];
    const code = outbox.filter(m => m.subject === "Your signing code" && m.to.includes(f.email)).at(-1)!.text.match(/\b(\d{6})\b/)![1];
    await page.getByLabel("Code", { exact: true }).fill(code); await actionComplete(page, () => page.getByRole("button", { name: "Verify", exact: true }).click());
    await expect(page.getByRole("button", { name: "Sign documents", exact: true })).toBeVisible();
    // PACK12: the public action must expose the same safe refusal as the domain.
    await page.getByLabel("Your name as signature", { exact: true }).fill("Fictional Very Long Typed Signature ".repeat(4).trim());
    const beforeLongMark = fixture(env, "snapshot");
    await actionComplete(page, () => page.getByRole("button", { name: "Sign documents", exact: true }).click());
    await expect(page.locator("form .row .small").filter({ hasText: /signature.*too long.*fit legibly/i })).toBeVisible();
    expect(fixture(env, "snapshot")).toEqual(beforeLongMark);
    for (const width of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await capture(page, path.join(shots, `signing-long-mark-error-${language}-${width}.png`));
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("button", { name: "Draw", exact: true }).click();
    const canvas = page.locator("canvas"); const bounds = (await canvas.boundingBox())!;
    await page.mouse.move(bounds.x + 30, bounds.y + 40); await page.mouse.down();
    await page.mouse.move(bounds.x + 95, bounds.y + 25); await page.mouse.move(bounds.x + 145, bounds.y + 65); await page.mouse.up();
    fixture(env, "corrupt"); const before = fixture(env, "snapshot");
    const downloaded = await page.request.get(`/api/sign/${f.token}/doc/${f.originalId}`);
    if (downloaded.status() === 200) {
      const { createHash } = await import("node:crypto"); expect.soft(createHash("sha256").update(await downloaded.body()).digest("hex")).toBe(f.originalHash);
    } else expect([404, 409]).toContain(downloaded.status());
    await actionComplete(page, () => page.getByRole("button", { name: "Sign documents", exact: true }).click());
    const error = page.locator("form .row .small").filter({ hasText: /changed|hash|integrity|approved|document/i });
    await expect.soft(error).toBeVisible(); expect.soft(fixture(env, "snapshot")).toEqual(before);
    // Baseline proof may reach a false successful signature. Preserve the failure
    // and stop before trying an already used link; repaired acceptance must proceed.
    if (!await error.isVisible()) return;
    for (const width of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await capture(page, path.join(shots, `signing-artifact-error-${language}-${width}.png`));
    }
    fixture(env, "restore"); await actionComplete(page, () => page.getByRole("button", { name: "Sign documents", exact: true }).click());
    await expect(page.getByText(`Signed. Thank you, ${f.name}.`, { exact: false })).toBeVisible();
    const final = fixture(env, "snapshot"); expect(final.status).toBe("completed"); expect(final.step).toBe("file"); expect(final.filingCount).toBe(1);
    expect(final.signed).toHaveLength(2); expect(final.people.filter((s: { signedAt: string | null }) => s.signedAt)).toHaveLength(2);
    for (const doc of final.signed as { id: string; sha256: string; certificate: string }[]) {
      expect(doc.certificate).toContain(f.email); expect(final.hashes).toContainEqual([doc.id, doc.sha256]);
      const response = await page.request.get(`/api/docs/${doc.id}`); expect(response.status()).toBe(200);
      const { createHash } = await import("node:crypto"); expect(createHash("sha256").update(await response.body()).digest("hex")).toBe(doc.sha256);
    }
    for (const width of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await capture(page, path.join(shots, `signing-artifact-complete-${language}-${width}.png`));
    }
    expect(fixture(env, "export").count).toBe(2); expect(pageErrors).toEqual([]);
  } finally { await page.setViewportSize({ width: 1280, height: 900 }); }
});
