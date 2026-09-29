import { test, expect } from "@playwright/test";

test("staff can download all registers for the selected historical date without creating a task", async ({ page, request }) => {
  await page.goto("/clients/cli_c1?tab=officers&asAt=2025-03-01");
  const download = page.getByRole("link", { name: "Download registers" });
  await expect(download).toHaveAttribute("href", "/api/clients/cli_c1/registers?asAt=2025-03-01");
  const response = await request.get(await download.getAttribute("href") as string);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");
  expect((await response.body()).subarray(0, 4).toString()).toBe("%PDF");
});

test("a register download rejects invalid calendar dates instead of silently printing another date", async ({ request }) => {
  const response = await request.get("/api/clients/cli_c1/registers?asAt=2025-02-30");
  expect(response.status()).toBe(400);
});

test("mobile officer names remain readable inside a horizontally scrollable register", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/clients/cli_c1?tab=officers");
  const widths = await page.locator("table").first().evaluate(table => ({ name: table.querySelector("td")!.getBoundingClientRect().width, table: table.getBoundingClientRect().width, viewport: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth }));
  expect(widths.name).toBeGreaterThanOrEqual(120);
  expect(widths.overflow).toBeLessThanOrEqual(1);
});
