// Screen recorder for the demo videos: Chrome's screencast (1920x1080 from a 1280x720 page at
// 1.5x), an on-screen cursor, captions, a highlight ring and title cards injected as an overlay.
// Waits on the live model are cut with pause()/resume(); ffmpeg assembles the frames.
import { chromium, type Browser, type BrowserContext, type CDPSession, type Locator, type Page } from "@playwright/test";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

export const BASE = process.env.REC_BASE ?? "http://localhost:3200";
export const STAGE = `${BASE}/__stage`;
const DRY = process.env.DRY === "1";

/** Where a caption sits: the classic spots, or an exact box (page px) kept clear of what matters. */
export type Where = "bottom" | "left" | { x: number; y: number; w: number };
type OverlayState = { x: number; y: number; caption: { label: string; text: string; where: Where } | null };

const OVERLAY = `(() => {
  if (window.top !== window) return;
  const css = \`
  #rec-cursor{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px);filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}
  .rec-ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #2f6fed;background:rgba(47,111,237,.18);z-index:2147483646;pointer-events:none;animation:rec-rip .55s ease-out forwards}
  @keyframes rec-rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
  #rec-ring{position:fixed;z-index:2147483645;pointer-events:none;border:2px solid #2f6fed;border-radius:10px;box-shadow:0 0 0 4px rgba(47,111,237,.16);opacity:0;transition:opacity .35s, left .45s ease, top .45s ease, width .45s ease, height .45s ease}
  #rec-cap{position:fixed;z-index:2147483646;pointer-events:none;background:rgba(22,24,29,.94);color:#fff;border-radius:12px;padding:12px 20px 14px;font:15px/1.45 "IBM Plex Sans","Noto Sans TC","PingFang TC",system-ui,sans-serif;opacity:0;transition:opacity .35s}
  #rec-cap.bottom{left:50%;bottom:28px;transform:translateX(-50%);max-width:720px;min-width:420px}
  #rec-cap.left{left:64px;top:50%;transform:translateY(-50%);width:400px;font-size:17px;padding:18px 24px 20px}
  #rec-cap.at{font-size:16px;padding:16px 20px 18px}
  #rec-key{position:fixed;z-index:2147483647;pointer-events:none;background:#16181d;color:#fff;border-radius:8px;padding:6px 12px;font:600 15px/1.2 "IBM Plex Mono",ui-monospace,monospace;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:0;transition:opacity .25s}
  #rec-cap .l{font-size:12px;color:#aeb4bd;margin-bottom:3px}
  #rec-cap.left .l{font-size:13px}
  #rec-title{position:fixed;inset:0;z-index:2147483647;background:#f4f6f8;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .5s;font-family:"IBM Plex Sans",system-ui,sans-serif;color:#16181d;text-align:center}
  #rec-title .p{font-size:14px;color:#6b7280;margin-bottom:18px}
  #rec-title .h{font-size:40px;font-weight:600;letter-spacing:-.01em}
  #rec-title .s{font-size:17px;color:#6b7280;margin-top:18px;max-width:760px;line-height:1.5}
  #rec-title .b{width:50px;height:2px;background:#16181d;margin-top:26px}\`;
  const mk = () => {
    if (document.getElementById("rec-cursor")) return;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const c = document.createElement("div"); c.id = "rec-cursor";
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L3 18 L7.2 14.2 L10 20.5 L12.6 19.4 L9.9 13.2 L15.6 13.2 Z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    const r = document.createElement("div"); r.id = "rec-ring"; document.body.appendChild(r);
    const cap = document.createElement("div"); cap.id = "rec-cap"; cap.className = "bottom"; cap.innerHTML = '<div class="l"></div><div class="t"></div>'; document.body.appendChild(cap);
    const k = document.createElement("div"); k.id = "rec-key"; document.body.appendChild(k);
    const t = document.createElement("div"); t.id = "rec-title"; t.innerHTML = '<div class="p"></div><div class="h"></div><div class="s"></div><div class="b"></div>'; document.body.appendChild(t);
    window.__rec.pos(window.__recX ?? 640, window.__recY ?? 400);
  };
  window.__rec = {
    pos(x, y) { window.__recX = x; window.__recY = y; const c = document.getElementById("rec-cursor"); if (c) { c.style.left = x + "px"; c.style.top = y + "px"; } },
    move(x, y, ms) { return new Promise((res) => { const x0 = window.__recX ?? 640, y0 = window.__recY ?? 400, t0 = performance.now();
      const ease = (t) => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
      const step = (now) => { const k = Math.min(1, (now - t0) / ms), e = ease(k); window.__rec.pos(x0 + (x - x0) * e, y0 + (y - y0) * e); if (k < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step); }); },
    ripple(x, y) { const d = document.createElement("div"); d.className = "rec-ripple"; d.style.left = x + "px"; d.style.top = y + "px"; document.body.appendChild(d); setTimeout(() => d.remove(), 700); },
    keycap(text, x, y) { const k = document.getElementById("rec-key"); if (!k) return; k.textContent = text; k.style.left = x + "px"; k.style.top = y + "px"; k.style.opacity = "1"; clearTimeout(window.__recKeyT); window.__recKeyT = setTimeout(() => { k.style.opacity = "0"; }, 1100); },
    caption(label, text, where) { const c = document.getElementById("rec-cap"); if (!c) return;
      if (where && typeof where === "object") { c.className = "at"; c.style.left = where.x + "px"; c.style.top = where.y + "px"; c.style.width = where.w + "px"; c.style.bottom = ""; c.style.transform = "none"; }
      else { c.className = where || "bottom"; c.style.left = ""; c.style.top = ""; c.style.width = ""; c.style.transform = ""; } c.querySelector(".l").textContent = label || ""; c.querySelector(".l").style.display = label ? "" : "none"; c.querySelector(".t").textContent = text; c.style.opacity = "1"; },
    hideCaption() { const c = document.getElementById("rec-cap"); if (c) c.style.opacity = "0"; },
    ring(x, y, w, h) { const r = document.getElementById("rec-ring"); if (!r) return; r.style.left = x + "px"; r.style.top = y + "px"; r.style.width = w + "px"; r.style.height = h + "px"; r.style.opacity = "1"; },
    hideRing() { const r = document.getElementById("rec-ring"); if (r) r.style.opacity = "0"; },
    title(p, h, s) { const t = document.getElementById("rec-title"); if (!t) return; t.querySelector(".p").textContent = p; t.querySelector(".h").textContent = h; t.querySelector(".s").textContent = s; t.style.opacity = "1"; },
    hideTitle() { const t = document.getElementById("rec-title"); if (t) t.style.opacity = "0"; },
    tick() { const c = document.getElementById("rec-cursor"); if (c) c.style.opacity = c.style.opacity === "0.99" ? "1" : "0.99"; },
  };
  const boot = async () => { mk(); try { const s = await window.__recState(); if (s) { window.__rec.pos(s.x, s.y); if (s.caption) { const c = document.getElementById("rec-cap"); c.style.transition = "none"; window.__rec.caption(s.caption.label, s.caption.text, s.caption.where); c.offsetHeight; c.style.transition = ""; } } } catch {} };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();`;

