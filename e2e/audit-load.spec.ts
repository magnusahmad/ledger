import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { writeFileSync, cpSync, mkdirSync } from "node:fs";
import { resetAuditFixtures, auditEnvironment } from "./audit-fixtures";

async function searchList(page: Page, q: string) {
  const form = page.locator("form").filter({ has: page.locator('input[name="q"]') });
  await form.locator('input[name="q"]').fill(q); await form.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(url => url.searchParams.get("q") === q); await page.waitForLoadState("networkidle");
}

test.afterAll(({}, info) => {
  const env = auditEnvironment(info); const archive = path.join(process.cwd(), "storage", "e2e-load-artifacts"); mkdirSync(archive, { recursive: true });
  cpSync(path.join(env.STORAGE_DIR!, "shots"), archive, { recursive: true }); resetAuditFixtures(info);
});
test("LOAD03 older unmatched deposits and human-approved overpayment residue remain reachable beyond 200 newer deposits", async ({ page }, info) => {
  test.setTimeout(180000); const env = resetAuditFixtures(info);
  const call = (mode: string) => JSON.parse(execFileSync("node_modules/.bin/tsx", ["e2e/scripts/load-fixture.ts", mode], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  const f = call("seed"); const before = call("snapshot");
  expect(before.tasks).toBeGreaterThan(2200); expect(before.originalResidue.status).toBe("matched"); expect(before.originalResidue.matchNote).toContain("123.45");
  try {
    await page.goto("/payments", { waitUntil: "domcontentloaded" }); await expect(page.getByRole("heading", { name: "Payments", exact: true })).toBeVisible(); await page.waitForLoadState("networkidle");
    // Follow actual staff controls rather than asking a bounded page to dump
    // all retained financial records. Filters must survive next/previous.
    await searchList(page, "Original unallocated deposit");
    await page.getByRole("link", { name: "Next", exact: true }).click(); await expect(page).toHaveURL(url => url.searchParams.get("page") === "2" && url.searchParams.get("q") === "Original unallocated deposit");
    await page.getByRole("link", { name: "Previous", exact: true }).click(); await expect(page).toHaveURL(url => (url.searchParams.get("page") ?? "1") === "1" && url.searchParams.get("q") === "Original unallocated deposit");
    await searchList(page, "Original unallocated deposit 0");
    await expect.soft(page.getByText("Original unallocated deposit 0", { exact: true })).toBeVisible();
    await searchList(page, f.overpaymentRef);
    await expect.soft(page.getByRole("link", { name: f.overpaymentRef, exact: true })).toBeVisible();
    await expect.soft(page.getByText(/123\.45 overpayment remains unallocated/)).toBeVisible();
    expect(call("snapshot")).toEqual(before);
    for (const width of [375, 768, 1280, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `load-payments-${width}.png`), fullPage: true }); }
  } finally { await page.setViewportSize({ width: 1280, height: 900 }); }
});

