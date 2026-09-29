import Link from "next/link";
import { getCtx } from "@/server/ctx";
import { taskRows } from "@/server/queries";
import { DeadlineStamp, Pill } from "@/components/ui";
import { LiveRefresh } from "@/components/LiveRefresh";

const FILTERS = [["open", "Open"], ["done", "Done"], ["cancelled", "Cancelled"], ["all", "All"]] as const;

export default async function Tasks({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "open" } = await searchParams;
  const ctx = getCtx();
  const rows = await taskRows(ctx, { status: (FILTERS.find((f) => f[0] === s)?.[0] ?? "open") as "open" });
  return (
    <>
      <div className="top"><div><h1>Tasks</h1><p className="sub">{rows.length} {s === "all" ? "" : s} task(s)</p></div><LiveRefresh /></div>
      <nav className="tabs" aria-label="Filter">{FILTERS.map(([k, l]) => <Link key={k} href={`/tasks?s=${k}`} className="tab" aria-current={s === k ? "page" : undefined}>{l}</Link>)}</nav>
      <div className="card tight scroll-x">
        <table className="tbl"><thead><tr><th>Task</th><th>Client</th><th>Step</th><th>Waiting on</th><th>Deadline</th></tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id}>
              <td><Link href={`/tasks/${t.id}`}>{t.title}</Link></td>
              <td><Link href={`/clients/${t.clientId}`}>{t.clientName}</Link></td>
              <td className="small">{t.stepLabel}</td>
              <td>{t.waitingOn && <Pill tone={t.waitingOn === "you" ? "blue" : t.waitingOn === "client" || t.waitingOn === "payment" || t.waitingOn === "signatures" ? "amber" : undefined}>{t.waitingOn}</Pill>}</td>
              <td>{t.status === "open" ? <DeadlineStamp dueDate={t.dueDate} today={ctx.clock.today()} /> : null}</td>
            </tr>))}
          </tbody></table>
        {rows.length === 0 && <p className="empty">No tasks.</p>}
      </div>
    </>
  );
}
