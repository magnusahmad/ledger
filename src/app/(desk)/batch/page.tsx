import { getCtx } from "@/server/ctx";
import { upcomingDeadlines } from "@/domain/deadlines";
import { listPlaybooks } from "@/domain/playbooks";
import { ActionForm } from "@/components/ActionForm";
import { batchAction, batchOfficerAction, batchGenerateAction } from "@/server/actions";
import { DeadlineStamp, fmt } from "@/components/ui";
import { plural } from "@/lib/display";
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
      <div className="top"><div><h1>Batch work</h1><p className="sub">Work across several companies at once. Each company keeps its own task and approvals.</p></div></div>
      <section className="sec">
        <div className="sec-h"><h2>Prepare documents</h2></div>
        <p className="small muted" style={{ marginTop: -4 }}>For tasks at the document step. A task with missing details or conflicts is skipped; the rest go ahead.</p>
        <div className="card">
          {preparation.length ? <ActionForm action={batchGenerateAction} submit="Prepare selected documents">
            {preparation.map(t => <label className="chk" key={t.id}>
              <input type="checkbox" name="taskId" value={t.id} defaultChecked />
              <span>{t.title}<div className="small muted">{clients.find(c => c.id === t.clientId)?.nameEn ?? t.clientId}{outstanding(t).length ? ` · ${plural(outstanding(t).length, "item")} outstanding` : " · All details in"}</div></span>
              <a className="small muted" href={`/tasks/${t.id}`}>View</a>
            </label>)}
          </ActionForm> : <p className="empty">No tasks are at the document step.</p>}
        </div>
      </section>
      <section className="sec">
        <div className="sec-h"><h2>Director resigning from several companies</h2></div>
        <p className="small muted" style={{ marginTop: -4 }}>Each company gets its own task, invoice and draft request for approval. Companies with a resignation already under way are skipped.</p>
        <div className="card">
          <ActionForm action={batchOfficerAction} submit="Prepare resignation requests">
            <div className="grid2" style={{ marginBottom: 16 }}>
              <div><label className="f" htmlFor="personId">Director</label><select id="personId" name="personId" required defaultValue=""><option value="" disabled>Choose a director</option>{people.filter(p => p.kind === "individual").map(p => <option key={p.id} value={p.id}>{p.nameEn}{p.nameZh ? ` · ${p.nameZh}` : ""}</option>)}</select></div>
              <div><label className="f" htmlFor="effectiveDate">Effective date</label><input id="effectiveDate" type="date" name="effectiveDate" required defaultValue={ctx.clock.today()} /></div>
            </div>
            {clients.filter(c => c.jurisdiction === "HK" && c.lifecycle !== "prospect" && c.lifecycle !== "archived" && c.operatingStatus !== "not_incorporated").map(c => <label className="chk" key={c.id}><input type="checkbox" name="clientId" value={c.id} /><span>{c.nameEn}{c.nameTc && <div className="small muted">{c.nameTc}</div>}</span></label>)}
          </ActionForm>
        </div>
      </section>
      <div className="sec-h" style={{ marginTop: 8 }}><h2>Start annual work</h2>
        <form className="row small"><label htmlFor="days" className="muted">Due within</label><select id="days" name="days" defaultValue={days} style={{ width: 120 }}><option value="30">30 days</option><option value="90">90 days</option><option value="180">180 days</option><option value="365">1 year</option></select><button className="btn sm sec2">Show</button></form></div>
      {[...groups.entries()].map(([pbId, items]) => {
        const pb = pbs.find((p) => p.id === pbId);
        return (
          <section className="sec" key={pbId}>
            <div className="card">
              <div className="sec-h"><h3 style={{ margin: 0, color: "var(--ink)", fontSize: 15, fontWeight: 600 }}>{pb?.name.en ?? pbId}</h3><span className="small muted">{plural(items.length, "client")}</span></div>
              <ActionForm action={batchAction} submit="Start for selected clients">
                <input type="hidden" name="playbookId" value={pbId} />
                {items.map((d) => (
                  <label key={`${d.clientId}${d.periodKey}`} className="chk" style={{ cursor: "pointer" }}>
                    <input type="checkbox" name="clientId" value={d.clientId} defaultChecked />
                    <span>{d.clientName}<div className="small muted">{d.label !== pb?.name.en ? `${d.label} · ` : ""}Due {fmt(d.dueDate)}</div></span>
                    <DeadlineStamp dueDate={d.dueDate} today={ctx.clock.today()} nearOnly />
                  </label>
                ))}
              </ActionForm>
            </div>
          </section>
        );
      })}
      {groups.size === 0 && <p className="empty">Nothing due in this period that hasn’t been started.</p>}
    </>
  );
}