test("LOAD01 client counts and overview never hide original open work behind newer completed history", async ({ page }, info) => {
  test.setTimeout(180000); const env = resetAuditFixtures(info);
  const call = (mode: string, lang = "en") => JSON.parse(execFileSync("node_modules/.bin/tsx", ["e2e/scripts/load-fixture.ts", mode, lang], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  call("seed"); const facts = call("client-history"); const before = call("snapshot"); const errors: string[] = [];
  expect(facts.open).toBeGreaterThan(1800); expect(facts.done).toBeGreaterThanOrEqual(400); expect(facts.collecting).toBeGreaterThanOrEqual(600);
  page.on("pageerror", error => errors.push(error.message));
  try {
    for (const lang of ["en", "tc", "sc"]) {
      const display = call("display", lang);
      await page.goto("/clients", { waitUntil: "domcontentloaded" }); await page.waitForLoadState("networkidle");
      const row = page.locator("tr").filter({ has: page.getByRole("link", { name: display.name, exact: true }) });
      await expect.soft(row.locator("td").nth(4), "company open count must match persisted work").toHaveText(String(facts.open));
      for (const width of [375, 768, 1280, 1440]) { await page.setViewportSize({ width, height: 900 }); expect.soft(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `load-clients-${lang}-${width}.png`) }); }
      await row.getByRole("link", { name: display.name, exact: true }).click(); await expect(page.locator("h1")).toHaveText(display.name); await page.waitForLoadState("networkidle");
      await expect.soft(page.getByText("No open tasks.", { exact: true }), "400 newer completed rows cannot imply zero open work").toHaveCount(0);
      await expect.soft(page.getByRole("heading", { name: "Outstanding from the client", exact: true })).toBeVisible();
      for (const width of [375, 768, 1280, 1440]) { await page.setViewportSize({ width, height: 900 }); expect.soft(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `load-client-overview-${lang}-${width}.png`) });
        for (const title of ["Outstanding from the client", "Completed"]) {
          await page.getByRole("heading", { name: title, exact: true }).scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `load-scroll-client-${title === "Completed" ? "completed" : "outstanding"}-${lang}-${width}.png`) });
        }
        await page.evaluate(() => scrollTo(0, 0));
      }
      const completeOpen = page.locator('a[href*="/tasks?"][href*="client=cli_c1"][href*="s=open"]'); await expect(completeOpen).toHaveCount(1); await completeOpen.click();
      await expect(page).toHaveURL(url => url.searchParams.get("client") === "cli_c1" && url.searchParams.get("s") === "open");
      await searchList(page, "LOAD oldest original manual gate"); await expect(page).toHaveURL(url => url.searchParams.get("client") === "cli_c1" && url.searchParams.get("s") === "open");
      await page.getByRole("link", { name: "LOAD oldest original manual gate", exact: true }).click(); await expect(page).toHaveURL(/\/tasks\//); await expect(page.locator("h1")).toHaveText("LOAD oldest original manual gate");
    }
    expect(call("snapshot")).toEqual(before); expect(errors).toEqual([]);
  } finally { await page.setViewportSize({ width: 1280, height: 900 }); }
});

for (const lang of ["en", "tc", "sc"] as const) test(`LOAD13 loaded ${lang} screens and staff filters stay usable at four widths with local development timing evidence`, async ({ page }, info) => {
  test.setTimeout(180000); const env = resetAuditFixtures(info);
  const call = (mode: string) => JSON.parse(execFileSync("node_modules/.bin/tsx", ["e2e/scripts/load-fixture.ts", mode, lang], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  const f = call("seed"); const display = call("display"); const measures = []; const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  try {
    for (const [name, url] of [["today", "/"], ["tasks", "/tasks"], ["payments", "/payments"], ["register", "/clients/cli_c1?tab=officers"], ["inbox", "/inbox"], ["mail", "/mail"]]) {
      const start = performance.now(); await page.goto(url, { waitUntil: "domcontentloaded" }); await expect(page.locator("h1")).toBeVisible(); await page.waitForLoadState("networkidle");
      if (name === "register") await expect(page.getByRole("heading", { level: 1, name: display.name })).toBeVisible();
      measures.push({ page: name, firstReadyMs: performance.now() - start, navigation: await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming; return { responseStart: n.responseStart, domContentLoaded: n.domContentLoadedEventEnd, responseEnd: n.responseEnd }; }) });
      // A 111,271px full-page Today capture hides legibility when resized.
      // Retain bounded viewport evidence; the full DOM overflow check remains.
      for (const width of [375, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect.soft(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${name} ${lang} ${width} global overflow`).toBeLessThanOrEqual(1);
        if (name === "payments") {
          const amounts = await page.locator("tbody tr td:nth-child(4)").evaluateAll(cells => cells.map(cell => {
            const range = document.createRange(); range.selectNodeContents(cell);
            return { text: cell.textContent?.trim(), lines: new Set(Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0).map(r => Math.round(r.top))).size };
          }));
          expect.soft(amounts.length).toBeGreaterThan(0);
          for (const amount of amounts) expect.soft(amount.lines, `${lang} ${width} currency ${amount.text} must retain its cents on one line`).toBe(1);
        }
        await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `load-viewport-${name}-${lang}-${width}.png`), fullPage: false });
        if (name === "payments" && width === 375) {
          await page.locator(".scroll-x").evaluate(el => { el.scrollLeft = el.scrollWidth; });
          await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `load-scroll-payments-right-${lang}-${width}.png`) });
          const firstAmount = page.locator("tbody tr td:nth-child(4)").first();
          await expect(firstAmount).toBeInViewport();
          await page.locator(".scroll-x").evaluate(el => { el.scrollLeft = 0; });
        }
        if (name === "today") {
          for (const id of ["out", "wc", "wk"]) {
            await page.locator(`#${id}`).scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `load-scroll-today-${id}-${lang}-${width}.png`) });
          }
          await page.evaluate(() => scrollTo(0, 0));
        }
      }
      const warm = performance.now(); await page.reload({ waitUntil: "domcontentloaded" }); await expect(page.locator("h1")).toBeVisible(); await page.waitForLoadState("networkidle"); measures.push({ page: name, warmReadyMs: performance.now() - warm });
    }
    await page.goto("/", { waitUntil: "domcontentloaded" }); await page.getByRole("link", { name: "LOAD oldest original manual gate", exact: true }).click(); await expect(page.locator("h1")).toHaveText("LOAD oldest original manual gate");
    await page.goto("/tasks", { waitUntil: "domcontentloaded" }); await page.waitForLoadState("networkidle"); const start = performance.now(); await page.getByRole("link", { name: "Done", exact: true }).click(); await expect(page).toHaveURL(/s=done/); await expect(page.getByRole("link", { name: "Fictional original review done 399", exact: true })).toBeVisible(); measures.push({ interaction: "Done task filter", ms: performance.now() - start });
    await page.goto("/", { waitUntil: "domcontentloaded" }); await page.locator('a[href*="/tasks?"][href*="held=1"]').click(); await searchList(page, "LOAD oldest held original gate"); await expect(page).toHaveURL(url => url.searchParams.get("held") === "1" && url.searchParams.get("s") === "open"); await page.getByRole("link", { name: "LOAD oldest held original gate", exact: true }).click(); await expect(page.locator("h1")).toHaveText("LOAD oldest held original gate");
    await page.goto("/inbox", { waitUntil: "domcontentloaded" }); await searchList(page, "history 0"); await page.getByRole("link", { name: "Fictional original review history 0", exact: true }).click(); await expect(page).toHaveURL(/\/inbox\/load-conversation-0/); await expect(page.getByText("Original retained message, no instructions to act", { exact: true })).toBeVisible();
    await page.goto("/mail", { waitUntil: "domcontentloaded" }); await searchList(page, "original letter 0"); await expect(page.getByText("Fictional original review original letter 0", { exact: true })).toBeVisible();
    expect(call("snapshot").tasks).toBeGreaterThan(2200); expect(errors).toEqual([]);
  } finally { writeFileSync(path.join(env.STORAGE_DIR!, "shots", `load-viewport-measures-${lang}.json`), JSON.stringify({ seed: f.seed, language: lang, measures, pageErrors: errors }, null, 2)); await page.setViewportSize({ width: 1280, height: 900 }); }
});

