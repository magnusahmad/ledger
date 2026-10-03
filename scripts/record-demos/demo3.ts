// Demo 3 · "Work doesn't only happen in the app": a mailbox reply sent from a phone, a
// lender's solicitor who isn't a client, and work agreed over lunch. Run reset.sh first.
import { Recorder, BASE, until, deliverEmail, phoneStage } from "./rec";

const r = new Recorder("demo3");
await r.start();
const p = r.page;
const main = p.locator("main");
const item = (l: ReturnType<typeof main.locator>) => l.locator("xpath=ancestor::*[contains(concat(' ',@class,' '),' item ')][1]");

await r.goto("/");
await r.title("Part 3 of 3", "Work doesn’t only happen in the app", "Staff reply from their phones, strangers email about clients, and instructions are agreed over lunch. Harbourline keeps up.");
await r.hideTitle();

// ---- 1. A client emails; the draft waits on Today ----
await r.caption("A client emails", "Ms Ho of Silverstrand Holdings asks to move the company’s registered office from 1 November.");
await r.cut(() => deliverEmail(r.bg, {
  from: "wingyan@silverstrand.example", name: "HO Wing Yan", subject: "Moving office",
  text: "Hi Karen,\n\nWe're moving at the end of October. Please change Silverstrand's registered office to Suite 2101, 21/F, Nexxus Building, 41 Connaught Road Central, Hong Kong, effective 1 November.\n\nThanks,\nWing Yan",
}).then(() => r.goto("/")));
const draft = main.getByRole("link", { name: /^Approve reply and invoice to HO Wing Yan/ });
await r.ring(item(draft));
await r.say("Waiting for approval", "The reply, invoice and upload link are drafted and waiting on Today. The draft asks for the tenancy agreement as proof of the new premises.");
await r.hideRing();

