// Invoice PDF on the firm's letterhead with bilingual headings and payment instructions.
import { and, eq, asc } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { client, document, invoice, invoiceLine } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import { invoiceContentFingerprint } from "@/domain/delivery-evidence";
import { getFirm } from "@/domain/firm";
import { money } from "@/domain/labels";
import { fmtDate } from "@/domain/dates";
import { buildPdf, type Block } from "./builder";

export async function renderInvoicePdf(ctx: Ctx, invoiceId: string, draftDates?: { issuedOn: string }): Promise<Buffer> {
  const inv = await ctx.db.query.invoice.findFirst({ where: and(eq(invoice.id, invoiceId), eq(invoice.firmId, ctx.firmId)) });
  if (!inv) throw new Error("Invoice not found");
  const lines = await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId, invoiceId)).orderBy(asc(invoiceLine.sort));
  const cl = (await ctx.db.query.client.findFirst({ where: eq(client.id, inv.clientId) }))!;
  const firm = await getFirm(ctx);
  const bank = await ctx.bank.accountDetails();
  const issued = inv.issuedOn ?? draftDates?.issuedOn ?? ctx.clock.today();
  const blocks: Block[] = [
    { t: "title", text: firm.legalName },
    ...(firm.legalNameZh ? [{ t: "subtitle" as const, text: firm.legalNameZh }] : []),
    { t: "small", text: firm.address ?? "" },
    { t: "small", text: `TCSP licence ${firm.tcspLicence ?? ""}` },
    { t: "h", text: "INVOICE 發票" },
    { t: "p", text: `No. ${inv.number}` },
    { t: "small", text: `Date 日期: ${fmtDate(issued)}` },
    { t: "small", text: `Terms 付款條款: ${inv.termsDays ? `${inv.termsDays} days` : "On receipt"}` },
    { t: "h", text: "Bill to 客戶" },
    { t: "p", text: cl.nameEn },
    ...(cl.nameTc ? [{ t: "p" as const, text: cl.nameTc }] : []),
    { t: "table", head: ["Description 項目", "Amount 金額"], widths: [327, 140], rows: lines.map(l => [l.description + (l.kind === "disbursement" ? "\nDisbursement 代支費用" : ""), money(l.amountCents, inv.currency)]) },
    { t: "table", head: ["Total 總額", money(inv.totalCents, inv.currency)], rows: [], widths: [327, 140] },
    { t: "h", text: "Payment 付款方法" },
    { t: "small", text: "Please quote the invoice number as the payment reference. 請以發票號碼作為付款參考。" },
    ...Object.entries(bank).map(([key, value]) => ({ t: "small" as const, text: `${key}: ${value}` })),
  ];
  const { pdf } = await buildPdf(blocks, { lang: "tc", footer: `Invoice ${inv.number}` });
  const id = ctx.ids.next("doc"), key = `${ctx.firmId}/invoices/${id}.pdf`;
  await ctx.storage.put(key, pdf);
  await ctx.db.insert(document).values({ id, firmId: ctx.firmId, clientId: inv.clientId, kind: "invoice", title: `${inv.number}.pdf`, storageKey: key, mime: "application/pdf", sha256: Crypto.sha256(pdf), source: "generated", requirementKey: `invoice:${inv.id}`, extractedText: invoiceContentFingerprint({ ...inv, lines }), createdAt: ctx.clock.now() });
  return pdf;
}
