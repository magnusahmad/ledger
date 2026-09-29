// Invoice PDF on the firm's letterhead with bilingual headings and payment instructions.
import { eq, asc } from "drizzle-orm";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import type { Ctx } from "@/lib/ctx";
import { client, invoice, invoiceLine } from "@/db/schema";
import { getFirm } from "@/domain/firm";
import { money } from "@/domain/labels";
import { fmtDate } from "@/domain/dates";
import { embedFonts } from "./fonts";

export async function renderInvoicePdf(ctx: Ctx, invoiceId: string): Promise<Buffer> {
  const inv = (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, invoiceId) }))!;
  const lines = await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId, invoiceId)).orderBy(asc(invoiceLine.sort));
  const cl = (await ctx.db.query.client.findFirst({ where: eq(client.id, inv.clientId) }))!;
  const firm = await getFirm(ctx);
  const bank = await ctx.bank.accountDetails();
  const doc = await PDFDocument.create();
  const fonts = await embedFonts(doc, "tc");
  const { regular, bold } = fonts;
  const page = doc.addPage([595, 842]);
  const ink = rgb(0.086, 0.094, 0.114), muted = rgb(0.42, 0.45, 0.5), line = rgb(0.9, 0.91, 0.925);
  const text = (s: string, x: number, y: number, size = 10, font: PDFFont = regular, color = ink) => page.drawText(s, { x, y, size, font: fonts.pick(s, font === bold), color });
  text(firm.legalName, 56, 790, 14, bold);
  if (firm.legalNameZh) text(firm.legalNameZh, 56, 772, 11);
  text(firm.address ?? "", 56, 756, 9, regular, muted);
  text(`TCSP licence ${firm.tcspLicence ?? ""}`, 56, 744, 9, regular, muted);
  text("INVOICE 發票", 400, 790, 16, bold);
  text(`No. ${inv.number}`, 400, 770, 10);
  const issued = inv.issuedOn ?? ctx.clock.today();
  text(`Date 日期: ${fmtDate(issued)}`, 400, 756, 9);
  text(`Terms 付款條款: ${inv.termsDays ? `${inv.termsDays} days` : "On receipt"}`, 400, 744, 9);
  text("Bill to 客戶", 56, 700, 9, bold, muted);
  text(cl.nameEn, 56, 686, 11, bold);
  if (cl.nameTc) text(cl.nameTc, 56, 671, 10);
  let y = 630;
  page.drawLine({ start: { x: 56, y: y + 14 }, end: { x: 539, y: y + 14 }, color: line, thickness: 1 });
  text("Description 項目", 56, y, 9, bold, muted); text("Amount 金額", 470, y, 9, bold, muted);
  y -= 22;
  for (const l of lines) {
    text(l.description.slice(0, 80), 56, y, 10);
    if (l.kind === "disbursement") text("Disbursement 代支費用", 56, y - 12, 8, regular, muted);
    text(money(l.amountCents, inv.currency), 470, y, 10);
    y -= l.kind === "disbursement" ? 30 : 22;
  }
  page.drawLine({ start: { x: 56, y: y + 8 }, end: { x: 539, y: y + 8 }, color: line, thickness: 1 });
  text("Total 總額", 380, y - 10, 11, bold); text(money(inv.totalCents, inv.currency), 470, y - 10, 11, bold);
  y -= 60;
  text("Payment 付款方法", 56, y, 10, bold); y -= 16;
  text("Please quote the invoice number as the payment reference. 請以發票號碼作為付款參考。", 56, y, 9, regular, muted); y -= 16;
  for (const [k, v] of Object.entries(bank)) { text(`${k}: ${v}`, 56, y, 9); y -= 13; }
  return Buffer.from(await doc.save());
}