test("LOAD14 register date and actual public OTP inputs hydrate without server/client style mismatches", async ({ page }, info) => {
  test.setTimeout(120000); const env = resetAuditFixtures(info);
  const call = (mode: string) => JSON.parse(execFileSync("node_modules/.bin/tsx", ["e2e/scripts/load-fixture.ts", mode], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  call("seed"); const diagnostics: string[] = [];
  const clean = (s: string) => s.replace(/\/sign\/[A-Za-z0-9]+/g, "/sign/[redacted]").replace(/token=\"[^\"]+\"/g, "token=\"[redacted]\"");
  page.on("console", m => { if (/hydrat|server rendered|didn.t match|mismatch/i.test(m.text())) diagnostics.push(clean(m.text())); });
  try {
    await page.goto("/clients/cli_c1?tab=officers", { waitUntil: "domcontentloaded" }); await expect(page.getByLabel("Registers as at")).toBeVisible(); await page.waitForLoadState("networkidle");
    for (const width of [375, 768, 1280, 1440]) { await page.setViewportSize({ width, height: 900 }); await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `load-hydration-register-${width}.png`), fullPage: true }); }
    const route = call("sign-path"); await page.goto(route.path, { waitUntil: "domcontentloaded" }); await expect(page.getByRole("textbox", { name: "Code", exact: true })).toBeVisible(); await page.waitForLoadState("networkidle");
    for (const width of [375, 768, 1280, 1440]) { await page.setViewportSize({ width, height: 900 }); await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `load-hydration-otp-${width}.png`), fullPage: true }); }
    expect(diagnostics, "Actual register170/OTP140 server-client style differences must not generate hydration errors").toEqual([]);
  } finally { writeFileSync(path.join(env.STORAGE_DIR!, "shots", "load-hydration-diagnostics.json"), JSON.stringify(diagnostics, null, 2)); await page.setViewportSize({ width: 1280, height: 900 }); }
});
