// Trilingual document templates (English, Traditional Chinese, Simplified Chinese, or
// bilingual English/Traditional). Wording is standard Hong Kong company secretarial
// boilerplate and is marked for company secretary review in the playbook library.
import type { Block } from "./builder";
import type { DocContext } from "./context";
import { fmtDate } from "@/domain/dates";

type L = "en" | "tc" | "sc";
type Tri = Record<L, string>;
const t = (en: string, tc: string, sc: string): Tri => ({ en, tc, sc });

function langs(c: DocContext): L[] { return c.lang === "bilingual" ? ["en", "tc"] : [c.lang]; }
function nm(c: DocContext, l: L) { return (l === "en" ? c.client.nameEn : l === "tc" ? c.client.nameTc : c.client.nameSc) ?? c.client.nameEn; }
function pname(p: { nameEn: string; nameZh?: string | null } | null | undefined, l: L) { if (!p) return ""; return l === "en" || !p.nameZh ? p.nameEn : `${p.nameZh}（${p.nameEn}）`; }
function d(date: string | null | undefined, l: L) { return fmtDate(date ?? "", l); }
const eff = (c: DocContext) => c.task.effectiveDate ?? c.values.effDate ?? c.today;

/** Resolution clauses for a playbook, in one language. */
export function resolutionClauses(c: DocContext, l: L): string[] {
  const v = c.values, p = c.person, co = nm(c, l);
  switch (c.pb.id) {
    case "hk.appointDirector": return [({ en: `THAT ${pname(p, l)} be and is hereby appointed as a director of the Company with effect from ${d(eff(c), l)}.`, tc: `議決委任${pname(p, l)}為本公司董事，自${d(eff(c), l)}起生效。`, sc: `议决委任${pname(p, l)}为本公司董事，自${d(eff(c), l)}起生效。` } as Tri)[l],
      t("THAT any one director or the company secretary be authorised to sign and file Form ND2A and to update the register of directors.", "議決授權任何一名董事或公司秘書簽署及提交表格ND2A，並更新董事登記冊。", "议决授权任何一名董事或公司秘书签署及提交表格ND2A，并更新董事登记册。")[l]];
    case "hk.resignDirector": return [({ en: `THAT the resignation of ${pname(p, l)} as a director of the Company with effect from ${d(v.lastDay ?? eff(c), l)} be and is hereby accepted.`, tc: `議決接納${pname(p, l)}辭任本公司董事，自${d(v.lastDay ?? eff(c), l)}起生效。`, sc: `议决接纳${pname(p, l)}辞任本公司董事，自${d(v.lastDay ?? eff(c), l)}起生效。` } as Tri)[l],
      t("THAT the company secretary be instructed to file Form ND2A and update the register of directors, and the Company's bankers be notified.", "議決指示公司秘書提交表格ND2A及更新董事登記冊，並通知本公司往來銀行。", "议决指示公司秘书提交表格ND2A及更新董事登记册，并通知本公司往来银行。")[l]];
    case "hk.changeSecretary": case "hk.transferIn": return [
      ({ en: `THAT ${c.firm.legalName} be and is hereby appointed as company secretary of the Company with effect from ${d(eff(c), l)}.`, tc: `議決委任${c.firm.legalNameZh ?? c.firm.legalName}為本公司之公司秘書，自${d(eff(c), l)}起生效。`, sc: `议决委任${c.firm.legalNameZh ?? c.firm.legalName}为本公司之公司秘书，自${d(eff(c), l)}起生效。` } as Tri)[l],
      ...(c.pb.id === "hk.transferIn" ? [({ en: `THAT the registered office of the Company be changed to ${c.firm.address} with effect from ${d(eff(c), l)}.`, tc: `議決將本公司註冊辦事處更改為${c.firm.address}，自${d(eff(c), l)}起生效。`, sc: `议决将本公司注册办事处更改为${c.firm.address}，自${d(eff(c), l)}起生效。` } as Tri)[l]] : [])];
    case "hk.changeOffice": return [({ en: `THAT the registered office of the Company be changed to ${v.newAddr ?? ""} with effect from ${d(eff(c), l)}.`, tc: `議決將本公司註冊辦事處更改為${v.newAddr ?? ""}，自${d(eff(c), l)}起生效。`, sc: `议决将本公司注册办事处更改为${v.newAddr ?? ""}，自${d(eff(c), l)}起生效。` } as Tri)[l],
      t("THAT the company secretary be authorised to file Form NR1 with the Companies Registry.", "議決授權公司秘書向公司註冊處提交表格NR1。", "议决授权公司秘书向公司注册处提交表格NR1。")[l]];
    case "hk.changeName": return [({ en: `THAT the name of the Company be changed from "${co}" to "${v.newName ?? ""}".`, tc: `議決將本公司名稱由「${co}」更改為「${v.newName ?? ""}」。`, sc: `议决将本公司名称由「${co}」更改为「${v.newName ?? ""}」。` } as Tri)[l]];
    case "hk.allotShares": return [({ en: `THAT the directors be authorised to allot shares as follows: ${v.allotmentDetails ?? ""}, credited as fully paid, and that share certificates be issued.`, tc: `議決授權董事按以下方式配發股份：${v.allotmentDetails ?? ""}，入賬列為繳足，並發出股票。`, sc: `议决授权董事按以下方式配发股份：${v.allotmentDetails ?? ""}，入账列为缴足，并发出股票。` } as Tri)[l]];
    case "hk.transferShares": return [({ en: `THAT the transfer of shares described as follows be approved and registered upon due stamping: ${v.transferDetails ?? ""}.`, tc: `議決批准並於妥為加蓋印花後登記以下股份轉讓：${v.transferDetails ?? ""}。`, sc: `议决批准并于妥为加盖印花后登记以下股份转让：${v.transferDetails ?? ""}。` } as Tri)[l],
      t("THAT the existing share certificate be cancelled and a new certificate be issued to the transferee.", "議決註銷原有股票，並向承讓人發出新股票。", "议决注销原有股票，并向承让人发出新股票。")[l]];
    case "hk.agm": return [({ en: `THAT the audited financial statements and the directors' report for the period ended ${d(c.client.accountsLastMadeUpTo, l)} be received and approved.`, tc: `議決省覽及批准截至${d(c.client.accountsLastMadeUpTo, l)}止期間之經審核財務報表及董事報告。`, sc: `议决省览及批准截至${d(c.client.accountsLastMadeUpTo, l)}止期间之经审核财务报表及董事报告。` } as Tri)[l],
      ({ en: `THAT ${v.auditor ?? c.client.auditor ?? "the auditor"} be re-appointed as auditor of the Company and the directors be authorised to fix its remuneration.`, tc: `議決續聘${v.auditor ?? c.client.auditor ?? "核數師"}為本公司核數師，並授權董事釐定其酬金。`, sc: `议决续聘${v.auditor ?? c.client.auditor ?? "审计师"}为本公司审计师，并授权董事厘定其酬金。` } as Tri)[l]];
    case "hk.changeFye": return [({ en: `THAT the accounting reference date of the Company be changed to ${v.newFye ?? ""}.`, tc: `議決將本公司的會計參照日期更改為${v.newFye ?? ""}。`, sc: `议决将本公司的会计参照日期更改为${v.newFye ?? ""}。` } as Tri)[l]];
    case "hk.changeAuditor": return [({ en: `THAT ${v.newAuditor ?? ""} be appointed as auditor of the Company to hold office until the conclusion of the next general meeting.`, tc: `議決委任${v.newAuditor ?? ""}為本公司核數師，任期至下屆成員大會結束為止。`, sc: `议决委任${v.newAuditor ?? ""}为本公司审计师，任期至下届成员大会结束为止。` } as Tri)[l]];
    case "hk.amendArticles": return [({ en: `THAT the articles of association of the Company be amended as follows: ${v.articlesChange ?? ""}.`, tc: `議決按以下方式修訂本公司組織章程細則：${v.articlesChange ?? ""}。`, sc: `议决按以下方式修订本公司组织章程细则：${v.articlesChange ?? ""}。` } as Tri)[l]];
    case "hk.buyback": return [({ en: `THAT the Company buy back shares on the following terms: ${v.buybackDetails ?? ""}.`, tc: `議決本公司按以下條款回購股份：${v.buybackDetails ?? ""}。`, sc: `议决本公司按以下条款回购股份：${v.buybackDetails ?? ""}。` } as Tri)[l]];
    case "hk.bankSignatory": return [({ en: `THAT the bank mandate be amended as follows: ${v.bankMandate ?? ""}.`, tc: `議決按以下方式修訂銀行授權：${v.bankMandate ?? ""}。`, sc: `议决按以下方式修订银行授权：${v.bankMandate ?? ""}。` } as Tri)[l]];
    case "hk.dormant": return [t("THAT the Company be declared dormant under section 447 of the Companies Ordinance (Cap. 622).", "議決根據《公司條例》（第622章）第447條宣佈本公司為不活動公司。", "议决根据《公司条例》（第622章）第447条宣布本公司为不活动公司。")[l]];
    case "hk.deregistration": return [t("THAT an application be made to the Registrar of Companies for the deregistration of the Company, all members having agreed.", "議決在全體成員同意下，向公司註冊處處長申請撤銷本公司註冊。", "议决在全体成员同意下，向公司注册处处长申请撤销本公司注册。")[l]];
    case "hk.reserveDirector": return [({ en: `THAT ${pname(p, l)} be nominated as reserve director of the Company.`, tc: `議決提名${pname(p, l)}為本公司後備董事。`, sc: `议决提名${pname(p, l)}为本公司后备董事。` } as Tri)[l]];
    case "hk.incorporation": return [t("THAT the first directors, company secretary and registered office be as stated in the incorporation form; THAT share certificates be issued to the founder members; THAT a bank account be opened.", "議決首任董事、公司秘書及註冊辦事處以法團成立表格所載為準；議決向創辦成員發出股票；議決開立銀行賬戶。", "议决首任董事、公司秘书及注册办事处以法团成立表格所载为准；议决向创办成员发出股票；议决开立银行账户。")[l]];
    default: return [`THAT ${c.task.title}.`];
  }
}

