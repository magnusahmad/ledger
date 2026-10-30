// Builds the fictional demo letter pack for the CWCCPA mail room demo:
//   demos/cwccpa/letter-pack.pdf     print this, feed it through the firm's copier (or drop it in)
//   seed/mailroom/cwccpa-demo-clients.csv   the firm's client index for the demo
// Every company, person and number here is invented. Each page is marked SPECIMEN.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";

type Letter = {
  sender: string; senderAddr: string[]; refs: [string, string][]; to: string[]; title: string;
  pages: string[][]; // paragraphs per page
};

const IRD = ["Inland Revenue Department", "Revenue Tower, 5 Gloucester Road", "Wan Chai, Hong Kong"];
const CR = ["Companies Registry", "14th Floor, Queensway Government Offices", "66 Queensway, Hong Kong"];
const DATE = "26 October 2026";

export const LETTERS: Letter[] = [
  { sender: IRD[0], senderAddr: IRD.slice(1), refs: [["File No.", "61/12345678"], ["Year of assessment", "2025/26"], ["Date of issue", DATE]],
    to: ["The Secretary", "ABC Trading Limited", "Unit 1203, 12/F, Kwai Fung Plaza", "18 Hing Fong Road, Kwai Chung, N.T."],
    title: "Notice of Assessment and Demand for Final Tax and Provisional Profits Tax",
    pages: [[
      "Profits Tax for the year of assessment 2025/26 has been assessed as follows.",
      "Assessable profits: HK$362,400. Tax charged at 8.25% on the first HK$2,000,000: HK$29,898.",
      "Provisional profits tax 2026/27: HK$18,302.",
      "Total amount payable: HK$48,200, to be paid on or before 28 November 2026.",
      "If you object to this assessment, you must give notice in writing within one month of the date of issue.",
    ], [
      "PAYMENT SLIP",
      "File No. 61/12345678    Year of assessment 2025/26",
      "Amount payable: HK$48,200    Due date: 28 November 2026",
      "Pay by PPS, internet banking, FPS, post or at any post office. Keep this slip for your records.",
    ]] },
  { sender: IRD[0], senderAddr: IRD.slice(1), refs: [["File No.", "61/71234567"], ["Year of assessment", "2025/26"], ["Date of issue", DATE]],
    to: ["The Secretary", "Mingtai Supply Chain Limited", "Room 808, 8/F, Tower B, Billion Centre", "1 Wang Kwong Road, Kowloon Bay, Kowloon"],
    title: "Profits Tax Return (BIR51) for the year of assessment 2025/26",
    pages: [[
      "A Profits Tax Return for the year of assessment 2025/26 is enclosed.",
      "Business Registration No. 71234567.",
      "The return must be completed, signed and filed within one month from the date of issue, that is by 26 November 2026.",
      "Audited financial statements and a tax computation must be filed with the return.",
    ], ["BIR51 (2025/26), page 1 of the return form. Part 1: particulars of the corporation. Part 2: assessable profits or adjusted loss."],
       ["BIR51 (2025/26), page 2 of the return form. Declaration to be signed by a director, secretary or principal officer."]] },
  { sender: CR[0], senderAddr: CR.slice(1), refs: [["Our ref.", "CR/AR/2026/41872"], ["Date", DATE]],
    to: ["The Directors", "Harbour Light Ltd", "Flat C, 9/F, Kam Fung Building", "88 Des Voeux Road West, Sheung Wan"],
    title: "Reminder: delivery of Annual Return (Form NAR1)",
    pages: [[
      "Our records show that the annual return of the company made up to its anniversary of incorporation in 2026 has not been delivered for registration.",
      "A private company must deliver its annual return within 42 days after its return date. A higher registration fee is payable if the return is delivered late.",
      "Please deliver the annual return together with the appropriate fee without delay.",
    ]] },
  { sender: "Pacific Star MPF Master Trust", senderAddr: ["Pacific Star Trustees Limited", "Level 20, Two Pacific Place, Admiralty"], refs: [["Employer account no.", "ER-0045821"], ["Date", "23 October 2026"]],
    to: ["Payroll Department", "Kowloon Bay Dental Limited", "Shop 3, G/F, Telford Gardens, Kowloon Bay"],
    title: "Notice of default contribution and surcharge",
    pages: [[
      "Mandatory contributions for the contribution period September 2026 were not received by the contribution day.",
      "Outstanding contributions: HK$31,500. Contribution surcharge (5%): HK$1,575. Total: HK$33,075.",
      "Please pay the total amount by 14 November 2026. Failure to pay may result in the matter being referred to the MPF Schemes Authority.",
    ]] },
  { sender: "Victoria Harbour Bank Limited", senderAddr: ["1 Queen's Road Central, Hong Kong"], refs: [["Account no.", "012-345678-001"], ["Statement date", "30 September 2026"]],
    to: ["SUNRISE FLORIST LIMITED", "G/F, 21 Tai Hang Road, Causeway Bay"],
    title: "Business Integrated Account statement, September 2026",
    pages: [[
      "Opening balance 1 September 2026: HK$128,440.20.",
      "Deposits: HK$212,906.00. Withdrawals: HK$198,013.55.",
      "Closing balance 30 September 2026: HK$143,332.65.",
    ], ["Transaction details, September 2026 (continued). 46 transactions. No action required."]] },
  { sender: "Pacific Office Supplies", senderAddr: ["Unit 5, 3/F, Wah Lok Industrial Centre, Kwun Tong"], refs: [["Date", "October 2026"]],
    to: ["The Office Manager", "Kowloon Bay Dental Limited", "Shop 3, G/F, Telford Gardens, Kowloon Bay"],
    title: "Autumn sale: 30% off toner and copier paper",
    pages: [["Order before 30 November and save 30% on all toner cartridges and A4 copier paper. Free delivery on orders over HK$800. Call 2345 6789."]] },
  { sender: IRD[0], senderAddr: ["Business Registration Office", ...IRD.slice(1)], refs: [["Business Registration No.", "40123456"], ["Date of issue", "20 October 2026"]],
    to: ["Golden Crane Catering Limited", "1/F, 33 Fuk Wing Street, Sham Shui Po"],
    title: "Demand for Business Registration Fee and Levy",
    pages: [["Your business registration certificate expires on 14 November 2026.", "Business registration fee and levy for one year: HK$2,200.", "Please pay on or before 14 November 2026 to renew the certificate."]] },
  { sender: IRD[0], senderAddr: IRD.slice(1), refs: [["File No.", "61/22446688"], ["Year of assessment", "2024/25"], ["Date", "24 October 2026"]],
    to: ["The Directors", "Eastpoint Logistics Limited", "Unit 15, 6/F, Kerry Warehouse, Tsuen Wan"],
    title: "Enquiry under section 51(1) of the Inland Revenue Ordinance",
    pages: [[
      "In connection with the company's Profits Tax Return for the year of assessment 2024/25, please provide the following information and documents.",
      "1. A breakdown of the freight charges of HK$1,284,000 claimed, with copies of the five largest invoices.",
      "2. Details of the payments to related companies shown in the financial statements.",
      "Please reply in writing on or before 27 November 2026.",
    ], ["3. A copy of the fixed asset register supporting the depreciation allowances claimed.", "If you need more time, please write before the due date giving reasons."]] },
  { sender: CR[0], senderAddr: CR.slice(1), refs: [["Company No.", "2987654"], ["Date", "22 October 2026"]],
    to: ["The Secretary", "Lotus Garden Trading Limited", "Room 1601, Wing On Plaza, Tsim Sha Tsui East"],
    title: "Annual return delivered late: higher registration fee payable",
    pages: [["The annual return of the company for 2026 was delivered after the prescribed period.", "A higher registration fee of HK$870 applies. The balance of HK$765 is payable.", "Please pay the balance on or before 21 November 2026."]] },
  { sender: IRD[0], senderAddr: IRD.slice(1), refs: [["Employer's File No.", "7P1-23456789"], ["Year ended", "31 March 2026"], ["Date of issue", "21 October 2026"]],
    to: ["The Manager", "Tai Hang Design Studio Limited", "4/F, 12 Wun Sha Street, Tai Hang"],
    title: "Employer's Return of Remuneration and Pensions (BIR56A)",
    pages: [["The enclosed Employer's Return (BIR56A) and employee notifications (IR56B) for the year 1 April 2025 to 31 March 2026 must be completed and filed.", "Please file the return within one month from the date of issue, that is by 21 November 2026."]] },
  { sender: IRD[0], senderAddr: IRD.slice(1), refs: [["File No.", "61/55667788"], ["Year of assessment", "2025/26"], ["Date of issue", DATE]],
    to: ["The Secretary", "Cheung & Co Trading Limited", "Room 502, 5/F, Prosperity Centre, Mong Kok"],
    title: "Notice of Assessment: Profits Tax 2025/26 (adjusted loss)",
    pages: [["The company's assessment for the year of assessment 2025/26 shows an adjusted loss of HK$86,210.", "No tax is payable. The loss will be carried forward and set off against future assessable profits.", "Please keep this notice for your records."]] },
  { sender: CR[0], senderAddr: CR.slice(1), refs: [["Company No.", "3456789"], ["Date", "21 October 2026"]],
    to: ["The Secretary", "Dragon Gate Holdings Limited", "Suite 2201, 22/F, Central Plaza, Wan Chai"],
    title: "Notice of change of registered office address received",
    pages: [["We have registered the Notice of Change of Address of Registered Office (Form NR1) delivered by the company.", "No further action is required."]] },
];

