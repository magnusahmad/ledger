// Demo 1 · "Change of director (ND2A) workflow": a client's Chinese email to a filed appointment and a
// register shown as it stood on any date. Run scripts/record-demos/reset.sh first.
import { readFileSync } from "node:fs";
import { Recorder, BASE, outbox, until, deliverEmail, sendDeposit, pdfPages, phoneStage, docStage } from "./rec";

const A = "scripts/record-demos/assets";
const r = new Recorder("demo1");
await r.start();
const p = r.page;
const main = p.locator("main");

// ---- Title ----
await r.goto("/");
await r.title("Part 1 of 3", "Change of director (ND2A) workflow", "A client’s email in Chinese becomes an invoiced, filed director appointment, with every step approved by staff");
await r.hideTitle();

// ---- 1. The email arrives ----
await r.say("Today", "This is Karen’s Today page. An overdue KYC review and an AGM due today already need her.");
await r.caption("A client emails", "Mr Chan of Kowloon Bay Trading writes in Cantonese: “Please add my wife, 黃美華, as a director from 1 November.”");
const delivering = deliverEmail(r.bg, {
  from: "chan.taiman@kbtrading.example", name: "CHAN Tai Man", subject: "委任董事",
  text: "Karen你好，\n\n想請你幫手委任我太太黃美華（WONG Mei Wah）做九龍灣貿易有限公司嘅董事，由11月1日開始生效。\n\n唔該晒！\n陳大文",
});
const reading = main.getByText("Reading it now");
await reading.waitFor({ timeout: 60_000 }).catch(() => {});
if (await reading.isVisible()) { await r.ring(reading.locator("xpath=ancestor::*[contains(concat(' ',@class,' '),' item ')][1]")); await r.say("It arrives on its own", "The email lands on Today by itself. Nobody copied or pasted anything; Clerk is reading it."); }
await r.cut(async () => { await delivering; await p.reload(); await p.waitForLoadState("networkidle"); });
await r.hideRing();
const card = main.getByRole("link", { name: /Approve reply and invoice to CHAN Tai Man/ });
await r.ring(card.locator("xpath=ancestor::*[contains(concat(' ',@class,' '),' item ')][1]"));
await r.say("Ready for approval", "A reply and an invoice are drafted and waiting for Karen. Nothing has been sent.");
await r.hideRing();
await r.click(card);
await p.waitForLoadState("networkidle");

// ---- 2. What it understood, the reply and the invoice ----
const fromClient = main.locator(".card", { has: p.getByRole("heading", { name: "From the client" }) });
await r.ring(fromClient);
await r.say("What it understood", "On the right: Mr Chan’s words, what Clerk understood, and that he’s an existing client who writes in Traditional Chinese.");
const checklist = main.locator(".card", { has: p.getByRole("heading", { name: /Appoint a director/ }) });
await r.ring(checklist);
await r.say("The checklist", "The appointment task already knows the name and effective date from the email, and lists what is still needed for the new director.");
const invCard = main.locator(".card", { has: p.getByRole("heading", { name: "Invoice" }) });
await r.ring(invCard);
await r.say("The invoice", "The invoice is prepared from the playbook fee. Kowloon Bay pays upfront, so work starts once it’s paid.");
await r.hideRing();
await r.scrollTop();
const replyCard = main.locator(".card", { has: p.getByRole("heading", { name: "Reply" }) });
await r.ring(replyCard.locator("textarea"));
await r.say("The reply", "The reply is drafted in 繁體中文, the client’s language: it confirms the request and asks only for what’s missing, with a secure upload link.");
await r.hideRing();
const text = replyCard.locator("textarea");
const before = await text.inputValue();
await r.click(replyCard.getByRole("button", { name: "EN", exact: true }));
await r.caption("Switch language", "Karen can read it in English…");
await r.cut(() => until(async () => (await text.inputValue()) !== before && /[a-z]{4}/i.test((await text.inputValue()).slice(0, 40)), "English redraft", 120_000));
await r.ring(text);
await r.wait(3500);
await r.hideRing();
const en = await text.inputValue();
await r.click(replyCard.getByRole("button", { name: "繁", exact: true }));
await r.caption("Switch language", "…and send it in Traditional Chinese.");
await r.cut(() => until(async () => (await text.inputValue()) !== en, "Chinese redraft", 120_000));
await r.wait(2500);
const approve = main.getByRole("button", { name: /Approve and send with invoice/ });
await r.ring(approve);
await r.say("Approve", "One click sends the reply with the invoice PDF, the bank details and the upload link.");
await r.hideRing();
await r.click(approve);
await r.cut(() => p.waitForURL(BASE + "/", { timeout: 60_000 }));
await p.waitForLoadState("networkidle");