const LBL = {
  boardRes: t("Written Resolutions of the Board of Directors", "董事會書面決議", "董事会书面决议"),
  membersRes: t("Written Resolutions of the Members", "成員書面決議", "成员书面决议"),
  specialRes: t("Special Resolution of the Members (passed as a written resolution)", "成員特別決議（以書面決議方式通過）", "成员特别决议（以书面决议方式通过）"),
  boardIntro: t("We, being all the directors of the Company, pass the following resolutions in writing under the articles of association of the Company:", "我們，即本公司全體董事，根據本公司組織章程細則以書面方式通過以下決議：", "我们，即本公司全体董事，根据本公司组织章程细则以书面方式通过以下决议："),
  membersIntro: t("We, being all the members of the Company entitled to vote, pass the following resolutions in writing under sections 548 to 564 of the Companies Ordinance (Cap. 622):", "我們，即本公司全體有權投票的成員，根據《公司條例》（第622章）第548至564條以書面方式通過以下決議：", "我们，即本公司全体有权投票的成员，根据《公司条例》（第622章）第548至564条以书面方式通过以下决议："),
  director: t("Director", "董事", "董事"), member: t("Member", "成員", "成员"),
  companyNo: t("Company number", "公司編號", "公司编号"), dated: t("Dated", "日期", "日期"),
  consent: t("Consent to Act as Director", "出任董事同意書", "出任董事同意书"),
  certificate: t("Share Certificate", "股票", "股票"),
};

