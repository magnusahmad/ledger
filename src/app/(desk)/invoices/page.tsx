import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { client, invoice } from "@/db/schema";
import { money } from "@/domain/labels";
import { DeadlineStamp, StatusPill, fmt } from "@/components/ui";
import { ActionButton } from "@/components/ActionForm";
import { remindersAction } from "@/server/actions";

const FILTERS = [["unpaid", "Unpaid"], ["overdue", "Overdue"], ["paid", "Paid"], ["all", "All"]] as const;

export default async function Invoices({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "unpaid" } = await searchParams;
  const ctx = getCtx();
  const today = ctx.clock.today();
  const where = s === "unpaid" ? inArray(invoice.status, ["sent", "part_paid", "draft"]) : s === "overdue" ? and(inArray(invoice.status, ["sent", "part_paid"]), sql`${invoice.dueOn} < ${today}`) : s === "paid" ? eq(invoice.status, "paid") : undefined;
  const rows = await ctx.db.select({ i: invoice, c: client }).from(invoice).innerJoin(client, eq(client.id, invoice.clientId)).where(and(eq(invoice.firmId, ctx.firmId), where)).orderBy(desc(invoice.createdAt));
  const all = await ctx.db.select().from(invoice).where(and(eq(invoice.firmId, ctx.firmId), inArray(invoice.status, ["sent", "part_paid"])));
  const outstanding = all.reduce((x, i) => x + i.totalCents - i.paidCents, 0);
  const overdue = all.filter((i) => i.dueOn && i.dueOn < today).reduce((x, i) => x + i.totalCents - i.paidCents, 0);
  return (
    <>
      <div className="top"><div><h1>Invoices</h1><p className="sub">{money(outstanding)} outstanding{overdue ? ` · ${money(overdue)} overdue` : ""}</p></div><ActionButton action={remindersAction}>Prepare reminders</ActionButton></div>
      <nav className="tabs" aria-label="Filter">{FILTERS.map(([k, l]) => <Link key={k} href={`/invoices?s=${k}`} className="tab" aria-current={s === k ? "page" : undefined}>{l}</Link>)}</nav>
      <div className="card tight scroll-x"><table className="tbl"><thead><tr><th>Invoice</th><th>Client</th><th>Issued</th><th>Total</th><th>Status</th><th>Due</th></tr></thead>
        <tbody>{rows.map(({ i, c }) => (
          <tr key={i.id}><td><Link href={`/invoices/${i.id}`}>{i.number}</Link></td><td>{c.nameEn}</td><td>{fmt(i.issuedOn) || "—"}</td><td>{money(i.totalCents)}</td><td><StatusPill status={i.status} /></td><td>{["sent", "part_paid"].includes(i.status) ? <DeadlineStamp dueDate={i.dueOn} today={today} /> : null}</td></tr>
        ))}</tbody></table>{rows.length === 0 && <p className="empty">No invoices here.</p>}</div>
    </>
  );
}