// ---- 3. Payment ----
const awaiting = main.locator("section", { has: p.getByRole("heading", { name: "Awaiting payment" }) });
await r.ring(awaiting);
await r.say("Awaiting payment", "The task now waits for payment.");
const invNo = outbox()[0].attachmentNames?.[0]?.replace(".pdf", "") ?? "CRCS-2026-0001";
await r.caption("The client pays", `Mr Chan pays by bank transfer, quoting ${invNo}. Here it’s a real deposit into the Airwallex sandbox account.`);
await r.wait(2500);
await r.cut(async () => { await sendDeposit(r.bg, invNo, "CHAN TAI MAN"); await until(async () => !(await awaiting.innerText()).includes(invNo), "payment gate to open", 90_000); });
await r.say("Matched automatically", "The deposit was matched on invoice number and amount. The task moved on to collecting the new director’s details.");
await r.hideRing();
await r.click(p.locator(`aside a[href="/payments"], nav a[href="/payments"]`).first());
await p.waitForLoadState("networkidle");
const row = main.locator("tr", { hasText: invNo }).first();
await r.ring(row);
await r.say("Payments", "The deposit from the Airwallex account, matched to the invoice with no one touching it.");
await r.hideRing();

// ---- 4. The client fills in the upload link on their phone ----
const link = outbox().map((m) => m.text.match(/http:\/\/localhost:3200\/u\/\w+/)?.[0]).find(Boolean)!;
await r.goto(r.stage("phone-upload", phoneStage(link, "The client’s phone")));
const f = p.frameLocator("#ph");
await r.caption("On the client’s phone", "Mr Chan opens the upload link from the email. Everything still needed is on one form, in Chinese.", "left");
await f.locator("form").waitFor();
await r.wait(3200);
const fill = async (key: string, v: string) => r.type(f.locator(`[name$=":${key}"]`), v, 30);
await fill("idNo", "HKID C668123(4), Hong Kong");
await fill("resAddr", "Flat 23A, Tower 2, Laguna City, Lam Tin, Kowloon, Hong Kong");
await fill("corrAddr", "Flat 23A, Tower 2, Laguna City, Lam Tin, Kowloon, Hong Kong");
await fill("contactInfo", "meiwah.wong@example.com, +852 9123 0007");
await r.caption("On the client’s phone", "Photos of the ID card and a utility bill, and a selfie for the identity check.", "left");
for (const [key, file] of [["idCopy", "id-copy.png"], ["addrProof", "address-proof.png"], ["selfie", "selfie.png"]]) {
  const inp = f.locator(`[name$=":${key}"]`);
  await r.hover(inp);
  await inp.setInputFiles(`${A}/${file}`);
  await r.wait(600);
}
await r.click(f.getByRole("button", { name: "提交" }));
await r.cut(() => until(async () => !(await f.locator("body").innerText()).includes("正在提交"), "portal submit", 180_000));
await r.say("Or by email", "If Mr Chan would rather email the details back, Clerk reads his reply and ticks off the same items.", "left");
await r.say("Sent", "One tap sends it all. Clerk reads the documents, checks them against what was typed, and screens the new director against sanctions lists.", "left");