function header(c: DocContext, title: Tri): Block[] {
  const out: Block[] = [];
  for (const l of langs(c)) {
    out.push({ t: "title", text: nm(c, l) });
    out.push({ t: "subtitle", text: `${LBL.companyNo[l]}: ${c.client.companyNumber ?? "—"}  ·  ${title[l]}` });
  }
  return out;
}

export function boardResolution(c: DocContext): Block[] {
  const blocks = header(c, LBL.boardRes);
  for (const l of langs(c)) {
    blocks.push({ t: "p", text: LBL.boardIntro[l] });
    blocks.push({ t: "list", items: resolutionClauses(c, l), numbered: true });
  }
  blocks.push({ t: "p", text: `${LBL.dated.en}: ${fmtDate(c.today)}` });
  blocks.push({ t: "sign", names: c.directors.map((x) => ({ name: x.person.nameEn, caption: langs(c).map((l) => LBL.director[l]).join(" / "), field: `sign:${x.personId}` })) });
  return blocks;
}

export function membersResolution(c: DocContext, special: boolean): Block[] {
  const blocks = header(c, special ? LBL.specialRes : LBL.membersRes);
  for (const l of langs(c)) {
    blocks.push({ t: "p", text: LBL.membersIntro[l] });
    blocks.push({ t: "list", items: resolutionClauses(c, l), numbered: true });
  }
  const seen = new Set<string>();
  blocks.push({ t: "sign", names: c.members.filter((m) => (seen.has(m.personId) ? false : (seen.add(m.personId), true))).map((m) => ({ name: m.name, caption: `${langs(c).map((l) => LBL.member[l]).join(" / ")} (${m.quantity.toLocaleString("en-US")} ${m.className})`, field: `sign:${m.personId}` })) });
  return blocks;
}

