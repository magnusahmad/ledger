import { test, expect, type Page, type Locator } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { auditEnvironment, resetAuditFixtures } from "./audit-fixtures";

let cases: { kind: string; language: string; proposalId: string; title: string; approvedBody: string; approvedAttachmentNames: string[]; messageId: string }[];
let foreignProposalId: string;
function readOutbox(): Record<string, unknown>[] {
  const outboxPath = "storage/e2e/fake/outbox.json";
  return existsSync(outboxPath) ? JSON.parse(readFileSync(outboxPath, "utf8")) : [];
}
async function completeReviewAction(page: Page, proposalId: string, button: Locator) {
  const response = page.waitForResponse(r => r.request().method() === "POST" && new URL(r.url()).pathname === `/review/${proposalId}`);
  await button.click();
  const actionResponse = await response;
  expect(actionResponse.status()).toBeLessThan(400);
  expect(await actionResponse.finished()).toBeNull();
}
test.beforeAll(({}, info) => {
  const env = resetAuditFixtures(info);
  execFileSync("node_modules/.bin/tsx", ["e2e/scripts/seed-approval-recovery.ts"], { env, stdio: "pipe", timeout: 60_000 });
  cases = JSON.parse(readFileSync(path.join(env.STORAGE_DIR!, "recovery-cases.json"), "utf8"));
  foreignProposalId = JSON.parse(readFileSync(path.join(env.STORAGE_DIR!, "foreign-recovery.json"), "utf8")).proposalId;
});
test.afterAll(({}, info) => { resetAuditFixtures(info); });

test("another firm's interrupted approval is hidden from Today and direct review returns 404", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("FOREIGN RECOVERY SECRET", { exact: true })).toHaveCount(0);
  const response = await page.goto(`/review/${foreignProposalId}`);
  expect(response?.status()).toBe(404);
  await expect(page.getByText("FOREIGN RECOVERY SECRET", { exact: true })).toHaveCount(0);
});

for (const width of [375, 768, 1280, 1440]) test(`interrupted review never reports approval complete or redirects at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const c = cases[0];
  await page.goto(`/review/${c.proposalId}`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: `storage/e2e/shots/recovery-interrupted-review-${width}.png`, fullPage: true });
  await expect(page.getByText(/In progress|Delivery needs review/).first()).toBeVisible();
  await expect(page.getByText(/Taking you back to Today/)).toHaveCount(0);
  await page.waitForTimeout(1100);
  await expect(page).toHaveURL(new RegExp(`/review/${c.proposalId}$`));
  await page.setViewportSize({ width: 1280, height: 900 });
});

for (const width of [375, 768, 1280, 1440]) test(`interrupted approved delivery stays visible and preserves original EN TC SC inputs at ${width}px`, async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  for (const c of cases) await expect(page.getByRole("link", { name: c.title, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: `storage/e2e/shots/recovery-today-${width}.png`, fullPage: true });
  for (const c of cases.filter(c => c.kind === "interrupted" || c.kind === "uncertain")) {
    await page.goto(`/review/${c.proposalId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/In progress|Delivery needs review/).first()).toBeVisible();
    await expect(page.getByText(c.approvedBody, { exact: true })).toBeVisible();
    await expect(page.getByText("original-recipient@fictional.example", { exact: false })).toBeVisible();
    expect(c.approvedAttachmentNames.length).toBeGreaterThan(0);
    for (const name of c.approvedAttachmentNames) await expect(page.getByText(name, { exact: false })).toBeVisible();
    await expect(page.getByText("UNAPPROVED LATER EDIT", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Approved", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Taking you back to Today/)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `storage/e2e/shots/recovery-${c.kind}-${c.language}-${width}.png`, fullPage: true });
    await page.waitForTimeout(1100);
    await expect(page).toHaveURL(new RegExp(`/review/${c.proposalId}$`));
  }
  const outboxPath = "storage/e2e/fake/outbox.json";
  expect(existsSync(outboxPath) ? JSON.parse(readFileSync(outboxPath, "utf8")) : []).toHaveLength(0);
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 900 });
});

for (const width of [375, 768, 1280, 1440]) test(`checking uncertain provider delivery never blindly resends at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  const c = cases.find(c => c.kind === "uncertain_control")!;
  await page.goto(`/review/${c.proposalId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Delivery needs review", { exact: true })).toBeVisible();
  const resume = page.getByRole("button", { name: "Check and resume approved action", exact: true });
  await completeReviewAction(page, c.proposalId, resume);
  const env = auditEnvironment(info);
  const db = new Pool({ connectionString: env.DATABASE_URL });
  try {
    const firmId = env.FIRM_ID ?? "firm_crcs";
    await expect.poll(async () => (await db.query("SELECT status FROM proposal WHERE id = $1 AND firm_id = $2", [c.proposalId, firmId])).rows[0]?.status).toBe("recovery");
    expect((await db.query("SELECT status FROM mail_delivery WHERE source_key = $1 AND firm_id = $2", [`message:${c.messageId}`, firmId])).rows).toEqual([{ status: "uncertain" }]);
  } finally { await db.end(); }
  await expect(page.getByText("Delivery needs review", { exact: true })).toBeVisible();
  await expect(resume).toBeEnabled();
  await expect(page.getByText(c.approvedBody, { exact: true })).toBeVisible();
  await expect(page.getByText("Approved", { exact: true })).toHaveCount(0);
  expect(JSON.parse(readFileSync("storage/e2e/simulated-acceptances.json", "utf8"))).toHaveLength(4);
  expect(readOutbox()).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: `storage/e2e/shots/recovery-uncertain-checked-${width}.png`, fullPage: true });
  await page.waitForTimeout(1100);
  await expect(page).toHaveURL(new RegExp(`/review/${c.proposalId}$`));
  await page.setViewportSize({ width: 1280, height: 900 });
});

