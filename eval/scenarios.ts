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
];