export class Recorder {
  browser!: Browser;
  ctx!: BrowserContext;
  page!: Page;
  bg!: Page;
  private cdp!: CDPSession;
  private frames: { file: string; t: number }[] = [];
  private paused = false;
  private pausedTotal = 0;
  private pausedAt = 0;
  private dir: string;
  private n = 0;
  state: OverlayState = { x: 640, y: 400, caption: null };
  stageRoutes = new Map<string, { body: string | Buffer; type: string }>();

  constructor(public name: string) { this.dir = path.resolve(`storage/rec/frames/${name}`); }

  async start() {
    rmSync(this.dir, { recursive: true, force: true });
    mkdirSync(this.dir, { recursive: true });
    this.browser = await chromium.launch();
    this.ctx = await this.browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, locale: "en-GB", timezoneId: "Asia/Hong_Kong" });
    await this.ctx.route(`${STAGE}/**`, (route) => {
      const u = new URL(route.request().url());
      const r = this.stageRoutes.get(u.pathname);
      return r ? route.fulfill({ body: r.body, contentType: r.type }) : route.fulfill({ status: 404, body: "no stage" });
    });
    this.page = await this.ctx.newPage();
    await this.page.exposeFunction("__recState", () => this.state);
    await this.page.addInitScript(OVERLAY);
    this.bg = await this.ctx.newPage();
    await this.page.bringToFront();
    if (DRY) return;
    this.cdp = await this.ctx.newCDPSession(this.page);
    this.cdp.on("Page.screencastFrame", async (f) => {
      this.cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
      if (this.paused) return;
      const t = (f.metadata.timestamp ?? Date.now() / 1000) - this.pausedTotal;
      const file = path.join(this.dir, `f${String(this.n++).padStart(6, "0")}.jpg`);
      writeFileSync(file, Buffer.from(f.data, "base64"));
      this.frames.push({ file, t });
    });
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  }

  /** Register a page served under /__stage/ (same origin as the app, so iframes work). */
  stage(p: string, body: string | Buffer, type = "text/html; charset=utf-8") { this.stageRoutes.set(`/__stage/${p}`, { body, type }); return `${STAGE}/${p}`; }

  pause() { if (DRY || this.paused) return; this.paused = true; this.pausedAt = Date.now() / 1000; }
  async resume() {
    if (DRY || !this.paused) return;
    this.pausedTotal += Date.now() / 1000 - this.pausedAt;
    this.paused = false;
    await this.page.evaluate(() => window.__rec?.tick()).catch(() => {});
  }
  /** Run something slow off camera: the video jumps from before to after. */
  async cut<T>(fn: () => Promise<T>): Promise<T> { this.pause(); try { return await fn(); } finally { await this.resume(); } }

  async wait(ms: number) { await this.page.waitForTimeout(DRY ? Math.min(ms, 150) : ms); }

  private async ev<T>(fn: string, ...args: unknown[]): Promise<T | undefined> {
    return this.page.evaluate(({ fn, args }) => (window.__rec as unknown as Record<string, (...a: unknown[]) => T>)?.[fn]?.(...args), { fn, args }).catch(() => undefined) as Promise<T | undefined>;
  }

  async goto(url: string) {
    await this.page.goto(url.startsWith("http") ? url : BASE + url);
    await this.page.waitForLoadState("networkidle").catch(() => {});
  }

  async caption(label: string, text: string, where: Where = "bottom") {
    this.state.caption = { label, text, where };
    await this.ev("caption", label, text, where);
  }
  async hideCaption() { this.state.caption = null; await this.ev("hideCaption"); }

  /** Caption, then hold long enough to read it. */
  async say(label: string, text: string, where: Where = "bottom") {
    await this.caption(label, text, where);
    await this.wait(Math.max(2600, 1400 + text.length * 48));
  }

  async title(part: string, heading: string, sub: string) {
    await this.hideCaption();
    await this.ev("title", part, heading, sub);
    await this.wait(3800);
  }
  async hideTitle() { await this.ev("hideTitle"); await this.wait(700); }

  async moveTo(x: number, y: number, ms = 750) {
    await this.ev("move", x, y, DRY ? 1 : ms);
    this.state.x = x; this.state.y = y;
    await this.page.mouse.move(x, y);
  }

  private async point(l: Locator, dx = 0.5, dy = 0.5) {
    await l.scrollIntoViewIfNeeded();
    await this.wait(250);
    const b = (await l.boundingBox())!;
    return { x: b.x + b.width * dx, y: b.y + b.height * dy, b };
  }

  async hover(l: Locator) { const { x, y } = await this.point(l); await this.moveTo(x, y); }

  async click(l: Locator, opts: { dx?: number; dy?: number } = {}) {
    const { x, y } = await this.point(l, opts.dx, opts.dy);
    await this.moveTo(x, y);
    await this.wait(150);
    await this.ev("ripple", x, y);
    await this.page.mouse.click(x, y);
    await this.wait(350);
  }

  async type(l: Locator, text: string, delay = 45) {
    await this.click(l);
    await l.fill("");
    if (DRY) await l.fill(text); else await l.pressSequentially(text, { delay });
    await this.wait(250);
  }

  /** Press a key, showing it as a keycap near the control it acts on (with a ripple there). */
  async press(key: string, shown: string, on?: Locator) {
    let x = this.state.x, y = this.state.y;
    if (on) { const b = await on.boundingBox(); if (b) { x = b.x + b.width / 2; y = b.y + b.height / 2; } }
    await this.ev("keycap", shown, Math.max(12, x - 18), Math.max(12, y - 64));
    await this.wait(450);
    if (on) await this.ev("ripple", x, y);
    await this.page.keyboard.press(key);
    await this.wait(400);
  }

  /** Blue ring around an element (or several: the ring covers their union). */
  async ring(...ls: Locator[]) {
    await ls[0].scrollIntoViewIfNeeded();
    await this.wait(200);
    const bs = (await Promise.all(ls.map((l) => l.boundingBox()))).filter((b): b is NonNullable<typeof b> => !!b);
    const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
    const r = Math.max(...bs.map((b) => b.x + b.width)), btm = Math.max(...bs.map((b) => b.y + b.height));
    await this.ev("ring", x - 6, y - 6, r - x + 12, btm - y + 12);
  }
  async hideRing() { await this.ev("hideRing"); }

  async scrollTo(l: Locator, block: "start" | "center" = "center") {
    await l.evaluate((e, block) => e.scrollIntoView({ behavior: "smooth", block }), block);
    await this.wait(900);
  }
  async scrollTop() { await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); await this.wait(700); }

  async finish(out: string) {
    if (!DRY) {
      await this.cdp.send("Page.stopScreencast").catch(() => {});
      const lines = ["ffconcat version 1.0"];
      const fr = this.frames;
      for (let i = 0; i < fr.length; i++) {
        const d = i + 1 < fr.length ? Math.max(0.001, fr[i + 1].t - fr[i].t) : 1.5;
        lines.push(`file '${fr[i].file}'`, `duration ${d.toFixed(4)}`);
      }
      lines.push(`file '${fr[fr.length - 1].file}'`);
      const list = path.join(this.dir, "list.ffconcat");
      writeFileSync(list, lines.join("\n"));
      mkdirSync(path.dirname(out), { recursive: true });
      execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-vf", "scale=1920:1080:flags=lanczos,fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", out], { stdio: "inherit" });
      console.log(`wrote ${out} (${fr.length} frames)`);
    }
    await this.browser.close();
  }
}