// Resolve any mismatch between typed values and the documents off camera (not the story of this demo).
await r.cut(async () => {
  await until(async () => {
    await r.bg.goto(BASE + "/");
    const conflict = r.bg.getByRole("link", { name: /^Conflicting/ }).first();
    if (await conflict.isVisible()) { await conflict.click(); await r.bg.getByRole("button", { name: "Use the new value" }).click(); await r.bg.waitForURL(BASE + "/", { timeout: 120_000 }); return false; }
    return r.bg.getByRole("link", { name: /Send for signature/ }).first().isVisible();
  }, "signing card", 300_000, 3000);
});

// ---- 5. Signing ----
await r.goto("/");
const signCard = main.getByRole("link", { name: /Send for signature/ }).first();
await r.ring(signCard.locator("xpath=ancestor::*[contains(concat(' ',@class,' '),' item ')][1]"));
await r.say("Documents prepared", "The board resolution, the consent to act and the ND2A were prepared from the registers and the new details.");
await r.hideRing();
await r.click(signCard);
await p.waitForLoadState("networkidle");
await r.ring(main.locator(".card").first());
await r.say("Send for signature", "Mr Chan signs the resolution as director; Mrs Wong signs her consent. Each gets a personal link.");
await r.hideRing();
await r.click(main.getByRole("button", { name: "Send for signature" }));
await r.cut(() => p.waitForURL(BASE + "/", { timeout: 120_000 }));
const signMails = outbox().filter((m) => /\/sign\//.test(m.text));
const wong = signMails.find((m) => m.to[0].includes("meiwah")) ?? signMails[0];
await r.goto(r.stage("phone-sign", phoneStage(wong.text.match(/http:\/\/localhost:3200\/sign\/\w+/)![0], "Mrs Wong’s phone")));
const s = p.frameLocator("#ph");
await s.locator("body").waitFor();
await r.say("Signing", "Mrs Wong opens her signing link. To prove it’s her, she asks for a code by email.", "left");
await r.click(s.getByRole("button").filter({ hasText: /code|驗證碼|验证码/i }).first());
const code = await until(async () => outbox().filter((x) => x.to[0] === wong.to[0] && /\b\d{6}\b/.test(x.text) && !/\/sign\//.test(x.text)).at(-1)?.text.match(/\b(\d{6})\b/)?.[1], "OTP email");
await r.caption("Signing", `The 6-digit code arrives in her email: ${code}.`, "left");
await r.type(s.locator("input").first(), code, 90);
await r.click(s.getByRole("button").filter({ hasText: /Verify|驗證|验证/ }).first());
await r.wait(1500);
await r.say("Signing", "She reads the consent to act, then signs.", "left");
await r.click(s.getByRole("button").filter({ hasText: /Sign|簽署|签署/ }).last());
await r.cut(() => until(async () => /Signed|已簽署|已签署|多謝|謝謝/.test(await s.locator("body").innerText()), "signed page", 60_000));
await r.say("Signed", "Signed, with an audit certificate recording the code, time and device.", "left");
// Mr Chan signs the board resolution the same way, off camera.
await r.cut(async () => {
  for (const m of signMails.filter((x) => x !== wong)) {
    await r.bg.goto(m.text.match(/http:\/\/localhost:3200\/sign\/\w+/)![0]);
    await r.bg.getByRole("button").filter({ hasText: /code|驗證碼|验证码/i }).first().click();
    const c = await until(async () => outbox().filter((x) => x.to[0] === m.to[0] && /\b\d{6}\b/.test(x.text) && !/\/sign\//.test(x.text)).at(-1)?.text.match(/\b(\d{6})\b/)?.[1], "OTP");
    await r.bg.locator("input").first().fill(c);
    await r.bg.getByRole("button").filter({ hasText: /Verify|驗證|验证/ }).first().click();
    await r.bg.getByRole("button").filter({ hasText: /Sign|簽署|签署/ }).last().click();
    await r.bg.waitForTimeout(3000);
  }
  await until(async () => { await r.bg.goto(BASE + "/"); return r.bg.getByRole("link", { name: /^File ND2A/ }).first().isVisible(); }, "filing card", 120_000, 2500);
});

// ---- 6. The official ND2A, filled in ----
await r.goto("/");
await r.say("Mr Chan signed too", "Once both have signed, the task moves to filing.");
const fileCard = main.getByRole("link", { name: /^File ND2A/ }).first();
await r.click(fileCard);
await p.waitForLoadState("networkidle");
const nd2aLink = main.getByRole("link", { name: /ND2A/ }).first();
await r.ring(nd2aLink);
await r.say("The ND2A", "Here is the official Companies Registry form, filled in.");
const href = await nd2aLink.getAttribute("href");
const pdf = Buffer.from(await (await r.bg.request.get(BASE + href)).body());
// Page 1 (company), page 2 (the appointment) and the PI-ND2A page; skip continuation sheets and notes.
const allPages = pdfPages(pdf, "nd2a");
const pages = [0, 1, 6].filter((i) => allPages[i]).map((i) => r.stage(`nd2a-${i}.png`, allPages[i], "image/png"));
const filingUrl = p.url();
await r.hideRing();
await r.goto(r.stage("nd2a", docStage("Form ND2A: appointment · Kowloon Bay Trading Limited", pages, "Generated by Clerk from the registers")));
await r.say("Form ND2A", "The official form, Specification No. 1/2023, with the company’s name and business registration number filled in.");
const pg = p.locator("img.pg");
await r.scrollTo(pg.nth(1), "start");
await r.say("Form ND2A", "Page 2: Mrs Wong’s appointment as director from 1 November 2026, her name, correspondence address, email and partial ID number.");
await r.scrollTo(pg.nth(2), "start");
await r.say("Form ND2A", "Her full ID number and residential address go on the protected-information page, which isn’t shown on the public record.");
await r.goto(filingUrl);
await r.caption("File on e-Registry", "Clerk doesn’t submit to the Companies Registry directly yet, so Karen files the ND2A on e-Registry and records the reference.");
await r.type(main.getByLabel("Filing reference"), "ER-2026-1101-4417", 60);
await r.click(main.getByRole("button", { name: "Record filing" }));
await r.cut(() => p.waitForURL(BASE + "/", { timeout: 60_000 }));

// ---- 7. The register, as at any date ----
const regCard = main.getByRole("link", { name: /^Update/ }).first();
await regCard.waitFor({ timeout: 60_000 });
await r.click(regCard);
await p.waitForLoadState("networkidle");
await r.ring(main.locator(".card").first());
await r.say("Update the register", "Karen approves the change to the register of directors, effective 1 November.");
await r.hideRing();
await r.click(main.getByRole("button", { name: /Update registers|Approve/ }).first());
await r.cut(() => p.waitForURL(BASE + "/", { timeout: 60_000 }));
await r.goto("/clients/cli_c1?tab=officers&asAt=2026-11-01");
const officers = main.locator(".card").filter({ has: p.getByRole("heading", { name: /Officers as at/ }) }).first();
await r.ring(officers);
await r.say("Registers as at 1 Nov 2026", "The register of directors as at 1 November: Mrs Wong is a director from that date.");
await r.hideRing();
const asAt = main.getByLabel("Registers as at");
await r.click(asAt);
await asAt.fill("2026-10-31");
await r.wait(600);
await r.click(main.getByRole("button", { name: "Show" }));
await p.waitForLoadState("networkidle");
await r.ring(main.locator(".card").filter({ has: p.getByRole("heading", { name: /Officers as at/ }) }).first());
await r.say("Registers as at 31 Oct 2026", "Set it to the day before and she disappears. Every register can be reproduced exactly as it stood on any date.");
await r.hideRing();
await r.hideCaption();
await r.title("ao1 Clerk", "Change of director (ND2A) workflow", "Read, drafted, invoiced, paid, collected, signed, filed and registered. Staff approved every step that reached the client or the registers.");
await r.finish("demos/1-change-of-director-nd2a.mp4");
void readFileSync;