export function consentToAct(c: DocContext): Block[] {
  const p = c.person;
  const blocks = header(c, LBL.consent);
  for (const l of langs(c)) {
    blocks.push({ t: "p", text: ({ en: `I, ${pname(p, "en")}, consent to act as a director of ${nm(c, "en")} with effect from ${d(eff(c), "en")}, and confirm that I have attained the age of 18 years.`, tc: `本人${pname(p, "tc")}同意出任${nm(c, "tc")}董事，自${d(eff(c), "tc")}起生效，並確認本人已年滿18歲。`, sc: `本人${pname(p, "sc")}同意出任${nm(c, "sc")}董事，自${d(eff(c), "sc")}起生效，并确认本人已年满18岁。` } as Tri)[l] });
  }
  blocks.push({ t: "sign", names: [{ name: p?.nameEn ?? "", caption: "Director / 董事", field: p ? `sign:${p.id}` : undefined }] });
  return blocks;
}

export function shareCertificate(c: DocContext): Block[] {
  const blocks: Block[] = [];
  const holders = c.members.length ? c.members : [];
  holders.forEach((m, i) => {
    if (i > 0) blocks.push({ t: "pagebreak" });
    blocks.push(...header(c, LBL.certificate));
    blocks.push({ t: "p", text: `Certificate No. ${String(i + 1).padStart(3, "0")}` });
    blocks.push({ t: "p", text: `This is to certify that ${m.name}${m.nameZh ? ` (${m.nameZh})` : ""} is the registered holder of ${m.quantity.toLocaleString("en-US")} ${m.className} shares in the above-named company, subject to its articles of association.` });
    blocks.push({ t: "p", text: `茲證明${m.nameZh ?? m.name}為上述公司${m.quantity.toLocaleString("en-US")}股${m.className === "Ordinary" ? "普通股" : m.className}的登記持有人，受公司組織章程細則規限。` });
    blocks.push({ t: "sign", names: c.directors.slice(0, 2).map((x) => ({ name: x.person.nameEn, caption: "Director / 董事", field: `sign:${x.personId}` })) });
  });
  return blocks;
}

