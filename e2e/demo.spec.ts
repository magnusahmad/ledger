// The investor demo, end to end in the browser, with the demo mailbox, bank and ledger and
// a scripted LLM (no live model). Every client-facing action is clicked by a human.
import { test, expect, type Page } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";

const outbox = () => (existsSync("storage/e2e/fake/outbox.json") ? JSON.parse(readFileSync("storage/e2e/fake/outbox.json", "utf8")) : []) as { to: string[]; subject: string; text: string; rfcMessageId: string; attachmentNames: string[] }[];

async function approveTop(page: Page, titleMatch: RegExp, button: RegExp, fill?: (p: Page) => Promise<void>) {
  await page.goto("/");
  const link = page.getByRole("link", { name: titleMatch }).first();
  await expect(link).toBeVisible({ timeout: 30_000 });
  await link.click();
  if (fill) await fill(page);
  await page.getByRole("button", { name: button }).click();
  await expect(page).toHaveURL("http://localhost:3100/", { timeout: 30_000 });
}

test("an unknown sender's request goes from email to a completed, filed and registered task, with every client-facing step approved", async ({ page }) => {
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
  await approveTop(page, /Approve reply and invoice to Sam Lee/, /Approve and send with invoice/);
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
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Deliver email" }).click();
  await expect(page.getByText(/processed/)).toBeVisible({ timeout: 30_000 });
  await approveTop(page, /^Approve reply to /, /Approve and send/);

  // 5. The client uploads documents through the secure link (in their language).
  const link = outbox().map((m) => m.text.match(/http:\/\/localhost:3100\/u\/\w+/)?.[0]).find(Boolean)!;
  await page.goto(link);
  // Fill in everything outstanding and send it in one go, as the client would.
  for (let i = 0; i < 5; i++) {
    const files = page.locator('form input[type="file"]');
    const texts = page.locator('form input[type="text"]');
    if (!(await files.count()) && !(await texts.count())) break;
    for (let f = 0; f < await files.count(); f++) await files.nth(f).setInputFiles({ name: "doc.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 demo") });
    for (let t = 0; t < await texts.count(); t++) await texts.nth(t).fill("Sam LEE 100%; salary and savings; Blue Harbour Trading Limited 3345678");
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
  for (const m of signLinks) {
    await page.goto(m.text.match(/http:\/\/localhost:3100\/sign\/\w+/)![0]);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await expect(page.getByLabel("Code")).toBeVisible();
    const code = outbox().filter((x) => x.to[0] === m.to[0] && /code/i.test(x.subject)).at(-1)!.text.match(/\b(\d{6})\b/)![1];
    await page.getByLabel("Code").fill(code);
    await page.getByRole("button", { name: "Verify" }).click();
    await page.getByRole("button", { name: "Sign documents" }).click();
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
      if (width === 375 || width === 1440) await page.screenshot({ path: `storage/e2e/shots/${width}${path.replace(/[/?=&]/g, "_") || "_today"}.png`, fullPage: true, caret: "initial" });
    }
    expect(errors).toEqual([]);
  });
}
