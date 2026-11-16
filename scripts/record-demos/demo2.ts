// Demo 2 · "The summons": a scanned court summons becomes tracked, invoiced work, including the
// steps done outside Clerk. Run scripts/record-demos/reset.sh first.
import { Recorder, BASE, until } from "./rec";

const r = new Recorder("demo2");
await r.start();
const p = r.page;
const main = p.locator("main");
const item = (l: ReturnType<typeof main.locator>) => l.locator("xpath=ancestor::*[contains(concat(' ',@class,' '),' item ')][1]");

await r.goto("/mail");
await r.title("Part 2 of 3", "The summons", "A court summons arrives at the registered office. Messy, high stakes, and mostly handled outside any system.");
await r.hideTitle();

// ---- 1. Drop the scan into Mail ----
await r.say("Registered office mail", "Peak Harbour Investments uses the firm’s address as its registered office. A letter from the Magistrates’ Courts has arrived.");
const file = main.locator("#file");
await r.hover(file);
await file.setInputFiles("scripts/record-demos/assets/summons-scan.jpg");
await r.caption("Upload the scan", "Karen photographs the letter and uploads it. That’s all she does.");
await r.wait(1800);
await r.click(main.getByRole("button", { name: "Log letter" }));
await r.cut(() => main.getByText(/Logged\./).waitFor({ timeout: 180_000 }));
const row = main.locator("tr", { hasText: "Peak Harbour" }).first();
await r.ring(row);
await r.say("Read and matched", "Clerk read the scan, matched it to the client and flagged it urgent.");
await r.hideRing();

// ---- 2. Today: the enforcement card ----
await r.click(p.locator('nav a[href="/"]').first());
await p.waitForLoadState("networkidle");
const card = main.getByRole("link", { name: /^Summons for Peak Harbour/ });
await r.ring(item(card));
await r.say("Enforcement", "Today shows a red Enforcement card with the hearing date, instead of a routine “you’ve got mail” notice.");
await r.hideRing();
await r.click(card);
await p.waitForLoadState("networkidle");
await r.ring(main.locator(".card").first());
await r.say("What to do about it", "It recognised a prosecution summons for the overdue 2025 annual return, took the hearing date as the hard deadline, and proposes the response playbook and fee.");
await r.hideRing();
await r.click(main.getByRole("button", { name: "Start the response" }));
await r.cut(async () => {
  await until(async () => { await r.bg.goto(BASE + "/"); return r.bg.getByRole("link", { name: /^Explain the letter/ }).first().isVisible(); }, "client draft", 180_000, 2000);
  await r.goto("/");
});
const explain = main.getByRole("link", { name: /^Explain the letter/ }).first();
await r.ring(item(explain));
await r.say("A draft to the client", "Starting it drafted an email to the client that explains the letter. Nothing is sent yet.");
await r.hideRing();
await r.click(explain);
await p.waitForLoadState("networkidle");
const reply = main.locator(".card", { has: p.getByRole("heading", { name: "Reply" }) });
await r.ring(reply.locator("textarea"));
await r.say("Plain language", "What the summons means, what happens if nothing is done, and what the firm needs from Mr Leung: how he wants to respond, and why the return was late.");
await r.ring(reply.getByText(/^Attached:/));
await r.say("Attached", "The scan of the summons and the invoice go with it.");
await r.hideRing();
await r.click(main.getByRole("button", { name: /^Approve and send/ }));
await r.cut(() => p.waitForURL(BASE + "/", { timeout: 60_000 }));
await p.waitForLoadState("networkidle");

// ---- 3. The task, with the 限 stamp ----
const taskLink = main.getByRole("link", { name: "Prosecution summons" }).first();
await r.click(taskLink);
await p.waitForLoadState("networkidle");
const taskUrl = p.url();
const stamp = main.locator(".top .row").first();
await r.ring(stamp);
await r.say("限", "The hearing is 22 days away, so the task carries the red 限 stamp everywhere it appears.");
await r.hideRing();

