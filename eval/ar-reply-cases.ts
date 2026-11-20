// Frozen test set for the reply reader (UHY pilot brief, "Test sets before shipping"): fictional
// client replies in English, Traditional and Simplified Chinese with the expected reading agreed
// before the first live run. Modelled on the kinds of reply a company secretarial firm gets; no real
// client, person or document. Run with scripts/eval-ar-replies.ts after every prompt or model
// change. Add cases (from recorded defects, rewritten as fiction); never edit an expectation to fit
// a model's answer. Rule set by the owner on 19 November, after the first run: when someone who is both
// an officer and a member changes name or address, that is two changes, one for each register (four
// cases updated; a passport number is an officer's detail only). On 20 November the owner decided the
// year of a date written without one is the model's judgement from context; three cases around the
// turn of the year were added before the run that first used that rule. Not covered yet: image-only scans, which need a rendered fixture.
import type { Expected } from "./ar-reply-score";

export type CaseAttachment =
  | { filename: string; kind: "pdf"; lines: string[] }
  | { filename: string; kind: "unreadable"; mime: string };
export type ReplyCase = {
  id: string; lang: "en" | "tc" | "sc"; note: string; from: string; fromName: string; subject?: string; text: string;
  /** When the email was sent, if not the usual 25 November 2026 (for dates whose year depends on it). */
  receivedAt?: string;
  earlier?: { direction: "in" | "out"; text: string }[]; attachments?: CaseAttachment[]; expect: Expected;
};

/** The fictional company every case is about. */
export const CASE_COMPANY = {
  companyName: "Alpha Trading Limited", year: 2026, madeUpDate: "2026-11-20", today: "2026-11-25",
  particulars: {
    registeredOffice: "Unit 1, 1/F, Example Building, 1 Example Road, Kowloon", backupTakenAt: "2026-11-25T04:30:00.000Z",
    officers: [
      { role: "director" as const, name: "CHAN Tai Man", nameZh: "陳大文" },
      { role: "director" as const, name: "LEE Siu Ming", nameZh: "李小明" },
      { role: "secretary" as const, name: "Fictional Secretaries Limited", nameZh: null },
    ],
    members: [
      { name: "CHAN Tai Man", nameZh: "陳大文", className: "Ordinary", shares: 60 },
      { name: "LEE Siu Ming", nameZh: "李小明", className: "Ordinary", shares: 40 },
    ],
  },
};

/** The firm's request, sent before every reply. */
export const DISPATCH = "Dear Ms Chan,\n\nWe enclose the 2026 Annual Return of Alpha Trading Limited, made up to 20 November 2026. Please check it, arrange for Mr CHAN Tai Man to sign page 8 and return the signed original to us by 18 December 2026.\n\nPlease CONFIRM whether the Company has taken out any mortgages or charges as at the made-up date, and if so provide details.\n\nIf any of the Company's particulars have changed since last year, please let us know before signing.\n\nFictional Secretaries Limited";

const none = { about: "this_return" as const, charges: "none" as const, changes: [], signedPapers: [] };
const from = { from: "finance@alpha.example", fromName: "Ms Chan" };
const signedPdf = { filename: "AR-signed.pdf", kind: "pdf" as const, lines: ["FORM NAR1  ANNUAL RETURN", "Alpha Trading Limited", "Date of this return: 20 November 2026", "Signed: (signature) CHAN Tai Man, Director", "Date: 24 November 2026"] };

