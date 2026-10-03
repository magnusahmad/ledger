// Drafting agent with deterministic checks: the email must carry the invoice number and
// upload link exactly. One regeneration, then a template fallback so staff always get a draft.
import type { Ctx } from "@/lib/ctx";
import type { Lang } from "@/db/schema";
import { callAgent, AgentError } from "./call";
import { DraftZ } from "./schemas";
import { DRAFT_SYSTEM } from "./prompts";
import { parseMoneyCents } from "@/domain/money-input";
import { getTask } from "@/domain/engine";
import { fmtDate, isIsoDate } from "@/domain/dates";

export type QuoteFacts = { title: string; supplied: string[]; needed: string[]; steps: string[]; caveats: string[]; lines: { description: string; amount: string }[]; totalFormatted: string; feeBasis?: "one_off" | "monthly" | "annual"; status: "proposed" };

export type ReplyFacts = {
  language: Lang;
  workStatus?: "proposed" | "awaiting_approval" | "started";
  /** "meeting": confirms what was agreed in person or by phone, rather than answering a message. */
  context?: "message" | "meeting" | "costs" | "chase" | "letter" | "change";
  recipientName: string;
  clientName: string;
  signOff: string;
  newRequests: { title: string; needed: string[]; onFile: string[]; alreadyReceived: string[]; deadline: string | null; notes?: string[] }[];
  quotes?: QuoteFacts[];
  updates: { title: string; received: string[]; stillNeeded: string[]; nextStep: string | null }[];
  changes: { title: string; change: string; nowNeeded: string[]; received?: string[] }[];
  cancellations: { taskId?: string; title: string; note: string; status?: "pending" | "completed" }[];
  questions: { question: string; facts: string; answerStatus?: "available" | "needs_staff" }[];
  clarifications: string[];
  invoice: { number: string; totalFormatted: string; lines: { description: string; amount: string }[]; terms: string; paymentInstructions: string | null } | null;
  uploadUrl: string | null;
  extraNotes?: string[];
};