export function instrumentOfTransfer(c: DocContext): Block[] {
  const v = c.values;
  return [
    ...header(c, t("Instrument of Transfer", "轉讓文書", "转让文书")),
    { t: "p", text: `Transfer details: ${v.transferDetails ?? ""}` },
    { t: "p", text: "The transferor, in consideration of the sum stated above paid by the transferee, transfers to the transferee the shares described, to hold unto the transferee, subject to the conditions on which the transferor held them; and the transferee agrees to take the shares subject to the same conditions." },
    { t: "p", text: "轉讓人在承讓人支付上述代價後，將上述股份轉讓予承讓人，承讓人按轉讓人持有該等股份時的相同條件接受該等股份。" },
    { t: "small", text: "Stamp duty: 0.1% of the higher of consideration and value on each of the bought and sold notes (0.2% in total), plus HK$5 on this instrument. Stamp within 30 days (2 days for contract notes executed in Hong Kong). Verify with the company secretary." },
    { t: "sign", names: [{ name: "Transferor", caption: "Transferor / 轉讓人", field: "sign:transferor" }, { name: "Transferee", caption: "Transferee / 承讓人", field: "sign:transferee" }] },
  ];
}

export function contractNotes(c: DocContext): Block[] {
  return [
    ...header(c, t("Bought and Sold Notes", "買賣單據", "买卖单据")),
    { t: "p", text: `Shares: ${c.values.transferDetails ?? ""}` },
    { t: "h", text: "Bought Note / 買入單據" }, { t: "sign", names: [{ name: "Transferee", caption: "Buyer / 買方", field: "sign:transferee" }] },
    { t: "h", text: "Sold Note / 賣出單據" }, { t: "sign", names: [{ name: "Transferor", caption: "Seller / 賣方", field: "sign:transferor" }] },
  ];
}

export function engagementLetter(c: DocContext): Block[] {
  return [
    { t: "title", text: c.firm.legalName }, { t: "subtitle", text: `${c.firm.address} · TCSP licence ${c.firm.tcspLicence}` },
    { t: "h", text: `Engagement letter: ${c.client.nameEn}` },
    { t: "p", text: `We are pleased to act as company secretary and to provide a registered office address for ${c.client.nameEn}${c.client.companyNumber ? ` (company number ${c.client.companyNumber})` : ""} from the date of this letter, on the terms below.` },
    { t: "list", items: [
      "Services: company secretary, registered office, statutory registers, annual return and statutory filings, and other work you instruct us on, each quoted before we start.",
      "Customer due diligence: as a licensed trust or company service provider we must identify and verify the company, its directors and significant controllers before acting, and keep records for at least 5 years after the relationship ends (AMLO Cap. 615).",
      "Fees: as quoted per task; invoices are issued with each request, payable as stated on the invoice.",
      "Your responsibilities: to give us complete and accurate information promptly and to tell us of changes in directors, shareholders, controllers and addresses.",
      "Data: we handle personal data under the Personal Data (Privacy) Ordinance (Cap. 486).",
      "Termination: either side may end this engagement by 30 days' written notice.",
    ] },
    { t: "sign", names: [{ name: c.firm.legalName, caption: "For and on behalf of the firm" }, ...c.directors.slice(0, 1).map((x) => ({ name: x.person.nameEn, caption: `For and on behalf of ${c.client.nameEn}`, field: `sign:${x.personId}` }))] },
  ];
}

export function scrNotice(c: DocContext): Block[] {
  return [...header(c, t("Notice to Registrable Person", "致須登記人士通知", "致须登记人士通知")),
    { t: "p", text: `Under Part 12, Division 2 of the Companies Ordinance (Cap. 622), the Company records the following particulars in its significant controllers register: ${c.values.controllerDetails ?? ""}. Please confirm they are correct within 7 days.` }];
}

export function registerOfDirectors(c: DocContext): Block[] {
  return [...header(c, t("Register of Directors", "董事登記冊", "董事登记册")),
    { t: "table", head: ["Name", "Chinese name", "Correspondence address", "Appointed"], rows: c.directors.map((x) => [x.person.nameEn, x.person.nameZh ?? "", x.person.correspondenceAddress ?? c.client.regOfficeEn ?? "", x.fromDate]), widths: [130, 80, 190, 67] }];
}

