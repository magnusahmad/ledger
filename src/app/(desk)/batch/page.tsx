import { getCtx } from "@/server/ctx";
import { upcomingDeadlines } from "@/domain/deadlines";
import { listPlaybooks } from "@/domain/playbooks";
import { ActionForm } from "@/components/ActionForm";
import { batchAction } from "@/server/actions";
import { DeadlineStamp, fmt } from "@/components/ui";

export default async function Batch({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days = "90" } = await searchParams;
  const ctx = getCtx();
  const dl = await upcomingDeadlines(ctx, { withinDays: Number(days) || 90 });
  const pbs = await listPlaybooks(ctx);
  const groups = new Map<string, typeof dl>();
  for (const d of dl) groups.set(d.playbookId, [...(groups.get(d.playbookId) ?? []), d]);
  return (
    <>
      <div className="top"><div><h1>Batch start</h1><p className="sub">Start the same work for many clients at once. Each gets its own task, invoice and drafted request, queued for your approval (CSA’s Mass Production, plus the messages and invoices).</p></div>
        <form className="row small" style={{ maxWidth: "100%" }}><label htmlFor="days" className="muted">Deadlines within</label><select id="days" name="days" defaultValue={days} style={{ width: 120, maxWidth: "100%" }}><option value="30">30 days</option><option value="90">90 days</option><option value="180">180 days</option><option value="365">a year</option></select><button className="btn sm sec2">Show</button></form></div>
      {[...groups.entries()].map(([pbId, items]) => {
        const pb = pbs.find((p) => p.id === pbId);
        return (
          <section className="sec" key={pbId}>
            <div className="sec-h"><h2>{pb?.name.en ?? pbId}</h2><span className="small muted">{items.length} client(s)</span></div>
            <div className="card">
              <ActionForm action={batchAction} submit="Start for selected clients">
                <input type="hidden" name="playbookId" value={pbId} />
                {items.map((d) => (
                  <label key={`${d.clientId}${d.periodKey}`} className="chk" style={{ cursor: "pointer" }}>
                    <input type="checkbox" name="clientId" value={d.clientId} defaultChecked />
                    <span>{d.clientName}<div className="small muted">{d.label} · due {fmt(d.dueDate)}</div></span>
                    <DeadlineStamp dueDate={d.dueDate} today={ctx.clock.today()} />
                  </label>
                ))}
              </ActionForm>
            </div>
          </section>
        );
      })}
      {groups.size === 0 && <p className="empty">No deadlines without a task in this window.</p>}
    </>
  );
}