export function draftProblems(f: ReplyFacts, body: string, opts: { claimBody?: string } = {}): string[] {
  const p: string[] = [];
  // Check model claims, not client quotations embedded by the application.
  if (f.workStatus && f.workStatus !== "started" && /(?:\b(?:have|has|already|we've)\s+(?:already\s+)?started\b|\bwork\s+has\s+begun\b|已(?:經|经)?(?:開始|开始|着手|著手))/.test(opts.claimBody ?? body)) p.push("Work is awaiting approval; do not claim it has started.");
  if (f.invoice && !body.includes(f.invoice.number)) p.push(`The body must include the invoice number ${f.invoice.number} exactly.`);
  if (f.invoice && !hasInvoiceTotal(body, f.invoice.totalFormatted)) p.push(`The body must state the invoice total ${f.invoice.totalFormatted}.`);
  if (f.uploadUrl && !body.includes(f.uploadUrl)) p.push(`The body must include the upload link ${f.uploadUrl} exactly.`);
  if (!body.trim()) p.push("The body is empty.");
  for (const email of new Set(f.changes.flatMap(c => (c.received ?? []).flatMap(v => v.match(/[\w.+-]+@[\w.-]+/g) ?? [])))) {
    if (!body.toLowerCase().includes(email.toLowerCase())) p.push(`Acknowledge the supplied contact email ${email}; it is not still missing.`);
  }
  if (f.invoice && /within \d+ days|\d+天[內内]付款/.test(f.invoice.terms) && /(?:payment|pay|paid).{0,45}before.{0,30}(?:start|work|proceed)|(?:confirm|confirmation).{0,20}(?:and\s+)?(?:pay|payment).{0,35}(?:start|work|proceed)|(?:確認|确认).{0,8}(?:及|和|並|并).{0,8}付款後|(?:確認|确认).{0,8}(?:及|和|並|并).{0,8}付款后/i.test(body)) p.push("This invoice has credit terms; do not make payment a condition of starting work.");
  for (const date of new Set(f.newRequests.flatMap(r => (r.notes ?? []).flatMap(n => n.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [])).filter(isIsoDate))) {
    if (!mentionsDate(body, date, f.language)) p.push(`Acknowledge the supplied proposed/instruction date ${date} without claiming the event has occurred.`);
  }
  return p;
}

function mentionsDate(body: string, date: string, language: Lang) {
  if (body.includes(date) || body.includes(fmtDate(date, language))) return true;
  const [year, month, day] = date.split("-").map(Number);
  const name = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  return new RegExp(`\\b${day}\\s+${name}\\s+${year}\\b|\\b${name}\\s+${day},?\\s+${year}\\b|${year}年\\s*${month}月\\s*${day}[日號号]`, "i").test(body);
}

function hasInvoiceTotal(body: string, total: string): boolean {
  const expected = /^(HK\$|[A-Z]{3})\s*(.+)$/.exec(total);
  if (!expected) return false;
  // A complete money token, not a numeric substring. Preserve cents and currency
  // while allowing ordinary grouping, whitespace and equivalent trailing zeros.
  const currency = expected[1] === "HK$" ? "(?:HK\\$|HKD)" : expected[1];
  const token = new RegExp(`(?<![A-Za-z0-9_$-])${currency}\\s*((?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{1,2})?)(?![A-Za-z0-9]|[.,]\\d)`, "gi");
  try {
    const cents = parseMoneyCents(expected[2]);
    for (const match of body.matchAll(token)) if (parseMoneyCents(match[1]) === cents) return true;
  } catch { return false; }
  return false;
}

export async function draftEmail(ctx: Ctx, facts: ReplyFacts, opts: { messageId?: string | null; taskId?: string | null; purpose?: string } = {}): Promise<{ subject: string; body: string; source: "agent" | "template" }> {
  // Stored draft facts are a preview. Refresh consequential wording from firm-scoped state.
  facts = { ...facts, cancellations: await Promise.all(facts.cancellations.map(async c => c.taskId ? { ...c, status: (await getTask(ctx, c.taskId)).status === "cancelled" ? "completed" as const : "pending" as const } : { ...c, status: c.status ?? "pending" })) };
  // There is no approved answer to synthesize. Do not ask the model to invent one.
  if (facts.questions.some(q => q.answerStatus === "needs_staff")) return { ...templateEmail(facts), source: "template" };
  let extra = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const d = await callAgent(ctx, {
        agent: "draft", system: DRAFT_SYSTEM, messageId: opts.messageId, taskId: opts.taskId,
        user: `${opts.purpose ? `Purpose: ${opts.purpose}\n\n` : ""}FACTS:\n\`\`\`json\n${JSON.stringify(facts, null, 1)}\n\`\`\`${extra}`,
        schema: DraftZ,
      });
      // The model places the financial section; the application renders its exact
      // amounts, localized terms and bank details from authoritative facts.
      const body = d.body.replaceAll("{{invoice}}", financeBlock(facts)).replaceAll("{{cancellations}}", cancellationBlock(facts)).replaceAll("{{quotes}}", quoteBlock(facts));
      const problems = draftProblems(facts, body, { claimBody: d.body });
      for (const [required, token] of [[facts.cancellations.length > 0, "{{cancellations}}"], [!!facts.quotes?.length, "{{quotes}}"]] as const) {
        if (required && d.body.split(token).length !== 2) problems.push(`Insert ${token} exactly once; Harbourline renders this block from reviewed facts.`);
      }
      const cancellationProse = d.body.replaceAll("{{cancellations}}", "").split("\n").filter(line => !/^(?:(?:Regarding|On) (?:the )?cancellation(?: request)?|(?:(?:此外|另外)[，,]\s*)?(?:關於|关于|有關|有关)取消(?:服務|服务)?(?:的)?(?:事項|事项|事宜|安排)?(?:如下)?)[：:]?\s*$/i.test(line.trim())).join("\n");
      if (facts.cancellations.length && /\bcancel(?:led|ed|lation|ling|ing)?\b|取消|撤銷|撤销/i.test(cancellationProse)) problems.push("Use only {{cancellations}} for cancellation wording, not a separate status claim.");
      if (facts.quotes?.length && /(?:HK\$|HKD|USD|CNY|RMB|港[幣币]|人民[幣币]|\$)\s*\d/i.test(d.body.replaceAll("{{quotes}}", "").replaceAll("{{invoice}}", ""))) problems.push("Keep all quoted amounts inside {{quotes}}; do not introduce a separate price.");
      if (problems.length === 0) return { ...d, body, source: "agent" };
      extra = `\n\nYour previous draft had problems:\n- ${problems.join("\n- ")}\nFix them.`;
    } catch (e) {
      if (!(e instanceof AgentError)) throw e;
      break;
    }
  }
  return { ...templateEmail(facts), source: "template" };
}

const T = {
  en: {
    hi: (n: string) => `Dear ${n},`,
    thanks: "Thank you for your message.",
    thanksMeeting: "Thank you for meeting with us. As agreed, we will take care of the following.",
    thanksChange: "We will take care of the following additional or replacement work. Please review the separate quote below.",
    thanksCosts: "We have paid the following on your behalf. Please find our invoice attached.",
    thanksChase: "A quick reminder: we still need a few things from you to complete the following.",
    thanksLetter: "We have received the attached letter for the company. Here is what needs to happen next.",
    newReq: (t: string) => `${t}:`,
    need: "To get this done, please send us:",
    onFile: "We already hold on file (no need to send again):",
    got: "Already received with your message:",
    due: (d: string) => `Statutory deadline: ${d}.`,
    upd: (t: string) => `${t}: thank you, we have received`,
    still: "Still outstanding:",
    allIn: "We now have everything we need for this and will proceed.",
    chg: (t: string, c: string) => `${t}: noted, ${c}.`,
    cancel: (t: string) => `${t}: we will cancel this as requested.`,
    cancelPending: (title: string) => `${title}: we have received your request to cancel this. It has not yet been cancelled.`,
    cancelCompleted: (title: string) => `${title}: this has been cancelled.`,
    holding: "We will check your question and get back to you.",
    quote: "Proposed quotation for review",
    quoteNext: "Please confirm the scope and quotation before service work proceeds.",
    supplied: "Details supplied",
    scope: "Proposed scope",
    caveats: "Assumptions to confirm",
    proposedTotal: "Proposed total",
    monthly: "per month",
    annual: "per year",
    instructions: "Your instructions",
    changedDetails: "we have recorded the following changes",
    q: "On your question:",
    ask: "Could you also help us with the following?",
    inv: (n: string, a: string) => `Our invoice ${n} for ${a} is attached.`,
    terms: (t: string) => `Payment terms: ${t}.`,
    pay: "Payment details (please quote the invoice number as the reference):",
    link: "You can upload documents securely here:",
    subject: (c: string) => `${c}: your request`,
  },
  tc: {
    hi: (n: string) => `${n}您好：`,
    thanks: "多謝您的訊息。",
    thanksMeeting: "多謝您抽空與我們會面。按我們商討的安排，我們會跟進以下事項。",
    thanksChange: "我們會跟進以下新增或替代事項，請查閱下列獨立報價。",
    thanksCosts: "我們已代您支付以下費用，隨函附上發票。",
    thanksChase: "溫馨提示：為完成以下事項，我們仍需您提供部分資料。",
    thanksLetter: "我們收到隨附給公司的信件，以下是接下來需要處理的事項。",
    newReq: (t: string) => `${t}：`,
    need: "為辦理此事，請提供：",
    onFile: "我們已存檔以下資料（毋須再次提供）：",
    got: "已從您的訊息中收到：",
    due: (d: string) => `法定期限：${d}。`,
    upd: (t: string) => `${t}：多謝，我們已收到`,
    still: "尚欠：",
    allIn: "我們已收齊所需資料，會隨即跟進。",
    chg: (t: string, c: string) => `${t}：已知悉，${c}。`,
    cancel: (t: string) => `${t}：我們會按您的指示取消。`,
    cancelPending: (title: string) => `${title}：我們已收到您的取消要求，此事項尚未取消。`,
    cancelCompleted: (title: string) => `${title}：此事項已取消。`,
    holding: "關於您的查詢，我們會確認後再回覆您。",
    quote: "建議報價，待確認",
    quoteNext: "請先確認服務範圍及報價，我們才會跟進服務工作。",
    supplied: "已提供的資料",
    scope: "建議服務範圍",
    caveats: "待確認的假設",
    proposedTotal: "建議總額",
    monthly: "每月",
    annual: "每年",
    instructions: "您的指示",
    changedDetails: "已記錄以下更改",
    q: "關於您的查詢：",
    ask: "另請協助提供以下資料：",
    inv: (n: string, a: string) => `隨函附上發票 ${n}，金額 ${a}。`,
    terms: (t: string) => `付款條款：${t}。`,
    pay: "付款資料（請以發票號碼作為付款參考）：",
    link: "您可透過以下安全連結上載文件：",
    subject: (c: string) => `${c}：您的要求`,
  },
  sc: {
    hi: (n: string) => `${n}您好：`,
    thanks: "感谢您的信息。",
    thanksMeeting: "感谢您抽空与我们会面。按我们商定的安排，我们会跟进以下事项。",
    thanksChange: "我们会跟进以下新增或替代事项，请查阅下列独立报价。",
    thanksCosts: "我们已代您支付以下费用，随函附上发票。",
    thanksChase: "温馨提示：为完成以下事项，我们仍需您提供部分资料。",
    thanksLetter: "我们收到随附给公司的信件，以下是接下来需要处理的事项。",
    newReq: (t: string) => `${t}：`,
    need: "为办理此事，请提供：",
    onFile: "我们已存档以下资料（无须再次提供）：",
    got: "已从您的信息中收到：",
    due: (d: string) => `法定期限：${d}。`,
    upd: (t: string) => `${t}：谢谢，我们已收到`,
    still: "尚欠：",
    allIn: "我们已收齐所需资料，会随即跟进。",
    chg: (t: string, c: string) => `${t}：已知悉，${c}。`,
    cancel: (t: string) => `${t}：我们会按您的指示取消。`,
    cancelPending: (title: string) => `${title}：我们已收到您的取消请求，此事项尚未取消。`,
    cancelCompleted: (title: string) => `${title}：此事项已取消。`,
    holding: "关于您的查询，我们会确认后再回复您。",
    quote: "建议报价，待确认",
    quoteNext: "请先确认服务范围及报价，我们才会跟进服务工作。",
    supplied: "已提供的资料",
    scope: "建议服务范围",
    caveats: "待确认的假设",
    proposedTotal: "建议总额",
    monthly: "每月",
    annual: "每年",
    instructions: "您的指示",
    changedDetails: "已记录以下更改",
    q: "关于您的查询：",
    ask: "另请协助提供以下资料：",
    inv: (n: string, a: string) => `随函附上发票 ${n}，金额 ${a}。`,
    terms: (t: string) => `付款条款：${t}。`,
    pay: "付款资料（请以发票号码作为付款参考）：",
    link: "您可通过以下安全链接上传文件：",
    subject: (c: string) => `${c}：您的要求`,
  },
};

export function templateEmail(f: ReplyFacts): { subject: string; body: string } {
  const t = T[f.language] ?? T.en;
  const out: string[] = [t.hi(f.recipientName), f.context === "change" ? t.thanksChange : f.context === "meeting" ? t.thanksMeeting : f.context === "costs" ? t.thanksCosts : f.context === "chase" ? t.thanksChase : f.context === "letter" ? t.thanksLetter : t.thanks];
  const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
  for (const r of f.newRequests) {
    const block = [t.newReq(r.title)];
    if (r.needed.length) block.push(`${t.need}\n${list(r.needed)}`);
    if (r.alreadyReceived.length) block.push(`${t.got}\n${list(r.alreadyReceived)}`);
    if (r.onFile.length) block.push(`${t.onFile}\n${list(r.onFile)}`);
    if (r.deadline) block.push(t.due(r.deadline));
    if (r.notes?.length) block.push(`${t.instructions}:\n${list(r.notes)}`);
    out.push(block.join("\n"));
  }
  for (const n of f.extraNotes ?? []) out.push(n);
  for (const u of f.updates) out.push(`${t.upd(u.title)}${u.received.length ? `:\n${list(u.received)}` : "."}${u.stillNeeded.length ? `\n${t.still}\n${list(u.stillNeeded)}` : `\n${t.allIn}`}`);
  for (const c of f.changes) out.push(t.chg(c.title, c.received?.length ? t.changedDetails : c.change) + (c.received?.length ? `\n${t.got}\n${list(c.received)}` : "") + (c.nowNeeded.length ? `\n${t.need}\n${list(c.nowNeeded)}` : ""));
  if (f.cancellations.length) out.push(cancellationBlock(f));
  if (f.quotes?.length) out.push(quoteBlock(f));
  for (const q of f.questions.filter(q => q.answerStatus !== "needs_staff")) out.push(`${t.q} ${q.question}\n${q.facts}`);
  if (f.questions.some(q => q.answerStatus === "needs_staff")) out.push(t.holding);
  if (f.clarifications.length) out.push(`${t.ask}\n${list(f.clarifications)}`);
  if (f.invoice) {
    out.push(financeBlock(f));
  }
  if (f.uploadUrl) out.push(`${t.link}\n${f.uploadUrl}`);
  out.push(f.signOff);
  return { subject: t.subject(f.clientName), body: out.join("\n\n") };
}

function cancellationBlock(f: ReplyFacts) {
  const t = T[f.language] ?? T.en;
  return f.cancellations.map(c => c.status === "completed" ? t.cancelCompleted(c.title) : t.cancelPending(c.title)).join("\n");
}

function quoteBlock(f: ReplyFacts) {
  const t = T[f.language] ?? T.en;
  const list = (label: string, xs: string[]) => xs.length ? `${label.replace(/[:：]$/, "")}:\n${xs.map(x => `- ${x}`).join("\n")}` : "";
  return (f.quotes ?? []).map(q => {
    const basis = q.feeBasis === "monthly" ? ` (${t.monthly})` : q.feeBasis === "annual" ? ` (${t.annual})` : "";
    return [ `${t.quote}: ${q.title}`, list(t.supplied, q.supplied), list(t.scope, q.steps), list(t.need, q.needed), list(t.caveats, q.caveats), ...q.lines.map(l => `- ${l.description}: ${l.amount}${basis}`), `${t.proposedTotal}: ${q.totalFormatted}${basis}`, t.quoteNext ].filter(Boolean).join("\n\n");
  }).join("\n\n");
}

function financeBlock(f: ReplyFacts): string {
  if (!f.invoice) return "";
  const t = T[f.language] ?? T.en;
  return [t.inv(f.invoice.number, f.invoice.totalFormatted), ...f.invoice.lines.map(l => `- ${l.description}: ${l.amount}`), t.terms(f.invoice.terms), f.invoice.paymentInstructions ? `${t.pay}\n${f.invoice.paymentInstructions}` : ""].filter(Boolean).join("\n");
}
