import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { resetAuditFixtures } from "./audit-fixtures";

test.afterAll(({}, info) => { resetAuditFixtures(info); });
async function action(page: Page, button: ReturnType<Page["getByRole"]>) {
  const response = page.waitForResponse(r => r.request().method() === "POST");
  await button.click(); await (await response).finished();
}
for (const lang of ["en", "tc", "sc"] as const) test(`edited ${lang} workflow enforces a delayed current proof gate and permits held filing approval with explicit release`, async ({ page }, info) => {
  test.setTimeout(120000);
  const env = resetAuditFixtures(info);
  const call = (mode: string) => JSON.parse(execFileSync("node_modules/.bin/tsx", ["e2e/scripts/edited-workflow-fixture.ts", mode, lang], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  const f = call("seed") as { taskId: string; title: string; proofTitle: string; hold: string; address: string; originalAddress: string };
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const views = async (stage: string) => { for (const width of [375, 768, 1280, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); await page.screenshot({ path: path.join(env.STORAGE_DIR!, "shots", `workflow-${stage}-${lang}-${width}.png`), fullPage: true }); } };
  const taskPage = async () => { await page.goto(`/tasks/${f.taskId}`, { waitUntil: "domcontentloaded" }); await expect(page.getByRole("heading", { level: 1, name: f.title })).toBeVisible(); await page.waitForLoadState("networkidle"); };
  try {
    await taskPage(); await page.getByText("Add an off-platform step", { exact: true }).click();
    await page.locator("#ops-title").fill(f.proofTitle); await page.locator("#ops-before").selectOption("1");
    // Keep the genuinely rendered old collect form. Another staff action supplies
    // the date and enters file before the original form is submitted.
    const atFile = call("facts"); expect(atFile.task.stepIndex).toBe(1); expect(atFile.filings).toEqual([]);
    await action(page, page.getByRole("button", { name: "Add step", exact: true }));
    const added = call("snapshot"); expect(added.actions).toHaveLength(1); expect(added.actions[0].beforeStep).toBe(1);
    const filingId = added.cards.find((p: { kind: string }) => p.kind === "record_filing").id;
    await page.goto(`/review/${filingId}`, { waitUntil: "domcontentloaded" }); await page.waitForLoadState("networkidle");
    await page.getByLabel("Filing reference", { exact: true }).fill("FICTIONAL-PROOF-GATE-NR1");
    await action(page, page.getByRole("button", { name: "Record filing", exact: true }));
    const blocked = call("snapshot"); expect(blocked.filings).toEqual([]); expect(blocked.task.stepIndex).toBe(1); expect(blocked.address).toBe(f.originalAddress);
    await expect(page.locator("[role=alert]:not(#__next-route-announcer__)")).toContainText(/proof|off.platform|before|blocked|complete/i); await views("blocked");
    await taskPage(); await page.getByText("Mark done or follow up", { exact: true }).click();
    const proofForm = page.getByRole("button", { name: "Mark done", exact: true }).locator("..").locator("..");
    await action(page, proofForm.getByRole("button", { name: "Mark done", exact: true })); await expect(proofForm.getByRole("alert")).toContainText(/proof/i);
    await proofForm.getByLabel("Reference", { exact: true }).fill("FICTIONAL-ORIGINAL-PROOF"); await action(page, proofForm.getByRole("button", { name: "Mark done", exact: true }));
    expect(call("snapshot").actions[0].status).toBe("done");
    await taskPage(); await page.locator("summary").filter({ hasText: /^Put on hold$/ }).click(); await page.locator("#hold-reason").fill(f.hold); await page.locator("#hold-fu").fill("2026-10-10");
    await action(page, page.getByRole("button", { name: "Put on hold", exact: true })); await taskPage(); expect(call("snapshot").task.holdReason).toBe(f.hold);
    const beforeHeld = call("snapshot"); const freshId = beforeHeld.cards.find((p: { kind: string }) => p.kind === "record_filing").id;
    await page.goto(`/review/${freshId}`, { waitUntil: "domcontentloaded" }); await page.waitForLoadState("networkidle"); await page.getByLabel("Filing reference", { exact: true }).fill("FICTIONAL-PROOF-GATE-NR1"); await action(page, page.getByRole("button", { name: "Record filing", exact: true }));
    const held = call("snapshot"); expect(held.filings).toHaveLength(1); expect(held.task.stepIndex).toBe(1); expect(held.task.holdReason).toBe(f.hold); expect(held.address).toBe(f.originalAddress); await taskPage(); await views("held-filed");
    await action(page, page.getByRole("button", { name: "Release hold", exact: true })); await taskPage();
    const released = call("snapshot"); expect(released.task.stepIndex).toBe(2); expect(released.task.holdReason).toBeNull(); expect(released.address).toBe(f.originalAddress); expect(released.cards.filter((p: { kind: string }) => p.kind === "register_change")).toHaveLength(1); await views("register-human-gate");
    const registerId = released.cards.find((p: { kind: string }) => p.kind === "register_change").id;
    await page.goto(`/review/${registerId}`, { waitUntil: "domcontentloaded" }); await page.waitForLoadState("networkidle"); await action(page, page.getByRole("button", { name: "Update registers", exact: true }));
    expect(call("snapshot").address).toBe(f.address); expect(call("snapshot").task.stepIndex).toBe(3); await taskPage(); await views("manual-final-gate");
    await action(page, page.getByRole("button", { name: "Mark done", exact: true })); const done = call("snapshot"); expect(done.task.status).toBe("done"); expect(done.filings).toHaveLength(1); expect(done.docs).toEqual([]); expect(done.actions).toHaveLength(1); expect(errors).toEqual([]);
  } finally { await page.setViewportSize({ width: 1280, height: 900 }); }
});
