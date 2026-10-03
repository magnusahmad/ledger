// Fictional documents used in the recordings: an ID copy, an address proof, a selfie and a
// scanned summons. All clearly marked as samples; none imitate a real document design.
import { chromium } from "@playwright/test";
const dir = "scripts/record-demos/assets";
const font = `font-family: 'IBM Plex Sans', 'PingFang TC', sans-serif;`;
const pages: Record<string, { w: number; h: number; html: string }> = {
  "id-copy.png": { w: 860, h: 540, html: `<div style="${font};width:800px;height:480px;margin:30px;border-radius:24px;background:linear-gradient(135deg,#e7eef6,#f7f3ea);box-shadow:0 2px 10px #0003;position:relative;padding:36px;box-sizing:border-box">
    <div style="font-size:22px;font-weight:600;color:#27425f">IDENTITY CARD · 身份證 <span style="float:right;color:#b0312b;border:2px solid #b0312b;padding:2px 10px;font-size:16px;transform:rotate(-4deg);display:inline-block">SAMPLE 樣本</span></div>
    <div style="display:flex;gap:36px;margin-top:40px"><div style="width:190px;height:240px;background:#c9d3de;border-radius:10px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden"><div style="width:120px;height:120px;border-radius:60px;background:#8595a8;margin-bottom:-10px"></div></div>
    <div style="font-size:24px;line-height:1.9;color:#1b2430"><div style="font-size:34px">黃美華</div><div>WONG, Mei Wah</div><div style="font-size:18px;color:#56606c">Date of birth 出生日期</div><div>12-03-1976</div><div style="font-size:18px;color:#56606c">Number 號碼</div><div style="font-family:monospace;font-size:30px">C668123(4)</div></div></div></div>` },
  "address-proof.png": { w: 820, h: 1060, html: `<div style="${font};padding:60px;color:#1b2430;background:#fff;height:940px">
    <div style="display:flex;justify-content:space-between"><div style="font-size:28px;font-weight:700;color:#1f5f8b">Harbour Utilities Co. (sample)</div><div style="font-size:16px;color:#56606c">Statement date 18 Sep 2026</div></div>
    <div style="margin-top:70px;font-size:20px;line-height:1.6">WONG Mei Wah<br>Flat 23A, Tower 2, Laguna City<br>Lam Tin, Kowloon<br>Hong Kong</div>
    <div style="margin-top:60px;font-size:24px;font-weight:600">Electricity bill · 電費單</div>
    <table style="margin-top:24px;width:100%;font-size:18px;border-collapse:collapse"><tr><td style="padding:10px 0;border-bottom:1px solid #ddd">Account number</td><td style="text-align:right;border-bottom:1px solid #ddd">8812 4410 23</td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #ddd">Billing period</td><td style="text-align:right;border-bottom:1px solid #ddd">14 Jul – 12 Sep 2026</td></tr><tr><td style="padding:10px 0">Amount due</td><td style="text-align:right">HK$1,284.60</td></tr></table>
    <div style="margin-top:360px;font-size:14px;color:#8a929c">Sample document for a product demonstration.</div></div>` },
  "selfie.png": { w: 720, h: 960, html: `<div style="width:720px;height:960px;background:linear-gradient(#d9e4ec,#b8c6d2);display:flex;align-items:flex-end;justify-content:center;overflow:hidden"><div style="position:relative;width:420px;height:760px"><div style="position:absolute;left:110px;top:120px;width:200px;height:250px;border-radius:100px;background:#e9c7a8"></div><div style="position:absolute;left:90px;top:95px;width:240px;height:140px;border-radius:120px 120px 30px 30px;background:#2b2320"></div><div style="position:absolute;left:0;top:400px;width:420px;height:420px;border-radius:200px 200px 0 0;background:#5b7a99"></div></div></div>` },
};
const b = await chromium.launch();
for (const [name, d] of Object.entries(pages)) {
  const p = await b.newPage({ viewport: { width: d.w, height: d.h } });
  await p.setContent(`<body style="margin:0;background:#fff">${d.html}</body>`);
  await p.screenshot({ path: `${dir}/${name}` });
}
await b.close();
