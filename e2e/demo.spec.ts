// The investor demo, end to end in the browser, with the demo mailbox, bank and ledger and
// a scripted LLM (no live model). Every client-facing action is clicked by a human.
import { test, expect, type Page } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { auditEnvironment } from "./audit-fixtures";

let storageRoot: string;
test.beforeAll(({}, info) => { storageRoot = auditEnvironment(info).STORAGE_DIR!; });
const outbox = () => (existsSync(path.join(storageRoot, "fake/outbox.json")) ? JSON.parse(readFileSync(path.join(storageRoot, "fake/outbox.json"), "utf8")) : []) as { to: string[]; subject: string; text: string; rfcMessageId: string; attachmentNames: string[] }[];

function messageLink(text: string, baseURL: string, kind: "u" | "sign"): string | undefined {
  const origin = new URL(baseURL).origin;
  for (const candidate of text.match(/https?:\/\/[^\s<>"']+/g) ?? []) {
    let url: URL;
    try { url = new URL(candidate); } catch { continue; }
    if (url.origin === origin && new RegExp(`^/${kind}/[A-Za-z0-9]+$`).test(url.pathname)) return url.href;
  }
}

async function approveTop(page: Page, titleMatch: RegExp, button: RegExp, fill?: (p: Page) => Promise<void>) {
  await page.goto("/");
  const origin = new URL(page.url()).origin;
  const link = page.getByRole("link", { name: titleMatch }).first();
  await expect(link).toBeVisible({ timeout: 30_000 });
  await link.click();
  if (fill) await fill(page);
  await page.getByRole("button", { name: button }).click();
  await expect(page).toHaveURL(url => url.origin === origin && url.pathname === "/", { timeout: 30_000 });
}

test("an unknown sender's request goes from email to a completed, filed and registered task, with every client-facing step approved", async ({ page, baseURL }) => {
  expect(baseURL).toBeTruthy();
  // 1. Email arrives from a new prospect.
  await page.goto("/demo");
  await page.getByLabel("From").fill("sam.lee@venture.example");
  await page.getByLabel("Name").fill("Sam Lee");
  await page.getByLabel("Subject").fill("New director E2E");
  await page.getByLabel("Body").fill("E2E-NEW Please appoint Jane Doe as a director of Blue Harbour Trading Limited (3345678) from 1 November.");
  await page.getByRole("button", { name: "Deliver email" }).click();
  await expect(page.getByText(/processed/)).toBeVisible({ timeout: 30_000 });

  // 2. The intray shows the drafted reply with the invoice; nothing has been sent yet.
  await page.goto("/");
  await expect(page.getByText("Blue Harbour Trading Limited · new prospect")).toBeVisible();
  expect(outbox()).toHaveLength(0);
  await approveTop(page, /Approve reply and invoice to Sam Lee/, /Approve and send with invoice/, async (p) => {
    // The invoice card is narrow at laptop width: the total must never wrap mid-number ("HK$3,79 / 5").
    const total = p.locator("td", { has: p.locator("b", { hasText: /^HK\$/ }) }).last();
    expect(await total.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("nowrap");
  });
  const first = outbox()[0];
  expect(first.to).toEqual(["sam.lee@venture.example"]);
  expect(first.attachmentNames[0]).toMatch(/^CRCS-\d{4}-\d{4}\.pdf$/);
  const invoiceNumber = first.attachmentNames[0].replace(".pdf", "");

  // 3. The client pays into the bank; the payment gate opens.
  await page.goto("/demo");
  await page.getByRole("button", { name: "Send deposit" }).click();
  await expect(page.getByText(/matched automatically|No unpaid invoices/).first()).toBeVisible({ timeout: 30_000 });
  await page.goto(`/invoices`);
  await page.getByRole("link", { name: "Paid", exact: true }).click();
  await expect(page.getByRole("link", { name: invoiceNumber })).toBeVisible();

  // 4. The client replies with details in the same thread.
  await page.goto("/demo");
  await page.getByLabel("From").fill("sam.lee@venture.example");
  await page.getByLabel("Name").fill("Sam Lee");
  await page.getByLabel("Subject").fill("Re: New director E2E");
  await page.getByLabel("Body").fill("E2E-DETAILS Jane's HKID K987654(3); home Flat 12B, 88 Robinson Road; use your office for correspondence; jane.doe@example.com +852 9123 4567");
  await page.getByRole("checkbox", { name: /Reply in the thread/ }).check();
  await page.getByRole("button", { name: "Deliver email" }).click();
  await expect(page.getByText(/processed/)).toBeVisible({ timeout: 30_000 });
  await approveTop(page, /^Approve reply to /, /Approve and send/);
  await expect(page.getByRole("link", { name: /^Conflicting / })).toHaveCount(0);

  // 5. The client uploads documents through the secure link (in their language).
  const link = outbox().map(m => messageLink(m.text, baseURL!, "u")).find(Boolean)!;
  expect(link).toBeTruthy();
  await page.goto(link);
  // Match each requested item to the same fictional prospect's real details.
  // A generic answer must not contradict Jane's previously recorded contact.
  const details: Record<string, string> = {
    fullName: "Jane DOE", chiName: "杜珍", idNo: "K987654(3), Hong Kong",
    resAddr: "Flat 12B, 88 Robinson Road, Mid-Levels, Hong Kong",
    corrAddr: "18/F, 88 Caine Road, Mid-Levels, Hong Kong",
    contactInfo: "jane.doe@example.com / +852 9123 4567", effDate: "2026-11-01",
    companyNumber: "3345678", scList: "Sam Lee owns 100% of Blue Harbour Trading Limited (3345678).",
    funds: "Salary and savings",
  };
  const pdf = readFileSync("tests/fixtures/upload-corpus/multipage-scan.pdf");
  const image = readFileSync("tests/fixtures/upload-corpus/readable-scan.jpg");
  for (let i = 0; i < 5; i++) {
    const files = page.locator('form input[type="file"]');
    const texts = page.locator('form input[type="text"]');
    if (!(await files.count()) && !(await texts.count())) break;
    for (let f = 0; f < await files.count(); f++) {
      const key = (await files.nth(f).getAttribute("name"))!.split(":").at(-1)!;
      expect(["idCopy", "addrProof", "selfie", "prevRecords"]).toContain(key);
      await files.nth(f).setInputFiles(key === "selfie"
        ? { name: "fictional-photo.jpg", mimeType: "image/jpeg", buffer: image }
        : { name: `fictional-${key}.pdf`, mimeType: "application/pdf", buffer: pdf });
    }
    for (let t = 0; t < await texts.count(); t++) {
      const key = (await texts.nth(t).getAttribute("name"))!.split(":").at(-1)!;
      expect(details[key], `A truthful fictional value is required for ${key}`).toBeDefined();
      await texts.nth(t).fill(details[key]);
    }
    await page.getByRole("button", { name: "Send" }).click();
    // Sending can prepare a full signing pack; wait for it rather than reloading early.
    await expect(page.getByText(/Received\. Thank you\.|We have everything we need/)).toBeVisible({ timeout: 60_000 });
    await page.reload();
  }
  await expect(page.locator('form input[type="file"], form input[type="text"]')).toHaveCount(0);

  // 6. Screening clears on its own; documents are generated; staff approve the signing pack.
  await approveTop(page, /Send for signature/, /Send for signature/);
  const signLinks = outbox().filter((m) => /\/sign\//.test(m.text));
  expect(signLinks.length).toBeGreaterThanOrEqual(1);
  expect(signLinks.flatMap(m => m.to)).toContain("jane.doe@example.com");
  for (const m of signLinks) {
    const signingLink = messageLink(m.text, baseURL!, "sign");
    expect(signingLink).toBeTruthy();
    await page.goto(signingLink!);
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll("button")].find(b => b.textContent === "Email me a code");
      return button && Object.keys(button).some(key => key.startsWith("__reactProps$") && typeof (button as unknown as Record<string, { onClick?: unknown }>)[key]?.onClick === "function");
    });
    const sentCode = page.waitForResponse(r => r.request().method() === "POST" && r.url() === signingLink);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await (await sentCode).finished();
    await expect(page.getByLabel("Code")).toBeVisible();
    await expect.poll(() => outbox().filter(x => x.to[0] === m.to[0] && /code/i.test(x.subject)).length).toBeGreaterThan(0);
    const code = outbox().filter((x) => x.to[0] === m.to[0] && /code/i.test(x.subject)).at(-1)!.text.match(/\b(\d{6})\b/)![1];
    await page.getByLabel("Code").fill(code);
    const verified = page.waitForResponse(r => r.request().method() === "POST" && r.url() === signingLink);
    await page.getByRole("button", { name: "Verify" }).click();
    await (await verified).finished();
    const signed = page.waitForResponse(r => r.request().method() === "POST" && r.url() === signingLink);
    await page.getByRole("button", { name: "Sign documents" }).click();
    await (await signed).finished();
    await expect(page.getByText(/Signed\. Thank you/)).toBeVisible({ timeout: 30_000 });
  }

  // 7. Filing reference, register update and completion email, each approved.
  await approveTop(page, /File ND2A/, /Record filing/, async (p) => { await p.getByLabel("Filing reference").fill("E2E-ND2A-0001"); });
  await approveTop(page, /Update registers/, /Update registers/);
  await approveTop(page, /Confirm completion/, /Approve and send/);

  // 8. Done: the director is on the register as at the effective date; filing recorded.
  await page.goto("/tasks?s=done");
  await expect(page.getByRole("link", { name: /Appoint a director: Jane DOE/ })).toBeVisible();
  const href = await page.getByRole("link", { name: "Blue Harbour Trading Limited" }).first().getAttribute("href");
  await page.goto(`${href}?tab=officers&asAt=2026-11-01`);
  await expect(page.getByRole("cell", { name: /Jane DOE/ }).first()).toBeVisible();
  // ...but not as at the day before the appointment took effect.
  await page.goto(`${href}?tab=officers&asAt=2026-10-31`);
  await expect(page.getByRole("heading", { name: /Officers as at 31 Oct 2026/ })).toBeVisible();
  await expect(page.locator("table").first().getByText("Jane DOE")).toHaveCount(0);
});

const PAGES = ["/", "/clients", "/clients/cli_c1", "/clients/cli_c1?tab=company", "/clients/cli_c1?tab=shares", "/clients/cli_c1?tab=officers", "/clients/cli_c1?tab=records", "/clients/cli_c1?tab=contacts", "/tasks?s=all", "/invoices?s=all", "/payments", "/batch", "/playbooks", "/inbox", "/reports", "/settings", "/demo", "/new", "/new?mode=manual&client=cli_c1", "/mail"];
for (const width of [375, 768, 1280, 1440]) {
  test(`no horizontal overflow and no console errors at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    for (const path of PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} overflows by ${overflow}px at ${width}px`).toBeLessThanOrEqual(1);
      // Hiding carets mutates every input's inline style while React may still
      // be hydrating the streamed playbook editors, causing a test-only mismatch.
      if (width === 375 || width === 1440) await page.screenshot({ path: `${storageRoot}/shots/${width}${path.replace(/[/?=&]/g, "_") || "_today"}.png`, fullPage: true, caret: "initial" });
    }
    expect(errors).toEqual([]);
  });
}