// ---------- Helpers shared by the demos ----------

type Mail = { to: string[]; subject: string; text: string; attachmentNames?: string[] };
export const outbox = (): Mail[] => (existsSync("storage/rec/fake/outbox.json") ? JSON.parse(readFileSync("storage/rec/fake/outbox.json", "utf8")) : []);

export async function until<T>(fn: () => Promise<T | null | undefined | false>, what: string, timeoutMs = 240_000, everyMs = 1500): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const v = await fn().catch(() => null);
    if (v) return v;
    if (Date.now() - t0 > timeoutMs) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, everyMs));
  }
}

/** Demo panel, driven in the background tab (never on camera). */
export async function deliverEmail(bg: Page, m: { from: string; name?: string; subject: string; text: string; asFirm?: boolean; files?: string[] }) {
  await bg.goto(BASE + "/demo");
  await bg.locator("#from").fill(m.from);
  await bg.locator("#fromName").fill(m.name ?? "");
  await bg.getByLabel("Subject").fill(m.subject);
  await bg.getByLabel("Body").fill(m.text);
  if (m.files) await bg.getByLabel("Attachments").setInputFiles(m.files);
  if (m.asFirm) await bg.getByRole("checkbox", { name: /Send as the firm/ }).check();
  await bg.getByRole("button", { name: "Deliver email" }).click();
  await bg.getByText(/processed|Recorded as a reply|Something went wrong|failed/i).first().waitFor({ timeout: 240_000 });
  return bg.locator("main").innerText();
}