export const CLIENTS = [
  ["name", "name_zh", "br_no", "ird_file_no", "cr_no", "mpf_no", "folder", "contact_name", "contact_email", "language"],
  ["ABC Trading Limited", "ABC貿易有限公司", "12345678", "61/12345678", "1234567", "", "ABC Trading Limited", "陳大文先生", "david.chan@abctrading.example", "tc"],
  ["Mingtai Supply Chain Limited", "明泰供应链有限公司", "71234567", "61/71234567", "2234567", "", "Mingtai Supply Chain Limited", "王建国先生", "wang.jg@mingtai.example", "sc"],
  ["Harbour Light Limited", "海光有限公司", "33300011", "61/33300011", "3300011", "", "Harbour Light Limited", "Ms Ann Ho", "ann.ho@harbourlight.example", "en"],
  ["Harbour Light (Asia) Limited", "", "33300022", "61/33300022", "3300022", "", "Harbour Light (Asia) Limited", "Mr Ben Ho", "ben.ho@hlasia.example", "en"],
  ["Kowloon Bay Dental Limited", "九龍灣牙科有限公司", "52345678", "61/52345678", "2345123", "ER-0045821", "Kowloon Bay Dental Limited", "Dr Leung Ka Yan", "kyleung@kbdental.example", "en"],
  ["Sunrise Florist Limited", "旭日花店有限公司", "65432198", "61/65432198", "2765432", "", "Sunrise Florist Limited", "黃美玲女士", "may@sunriseflorist.example", "tc"],
  ["Golden Crane Catering Limited", "金鶴餐飲有限公司", "40123456", "61/40123456", "2123456", "", "Golden Crane Catering Limited", "李志強先生", "chikeung.li@goldencrane.example", "tc"],
  ["Eastpoint Logistics Limited", "东点物流有限公司", "28765432", "61/22446688", "2654321", "", "Eastpoint Logistics Limited", "刘洋先生", "liuyang@eastpoint.example", "sc"],
  ["Lotus Garden Trading Limited", "蓮園貿易有限公司", "61234598", "61/61234598", "2987654", "", "Lotus Garden Trading Limited", "Ms Karen Tsang", "karen@lotusgarden.example", "en"],
  ["Tai Hang Design Studio Limited", "大坑設計工作室有限公司", "37654321", "61/37654321", "3123987", "", "Tai Hang Design Studio Limited", "Mr Jason Lam", "jason@taihangdesign.example", "en"],
  ["Cheung Brothers Trading Limited", "張氏兄弟貿易有限公司", "55667788", "61/55667788", "2456789", "", "Cheung Brothers Trading Limited", "張偉明先生", "wm.cheung@cheungbros.example", "tc"],
  ["Northpoint Property Management Limited", "北角物業管理有限公司", "47788990", "61/47788990", "2876543", "", "Northpoint Property Management Limited", "Ms Grace Wong", "grace@northpointpm.example", "en"],
  ["Silver Bay Seafood Limited", "银湾海鲜有限公司", "39887766", "61/39887766", "3012345", "", "Silver Bay Seafood Limited", "陈明先生", "chenming@silverbay.example", "sc"],
  ["Tin Hau Tutoring Centre Limited", "天后補習中心有限公司", "58899001", "61/58899001", "3234567", "", "Tin Hau Tutoring Centre Limited", "Miss Yeung", "yeung@tinhaututor.example", "tc"],
];

