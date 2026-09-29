import Link from "next/link";
import { eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { task } from "@/db/schema";
import { timeSavedForTask, firmTimeSaved } from "@/domain/time-saved";

export default async function Reports() {
  const ctx = getCtx();
  const tasks = await ctx.db.select().from(task).where(eq(task.firmId, ctx.firmId));
  const rows = [];
  for (const t of tasks) { const s = await timeSavedForTask(ctx, t.id); if (s.baselineMinutes > 0) rows.push({ t, s }); }
  const base = rows.reduce((x, r) => x + r.s.baselineMinutes, 0);
  const staff = rows.reduce((x, r) => x + r.s.staffMinutes, 0);
  const firm = await firmTimeSaved(ctx);
  return (
    <>
      <div className="top"><div><h1>Time saved</h1><p className="sub">Staff time logged on each approval, against the typical time for the same work without Harbourline (per-task estimates from TIME_SAVED_VS_CSA.md §3a, to be replaced by design-partner timings).</p></div></div>
      <div className="grid3">
        <div className="card stat"><b>{Math.round(base)} min</b><span>typical staff time for the work done</span></div>
        <div className="card stat"><b>{Math.round(staff * 10) / 10} min</b><span>staff time spent reviewing and approving</span></div>
        <div className="card stat"><b>{staff > 0 ? `${Math.round(base / Math.max(staff, 0.1))}×` : "—"}</b><span>less staff time on these tasks</span></div>
      </div>
      <p className="small muted">{firm.approvals} approvals logged; {firm.editChars.toLocaleString()} characters edited in drafts before sending.</p>
      <div className="card tight scroll-x" style={{ marginTop: 16 }}><table className="tbl"><thead><tr><th>Task</th><th>Typical</th><th>Actual</th><th>AI calls</th></tr></thead>
        <tbody>{rows.map(({ t, s }) => <tr key={t.id}><td><Link href={`/tasks/${t.id}`}>{t.title}</Link></td><td>{Math.round(s.baselineMinutes)} min</td><td>{s.staffMinutes} min</td><td>{s.aiCalls}</td></tr>)}</tbody></table>
        {rows.length === 0 && <p className="empty">Nothing measured yet.</p>}</div>
    </>
  );
}