export async function sendDeposit(bg: Page, invoiceNumber: string, payer: string) {
  await bg.goto(BASE + "/demo");
  const opt = bg.locator("#invoiceId option", { hasText: invoiceNumber });
  await bg.locator("#invoiceId").selectOption(await opt.getAttribute("value") as string);
  await bg.getByLabel("Payer name").fill(payer);
  await bg.getByRole("button", { name: "Send deposit" }).click();
  await bg.getByText(/matched automatically|went wrong|failed/i).first().waitFor({ timeout: 120_000 });
}

export function pdfPages(buf: Buffer, name: string): Buffer[] {
  const dir = path.resolve(`storage/rec/pdf/${name}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "doc.pdf"), buf);
  execFileSync("pdftoppm", ["-r", "150", "-png", path.join(dir, "doc.pdf"), path.join(dir, "p")]);
  return execFileSync("ls", [dir]).toString().split("\n").filter((f) => f.startsWith("p") && f.endsWith(".png")).sort().map((f) => readFileSync(path.join(dir, f)));
}

/** A phone frame showing `src` in an iframe, on the right of a quiet backdrop. */
export function phoneStage(src: string, heading: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;background:#eef1f4;font-family:"IBM Plex Sans","PingFang TC",system-ui,sans-serif;overflow:hidden}
  .phone{position:absolute;left:760px;top:50%;transform:translateY(-50%);width:375px;height:667px;border-radius:38px;border:11px solid #16181d;background:#fff;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.18)}
  .phone iframe{width:100%;height:100%;border:0;display:block}
  .h{position:absolute;left:64px;top:92px;font-size:13px;color:#6b7280}
  </style></head><body><div class="h">${heading}</div><div class="phone"><iframe id="ph" src="${src}"></iframe></div></body></html>`;
}

export function docStage(title: string, pageUrls: string[], note: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#525659;font-family:"IBM Plex Sans",system-ui,sans-serif}
  .bar{position:sticky;top:0;z-index:2;height:44px;background:#323639;color:#f1f3f4;display:flex;align-items:center;padding:0 20px;font-size:14px;justify-content:space-between}
  .bar span{color:#bdc1c6;font-size:12px}
  .pg{display:block;width:860px;margin:18px auto;box-shadow:0 2px 12px rgba(0,0,0,.4);background:#fff}
  </style></head><body><div class="bar"><div>${title}</div><span>${note}</span></div>${pageUrls.map((u) => `<img class="pg" src="${u}">`).join("")}<div style="height:60px"></div></body></html>`;
}

declare global { interface Window { __rec: Record<string, (...a: unknown[]) => unknown>; __recX?: number; __recY?: number; __recKeyT?: ReturnType<typeof setTimeout>; __recState: () => Promise<OverlayState> } }
