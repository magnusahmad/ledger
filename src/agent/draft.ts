// Drafting agent with deterministic checks: the email must carry the invoice number and
// upload link exactly. One regeneration, then a template fallback so staff always get a draft.
import type { Ctx } from "@/lib/ctx";
import type { Lang } from "@/db/schema";
import { callAgent, AgentError } from "./call";
import { DraftZ } from "./schemas";
import { DRAFT_SYSTEM } from "./prompts";

export type ReplyFacts = {
  language: Lang;
  /** "meeting": confirms what was agreed in person or by phone, rather than answering a message. */
  context?: "message" | "meeting" | "costs" | "chase" | "letter";
  recipientName: string;
  clientName: string;
  signOff: string;
  newRequests: { title: string; needed: string[]; onFile: string[]; alreadyReceived: string[]; deadline: string | null; notes?: string[] }[];
  updates: { title: string; received: string[]; stillNeeded: string[]; nextStep: string | null }[];
  changes: { title: string; change: string; nowNeeded: string[] }[];
  cancellations: { title: string; note: string }[];
  questions: { question: string; facts: string }[];
  clarifications: string[];
  invoice: { number: string; totalFormatted: string; lines: { description: string; amount: string }[]; terms: string; paymentInstructions: string | null } | null;
  uploadUrl: string | null;
  extraNotes?: string[];
};

export function draftProblems(f: ReplyFacts, body: string): string[] {
  const p: string[] = [];
  if (f.invoice && !body.includes(f.invoice.number)) p.push(`The body must include the invoice number ${f.invoice.number} exactly.`);
  if (f.invoice && !body.includes(f.invoice.totalFormatted.replace(/^HK\$/, "").split(".")[0])) p.push(`The body must state the invoice total ${f.invoice.totalFormatted}.`);
  if (f.uploadUrl && !body.includes(f.uploadUrl)) p.push(`The body must include the upload link ${f.uploadUrl} exactly.`);
  if (!body.trim()) p.push("The body is empty.");
  return p;
}

export async function draftEmail(ctx: Ctx, facts: ReplyFacts, opts: { messageId?: string | null; taskId?: string | null; purpose?: string } = {}): Promise<{ subject: string; body: string; source: "agent" | "template" }> {
  let extra = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const d = await callAgent(ctx, {
        agent: "draft", system: DRAFT_SYSTEM, messageId: opts.messageId, taskId: opts.taskId,
        user: `${opts.purpose ? `Purpose: ${opts.purpose}\n\n` : ""}FACTS:\n\`\`\`json\n${JSON.stringify(facts, null, 1)}\n\`\`\`${extra}`,
        schema: DraftZ,
      });
      const problems = draftProblems(facts, d.body);
      if (problems.length === 0) return { ...d, source: "agent" };
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
  const out: string[] = [t.hi(f.recipientName), f.context === "meeting" ? t.thanksMeeting : f.context === "costs" ? t.thanksCosts : f.context === "chase" ? t.thanksChase : f.context === "letter" ? t.thanksLetter : t.thanks];
  const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
  for (const r of f.newRequests) {
    const block = [t.newReq(r.title)];
    if (r.needed.length) block.push(`${t.need}\n${list(r.needed)}`);
    if (r.alreadyReceived.length) block.push(`${t.got}\n${list(r.alreadyReceived)}`);
    if (r.onFile.length) block.push(`${t.onFile}\n${list(r.onFile)}`);
    if (r.deadline) block.push(t.due(r.deadline));
    out.push(block.join("\n"));
  }
  for (const n of f.extraNotes ?? []) out.push(n);
  for (const u of f.updates) out.push(`${t.upd(u.title)}${u.received.length ? `:\n${list(u.received)}` : "."}${u.stillNeeded.length ? `\n${t.still}\n${list(u.stillNeeded)}` : `\n${t.allIn}`}`);
  for (const c of f.changes) out.push(t.chg(c.title, c.change) + (c.nowNeeded.length ? `\n${t.need}\n${list(c.nowNeeded)}` : ""));
  for (const c of f.cancellations) out.push(t.cancel(c.title));
  for (const q of f.questions) out.push(`${t.q} ${q.question}\n${q.facts}`);
  if (f.clarifications.length) out.push(`${t.ask}\n${list(f.clarifications)}`);
  if (f.invoice) {
    out.push([t.inv(f.invoice.number, f.invoice.totalFormatted), t.terms(f.invoice.terms), f.invoice.paymentInstructions ? `${t.pay}\n${f.invoice.paymentInstructions}` : ""].filter(Boolean).join("\n"));
  }
  if (f.uploadUrl) out.push(`${t.link}\n${f.uploadUrl}`);
  out.push(f.signOff);
  return { subject: t.subject(f.clientName), body: out.join("\n\n") };
}