export function registerOfMembers(c: DocContext): Block[] {
  return [...header(c, t("Register of Members", "成員登記冊", "成员登记册")),
    { t: "table", head: ["Member", "Class", "Shares", "%"], rows: c.members.map((m) => [m.name + (m.nameZh ? ` ${m.nameZh}` : ""), m.className, m.quantity.toLocaleString("en-US"), `${m.percent}%`]), widths: [220, 90, 90, 67] }];
}

export const TEMPLATES: Record<string, (c: DocContext) => Block[]> = {
  "tpl:board-resolution": boardResolution,
  "tpl:first-board-resolution": boardResolution,
  "tpl:members-written-resolution": (c) => membersResolution(c, false),
  "tpl:members-special-resolution": (c) => membersResolution(c, true),
  "tpl:consent-to-act": consentToAct,
  "tpl:share-certificate": shareCertificate,
  "tpl:instrument-of-transfer": instrumentOfTransfer,
  "tpl:contract-notes": contractNotes,
  "tpl:engagement-letter": engagementLetter,
  "tpl:scr-notice": scrNotice,
  "tpl:register-directors": registerOfDirectors,
  "tpl:register-members": registerOfMembers,
};

// ---------- Mainland China, Macau, Taiwan ----------
const eff2 = (c: DocContext) => c.task.effectiveDate ?? c.values.effDate ?? c.today;

function cnClauses(c: DocContext): string[] {
  const v = c.values, p = c.person, d0 = fmtDate(eff2(c), "sc"), name = p ? (p.nameZh ? `${p.nameZh}（${p.nameEn}）` : p.nameEn) : "";
  switch (c.pb.id) {
    case "cn.changeLegalRep": return [`同意变更公司法定代表人为${name}，自${d0}起生效。`, "授权公司办理相关变更登记手续，并更换营业执照。"];
    case "cn.changeOfficers": return [`同意委任${name}为公司董事，自${d0}起生效。`, "授权公司于三十日内向登记机关办理备案。"];
    case "cn.changeAddress": return [`同意将公司住所变更为${v.cnNewAddress ?? ""}，自${d0}起生效。`, "同意相应修改公司章程，并办理变更登记。"];
    case "cn.changeCapital": return [`同意变更公司注册资本及出资安排：${v.cnCapitalChange ?? ""}。`, "同意相应修改公司章程；如属减资，依法通知债权人并公告。"];
    case "cn.equityTransfer": return [`同意以下股权转让：${v.cnEquityTransfer ?? ""}。`, "其他股东放弃优先购买权（如适用），并同意修改公司章程及办理变更登记。"];
    default: return [c.task.title];
  }
}

export function cnResolution(c: DocContext): Block[] {
  const nameSc = c.client.nameSc ?? c.client.nameEn;
  const uscc = (c.client.jurisdictionData as { uscc?: string }).uscc ?? c.client.companyNumber ?? "";
  const single = new Set(c.members.map((m) => m.personId)).size <= 1;
  return [
    { t: "title", text: nameSc }, { t: "subtitle", text: `统一社会信用代码：${uscc}  ·  ${single ? "股东决定" : "股东会决议"}` },
    { t: "p", text: `${single ? "本公司唯一股东" : "本公司股东会"}依据《中华人民共和国公司法》及公司章程，作出如下${single ? "决定" : "决议"}：` },
    { t: "list", items: cnClauses(c), numbered: true },
    { t: "p", text: `日期：${fmtDate(c.today, "sc")}` },
    { t: "sign", names: [...new Map(c.members.map((m) => [m.personId, m])).values()].map((m) => ({ name: m.name, caption: "股东（签字/盖章）", field: `sign:${m.personId}` })) },
    { t: "small", text: "The English translation is for reference; the Chinese text prevails for filing with the market regulator." },
  ];
}

