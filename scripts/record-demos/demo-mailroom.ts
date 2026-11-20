// Mail room demo: the morning's post goes through the copier, every letter is read,
// matched, filed to the firm's server and drafted to the client, with staff approving each.
// Fictional letters only. Run with the mail room server up (npm run mailroom:dev), then:
//   npm run mailroom:reset && REC_BASE=http://localhost:3100 npx tsx scripts/record-demos/demo-mailroom.ts
import { copyFileSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { simpleParser } from "mailparser";
import { Recorder, until } from "./rec";

const ROOT = path.resolve("storage/cwccpa/mailroom");
const SERVER = path.join(ROOT, "Server");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** An Explorer-like view of the firm's X: drive: each client folder, and any letters filed today. */
function finderStage(title: string, today: string) {
  const top = path.join(SERVER, "XYZ Client Folder");
  const clients = readdirSync(top).filter((f) => !f.startsWith(".")).sort();
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = path.join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const rel = (from: string, f: string) => path.relative(from, path.dirname(f)).split(path.sep).filter(Boolean).map((x) => `${esc(x)}\\`).join("");
  const rows = clients.map((c) => {
    const filed = walk(path.join(top, c)).filter((f) => path.basename(f).startsWith(today));
    const files = filed.map((f) => `<div class="f new"><span class="ic">▤</span>${rel(path.join(top, c), f)}<b>${esc(path.basename(f))}</b></div>`).join("");
    return `<div class="d"><span class="ic">▸</span>${esc(c)}</div>${files}`;
  }).join("");
  const un = path.join(SERVER, "_Mail room unsorted");
  const unsorted = existsSync(un) ? walk(un).map((f) => `<div class="f new"><span class="ic">▤</span>${rel(un, f)}<b>${esc(path.basename(f))}</b></div>`).join("") : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;background:#e9eaed;font-family:"Segoe UI",-apple-system,"PingFang HK","IBM Plex Sans",system-ui,sans-serif}
  .win{position:absolute;left:40px;top:28px;width:820px;bottom:28px;background:#fff;border-radius:8px;box-shadow:0 14px 40px rgba(0,0,0,.18);overflow:hidden;display:flex;flex-direction:column}
  .bar{height:44px;background:#f3f3f3;border-bottom:1px solid #ddd;display:flex;align-items:center;padding:0 14px;font-size:13px;color:#333}
  .addr{flex:1;background:#fff;border:1px solid #d6d6d6;border-radius:4px;padding:5px 10px;font-size:13px}
  .list{padding:8px 0;overflow:auto;font-size:13.5px}
  .d{padding:5px 18px;color:#222}.d .ic{color:#c9a227;margin-right:8px;font-size:11px}
  .f{padding:4px 18px 4px 44px;color:#555}.f .ic{margin-right:8px;color:#8a8f98}
  .f.new{background:#eaf4ee;color:#1f4d33}.f.new b{font-weight:500}
  .h{padding:12px 18px 4px;font-size:12px;color:#888}
  </style></head><body><div class="win"><div class="bar"><span class="addr">${esc(title)}</span></div>
  <div class="list">${rows}${unsorted ? `<div class="h">X:\\_Mail room unsorted</div>${unsorted}` : ""}</div></div></body></html>`;
}

/** An Outlook-like draft window for one saved .eml draft. */
async function draftStage(file: string) {
  const m = await simpleParser(readFileSync(file));
  const to = Array.isArray(m.to) ? m.to.map((t) => t.text).join(", ") : m.to?.text ?? "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;background:#e9eaed;font-family:"Segoe UI",-apple-system,"PingFang HK","IBM Plex Sans",system-ui,sans-serif}
  .win{position:absolute;left:40px;top:28px;width:760px;bottom:28px;background:#fff;border-radius:10px;box-shadow:0 14px 40px rgba(0,0,0,.18);overflow:hidden;display:flex;flex-direction:column}
  .top{height:52px;background:#0f6cbd;color:#fff;display:flex;align-items:center;padding:0 18px;gap:14px;font-size:14px}
  .send{background:#fff;color:#0f6cbd;border-radius:4px;padding:6px 16px;font-weight:600}
  .row{display:flex;gap:12px;padding:10px 20px;border-bottom:1px solid #edebe9;font-size:14px}.row span{color:#605e5c;width:60px}
  .att{margin:12px 20px 0;display:inline-flex;gap:8px;align-items:center;border:1px solid #e1dfdd;border-radius:4px;padding:8px 12px;font-size:13px;width:fit-content}
  .att i{color:#c4314b;font-style:normal;font-weight:700}
  .body{padding:18px 20px;white-space:pre-wrap;font-size:15px;line-height:1.7;color:#242424}
  .tag{font-size:12px;opacity:.85}
  </style></head><body><div class="win"><div class="top"><span class="send">Send</span><span class="tag">Draft, not sent</span></div>
  <div class="row"><span>To</span>${esc(to)}</div><div class="row"><span>Subject</span>${esc(m.subject ?? "")}</div>
  ${(m.attachments ?? []).map((a) => `<div class="att"><i>PDF</i>${esc(a.filename ?? "scan.pdf")}</div>`).join("")}
  <div class="body">${esc(m.text ?? "")}</div></div></body></html>`;
}

const r = new Recorder("mailroom");
await r.start();
const p = r.page;
const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
// Caption spots chosen per screen so nothing important is covered.
const RIGHT = { x: 900, y: 120, w: 340 };     // beside the Finder and Outlook windows
const ON_SCAN = { x: 310, y: 470, w: 430 };    // the empty lower half of the letter, list view
const SIDE = { x: 24, y: 150, w: 270 };        // left of the centred letter, focus view

// ---- Opening ----
await r.goto(r.stage("server-before.html", finderStage("X:\\XYZ Client Folder", today)));
await r.title("AO1 Systems", "Mail room automation", "Batch-scan the day’s post. Letters are read, matched to the client, filed on the office server and attached to emails drafted in Outlook.");
await r.hideTitle();
await r.say("Zero migration", "Each client keeps its folder, named with its client code. Nothing is migrated.", RIGHT);

// ---- The scan arrives ----
await r.goto("/mailroom");
await r.say("This morning", "The post goes through the copier as usual. The copier saves the scan to a folder.", { x: 700, y: 150, w: 420 });
copyFileSync("demos/cwccpa/letter-pack.pdf", path.join(ROOT, "Scans", `Scan_${today.replace(/-/g, "")}_0912.pdf`));
const batch = p.locator("a.mr-batch").first();
await batch.waitFor({ timeout: 60_000 });
await p.getByText("12 to check").waitFor({ timeout: 60_000 });
await r.ring(batch);
await r.say("Read in seconds", "17 pages, split into 12 letters, each one read and matched.", { x: 700, y: 150, w: 420 });
await r.hideRing();
await r.click(batch);
await p.waitForLoadState("networkidle");
await p.locator(".mr-pages canvas").first().waitFor({ timeout: 30_000 });

// ---- Letter 1, list view ----
await r.ring(p.locator(".mr-list"));
await r.say("The morning's letters", "Every letter in the scan. The red 限 marks a deadline within 30 days; “Needs you” means it couldn’t tell whose letter it is.", ON_SCAN);
await r.hideRing();
const panel = p.locator(".mr-panel");
await r.ring(panel.locator("h1"), panel.locator(".mr-why"));
await r.say("Client ID matched", "It found the IRD file number on the letter and matched it to ABC Trading Limited in your client list.", ON_SCAN);
await r.ring(panel.locator(".mr-action"));
await r.say("What the client must do", "HK$48,200 by 28 November, read straight off the demand note.", ON_SCAN);
await r.ring(panel.locator(".mr-files"));
await r.say("Where it goes", "The client’s tax folder on X:, under its client code. Letters that aren’t about tax go in the client’s own folder.", ON_SCAN);
await r.hideRing();
await r.click(panel.locator("details summary"));
await r.scrollTo(panel.locator(".mr-mail"));
await r.ring(panel.locator(".mr-mail"));
await r.say("The client email", "Drafted in Traditional Chinese for 陳大文先生, with the scan attached. Staff can change anything.", ON_SCAN);
await r.hideRing();
await r.scrollTop();
await r.click(panel.locator("[data-approve] button"));
await p.waitForURL(/l=/);
await p.locator(".mr-pages canvas").first().waitFor({ timeout: 30_000 });
await r.say("Approved", "Letter filed on the server and client message saved as a draft in Outlook.", ON_SCAN);

// ---- Focus mode and the keyboard ----
await r.caption("Faster", "Hide the list and work from the keyboard: the letter in front, the decision underneath.", SIDE);
await r.press("[", "[", p.locator(".mr-list .mr-toggle"));
await p.locator(".mr-bar-dock").waitFor();
await r.wait(2600);
const approveBar = () => p.locator(".mr-bar-dock [data-approve] button");
await r.ring(p.locator(".mr-bar-dock"));
await r.say("Mingtai Supply Chain", "A profits tax return. The email will be in Simplified Chinese for this client.", SIDE);
await r.hideRing();
await r.press("Enter", "↵", approveBar());
await p.locator("h1", { hasText: "Whose letter is this?" }).waitFor({ timeout: 30_000 });

// ---- Letter 3: it asks ----
await r.ring(p.locator(".mr-choice").first(), p.locator(".mr-choice").nth(1));
await r.say("It asks instead of guessing", "No reference number, and two clients have similar names. Staff choose.", { x: 40, y: 440, w: 400 });
await r.hideRing();
await r.click(p.locator(".mr-choice").first());
await r.click(p.getByRole("button", { name: "Use this client" }));
await r.cut(() => p.locator(".mr-bar-dock").waitFor({ timeout: 60_000 }));
await r.say("Chosen", "The folder and the email follow the client staff picked.", SIDE);
await r.press("Enter", "↵", approveBar());
await p.locator(".mr-bar-dock b", { hasText: "Kowloon Bay Dental" }).waitFor({ timeout: 30_000 });

// ---- A few quick ones ----
await r.caption("One key per letter", "MPF surcharge notice: pay HK$33,075 by 14 November.", SIDE);
await r.wait(2200);
await r.press("Enter", "↵", approveBar());
await p.locator(".mr-bar-dock b", { hasText: "Sunrise Florist" }).waitFor({ timeout: 30_000 });
await r.caption("One key per letter", "A bank statement. Filed, and the client told it arrived.", SIDE);
await r.wait(2000);
await r.press("Enter", "↵", approveBar());
await p.locator(".mr-bar-dock b", { hasText: "Advertising or junk" }).waitFor({ timeout: 30_000 });
await r.ring(p.locator(".mr-bar-dock"));
await r.say("Junk", "Filed to an unsorted folder, with no email.", SIDE);
await r.hideRing();
await r.press("Enter", "↵", approveBar());

// ---- The rest, off camera ----
await r.caption("The rest of the pile", "Six more letters, the same way.", SIDE);
await r.wait(1600);
await r.cut(async () => {
  const ask = p.locator("h1", { hasText: "Whose letter is this?" });
  for (let i = 0; i < 14; i++) {
    const state = await until(async () => /\/done$/.test(p.url()) ? "done" : (await ask.isVisible().catch(() => false)) ? "ask" : (await approveBar().isVisible().catch(() => false)) ? "bar" : null, "a letter", 60_000, 200);
    if (state === "done") break;
    if (state === "ask") { await p.getByRole("button", { name: "Not for any client" }).click(); await approveBar().waitFor({ timeout: 30_000 }); }
    const before = p.url();
    await approveBar().click();
    await until(async () => p.url() !== before, "next letter", 30_000, 200);
  }
  if (!/\/done$/.test(p.url())) await r.goto(p.url().replace(/\?.*$/, "") + "/done");
  else await p.waitForLoadState("networkidle");
});

// ---- Summary ----

// ---- The proof: server and Outlook ----
await r.goto(r.stage("server-after.html", finderStage("X:\\XYZ Client Folder", today)));
await r.say("On your X: drive", "Each letter in its client’s folder: tax letters in the tax folder. Undo takes back any filing.", RIGHT);
const drafts = readdirSync(path.join(ROOT, "Outlook drafts")).filter((f) => f.endsWith(".eml")).map((f) => path.join(ROOT, "Outlook drafts", f));
const abc = drafts.find((f) => readFileSync(f, "utf8").includes("david.chan@")) ?? drafts[0];
await r.goto(r.stage("draft.html", await draftStage(abc)));
await r.say("In Outlook", "Each email opens as an unsent draft with the scan attached. Staff read it and press Send.", RIGHT);
await r.hideCaption();
await r.title("AO1 Systems · Mailroom automation", "Reduce staff time on inbound mail by up to 90%", "We run alongside your team, testing accuracy and time savings before going live.");
await r.finish("demos/cwccpa/mailroom-demo.mp4");
