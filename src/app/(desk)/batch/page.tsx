import { getCtx } from "@/server/ctx";
import { upcomingDeadlines } from "@/domain/deadlines";
import { listPlaybooks } from "@/domain/playbooks";
import { ActionForm } from "@/components/ActionForm";
import { batchAction, batchOfficerAction, batchGenerateAction } from "@/server/actions";
import { DeadlineStamp, fmt } from "@/components/ui";
import { and, asc, eq } from "drizzle-orm";
import { client, person, task } from "@/db/schema";
import { getTask, currentStep, outstanding } from "@/domain/engine";

export default async function Batch({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days = "90" } = await searchParams;
  const ctx = getCtx();
  const dl = await upcomingDeadlines(ctx, { withinDays: Number(days) || 90 });
  const pbs = await listPlaybooks(ctx);
  const [clients, people, openTasks] = await Promise.all([
    ctx.db.select().from(client).where(eq(client.firmId, ctx.firmId)).orderBy(asc(client.nameEn)),
    ctx.db.select().from(person).where(eq(person.firmId, ctx.firmId)).orderBy(asc(person.nameEn)),
    ctx.db.select({ id: task.id }).from(task).where(and(eq(task.firmId, ctx.firmId), eq(task.status, "open"))),
  ]);
  const preparation = (await Promise.all(openTasks.map(t => getTask(ctx, t.id)))).filter(t => currentStep(t)?.kind === "generate");
  const groups = new Map<string, typeof dl>();
  for (const d of dl) groups.set(d.playbookId, [...(groups.get(d.playbookId) ?? []), d]);
  return (
    <>
      <div className="top"><div><h1>Batch work</h1><p className="sub">Start annual work, prepare documents or arrange one director’s resignation across companies. Each company keeps its own task and approvals.</p></div>
        <form className="row small" style={{ maxWidth: "100%" }}><label htmlFor="days" className="muted">Deadlines within</label><select id="days" name="days" defaultValue={days} style={{ width: 120, maxWidth: "100%" }}><option value="30">30 days</option><option value="90">90 days</option><option value="180">180 days</option><option value="365">a year</option></select><button className="btn sm sec2">Show</button></form></div>
      <section className="sec">
        <h2>Prepare documents</h2>
        <p className="small muted">Prepare selected tasks that have reached the document step. Missing information or conflicts stop only the affected task.</p>
        <div className="card">
          {preparation.length ? <ActionForm action={batchGenerateAction} submit="Prepare selected documents">
            {preparation.map(t => <label className="chk" key={t.id}>
              <input type="checkbox" name="taskId" value={t.id} defaultChecked />
              <span>{t.title}<div className="small muted">{clients.find(c => c.id === t.clientId)?.nameEn ?? t.clientId}{outstanding(t).length ? ` · ${outstanding(t).length} item(s) outstanding` : " · Information collected"}</div></span>
              <a className="small" href={`/tasks/${t.id}`}>View task</a>
            </label>)}
          </ActionForm> : <p className="empty">No tasks awaiting document preparation. Tasks appear here when they reach that step.</p>}
        </div>
      </section>
      <section className="sec">
        <h2>Resign a director across companies</h2>
        <p className="small muted">Choose the person, effective date and companies. Each eligible company gets a task, invoice and draft request. Existing resignation tasks are skipped.</p>
        <div className="card">
          <ActionForm action={batchOfficerAction} submit="Prepare resignation requests">
            <div className="grid2" style={{ marginBottom: 16 }}>
              <label>Director<select name="personId" required defaultValue=""><option value="" disabled>Choose a director</option>{people.filter(p => p.kind === "individual").map(p => <option key={p.id} value={p.id}>{p.nameEn}{p.nameZh ? ` · ${p.nameZh}` : ""}</option>)}</select></label>
              <label>Effective date<input type="date" name="effectiveDate" required defaultValue={ctx.clock.today()} /></label>
            </div>
            {clients.filter(c => c.jurisdiction === "HK").map(c => <label className="chk" key={c.id}><input type="checkbox" name="clientId" value={c.id} /><span>{c.nameEn}{c.nameTc && <div className="small muted">{c.nameTc}</div>}</span></label>)}
          </ActionForm>
        </div>
      </section>
      <h2>Start annual work</h2>
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
