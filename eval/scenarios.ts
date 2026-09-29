// Live LLM evaluation scenarios (npm run eval:llm). Realistic client messages, including
// Cantonese, mainland Chinese, mixed language, changes of mind and misrouted information.
export type Scenario = {
  name: string;
  from: string;
  fromName: string;
  subject: string;
  text: string;
  attachments?: string[];
  /** Run these messages first (e.g. to open a task the scenario then changes). */
  before?: { text: string; subject?: string }[];
  expect: {
    language?: "en" | "tc" | "sc";
    clientKind?: "existing" | "new_prospect";
    startPlaybooks?: string[];         // exact set of new playbooks (excluding auto-added onboarding)
    actionTypes?: string[];            // must include each
    notActionTypes?: string[];
    fields?: Record<string, RegExp>;   // extracted on any new task
    personName?: RegExp;
  };
};

const DEMO = "director@kbtrading.example";
const STRANGER = "sam.investor@venture.example";

export const SCENARIOS: Scenario[] = [
  { name: "EN appoint director with date", from: DEMO, fromName: "CHAN Tai Man", subject: "New director",
    text: "Hi Karen, we'd like to add my business partner Wong Ka Man as a director from 15 October. Thanks, Tai Man",
    expect: { language: "en", clientKind: "existing", startPlaybooks: ["hk.appointDirector"], fields: { effDate: /2026-10-15/ }, personName: /wong ka man/i } },
  { name: "Cantonese office move + new director", from: DEMO, fromName: "CHAN Tai Man", subject: "搬寫字樓",
    text: "Karen，我哋下個月1號搬去觀塘鴻圖道88號12樓，另外想加我太太李小玲做董事。唔該晒！",
    expect: { language: "tc", startPlaybooks: ["hk.appointDirector", "hk.changeOffice"], fields: { effDate: /2026-10-01/ } } },
  { name: "Simplified Chinese share transfer", from: DEMO, fromName: "CHAN Tai Man", subject: "股份转让",
    text: "您好，李小玲准备把她持有的3000股全部转让给我，价格港币30万元，请帮忙办理，谢谢。",
    expect: { language: "sc", startPlaybooks: ["hk.transferShares"] } },
  { name: "Replace a director = resign + appoint", from: DEMO, fromName: "CHAN Tai Man", subject: "Board change",
    text: "Please record that I will step down as director at the end of October and Lee Siu Ling will take over from 1 November.",
    expect: { startPlaybooks: ["hk.appointDirector", "hk.resignDirector"] } },
  { name: "Status question only", from: DEMO, fromName: "CHAN Tai Man", subject: "Annual return?",
    text: "When is our next annual return due and is there anything you need from me?",
    expect: { actionTypes: ["ask_question"], notActionTypes: ["start_request"] } },
  { name: "Unsupported: bank account", from: DEMO, fromName: "CHAN Tai Man", subject: "Bank account",
    text: "Could you help us open a new USD account with HSBC for the company?",
    expect: { actionTypes: ["unsupported_request"], notActionTypes: ["start_request"] } },
  { name: "Unknown sender wants to incorporate", from: STRANGER, fromName: "Sam Lee", subject: "Setting up a company",
    text: "Hello, I'm looking to set up a new Hong Kong company for my fintech startup, called Nimbus Ledger Limited. Two founders, 50/50. What do you need from us?",
    expect: { clientKind: "new_prospect", startPlaybooks: ["hk.incorporation"] } },
  { name: "Unknown sender existing company change", from: STRANGER, fromName: "Sam Lee", subject: "Change of director",
    text: "Hi, I'm a director of Blue Harbour Trading Limited (company no. 3345678). We need to appoint a new director, Jane Doe, next week. Can you handle this?",
    expect: { clientKind: "new_prospect", startPlaybooks: ["hk.appointDirector"], personName: /jane doe/i } },
  { name: "Change of mind on appointee", from: DEMO, fromName: "CHAN Tai Man", subject: "Re: New director",
    before: [{ text: "Please appoint Wong Ka Man as a director from 15 October.", subject: "New director" }],
    text: "Sorry Karen, change of plan. Please appoint Ma Siu Fung instead of Ka Man. Same date.",
    expect: { actionTypes: ["change_request"], notActionTypes: ["start_request"] } },
  { name: "Cancellation", from: DEMO, fromName: "CHAN Tai Man", subject: "Re: office move",
    before: [{ text: "We are moving our registered office to 12/F, 88 Hung To Road, Kwun Tong from 1 November.", subject: "office move" }],
    text: "Hi Karen, the landlord pulled out so we're not moving after all. Please cancel.",
    expect: { actionTypes: ["cancel_request"], notActionTypes: ["start_request"] } },
  { name: "Info for an open task, with attachment", from: DEMO, fromName: "CHAN Tai Man", subject: "Re: New director",
    before: [{ text: "Please appoint Wong Ka Man as a director from 15 October.", subject: "New director" }],
    text: "Ka Man's details: HKID K987654(3). Home: Flat 12B, 88 Robinson Road, Mid-Levels. Correspondence address same as company. Email kaman.wong@example.com, mobile 9123 4567.",
    attachments: ["hkid_wong.jpg", "cle_bill_wong.pdf"],
    expect: { actionTypes: ["provide_information"], notActionTypes: ["start_request"] } },
  { name: "Mixed EN/Cantonese name change", from: DEMO, fromName: "CHAN Tai Man", subject: "改名",
    text: "Karen, 我哋想將公司改名做 KB Global Trading Limited，中文名九龍灣環球貿易有限公司。有冇問題？",
    expect: { language: "tc", startPlaybooks: ["hk.changeName"], fields: { newName: /KB Global Trading/i } } },
  { name: "Thanks only", from: DEMO, fromName: "CHAN Tai Man", subject: "Re: Annual return",
    text: "Thanks Karen, received with thanks!",
    expect: { notActionTypes: ["start_request", "unsupported_request", "cancel_request"] } },
  { name: "SC mainland founder incorporation", from: "zhang.wei@example.cn", fromName: "张伟", subject: "香港公司注册",
    text: "您好，我想在香港注册一家新公司做跨境电商，公司名叫环宇跨境贸易有限公司，我一个人做股东和董事。需要准备什么材料？费用多少？",
    expect: { language: "sc", clientKind: "new_prospect", startPlaybooks: ["hk.incorporation"] } },
  { name: "PRC client change legal representative", from: "liu.wei@qianhai.example", fromName: "刘伟", subject: "更换法定代表人",
    text: "你好，深圳前海港湾贸易有限公司的法定代表人要从我换成总经理李小玲，下个月生效，请安排。",
    expect: { language: "sc", clientKind: "existing", startPlaybooks: ["cn.changeLegalRep"] } },
  { name: "Taiwan client new director", from: "chihhao.lin@taipeiharbour.example", fromName: "林志豪", subject: "新增董事",
    text: "您好，台北港灣科技有限公司想新增一位董事王大明，11月1日起生效，請協助辦理變更登記。",
    expect: { language: "tc", clientKind: "existing", startPlaybooks: ["tw.changeDirectors"] } },
  { name: "Macau quota transfer", from: "maria.ferreira@baiavista.example", fromName: "Maria Ferreira", subject: "Quota transfer",
    text: "Hello, I'd like to transfer my quota in Baia Vista Comercio to LEE Siu Ling for MOP 50,000. Please prepare what's needed.",
    expect: { language: "en", clientKind: "existing", startPlaybooks: ["mo.quotaTransfer"] } },
  { name: "Office move plus new director", from: DEMO, fromName: "CHAN Tai Man", subject: "Two things",
    text: "Karen, two things: we're moving the registered office to Unit 1201, 12/F, Millennium City 5, 418 Kwun Tong Road from 1 December, and Lee Siu Ling will join the board as a director from the same date. Thanks",
    expect: { startPlaybooks: ["hk.appointDirector", "hk.changeOffice"], fields: { newAddr: /Millennium City/i } } },
  { name: "Allot new shares to an investor", from: DEMO, fromName: "CHAN Tai Man", subject: "New investor",
    text: "We're bringing in an investor, Brightwater Ventures Limited, who will subscribe for 2,000 new ordinary shares at HK$50 each. Please handle the paperwork.",
    expect: { startPlaybooks: ["hk.allotShares"] } },
  { name: "Close the company", from: DEMO, fromName: "CHAN Tai Man", subject: "Closing down",
    text: "We stopped trading in June and have no assets or debts left. We'd like to close Kowloon Bay Trading down properly. What's the process?",
    expect: { startPlaybooks: ["hk.deregistration"] } },
  { name: "Change financial year end", from: DEMO, fromName: "CHAN Tai Man", subject: "Year end",
    text: "Our auditor suggests moving the financial year end from 31 March to 31 December. Can you arrange it?",
    expect: { startPlaybooks: ["hk.changeFye"] } },
  { name: "Cantonese voice-note BR renewal", from: DEMO, fromName: "CHAN Tai Man", subject: "語音訊息",
    text: "喂Karen呀，我收到稅局嗰張商業登記續期通知呀，今次想一次過續三年，你幫手搞埋佢啦，唔該晒。",
    expect: { language: "tc", startPlaybooks: ["hk.brRenewal"], fields: { brTerm: /3/ } } },
  { name: "Register copy request", from: DEMO, fromName: "CHAN Tai Man", subject: "Register of members",
    text: "Could you send me a copy of our current register of members? The bank is asking for it.",
    expect: { notActionTypes: ["cancel_request"] } },
  { name: "Details for a different open task", from: DEMO, fromName: "CHAN Tai Man", subject: "Re: office move",
    before: [{ text: "Please appoint Wong Ka Man as a director from 15 October.", subject: "New director" }, { text: "We are also moving the registered office from 1 November; I'll send the address.", subject: "office move" }],
    text: "The new office address is Room 2305, 23/F, Harbour Centre, 25 Harbour Road, Wan Chai.",
    expect: { actionTypes: ["provide_information"], notActionTypes: ["start_request"] } },
  { name: "Mixed: status question plus new request", from: DEMO, fromName: "CHAN Tai Man", subject: "Quick ones",
    text: "Hi Karen, when is our annual return due this year? Also, I've moved house - my new residential address is Flat 8A, 3 Tai Hang Road. Please update the records.",
    expect: { actionTypes: ["ask_question"], startPlaybooks: ["hk.changeParticulars"] } },
];