// ---- 2. Karen replies from Gmail on her phone ----
const mailApp = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>
body{margin:0;font:15px/1.45 -apple-system,"Helvetica Neue",sans-serif;color:#1f1f1f;background:#fff}
.bar{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #eee;font-size:16px}
.bar b{font-weight:600}.send{background:#1a73e8;color:#fff;border:0;border-radius:18px;padding:8px 18px;font-size:15px}
.f{padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#555;font-size:14px}.f span{color:#1f1f1f}
textarea{width:100%;box-sizing:border-box;border:0;padding:14px 16px;font:inherit;height:180px;resize:none;outline:none}
.q{margin:0 16px;padding-left:12px;border-left:3px solid #ddd;color:#777;font-size:13px}
.sent{display:none;position:absolute;left:0;right:0;bottom:40px;text-align:center}.sent div{display:inline-block;background:#323232;color:#fff;border-radius:6px;padding:10px 18px;font-size:14px}
</style></head><body><div class="bar"><span>✕</span><b>Reply</b><button class="send" id="send">Send</button></div>
<div class="f">From <span>Karen Yip &lt;desk@caineroad.example&gt;</span></div><div class="f">To <span>HO Wing Yan</span></div><div class="f">Re: Moving office</div>
<textarea id="body" aria-label="Reply"></textarea>
<div class="q">On 30 Sept, HO Wing Yan wrote:<br>We're moving at the end of October. Please change Silverstrand's registered office to Suite 2101, 21/F, Nexxus Building…</div>
<div class="sent" id="toast"><div>Sent</div></div>
<script>document.getElementById("send").onclick=()=>{document.getElementById("toast").style.display="block"}</script></body></html>`;
r.stage("mail-app", mailApp);
await r.goto(r.stage("phone-mail", phoneStage(`${BASE}/__stage/mail-app`, "Karen’s phone · Gmail")));
const m = p.frameLocator("#ph");
await r.say("Meanwhile, on her phone", "Before approving, Karen answers Ms Ho straight from Gmail on her phone, the way she always has.", "left");
const reply = "Hi Wing Yan, no need to send the tenancy agreement, we have it from the landlord already. Invoice to follow. Karen";
await r.type(m.locator("#body"), reply, 28);
await r.click(m.locator("#send"));
await r.wait(1200);
await r.cut(() => deliverEmail(r.bg, { from: "wingyan@silverstrand.example", subject: "Re: Moving office", text: reply.replace(/\. /g, ".\n\n").replace("Karen", "\nKaren"), asFirm: true }));
await r.cut(async () => {
  await until(async () => { await r.bg.goto(BASE + "/"); return r.bg.getByRole("link", { name: /^Update tasks to match/ }).first().isVisible(); }, "mailbox review card", 180_000, 2000);
  await r.goto("/");
});

// ---- 3. The draft is withdrawn; what's still owed ----
await r.say("Picked up from the Sent folder", "Harbourline read Karen’s reply from the mailbox. The draft is withdrawn, so Ms Ho isn’t answered twice.");
const still = main.getByRole("link", { name: /^Still to send/ }).first();
await r.ring(item(still));
await r.say("Still to send", "Karen’s reply didn’t include the invoice or the upload link, so a card keeps them from being forgotten.");
const upd = main.getByRole("link", { name: /^Update tasks to match/ }).first();
await r.ring(item(upd));
await r.say("Update the tasks", "Her reply also changed the work: the tenancy agreement isn’t needed. Harbourline suggests updating the task to match.");
await r.hideRing();
await r.click(upd);
await p.waitForLoadState("networkidle");
await r.ring(main.locator(".card").first());
await r.say("Nothing changes until she approves", "The suggestion quotes her words: “Tenancy agreement: not needed”.");
await r.hideRing();
await r.click(main.getByRole("button", { name: /Apply|Approve|Update/ }).first());
await r.cut(() => p.waitForURL(BASE + "/", { timeout: 60_000 }));
await r.click(main.getByRole("link", { name: /^Still to send/ }).first());
await p.waitForLoadState("networkidle");
await r.ring(main.locator(".banner").first());
await r.say("Send what’s missing", "The replacement draft sends the invoice and upload link, without asking again for the tenancy agreement.");
await r.hideRing();
await r.click(main.getByRole("button", { name: /^Approve and send/ }));
await r.cut(() => p.waitForURL(BASE + "/", { timeout: 60_000 }));

// ---- 4. A lender's solicitor emails ----
await r.caption("Someone else emails", "A solicitor acting for Silverstrand’s lender asks for certified copies of its registers.");
await r.cut(() => deliverEmail(r.bg, {
  from: "janet.tam@tamandco-law.example", name: "Janet Tam", subject: "Silverstrand Holdings Limited: facility with Harbour Bank",
  text: "Dear Sirs,\n\nWe act for Harbour Bank Limited in connection with a HK$20 million facility to Silverstrand Holdings Limited. As company secretary, please provide certified true copies of the company's current registers of directors and members, and confirm its registered office address.\n\nRegards,\nJanet Tam\nTam & Co Solicitors",
}).then(() => r.goto("/")));
const prospect = main.locator(".item", { hasText: /new prospect/ }).first();
await r.ring(prospect);
await r.say("A new prospect?", "An unknown sender asking for work looks like a new client, so Harbourline drafted a reply and made a prospect.");
await r.hideRing();
await r.click(prospect.getByRole("link").first());
await p.waitForLoadState("networkidle");
const notClient = main.getByRole("link", { name: /Mark the sender as not a client/ });
await r.ring(notClient);
await r.wait(1800);
await r.hideRing();
await r.click(notClient);
await p.waitForLoadState("networkidle");
await r.click(main.getByText("Not a client", { exact: true }));
await r.caption("Not a client", "Karen marks her as a third party: a law firm, linked to Silverstrand’s office move.");
await r.type(main.locator("#nc-org"), "Tam & Co Solicitors", 40);
await main.locator("#nc-role").selectOption("law_firm");
await r.hover(main.locator("#nc-role"));
await r.wait(600);
const taskOpt = await main.locator("#nc-task option", { hasText: "Silverstrand" }).first().getAttribute("value");
await main.locator("#nc-task").selectOption(taskOpt!);
await r.hover(main.locator("#nc-task"));
await r.wait(1500);
await r.click(main.locator(".pop-body").getByRole("button", { name: "Save" }));
await r.cut(() => p.waitForTimeout(3000));
await r.say("Closed", "The prospect, its draft reply and invoice are withdrawn. Her future emails are logged on the task instead of starting new work.");
await r.goto("/tasks?s=all");
await r.click(main.getByRole("link", { name: "Change of registered office" }).first());
await p.waitForLoadState("networkidle");
const parties = main.locator("dd", { hasText: "Janet Tam" }).first();
await r.ring(parties);
await r.say("Third parties", "On the task, she’s listed as the lender’s solicitor.");
await r.hideRing();

// ---- 5. Start manually ----
await r.click(p.locator('nav a[href="/"]').first());
await p.waitForLoadState("networkidle");
await r.caption("Agreed over lunch", "Over lunch, Ms Ho also asks Karen to change the company’s name to Silverstrand Global Limited. No email at all.");
await r.click(main.getByRole("link", { name: "New request" }));
await p.waitForLoadState("networkidle");
await r.click(main.getByRole("link", { name: "Start manually" }));
await p.waitForLoadState("networkidle");
const pick = main.locator("#pick-client");
await r.hover(pick);
await pick.selectOption({ label: "Silverstrand Holdings Limited 銀線灣控股有限公司" }).catch(async () => pick.selectOption({ index: 2 }));
await p.waitForLoadState("networkidle");
await main.locator("#pb-1").waitFor();
await r.hover(main.locator("#pb-1"));
await main.locator("#pb-1").selectOption({ label: "Change of company name" });
await r.wait(800);
const details = main.getByText(/^Details already given/);
if (await details.isVisible()) {
  await r.click(details);
  const nm = main.locator('[id$="-newName"]');
  if (await nm.count()) await r.type(nm.first(), "Silverstrand Global Limited", 35);
}
await r.type(main.locator("#notes"), "Agreed with Ms Ho over lunch on 30 September.", 30);
await r.ring(main.locator("label", { hasText: "Draft a confirmation" }));
await r.say("Start manually", "Karen picks the playbook, notes what was agreed, and Harbourline drafts the confirmation and invoice for her to approve.");
await r.hideRing();
await r.click(main.getByRole("button", { name: "Start", exact: true }));
await r.cut(async () => { await p.waitForURL((u) => !u.search.includes("mode=manual"), { timeout: 180_000 }); await p.waitForLoadState("networkidle"); });
await r.wait(1500);
if (!p.url().includes("/review/")) await r.goto("/");
const conf = p.url().includes("/review/") ? main.locator(".card").first() : item(main.getByRole("link", { name: /Silverstrand/ }).first());
await r.ring(conf);
await r.say("Confirmation drafted", "A confirmation that thanks her for meeting, with the invoice, ready for approval. Nothing is sent until Karen clicks.");
await r.hideRing();
await r.hideCaption();
await r.title("Harbourline Desk", "Work doesn’t only happen in the app", "Replies from Gmail, third parties, and instructions taken in person all land on the same tasks, with nothing sent twice or forgotten.");
await r.finish("demos/3-work-outside-the-app.mp4");
