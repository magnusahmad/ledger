import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { bankTransaction, payment, invoice } from "@/db/schema";
import { money } from "@/domain/labels";
import { Pill, fmt, STATUS_TONE } from "@/components/ui";
import { ActionButton } from "@/components/ActionForm";
import { checkBankAction } from "@/server/actions";
import { LiveRefresh } from "@/components/LiveRefresh";

export default async function Payments() {
  const ctx = getCtx();
  const rows = await ctx.db.select({ b: bankTransaction, p: payment, i: invoice }).from(bankTransaction).leftJoin(payment, eq(payment.bankTransactionId, bankTransaction.id)).leftJoin(invoice, eq(invoice.id, payment.invoiceId)).where(eq(bankTransaction.firmId, ctx.firmId)).orderBy(desc(bankTransaction.receivedAt)).limit(200);
  return (
    <>
      <div className="top"><div><h1>Payments</h1><p className="sub">Deposits into the {ctx.bank.name === "airwallex" ? "Airwallex Global Account" : "demo bank account"}, matched on invoice number and amount.</p></div><div className="row"><LiveRefresh /><ActionButton action={checkBankAction}>Check bank now</ActionButton></div></div>
      <div className="card tight scroll-x"><table className="tbl"><thead><tr><th>Received</th><th>From</th><th>Reference</th><th>Amount</th><th>Status</th><th>Invoice</th></tr></thead>
        <tbody>{rows.map(({ b, i }) => (<tr key={b.id}><td>{fmt(b.receivedAt, true)}</td><td>{b.payerName}</td><td className="mono">{b.reference}</td><td>{money(b.amountCents, b.currency)}</td><td><Pill tone={STATUS_TONE[b.status]}>{b.status}</Pill>{b.matchNote && <div className="small muted">{b.matchNote}</div>}</td><td>{i ? <Link href={`/invoices/${i.id}`}>{i.number}</Link> : ""}</td></tr>))}</tbody></table>
        {rows.length === 0 && <p className="empty">No deposits yet.</p>}</div>
    </>
  );
}
