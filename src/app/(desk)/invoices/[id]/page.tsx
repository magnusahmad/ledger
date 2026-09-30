import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { bankTransaction, client, invoice, invoiceLine, payment, reminder, task } from "@/db/schema";
import { money } from "@/domain/labels";
import { StatusPill, fmt } from "@/components/ui";
import { ActionButton } from "@/components/ActionForm";
import { markPaidAction } from "@/server/actions";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = getCtx();
  const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, id) });
  if (!inv) notFound();
  const cl = (await ctx.db.query.client.findFirst({ where: eq(client.id, inv.clientId) }))!;
  const lines = await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId, id)).orderBy(asc(invoiceLine.sort));
  const pays = await ctx.db.select({ p: payment, b: bankTransaction }).from(payment).leftJoin(bankTransaction, eq(bankTransaction.id, payment.bankTransactionId)).where(eq(payment.invoiceId, id));
  const rems = await ctx.db.select().from(reminder).where(eq(reminder.invoiceId, id));
  const tasks = inv.requestId ? await ctx.db.select().from(task).where(eq(task.requestId, inv.requestId)) : [];
  return (
    <>
      <div className="top"><div><Link href="/invoices" className="back">← Invoices</Link><h1>{inv.number}</h1><p className="sub"><Link className="lnk" href={`/clients/${cl.id}`}>{cl.nameEn}</Link> · {inv.issuedOn ? `Issued ${fmt(inv.issuedOn)} · Due ${fmt(inv.dueOn)}` : "Not issued yet"} · {inv.termsDays ? `${inv.termsDays} days credit` : "Payable upfront"}</p></div>
        <div className="row"><StatusPill status={inv.status} /><a className="btn sec2 sm" href={`/api/invoices/${inv.id}/pdf`} target="_blank">Download PDF</a>{["sent", "part_paid"].includes(inv.status) && <ActionButton action={markPaidAction.bind(null, inv.id)} confirm="Record the remaining balance as paid?">Record payment</ActionButton>}</div></div>
      <div className="cols">
        <div className="card scroll-x"><table className="tbl"><thead><tr><th>Description</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead><tbody>{lines.map((l) => <tr key={l.id}><td>{l.description}{l.kind === "disbursement" && <div className="small muted">Disbursement</div>}</td><td style={{ textAlign: "right" }}>{money(l.amountCents)}</td></tr>)}<tr><td><b>Total</b></td><td style={{ textAlign: "right" }}><b>{money(inv.totalCents)}</b></td></tr>{inv.paidCents > 0 && <tr><td>Paid</td><td style={{ textAlign: "right" }}>−{money(inv.paidCents)}</td></tr>}{inv.status !== "draft" && inv.status !== "void" && <tr><td><b>Balance due</b></td><td style={{ textAlign: "right" }}><b>{money(inv.totalCents - inv.paidCents)}</b></td></tr>}</tbody></table>
          {inv.supersedesId && <p className="small muted">Revision {inv.version}, supersedes an earlier invoice.</p>}</div>
        <div className="stack">
          <div className="card"><h2>Payments</h2>{pays.length === 0 ? <p className="empty">No payments received.</p> : pays.map(({ p, b }) => <div key={p.id} className="small" style={{ marginBottom: 8 }}>{fmt(p.receivedOn)} · {money(p.amountCents)} · {p.method === "bank_auto" ? "Matched from bank" : p.method === "bank_approved" ? "Matched from bank, confirmed by staff" : "Recorded manually"}{b && <div className="muted">“{b.reference}” from {b.payerName}</div>}</div>)}</div>
          {ctx.config.accountingProvider === "xero" && <div className="card"><h2>Xero</h2><p className="small" style={{ margin: 0 }}>{inv.xeroStatus === "synced" ? "Synced" : inv.xeroStatus === "error" ? <span style={{ color: "var(--red)" }}>Sync failed: {inv.xeroError}</span> : inv.status === "draft" ? "Added when the invoice is sent" : "Syncing"}</p></div>}
          {rems.length > 0 && <div className="card"><h2>Reminders</h2>{rems.map((r) => <div key={r.id} className="small">{["First", "Second", "Final"][r.level - 1] ?? `Reminder ${r.level}`} reminder · {fmt(r.createdAt, true)}</div>)}</div>}
          {tasks.length > 0 && <div className="card"><h2>Tasks</h2>{tasks.map((t) => <div key={t.id} className="small"><Link className="lnk" href={`/tasks/${t.id}`}>{t.title}</Link></div>)}</div>}
        </div>
      </div>
    </>
  );
}
