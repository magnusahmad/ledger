import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { createHash } from "node:crypto";
import { auditEnvironment, resetAuditFixtures } from "./audit-fixtures";

let fixture: { token: string; signerId: string; email: string; taskId: string };
test.beforeEach(({}, info) => {
  const env = resetAuditFixtures(info);
  execFileSync("node_modules/.bin/tsx", ["e2e/scripts/seed-otp-access.ts"], { env, stdio: "pipe", timeout: 60_000 });
  fixture = JSON.parse(readFileSync(path.join(env.STORAGE_DIR!, "otp-access-case.json"), "utf8"));
});
test.afterAll(({}, info) => { resetAuditFixtures(info); });

async function actionComplete(page: Page, label: string) {
  const response = page.waitForResponse(r => r.request().method() === "POST" && new URL(r.url()).pathname === `/sign/${fixture.token}`, { timeout: 30_000 });
  await page.getByRole("button", { name: label, exact: true }).click();
  const done = await response;
  expect(done.ok()).toBe(true);
  await done.finished();
}

async function publicFormReady(page: Page) {
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find(b => b.textContent === "Email me a code");
    if (!button) return false;
    return Object.keys(button).some(key => key.startsWith("__reactProps$") && typeof (button as unknown as Record<string, { onClick?: unknown }>)[key]?.onClick === "function");
  });
}

for (const width of [375, 768, 1280, 1440]) test(`repeated public OTP actions preserve resend consistency and five-attempt lock at ${width}px`, async ({ page }, info) => {
  const env = auditEnvironment(info);
  const db = new Pool({ connectionString: env.DATABASE_URL });
  await page.setViewportSize({ width, height: 900 });
  try {
    await page.goto(`/sign/${fixture.token}`, { waitUntil: "domcontentloaded" });
    // Server HTML is already visible while the public client component hydrates.
    // Wait for this exact button's event props before dispatching its first click.
    await publicFormReady(page);
    await expect(page.getByText("OTP Appointee 繁體 简体", { exact: false })).toBeVisible();
    await actionComplete(page, "Email me a code");
    await expect(page.getByRole("button", { name: "Send again", exact: true })).toBeEnabled();
    await actionComplete(page, "Send again");
    const outbox = JSON.parse(readFileSync(path.join(env.STORAGE_DIR!, "fake/outbox.json"), "utf8")) as { subject: string; to: string[]; text: string }[];
    const deliveries = outbox.filter(m => m.subject === "Your signing code" && m.to.includes(fixture.email));
    expect(deliveries).toHaveLength(2);
    const actual = deliveries.at(-1)!.text.match(/\b\d{6}\b/)![0];
    const bad = actual === "000000" ? "111111" : "000000";
    for (let i = 1; i <= 5; i++) {
      await page.getByRole("textbox", { name: "Code", exact: true }).fill(bad);
      await actionComplete(page, "Verify");
      await expect.poll(async () => Number((await db.query("SELECT otp_attempts FROM signer WHERE id=$1", [fixture.signerId])).rows[0].otp_attempts)).toBe(i);
      await expect(page.getByText(i < 5 ? "That code isn't right" : "Too many wrong codes; this link is now locked", { exact: true })).toBeVisible();
      if (i === 1) {
        await page.getByRole("textbox", { name: "Code", exact: true }).fill("");
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `otp-invalid-${width}.png`), fullPage: true });
      }
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("This link is locked after too many wrong codes. Please ask us for a new one.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Email me a code", exact: true })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Your name as signature", exact: true })).toHaveCount(0);
    expect((await db.query("SELECT otp_verified_at FROM signer WHERE id=$1", [fixture.signerId])).rows[0].otp_verified_at).toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `otp-lock-${width}.png`), fullPage: true });
  } finally { await db.end(); if (!page.isClosed()) await page.setViewportSize({ width: 1280, height: 900 }); }
});