// ---- 4. The client goes quiet: escalation ----
await r.caption("Time passes", "Ten days later, Mr Leung still hasn’t said how he wants to respond.");
await r.wait(2500);
await r.cut(async () => {
  await r.bg.goto(BASE + "/demo");
  await r.bg.getByLabel("Days to jump").fill("10");
  await r.bg.getByRole("button", { name: "Jump ahead" }).click();
  await r.bg.getByText(/It's now/).waitFor({ timeout: 180_000 });
  await r.goto("/");
});
const esc = main.getByRole("link", { name: /^Escalate:/ }).first();
await r.ring(item(esc));
await r.say("Escalation", "The hearing is now 12 days away. Clerk drafted a firmer chaser and flagged it as an escalation.");
await r.hideRing();
await r.goto(taskUrl);
const call = main.locator("li", { hasText: /^Call / }).first();
await r.ring(call);
await r.say("Call the client", "It also added a step for Karen: call Mr Leung today. Emails alone aren’t enough this close to a court date.");
await r.hideRing();
await r.click(call.getByText("Mark done or follow up"));
await r.type(call.getByLabel("Note"), "Spoke to Mr Leung. He will plead guilty in writing; late because the accountant left.", 25);
await r.click(call.getByRole("button", { name: "Mark done" }));
await r.cut(() => main.locator("li", { hasText: /Call .*Done/ }).first().waitFor({ timeout: 30_000 }));

// ---- 5. An off-platform step: file the overdue NAR1 ----
await r.caption("Work outside the platform", "Filing the overdue return happens on the Companies Registry’s e-Registry, not here. Karen adds it as an off-platform step.");
const add = main.getByText("Add an off-platform step");
await r.click(add);
await r.type(main.getByLabel("What needs doing"), "File the overdue NAR1 on e-Registry", 40);
await r.click(main.getByRole("button", { name: "Add step" }));
const nar = main.locator("li", { hasText: "File the overdue NAR1 on e-Registry" }).first();
await r.cut(() => nar.waitFor({ timeout: 30_000 }));
await r.ring(nar);
await r.say("Tracked", "It’s tracked on the task and on Today until it’s done.");
await r.click(nar.getByText("Mark done or follow up"));
await r.caption("Close it with proof", "Once filed, Karen closes it with the e-Registry submission reference as proof.");
await r.type(nar.getByLabel("Reference"), "NAR1-2026-1009-88412", 50);
await r.click(nar.getByRole("button", { name: "Mark done" }));
await r.cut(() => main.locator("li", { hasText: "ref NAR1-2026-1009-88412" }).first().waitFor({ timeout: 30_000 }));
await r.ring(main.locator("li", { hasText: "ref NAR1-2026-1009-88412" }).first());
await r.say("Done, with proof", "Done, with the reference recorded on the task’s history.");
await r.hideRing();

// ---- 6. A cost after invoicing ----
const addCost = main.getByText("Add a cost");
await r.scrollTo(addCost);
await r.click(addCost);
await r.caption("A later cost", "The court fine, paid on the client’s behalf, comes up after the invoice went out.");
await r.type(main.getByLabel("What for"), "Court fine, summons ESS 18842/2026 (paid on your behalf)", 30);
await r.type(main.getByLabel("Amount (HK$)"), "3000", 80);
await r.ring(main.getByText(/goes on an additional invoice/));
await r.wait(2200);
await r.hideRing();
await r.click(main.getByRole("button", { name: "Add cost" }));
await r.cut(async () => { await p.waitForTimeout(2500); await r.goto("/"); });
const extra = main.getByRole("link", { name: /additional invoice|Additional invoice|costs/i }).first();
await r.ring(item(extra));
await r.say("An additional invoice", "It becomes an additional invoice, drafted to the client for Karen to approve. The original invoice is never changed.");
await r.hideRing();
await r.click(extra);
await p.waitForLoadState("networkidle");
await r.wait(3500);

// ---- 7. On hold ----
await r.goto(taskUrl);
await r.caption("On hold", "Now the task waits on the client’s plea decision. Karen puts it on hold, with a date to follow up.");
await r.click(main.getByText("Put on hold").first());
await r.type(main.locator("#hold-reason"), "Waiting for the client’s plea decision", 40);
await main.locator(".pop-body select[name=waitingOn]").selectOption("client");
await r.hover(main.locator(".pop-body select[name=waitingOn]"));
await r.wait(500);
await main.locator("#hold-fu").fill("2026-10-14");
await r.hover(main.locator("#hold-fu"));
await r.wait(700);
await r.click(main.locator(".pop-body").getByRole("button", { name: "Put on hold" }));
await r.cut(() => main.locator(".banner.hold").waitFor({ timeout: 30_000 }));
await r.ring(main.locator(".banner.hold"));
await r.say("On hold", "Nothing moves or chases the client while it’s on hold.");
await r.hideRing();
await r.click(p.locator('nav a[href="/"]').first());
await p.waitForLoadState("networkidle");
const outside = main.locator("section", { has: p.getByRole("heading", { name: "Outside the platform" }) });
await r.scrollTo(outside);
await r.ring(outside);
await r.say("Outside the platform", "Today keeps a list of everything happening outside Clerk: holds and off-platform steps, with their follow-up dates.");
await r.hideRing();
await r.hideCaption();
await r.title("ao1 Clerk", "The summons", "From a photo of a letter to a tracked, invoiced response with a hard deadline, escalation, work done elsewhere, and later costs.");
await r.finish("demos/2-the-summons.mp4");