test("authoritative proof of non-delivery resumes unchanged approved inputs exactly once", async ({ page }) => {
  const c = cases.find(c => c.kind === "resumable")!;
  await page.goto(`/review/${c.proposalId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(c.approvedBody, { exact: true })).toBeVisible();
  await completeReviewAction(page, c.proposalId, page.getByRole("button", { name: "Check and resume approved action", exact: true }));
  await expect.poll(() => readOutbox().length).toBe(1);
  const outbox = readOutbox();
  expect(outbox).toHaveLength(1);
  expect(outbox[0]).toMatchObject({ text: c.approvedBody, to: ["original-recipient@fictional.example"], subject: "Approved en", attachmentNames: c.approvedAttachmentNames });
  await page.goto(`/review/${c.proposalId}`);
  await expect(page.getByText(/^Approved(?: |$)/).first()).toBeVisible();
  await expect(page.getByText("Check and resume approved action", { exact: true })).toHaveCount(0);
  expect(JSON.parse(readFileSync("storage/e2e/fake/outbox.json", "utf8"))).toHaveLength(1);
});

test("staff can close a changed uncertain action and separately approve its fresh delivery", async ({ page }, info) => {
  const c = cases.find(c => c.kind === "uncertain" && c.language === "en")!;
  await page.goto(`/review/${c.proposalId}`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: "storage/e2e/shots/recovery-before-close.png", fullPage: true });
  const close = page.getByRole("button", { name: "Close interrupted action and request fresh review", exact: true });
  await expect(close).toBeVisible();
  const outboxCount = () => existsSync("storage/e2e/fake/outbox.json") ? JSON.parse(readFileSync("storage/e2e/fake/outbox.json", "utf8")).length : 0;
  const beforeCount = outboxCount();
  const env = auditEnvironment(info);
  const db = new Pool({ connectionString: env.DATABASE_URL });
  try {
    const firmId = env.FIRM_ID ?? "firm_crcs";
    const beforeCards = (await db.query("SELECT id FROM proposal WHERE firm_id = $1", [firmId])).rows;
    const beforeDeliveries = (await db.query("SELECT id, status FROM mail_delivery WHERE firm_id = $1 ORDER BY id", [firmId])).rows;
    expect(beforeDeliveries.some(d => d.status === "uncertain")).toBe(true);
    await page.getByLabel("I checked the mailbox and understand the previous message may have been delivered", { exact: true }).check();
    await page.getByRole("textbox", { name: /note/i }).fill("Fixture staff checked the mailbox; delivery remains unconfirmed and the edited request needs fresh review.");
    await close.click();
    await expect.poll(async () => (await db.query("SELECT status FROM proposal WHERE id = $1 AND firm_id = $2", [c.proposalId, firmId])).rows[0]?.status).toBe("superseded");
    const afterCards = (await db.query("SELECT id, status FROM proposal WHERE firm_id = $1", [firmId])).rows;
    const fresh = afterCards.filter(p => !beforeCards.some(old => old.id === p.id));
    expect(fresh).toHaveLength(1);
    expect(fresh[0].status).toBe("pending");
    const afterDeliveries = (await db.query("SELECT id, status FROM mail_delivery WHERE firm_id = $1 ORDER BY id", [firmId])).rows;
    for (const old of beforeDeliveries) expect(afterDeliveries).toContainEqual(old);
    expect(outboxCount()).toBe(beforeCount);
    await page.goto(`/review/${fresh[0].id}`);
    await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveValue("UNAPPROVED LATER EDIT");
    await expect(page.getByRole("textbox", { name: "To", exact: true })).toHaveValue("changed-recipient@fictional.example");
    await expect(page.getByRole("button", { name: /Approve and send/ })).toBeVisible();
    await page.screenshot({ path: "storage/e2e/shots/recovery-fresh-review.png", fullPage: true });
    expect(outboxCount()).toBe(beforeCount);
    const freshCard = (await db.query("SELECT payload FROM proposal WHERE id = $1 AND firm_id = $2", [fresh[0].id, firmId])).rows[0];
    expect(freshCard.payload.messageId).not.toBe(c.messageId);
    await completeReviewAction(page, fresh[0].id, page.getByRole("button", { name: /Approve and send/ }));
    await expect.poll(outboxCount).toBe(beforeCount + 1);
    expect(readOutbox().at(-1)).toMatchObject({ text: "UNAPPROVED LATER EDIT", to: ["changed-recipient@fictional.example"] });
    expect((await db.query("SELECT status FROM proposal WHERE id = $1 AND firm_id = $2", [fresh[0].id, firmId])).rows).toEqual([{ status: "approved" }]);
    expect((await db.query("SELECT status FROM mail_delivery WHERE source_key = $1 AND firm_id = $2", [`message:${c.messageId}`, firmId])).rows).toEqual([{ status: "uncertain" }]);
    expect((await db.query("SELECT status FROM mail_delivery WHERE source_key = $1 AND firm_id = $2", [`message:${freshCard.payload.messageId}`, firmId])).rows).toEqual([{ status: "sent" }]);
    await page.goto(`/review/${fresh[0].id}`);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
    await expect(page.locator(`a[href="/review/${fresh[0].id}"]`)).toHaveCount(0);
    expect(outboxCount()).toBe(beforeCount + 1);
  } finally { await db.end(); }
});
