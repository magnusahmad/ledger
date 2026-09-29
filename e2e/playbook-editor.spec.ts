import { test, expect } from "@playwright/test";

test("staff edit a bilingual playbook safely at all four widths", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/playbooks");
  const row = page.locator("li.item").filter({ has: page.locator('[id="definition-hk.changeOffice"]') });
  const editor = row.locator("details").filter({ has: page.locator('textarea') });
  await editor.locator("summary").click();
  const input = editor.locator("textarea");
  const original = JSON.parse(await input.inputValue());
  await input.fill("{broken JSON");
  await editor.getByRole("button", { name: "Save new version" }).click();
  await expect(editor.getByRole("alert")).toContainText("Invalid JSON");
  await expect(input).toHaveValue("{broken JSON");
  original.name.tc = "更改註冊地址（公司秘書已審閱）";
  original.description = "Staff-reviewed registered-office workflow. Existing tasks keep their pinned version.";
  await input.fill(JSON.stringify(original, null, 2));
  await editor.getByRole("button", { name: "Save new version" }).click();
  await expect(editor.getByRole("status")).toContainText(`Saved version ${original.version + 1}`);
  await expect.poll(async () => JSON.parse(await input.inputValue()).version).toBe(original.version + 1);
  for (const width of [375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await editor.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(editor.locator("label").filter({ hasText: "更改註冊地址" })).toBeVisible();
    await page.screenshot({ path: `storage/e2e/shots/playbook-editor-${width}.png` });
  }
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 900 });
});

test("an incomplete official-form check stays visibly unverified at every width", async ({ page }) => {
  const { Pool } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const manifest = JSON.parse(readFileSync("forms/hk-cr/manifest.json", "utf8"));
  const pool = new Pool({ connectionString: "postgres://localhost/harbourline_e2e" });
  const previous = await pool.query("SELECT value FROM kv WHERE firm_id=$1 AND key=$2", ["firm_crcs", "forms.check"]);
  try {
    const failed = { at: "2026-09-29T15:00:00Z", changed: [], errors: Object.keys(manifest).map(code => `${code}: fetch failed`) };
    await pool.query("INSERT INTO kv (firm_id, key, value) VALUES ($1,$2,$3) ON CONFLICT (firm_id,key) DO UPDATE SET value=EXCLUDED.value", ["firm_crcs", "forms.check", JSON.stringify(failed)]);
    await page.goto("/playbooks");
    await expect(page.getByText(/Check incomplete: could not verify/)).toBeVisible();
    await expect(page.getByText("Not verified", { exact: true })).toHaveCount(Object.keys(manifest).length);
    await expect(page.getByText("Verified unchanged", { exact: true })).toHaveCount(0);
    for (const width of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `storage/e2e/shots/playbook-check-failed-${width}.png` });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  } finally {
    if (previous.rows.length) await pool.query("UPDATE kv SET value=$3 WHERE firm_id=$1 AND key=$2", ["firm_crcs", "forms.check", JSON.stringify(previous.rows[0].value)]);
    else await pool.query("DELETE FROM kv WHERE firm_id=$1 AND key=$2", ["firm_crcs", "forms.check"]);
    await pool.end();
  }
});
