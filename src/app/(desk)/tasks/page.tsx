import Link from "next/link";
import { getCtx } from "@/server/ctx";
import { taskPage, pageQuery } from "@/server/queries";
import { DeadlineStamp, Pill } from "@/components/ui";
import { LiveRefresh } from "@/components/LiveRefresh";
import { plural, sentence } from "@/lib/display";

import { ListControls } from "@/components/ListControls";

const FILTERS = [["open", "Open"], ["done", "Done"], ["cancelled", "Cancelled"], ["all", "All"]] as const;

export default async function Tasks({ searchParams }: { searchParams: Promise<{ s?: string; q?: string; page?: string; pageSize?: string; client?: string; held?: string }> }) {
  const input = await searchParams;
  const s = FILTERS.find(f => f[0] === input.s)?.[0] ?? "open", q = pageQuery(input.q);
  const ctx = getCtx();
  const data = await taskPage(ctx, { status: s, q, page: input.page, pageSize: input.pageSize, clientId: input.client, held: input.held === "1" });
  const rows = data.rows;
  const filters = { s, client: input.client, held: input.held };
  return (
    <>
      <div className="top"><div><h1>Tasks</h1><p className="sub">{s === "all" ? plural(data.total, "task") : plural(data.total, `${s} task`)}</p></div><LiveRefresh /></div>
      <nav className="tabs" aria-label="Filter">{FILTERS.map(([k, l]) => <Link key={k} href={`/tasks?${new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter((e): e is [string, string] => !!e[1])), s: k, q })}`} className="tab" aria-current={s === k ? "page" : undefined}>{l}</Link>)}</nav>
      <ListControls path="/tasks" q={q} {...data} filters={filters} />
      <div className="card tight scroll-x">
        <table className="tbl"><thead><tr><th>Task</th><th>Client</th><th>Status</th><th>Waiting on</th><th>Deadline</th></tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id}>
              <td><Link href={`/tasks/${t.id}`}>{t.title}</Link></td>
              <td><Link href={`/clients/${t.clientId}`}>{t.clientName}</Link></td>
              <td className="small">{t.stepLabel}</td>
              <td>{t.waitingOn && <Pill tone={t.waitingOn === "you" ? "blue" : ["client", "payment", "signatures", "hold"].includes(t.waitingOn) ? "amber" : undefined}>{t.waitingOn === "you" ? "You" : t.waitingOn === "hold" ? "On hold" : sentence(t.waitingOn)}</Pill>}</td>
              <td>{t.status === "open" ? <DeadlineStamp dueDate={t.dueDate} today={ctx.clock.today()} /> : null}</td>
            </tr>))}
          </tbody></table>
        {rows.length === 0 && <p className="empty">No tasks here.</p>}
      </div>
    </>
  );
}
