// A fictional, clearly marked sample summons, rendered as a slightly skewed phone scan.
import { chromium } from "@playwright/test";
const html = `<body style="margin:0;background:#8d8a84;width:1240px;height:1754px;display:flex;align-items:center;justify-content:center">
<div style="width:1090px;height:1580px;background:#f7f5ef;transform:rotate(-0.8deg);box-shadow:0 6px 30px #0006;padding:90px 100px;box-sizing:border-box;font-family:'Times New Roman',serif;color:#1d1d1d;filter:contrast(1.05) grayscale(.2);position:relative">
<div style="position:absolute;right:60px;top:22px;border:3px solid #a33;color:#a33;font:bold 26px sans-serif;padding:4px 14px;transform:rotate(6deg)">SAMPLE · FOR DEMONSTRATION</div>
<div style="text-align:center;font-size:30px;font-weight:bold;letter-spacing:1px">IN THE EASTERN MAGISTRATES' COURTS</div>
<div style="text-align:center;font-size:22px;margin-top:6px">HONG KONG SPECIAL ADMINISTRATIVE REGION</div>
<div style="text-align:center;font-size:40px;font-weight:bold;margin-top:40px">SUMMONS TO DEFENDANT</div>
<div style="text-align:center;font-size:22px;margin-top:8px">Summons No. ESS 18842/2026</div>
<div style="font-size:24px;line-height:1.7;margin-top:60px">
<p><b>To:</b> PEAK HARBOUR INVESTMENTS LIMITED (Company No. 2650918)<br>18/F, Caine Road House, 2 Pedder Lane, Central, Hong Kong</p>
<p style="margin-top:34px">WHEREAS information has been laid by the Registrar of Companies that you, being a company registered in Hong Kong, failed to deliver to the Registrar for registration an annual return (Form NAR1) for the year 2025 within 42 days after the return date, contrary to section 662(1) and (5) of the Companies Ordinance (Cap. 622).</p>
<p style="margin-top:34px"><b>YOU ARE HEREBY SUMMONED</b> to appear before a Magistrate at the Eastern Magistrates' Courts, 29 Tai On Street, Sai Wan Ho, Court No. 3, on</p>
<p style="text-align:center;font-size:32px;font-weight:bold;margin:26px 0">Thursday, 22 October 2026 at 9:30 a.m.</p>
<p>to answer the said information. If you intend to plead guilty you may do so in writing in accordance with the notice attached. Maximum penalty: a fine at level 5 and a daily default fine.</p>
<p style="margin-top:70px">Dated this 24th day of September 2026.</p>
<p style="margin-top:80px;text-align:right">.................................................<br>Magistrate</p></div></div></body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1240, height: 1754 } });
await p.setContent(html);
await p.screenshot({ path: "scripts/record-demos/assets/summons-scan.jpg", type: "jpeg", quality: 80 });
await b.close();