async function drawLetter(doc: PDFDocument, l: Letter, font: PDFFont, bold: PDFFont) {
  const ink = rgb(0.1, 0.1, 0.12), grey = rgb(0.4, 0.4, 0.44);
  const wrap = (text: string, size: number, width: number, f = font) => {
    const words = text.split(" "), lines: string[] = [];
    let cur = "";
    for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (f.widthOfTextAtSize(t, size) > width && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    return lines;
  };
  l.pages.forEach((paras, i) => {
    const p: PDFPage = doc.addPage([595, 842]);
    let y = 790;
    if (i === 0) {
      p.drawText(l.sender, { x: 56, y, size: 13, font: bold, color: ink });
      l.senderAddr.forEach((a, j) => p.drawText(a, { x: 56, y: y - 16 - j * 12, size: 9, font, color: grey }));
      l.refs.forEach(([k, v], j) => { p.drawText(k, { x: 360, y: y - j * 14, size: 9, font, color: grey }); p.drawText(v, { x: 460, y: y - j * 14, size: 9, font: bold, color: ink }); });
      y -= 100;
      l.to.forEach((t, j) => p.drawText(t, { x: 56, y: y - j * 14, size: 10.5, font: j === 1 || (j === 0 && l.to.length < 4) ? bold : font, color: ink }));
      y -= l.to.length * 14 + 34;
      for (const line of wrap(l.title, 12.5, 480, bold)) { p.drawText(line, { x: 56, y, size: 12.5, font: bold, color: ink }); y -= 17; }
      y -= 10;
    } else {
      p.drawText(`${l.sender}   ${l.refs[0][0]} ${l.refs[0][1]}`, { x: 56, y, size: 9, font, color: grey });
      y -= 40;
    }
    for (const para of paras) {
      for (const line of wrap(para, 10.5, 480)) { p.drawText(line, { x: 56, y, size: 10.5, font, color: ink }); y -= 15; }
      y -= 9;
    }
    p.drawText(`Page ${i + 1} of ${l.pages.length}`, { x: 56, y: 40, size: 8.5, font, color: grey });
    p.drawText("Fictional letter for demonstration only", { x: 360, y: 40, size: 8.5, font, color: grey });
    p.drawText("SPECIMEN", { x: 150, y: 330, size: 92, font: bold, color: rgb(0.85, 0.85, 0.87), rotate: degrees(35), opacity: 0.45 });
  });
}

async function main() {
  const doc = await PDFDocument.create();
  const fixed = new Date("2026-10-26T00:00:00Z");
  doc.setCreationDate(fixed); doc.setModificationDate(fixed);
  doc.setTitle("CWCCPA mail room demo letter pack (fictional)");
  const font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const l of LETTERS) await drawLetter(doc, l, font, bold);
  const out = path.join(process.cwd(), "demos/cwccpa");
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, "letter-pack.pdf"), await doc.save());
  const csv = CLIENTS.map((r) => r.map((c) => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n") + "\n";
  writeFileSync(path.join(process.cwd(), "seed/mailroom/cwccpa-demo-clients.csv"), csv);
  console.log(`${LETTERS.length} letters, ${doc.getPageCount()} pages -> demos/cwccpa/letter-pack.pdf`);
}

if (process.argv[1]?.endsWith("mailroom-pack.ts")) main();