export const AR_REPLY_CASES: ReplyCase[] = [
  // ---- English
  { id: "en-plain-none", lang: "en", note: "Plain answer: no charges, nothing changed.", ...from,
    text: "Dear Ruby,\n\nThe company has no mortgages or charges. Nothing has changed since last year.\n\nRegards,\nMs Chan", expect: none },
  { id: "en-correct-no-charges-answer", lang: "en", note: "'All correct' does not answer the charges question.", ...from,
    text: "Hi Ruby,\n\nI've checked the return and all the details are correct. Mr Chan will sign it this week and I'll post it back.\n\nThanks,\nMs Chan",
    expect: { ...none, charges: "not_answered" } },
  { id: "en-has-charges-statement", lang: "en", note: "A mortgage, with a bank statement attached.", ...from,
    text: "Dear Ruby,\n\nYes, the company has a mortgage loan with Example Bank, taken out in August 2026. The outstanding amount was HK$3,000,000 at 31 October. Statement attached.\n\nNo other changes.\n\nMs Chan",
    attachments: [{ filename: "statement-oct.pdf", kind: "pdf", lines: ["Example Bank Limited", "Mortgage loan statement as at 31 October 2026", "Borrower: Alpha Trading Limited", "Outstanding balance: HKD 3,000,000.00"] }],
    expect: { ...none, charges: "has_charges", documents: ["bank_statement"] } },
  { id: "en-buried-resignation", lang: "en", note: "A director's resignation buried in a long, chatty email.", ...from,
    text: "Hi Ruby,\n\nSorry for the slow reply, we have been tied up with the stock take and then the Canton Fair, which went well by the way, lots of new buyers from the Middle East this year. Thanks for sending the return. I had a look and the share capital and the office are right. We don't have any mortgages or charges, the bank facility we talked about in the summer never went ahead.\n\nOne thing I should mention while I remember, Mr Lee stepped down from the board at the end of last month (31 October) because he is moving to Vancouver, though he is keeping his shares. Not sure if that matters for this form.\n\nAlso can you remind me when the business registration is due? No rush.\n\nBest,\nMs Chan",
    expect: { ...none, changes: [{ types: ["director_ceased"], subject: "lee", effectiveDate: "2026-10-31" }] } },
  { id: "en-new-director", lang: "en", note: "A new director with a date.", ...from,
    text: "Dear Ruby,\n\nNo charges to report. Please note Ms WONG Mei Ling joined the board as a director on 1 November 2026. Let me know what you need from her.\n\nMs Chan",
    expect: { ...none, changes: [{ types: ["director_appointed"], subject: "wong", effectiveDate: "2026-11-01" }] } },
  { id: "en-office-move", lang: "en", note: "Registered office moved; charges not mentioned.", ...from,
    text: "Dear Ruby,\n\nWe moved on 1 November. The company's registered office is now Room 808, 8/F, Sample Tower, 8 Sample Street, Hong Kong. Please update the return.\n\nMs Chan",
    expect: { ...none, charges: "not_answered", changes: [{ types: ["registered_office"], subject: "sample", effectiveDate: "2026-11-01" }] } },
  { id: "en-director-address", lang: "en", note: "A director's home address changed, no date given.", ...from,
    text: "Hi Ruby,\n\nNo mortgages or charges. One correction: Mr Chan has moved house. His address is now Flat 5, 5/F, Garden Court, 5 Garden Road, Hong Kong.\n\nMs Chan",
    expect: { ...none, changes: [{ types: ["officer_particulars"], subject: "chan", effectiveDate: null }, { types: ["member_particulars"], subject: "chan", effectiveDate: null }] } },
  { id: "en-share-transfer", lang: "en", note: "Shares transferred between the two members.", ...from,
    text: "Dear Ruby,\n\nNo charges. Mr Lee transferred 20 of his shares to Mr Chan on 5 October 2026, so Mr Chan now holds 80 and Mr Lee 20. The instrument of transfer was stamped last month.\n\nMs Chan",
    expect: { ...none, changes: [{ types: ["shares_transferred"], subject: "lee|chan", effectiveDate: "2026-10-05" }] } },
  { id: "en-other-topic", lang: "en", note: "About something else entirely.", ...from, subject: "Audit report",
    text: "Hi Ruby,\n\nCould you send me a copy of last year's audit report? The bank is asking for it for our account review.\n\nThanks,\nMs Chan",
    expect: { about: "other", charges: "not_answered", changes: [], signedPapers: [] } },
  { id: "en-question-about-return", lang: "en", note: "A question about the return: about it, but no answers.", ...from,
    text: "Hi Ruby,\n\nWhich page does Mr Chan sign? And can he sign electronically or does it have to be ink?\n\nMs Chan",
    expect: { ...none, charges: "not_answered" } },
  { id: "en-signed-attached", lang: "en", note: "Signed return attached as a scan, charges answered.", ...from,
    text: "Dear Ruby,\n\nSigned annual return attached, original in the post today. The company has no mortgages or charges.\n\nMs Chan",
    attachments: [signedPdf], expect: { ...none, signedPapers: ["annual_return"] } },
  { id: "en-quoted-old-text", lang: "en", note: "New text says nothing; the quoted thread below mentions an old office move.", ...from,
    text: "Received with thanks, will revert shortly.\n\nMs Chan\n\n> From: Ruby\n> Please CONFIRM whether the Company has taken out any mortgages or charges.\n>\n> From: Ms Chan (last year)\n> We have moved our registered office to Unit 1, 1/F, Example Building, 1 Example Road, Kowloon and Mr Lee joined as director.",
    expect: { ...none, charges: "not_answered" } },
  { id: "en-confirms-existing", lang: "en", note: "Restating what is already on record is not a change.", ...from,
    text: "Dear Ruby,\n\nConfirming the directors are still Mr CHAN Tai Man and Mr LEE Siu Ming, and the registered office is still Unit 1, 1/F, Example Building, 1 Example Road, Kowloon. No mortgages or charges.\n\nMs Chan",
    expect: none },
  { id: "en-attachment-shows-change", lang: "en", note: "The email says no changes; the attached notice shows the office moved.", ...from,
    text: "Dear Ruby,\n\nNo changes on our side and no charges. Please see attached for your file.\n\nMs Chan",
    attachments: [{ filename: "notice.pdf", kind: "pdf", lines: ["NOTICE TO ALL SUPPLIERS AND SERVICE PROVIDERS", "Alpha Trading Limited", "With effect from 1 November 2026 the registered office of the Company", "is changed to Room 808, 8/F, Sample Tower, 8 Sample Street, Hong Kong.", "By order of the board"] }],
    expect: { ...none, changes: [{ types: ["registered_office"], subject: "sample", effectiveDate: "2026-11-01" }] } },
  { id: "en-second-message", lang: "en", note: "Second of two replies: only what the new email adds.", ...from,
    earlier: [{ direction: "in", text: "Dear Ruby,\n\nNo mortgages or charges. I will come back to you on whether anything else changed.\n\nMs Chan" }],
    text: "Dear Ruby,\n\nFurther to my email yesterday: Mr Lee renewed his passport in September, so his passport number has changed. Copy of the new passport attached.\n\nMs Chan",
    attachments: [{ filename: "lee-passport.pdf", kind: "pdf", lines: ["PASSPORT (fictional specimen)", "Surname: LEE   Given names: SIU MING", "Passport No: X0000000", "Date of issue: 12 SEP 2026"] }],
    expect: { ...none, charges: "not_answered", changes: [{ types: ["officer_particulars"], subject: "lee" }], documents: ["id_document"] } },
  { id: "en-name-change", lang: "en", note: "Company name changed.", ...from,
    text: "Dear Ruby,\n\nNo charges. The company changed its name to Alpha Global Trading Limited on 3 November 2026. Has the return been prepared in the new name?\n\nMs Chan",
    expect: { ...none, changes: [{ types: ["company_name"], subject: "alpha global", effectiveDate: "2026-11-03" }] } },
  { id: "en-unsigned-draft-back", lang: "en", note: "The draft sent back with a correction is not a signed paper.", ...from,
    text: "Hi Ruby,\n\nI'm returning the draft because Mr Lee's residential address on page 4 is out of date. He now lives at Flat 9, 9/F, Harbour Mansion, 9 Harbour Street, Kowloon. Please amend and resend for signing.\n\nMs Chan",
    attachments: [{ filename: "AR-draft.pdf", kind: "pdf", lines: ["FORM NAR1  ANNUAL RETURN (DRAFT)", "Alpha Trading Limited", "Signed: ____________________  Director", "Date: ____________________"] }],
    expect: { ...none, charges: "not_answered", changes: [{ types: ["officer_particulars"], subject: "lee" }, { types: ["member_particulars"], subject: "lee" }] } },
  { id: "en-allotment", lang: "en", note: "New shares issued.", ...from,
    text: "Dear Ruby,\n\nThe company has no charges. We issued 100 new ordinary shares to Mr Chan on 12 October 2026 at HK$1 each, so the issued share capital is now 200 shares.\n\nMs Chan",
    expect: { ...none, changes: [{ types: ["shares_allotted"], subject: "chan|100|shares", effectiveDate: "2026-10-12" }] } },
  { id: "en-word-attachment", lang: "en", note: "A Word attachment the model isn't given: only the email text is read.", ...from,
    text: "Dear Ruby,\n\nNo mortgages or charges. Our updated details are in the attached Word file.\n\nMs Chan",
    attachments: [{ filename: "updated-details.docx", kind: "unreadable", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }],
    expect: none },
  { id: "en-two-changes", lang: "en", note: "Two separate changes in one reply.", ...from,
    text: "Dear Ruby,\n\nTwo updates. First, Ms WONG Mei Ling was appointed a director on 1 November 2026. Second, Mr Lee resigned as director on the same day. No mortgages or charges.\n\nMs Chan",
    expect: { ...none, changes: [{ types: ["director_appointed"], subject: "wong", effectiveDate: "2026-11-01" }, { types: ["director_ceased"], subject: "lee", effectiveDate: "2026-11-01" }] } },
  { id: "en-year-turn-past", lang: "en", note: "Sent in January: '31 December' without a year is last year's.", ...from, receivedAt: "2027-01-05T03:00:00.000Z",
    text: "Dear Ruby,\n\nHappy new year. Sorry this is late. No mortgages or charges. I should have told you earlier that Mr Lee resigned as director on 31 December.\n\nMs Chan",
    expect: { ...none, changes: [{ types: ["director_ceased"], subject: "lee", effectiveDate: "2026-12-31" }] } },
  { id: "en-year-turn-future", lang: "en", note: "Sent in December: a director who 'will join on 2 January' joins next year.", ...from, receivedAt: "2026-12-20T03:00:00.000Z",
    text: "Dear Ruby,\n\nNo charges. For your planning, Ms WONG Mei Ling will join the board as a director on 2 January.\n\nMs Chan",
    expect: { ...none, changes: [{ types: ["director_appointed"], subject: "wong", effectiveDate: "2027-01-02" }] } },

  // ---- Traditional Chinese
  { id: "tc-plain-none", lang: "tc", note: "無押記、無變更。", from: "finance@alpha.example", fromName: "陳小姐",
    text: "Ruby 你好，\n\n公司並無任何按揭或押記，公司資料亦沒有任何變更。\n\n謝謝。\n陳小姐", expect: none },
  { id: "tc-director-resigned", lang: "tc", note: "董事辭任，附日期。", from: "finance@alpha.example", fromName: "陳小姐",
    text: "Ruby 你好，\n\n公司沒有按揭或押記。另外通知你，李小明先生已於2026年10月31日辭任董事一職。\n\n陳小姐",
    expect: { ...none, changes: [{ types: ["director_ceased"], subject: "lee|李小明", effectiveDate: "2026-10-31" }] } },
  { id: "tc-has-charges", lang: "tc", note: "有按揭貸款。", from: "finance@alpha.example", fromName: "陳小姐",
    text: "Ruby 你好，\n\n公司於2026年8月向樣本銀行借入按揭貸款港幣200萬元，以公司物業作抵押。其他資料沒有改變。\n\n陳小姐",
    expect: { ...none, charges: "has_charges" } },
  { id: "tc-office-move", lang: "tc", note: "註冊辦事處搬遷。", from: "finance@alpha.example", fromName: "陳小姐",
    text: "Ruby 你好，\n\n公司的註冊辦事處已於2026年11月1日遷往香港樣本街8號樣本大廈8樓808室，請更新周年申報表。公司沒有任何押記。\n\n陳小姐",
    expect: { ...none, changes: [{ types: ["registered_office"], subject: "808|樣本|sample", effectiveDate: "2026-11-01" }] } },
  { id: "tc-correct-no-charges-answer", lang: "tc", note: "「資料正確」並沒有回答押記問題。", from: "finance@alpha.example", fromName: "陳小姐",
    text: "Ruby 你好，\n\n申報表已核對，資料正確。陳先生會於本週簽署後寄回。\n\n陳小姐",
    expect: { ...none, charges: "not_answered" } },
  { id: "tc-other-topic", lang: "tc", note: "與周年申報表無關。", from: "finance@alpha.example", fromName: "陳小姐", subject: "商業登記",
    text: "Ruby 你好，\n\n想請問明年商業登記證續期的費用是多少？另外可否代辦？\n\n陳小姐",
    expect: { about: "other", charges: "not_answered", changes: [], signedPapers: [] } },
  { id: "tc-signed-no-attachment", lang: "tc", note: "說已簽署並寄出，但沒有附件：不算收到簽署文件。", from: "finance@alpha.example", fromName: "陳小姐",
    text: "Ruby 你好，\n\n周年申報表已由陳先生簽署，正本今天已寄出。公司沒有按揭或押記。\n\n陳小姐", expect: none },
  { id: "tc-director-address", lang: "tc", note: "董事住址變更。", from: "finance@alpha.example", fromName: "陳小姐",
    text: "Ruby 你好，\n\n公司沒有押記。陳大文先生上月搬家，新住址為香港花園道5號花園閣5樓5室，請更新。\n\n陳小姐",
    expect: { ...none, changes: [{ types: ["officer_particulars"], subject: "chan|陳大文", effectiveDate: null }, { types: ["member_particulars"], subject: "chan|陳大文", effectiveDate: null }] } },
  { id: "tc-share-transfer", lang: "tc", note: "股份轉讓。", from: "finance@alpha.example", fromName: "陳小姐",
    text: "Ruby 你好，\n\n李小明先生已於2026年10月5日將其20股普通股轉讓予陳大文先生。公司並無按揭或押記。\n\n陳小姐",
    expect: { ...none, changes: [{ types: ["shares_transferred"], subject: "lee|chan|李小明|陳大文", effectiveDate: "2026-10-05" }] } },
  { id: "tc-director-died", lang: "tc", note: "董事離世。", from: "finance@alpha.example", fromName: "陳小姐",
    text: "Ruby 你好，\n\n很遺憾通知你，李小明先生已於2026年10月2日離世。我們稍後會安排其股份的處理。公司沒有任何按揭或押記。\n\n陳小姐",
    expect: { ...none, changes: [{ types: ["director_ceased"], subject: "lee|李小明", effectiveDate: "2026-10-02" }] } },
  { id: "tc-year-turn-past", lang: "tc", note: "一月發出：「12月15日」沒有年份，指去年。", from: "finance@alpha.example", fromName: "陳小姐", receivedAt: "2027-01-04T03:00:00.000Z",
    text: "Ruby 你好，\n\n新年快樂。公司沒有按揭或押記。李小明先生已於12月15日辭任董事，之前忘了通知你。\n\n陳小姐",
    expect: { ...none, changes: [{ types: ["director_ceased"], subject: "lee|李小明", effectiveDate: "2026-12-15" }] } },

  // ---- Simplified Chinese
  { id: "sc-plain-none", lang: "sc", note: "无押记、无变更。", from: "admin@alpha.example", fromName: "李先生",
    text: "Ruby 你好，\n\n公司没有任何按揭或押记，公司资料也没有变化。\n\n谢谢。\n李", expect: none },
  { id: "sc-has-charges-partial", lang: "sc", note: "有抵押贷款，详情稍后提供。", from: "admin@alpha.example", fromName: "李先生",
    text: "Ruby 你好，\n\n公司目前有一笔以存货作抵押的银行贷款，具体金额和银行对账单我稍后发给你。其他没有变化。\n\n李",
    expect: { ...none, charges: "has_charges" } },
  { id: "sc-new-director", lang: "sc", note: "新任董事。", from: "admin@alpha.example", fromName: "李先生",
    text: "Ruby 你好，\n\n公司没有按揭或押记。王美玲女士已于2026年11月1日获委任为公司董事，请告知需要她提供哪些资料。\n\n李",
    expect: { ...none, changes: [{ types: ["director_appointed"], subject: "wong|王美玲", effectiveDate: "2026-11-01" }] } },
  { id: "sc-office-signed", lang: "sc", note: "办事处搬迁，并附已签署的申报表。", from: "admin@alpha.example", fromName: "李先生",
    text: "Ruby 你好，\n\n周年申报表已签署，扫描件见附件，正本今天寄出。公司没有任何按揭或押记。\n\n另外，公司注册办事处已于2026年10月15日迁至香港样本街8号样本大厦8楼808室。\n\n李",
    attachments: [signedPdf],
    expect: { ...none, changes: [{ types: ["registered_office"], subject: "808|样本|sample", effectiveDate: "2026-10-15" }], signedPapers: ["annual_return"] } },
  { id: "sc-fee-question", lang: "sc", note: "询问申报表费用：与申报表有关，但没有回答。", from: "admin@alpha.example", fromName: "李先生",
    text: "Ruby 你好，\n\n请问这次周年申报表的登记费是多少？如果逾期提交会加多少？\n\n李",
    expect: { ...none, charges: "not_answered" } },
  { id: "sc-mixed-language", lang: "sc", note: "中英夹杂。", from: "admin@alpha.example", fromName: "李先生",
    text: "Hi Ruby，\n\nAR 已经看过，no charges。FYI Mr Lee Siu Ming 已经在 10月31日 resign 了 director，shares 不变。\n\n李",
    expect: { ...none, changes: [{ types: ["director_ceased"], subject: "lee|李小明", effectiveDate: "2026-10-31" }] } },
  { id: "sc-other-topic", lang: "sc", note: "与周年申报表无关。", from: "admin@alpha.example", fromName: "李先生", subject: "银行开户",
    text: "Ruby 你好，\n\n我们想在香港再开一个银行账户，请问贵司可以协助准备开户文件吗？费用如何？\n\n李",
    expect: { about: "other", charges: "not_answered", changes: [], signedPapers: [] } },
  { id: "sc-member-address", lang: "sc", note: "股东地址变更。", from: "admin@alpha.example", fromName: "李先生",
    text: "Ruby 你好，\n\n公司没有押记。股东李小明的地址已更改为九龙海港街9号海港大厦9楼9室。\n\n李",
    expect: { ...none, changes: [{ types: ["officer_particulars"], subject: "lee|李小明", effectiveDate: null }, { types: ["member_particulars"], subject: "lee|李小明", effectiveDate: null }] } },
];
