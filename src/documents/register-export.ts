// Read-only dated snapshots. Contact particulars currently come from the person
// record; membership and transactions are reconstructed at the selected date.
import { and, eq, lte } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { charge, person, significantController, type Lang } from "@/db/schema";
import { getClient, officersAsAt } from "@/domain/records";
import { membersAsAt, movementHistory } from "@/domain/shares";
import { buildPdf, type Block } from "./builder";

export function validRegisterDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
}

export async function renderRegisters(ctx: Ctx, clientId: string, date: string, language?: Lang | "bilingual") {
  if (!validRegisterDate(date)) throw new Error("Choose a valid register date");
  const client = await getClient(ctx, clientId);
  const lang = language ?? client.docLang;
  const label = (en: string, tc: string, sc = tc) => lang === "en" ? en : lang === "sc" ? sc : lang === "bilingual" ? `${en} / ${tc}` : tc;
  const officers = await officersAsAt(ctx, clientId, date);
  const members = await membersAsAt(ctx, clientId, date);
  const movements = (await movementHistory(ctx, clientId)).filter((m) => m.date <= date);
  const controllers = await ctx.db.select().from(significantController).where(and(eq(significantController.firmId, ctx.firmId), eq(significantController.clientId, clientId), lte(significantController.registrableFrom, date)));
  const charges = await ctx.db.select().from(charge).where(and(eq(charge.firmId, ctx.firmId), eq(charge.clientId, clientId), lte(charge.createdOn, date)));
  const people = await ctx.db.select().from(person).where(eq(person.firmId, ctx.firmId));
  const name = (id: string | null) => {
    const p = people.find((p) => p.id === id);
    return p ? (lang === "en" ? p.nameEn : p.nameZh ? `${p.nameZh} (${p.nameEn})` : p.nameEn) : "—";
  };
  const companyName = (lang === "en" ? client.nameEn : lang === "sc" ? client.nameSc : client.nameTc) || client.nameEn;
  const blocks: Block[] = [];
  const section = (title: string, head: string[], rows: string[][]) => {
    if (blocks.length) blocks.push({ t: "pagebreak" });
    blocks.push({ t: "title", text: companyName }, { t: "subtitle", text: `${title} · ${label("As at", "截至", "截至")} ${date}` });
    blocks.push({ t: "small", text: label("Membership and transactions are dated. Names and contact particulars reflect the current person record; verify historical particulars before statutory use.", "成員資格及交易按指定日期列示。姓名及聯絡資料來自現有記錄；作法定用途前請核對歷史資料。", "成员资格及交易按指定日期列示。姓名及联系资料来自现有记录；作法定用途前请核对历史资料。") });
    if (rows.length) blocks.push({ t: "table", head, rows });
    else blocks.push({ t: "p", text: label("No entries on this date.", "此日期無記錄。", "此日期无记录。") });
  };
  const officerRows = (roles: string[]) => officers.filter((o) => roles.includes(o.role)).map((o) => [name(o.personId), o.person.correspondenceAddress ?? "—", o.fromDate]);
  const officerHead = [label("Name", "姓名"), label("Correspondence address", "通訊地址", "通讯地址"), label("Appointed", "委任日期")];
  section(label("Directors", "董事登記冊", "董事登记册"), officerHead, officerRows(["director", "alternate_director", "reserve_director"]));
  section(label("Secretaries", "秘書登記冊", "秘书登记册"), officerHead, officerRows(["secretary"]));
  section(label("Members", "成員登記冊", "成员登记册"), [label("Member", "成員", "成员"), label("Class", "類別", "类别"), label("Holding", "持股量"), "%"], members.map((m) => [name(m.personId), m.className, m.quantity.toLocaleString("en-US"), `${m.percent}%`]));
  section(label("Significant controllers", "重要控制人登記冊", "重要控制人登记册"), [label("Name", "姓名"), label("Nature of control", "控制性質", "控制性质"), label("Since", "起始日期")], controllers.filter((s) => !s.ceasedOn || s.ceasedOn > date).map((s) => [name(s.personId), s.nature, s.registrableFrom]));
  section(label("Share movements", "股份變動記錄", "股份变动记录"), [label("Date", "日期"), label("Type", "類別", "类别"), label("From / to", "轉出／轉入", "转出／转入"), label("Quantity", "數量", "数量")], movements.map((m) => [m.date, label(m.kind, ({ allotment: "配發", transfer: "轉讓", buyback: "回購", cancellation: "註銷", capital_change: "資本變動" })[m.kind], ({ allotment: "配发", transfer: "转让", buyback: "回购", cancellation: "注销", capital_change: "资本变动" })[m.kind]), `${name(m.fromPersonId)} → ${name(m.toPersonId)}`, m.quantity.toLocaleString("en-US")]));
  section(label("Charges", "押記登記冊", "押记登记册"), [label("Created", "設立日期", "设立日期"), label("Description", "詳情", "详情"), label("Chargee", "承押記人", "承押记人"), label("Status", "狀態", "状态")], charges.map((c) => [c.createdOn, c.description, c.chargee ?? "—", c.satisfiedOn && c.satisfiedOn <= date ? `${label("Satisfied", "已清償", "已清偿")} ${c.satisfiedOn}` : label("Outstanding", "未清償", "未清偿")]));
  return buildPdf(blocks, { lang, header: `${companyName} · ${date}`, footer: label("Register extract — review before statutory use", "登記冊摘要 — 作法定用途前請覆核", "登记册摘要 — 作法定用途前请复核") });
}