function moClauses(c: DocContext): [string, string][] {
  const v = c.values, p = c.person;
  switch (c.pb.id) {
    case "mo.changeAdministrators": return [[`Deliberado nomear ${p?.nameEn ?? ""} como administrador da sociedade.`, `議決委任${p?.nameZh ?? p?.nameEn ?? ""}為公司行政管理機關成員。`]];
    case "mo.quotaTransfer": return [[`Deliberado consentir na cessão de quota: ${v.moQuotaTransfer ?? ""}.`, `議決同意以下股的轉讓：${v.moQuotaTransfer ?? ""}。`]];
    case "mo.changeOffice": return [[`Deliberado transferir a sede da sociedade para ${v.newAddr ?? ""}.`, `議決將公司住所遷往${v.newAddr ?? ""}。`]];
    case "mo.amendArticles": return [[`Deliberado alterar os estatutos: ${v.articlesChange ?? ""}.`, `議決修改公司章程：${v.articlesChange ?? ""}。`]];
    case "mo.approveAccounts": return [["Deliberado aprovar o relatório e as contas do exercício.", "議決通過年度報告及帳目。"]];
    default: return [[c.task.title, c.task.title]];
  }
}

export function moActa(c: DocContext): Block[] {
  return [
    { t: "title", text: `${c.client.nameEn}${c.client.nameTc ? ` ${c.client.nameTc}` : ""}` },
    { t: "subtitle", text: `Registo n.º ${c.client.companyNumber ?? ""}  ·  Acta da Assembleia Geral / 股東會會議錄` },
    { t: "p", text: `Aos ${fmtDate(c.today)}, reuniram-se os sócios representando a totalidade do capital social, que deliberaram por unanimidade: / 全體股東出席，一致議決：` },
    { t: "list", items: moClauses(c).map(([pt, tc]) => `${pt}\n${tc}`), numbered: true },
    { t: "sign", names: [...new Map(c.members.map((m) => [m.personId, m])).values()].map((m) => ({ name: m.name, caption: "Sócio / 股東", field: `sign:${m.personId}` })) },
    { t: "small", text: "Signatures on documents for the Commercial Registry may need notarial recognition. / 提交商業登記局的文件簽名或須經公證認定。" },
  ];
}

function twClauses(c: DocContext): string[] {
  const v = c.values, p = c.person, name = p ? (p.nameZh ?? p.nameEn) : "";
  switch (c.pb.id) {
    case "tw.changeDirectors": return [`經全體股東同意，選任${name}為本公司董事，自${fmtDate(eff2(c), "tc")}起生效。`];
    case "tw.changeResponsiblePerson": return [`經全體股東同意，推選${name}為本公司代表人，自${fmtDate(eff2(c), "tc")}起生效。`];
    case "tw.changeAddress": return [`經全體股東同意，本公司所在地變更為${v.newAddr ?? ""}。`];
    case "tw.capitalIncrease": return [`經全體股東同意，本公司辦理增資：${v.twCapitalIncrease ?? ""}，並修正章程。`];
    default: return [c.task.title];
  }
}

export function twResolution(c: DocContext): Block[] {
  const ubn = (c.client.jurisdictionData as { ubn?: string }).ubn ?? c.client.companyNumber ?? "";
  return [
    { t: "title", text: c.client.nameTc ?? c.client.nameEn }, { t: "subtitle", text: `統一編號：${ubn}  ·  股東同意書` },
    { t: "p", text: "本公司全體股東依公司法及章程規定，同意下列事項：" },
    { t: "list", items: twClauses(c), numbered: true },
    { t: "p", text: `中華民國${Number(c.today.slice(0, 4)) - 1911}年${Number(c.today.slice(5, 7))}月${Number(c.today.slice(8, 10))}日` },
    { t: "sign", names: [...new Map(c.members.map((m) => [m.personId, m])).values()].map((m) => ({ name: m.name, caption: "股東（簽名蓋章）", field: `sign:${m.personId}` })) },
  ];
}

TEMPLATES["tpl:cn-resolution"] = cnResolution;
TEMPLATES["tpl:mo-acta"] = moActa;
TEMPLATES["tpl:tw-resolution"] = twResolution;