test("a normal public signer verifies and signs once, then retains readable documents without new verification", async ({ page }, info) => {
  const env = auditEnvironment(info);
  const db = new Pool({ connectionString: env.DATABASE_URL });
  await page.setViewportSize({ width: 375, height: 900 });
  try {
    await page.goto(`/sign/${fixture.token}`, { waitUntil: "domcontentloaded" });
    await publicFormReady(page);
    await actionComplete(page, "Email me a code");
    await expect(page.getByRole("textbox", { name: "Code", exact: true })).toBeVisible();
    const outbox = JSON.parse(readFileSync(path.join(env.STORAGE_DIR!, "fake/outbox.json"), "utf8")) as { subject: string; to: string[]; text: string }[];
    const code = outbox.filter(m => m.subject === "Your signing code" && m.to.includes(fixture.email)).at(-1)!.text.match(/\b\d{6}\b/)![0];
    await page.getByRole("textbox", { name: "Code", exact: true }).fill(code);
    await actionComplete(page, "Verify");
    await expect(page.getByRole("textbox", { name: "Your name as signature", exact: true })).toBeVisible();
    const href = await page.locator('a[href^="/api/sign/"]').first().getAttribute("href");
    if (!href) throw new Error("The verified signer has no permitted document link");
    const before = await page.request.get(href);
    expect(before.status()).toBe(200);
    expect(before.headers()["content-type"]).toContain("application/pdf");
    const beforeDigest = createHash("sha256").update(await before.body()).digest("hex");
    await actionComplete(page, "Sign documents");
    await expect(page.getByText("Signed. Thank you, OTP Appointee 繁體 简体. Signed copies will be sent to you by your company secretary.", { exact: true })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Signed. Thank you, OTP Appointee 繁體 简体. Signed copies will be sent to you by your company secretary.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Email me a code", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Sign documents", exact: true })).toHaveCount(0);
    const after = await page.request.get(href);
    expect(after.status()).toBe(200);
    expect(createHash("sha256").update(await after.body()).digest("hex")).toBe(beforeDigest);
    const state = (await db.query("SELECT signed_at,otp_hash FROM signer WHERE id=$1", [fixture.signerId])).rows[0];
    expect(state.signed_at).not.toBeNull();
    expect(state.otp_hash).toBeNull();
    expect(Number((await db.query("SELECT count(*) as n FROM task_event WHERE task_id=$1 AND kind='signing.signed'", [fixture.taskId])).rows[0].n)).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", "otp-signed-readable-375.png"), fullPage: true });
  } finally { await db.end(); if (!page.isClosed()) await page.setViewportSize({ width: 1280, height: 900 }); }
});

test("a delivered live signing code survives page reload and verifies without a replacement delivery", async ({ page }, info) => {
  const env = auditEnvironment(info);
  const db = new Pool({ connectionString: env.DATABASE_URL });
  await page.setViewportSize({ width: 375, height: 900 });
  try {
    await page.goto(`/sign/${fixture.token}`, { waitUntil: "domcontentloaded" });
    await publicFormReady(page);
    await actionComplete(page, "Email me a code");
    await expect(page.getByRole("textbox", { name: "Code", exact: true })).toBeVisible();
    const outboxPath = path.join(env.STORAGE_DIR!, "fake/outbox.json");
    const accepted = JSON.parse(readFileSync(outboxPath, "utf8")) as { subject: string; to: string[]; text: string }[];
    const codes = accepted.filter(m => m.subject === "Your signing code" && m.to.includes(fixture.email));
    expect(codes).toHaveLength(1);
    const code = codes[0].text.match(/\b\d{6}\b/)![0];
    await page.reload({ waitUntil: "domcontentloaded" });
    // The client already received a live code. A reload must not force a resend
    // that invalidates it or require reconstructing local component state.
    await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", "otp-reloaded-received-code-375.png"), fullPage: true });
    await expect(page.getByRole("textbox", { name: "Code", exact: true })).toBeVisible();
    // A reload exposes server HTML before the client handlers attach. Require
    // the same genuine hydration readiness used for the initial request.
    await publicFormReady(page);
    await page.getByRole("textbox", { name: "Code", exact: true }).fill(code);
    await actionComplete(page, "Verify");
    await expect(page.getByRole("textbox", { name: "Your name as signature", exact: true })).toBeVisible();
    await actionComplete(page, "Sign documents");
    await expect(page.getByText("Signed. Thank you, OTP Appointee 繁體 简体. Signed copies will be sent to you by your company secretary.", { exact: true })).toBeVisible();
    expect(JSON.parse(readFileSync(outboxPath, "utf8"))).toHaveLength(accepted.length);
    expect((await db.query("SELECT signed_at,otp_hash FROM signer WHERE id=$1", [fixture.signerId])).rows[0]).toMatchObject({ otp_hash: null });
    expect((await db.query("SELECT signed_at FROM signer WHERE id=$1", [fixture.signerId])).rows[0].signed_at).not.toBeNull();
    expect(Number((await db.query("SELECT count(*) as n FROM task_event WHERE task_id=$1 AND kind='signing.signed'", [fixture.taskId])).rows[0].n)).toBe(1);
  } finally { await db.end(); if (!page.isClosed()) await page.setViewportSize({ width: 1280, height: 900 }); }
});
