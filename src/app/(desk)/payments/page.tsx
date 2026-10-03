import Link from "next/link";
import { getCtx } from "@/server/ctx";
import { paymentPage, pageQuery } from "@/server/queries";
import { ListControls } from "@/components/ListControls";
import { money } from "@/domain/labels";
import { StatusPill, fmt } from "@/components/ui";
import { LiveRefresh } from "@/components/LiveRefresh";

export default async function Payments({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; pageSize?: string }> }) {
  const ctx = getCtx();
  const where = await searchParams, q = pageQuery(where.q);
  const data = await paymentPage(ctx, where), rows = data.rows;
  return (
    <>
      <div className="top"><div><h1>Payments</h1><p className="sub">Deposits received{ctx.bank.name === "airwallex" ? " in the Airwallex account" : ""}, matched to invoices by number and amount.</p></div><LiveRefresh /></div>
      <ListControls path="/payments" q={q} {...data} />
      <div className="card tight scroll-x"><table className="tbl"><thead><tr><th>Received</th><th>From</th><th>Reference</th><th>Amount</th><th>Status</th><th>Invoice</th></tr></thead>
        <tbody>{rows.map(({ b, i }) => (<tr key={b.id}><td>{fmt(b.receivedAt, true)}</td><td>{b.payerName}</td><td className="mono">{b.reference}</td><td style={{ whiteSpace: "nowrap" }}>{money(b.amountCents, b.currency)}</td><td><StatusPill status={b.status} />{b.matchNote && <div className="small muted">{b.matchNote}</div>}</td><td>{i ? <Link href={`/invoices/${i.id}`}>{i.number}</Link> : ""}</td></tr>))}</tbody></table>
        {rows.length === 0 && <p className="empty">No deposits received yet.</p>}</div>
    </>
  );
}
