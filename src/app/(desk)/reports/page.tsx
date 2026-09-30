import Link from "next/link";
import { eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { task } from "@/db/schema";
import { timeSavedForTask, firmTimeSaved } from "@/domain/time-saved";

export default async function Reports() {
  const ctx = getCtx();
  const tasks = await ctx.db.select().from(task).where(eq(task.firmId, ctx.firmId));
  const rows = [];
  for (const t of tasks) { const s = await timeSavedForTask(ctx, t.id); if (s.baselineMinutes > 0 || s.hasMeasurements) rows.push({ t, s }); }
  const base = rows.reduce((x, r) => x + r.s.baselineMinutes, 0);
  const firm = await firmTimeSaved(ctx);
  return (
    <>
      <div className="top"><div><Link href="/settings" className="back">← Settings</Link><h1>Time saved</h1><p className="sub">Estimated manual work Harbourline handled, set against the time staff spent on approvals.</p></div></div>
      <div className="grid3">
        <div className="card stat"><b>{Math.round(base)} min</b><span>Estimated manual work</span></div>
        <div className="card stat"><b>{firm.approvals ? `${firm.staffMinutes} min` : "—"}</b><span>Recorded approval time</span></div>
        <div className="card stat"><b>{firm.approvals}</b><span>Approvals</span></div>
      </div>
      <p className="small muted">Estimates, not measured savings. Work outside approval screens, such as filing on e-Registry, is not captured. Document generation, register updates and screening are not counted. {firm.editChars.toLocaleString()} characters edited in drafts before sending.</p>
      <div className="card tight scroll-x" style={{ marginTop: 16 }}><table className="tbl"><thead><tr><th>Task</th><th>Estimated manual work</th><th>Approval time</th></tr></thead>
        <tbody>{rows.map(({ t, s }) => <tr key={t.id}><td><Link href={`/tasks/${t.id}`}>{t.title}</Link></td><td>{Math.round(s.baselineMinutes)} min</td><td>{s.hasMeasurements ? `${s.staffMinutes} min` : "—"}</td></tr>)}</tbody></table>
        {rows.length === 0 && <p className="empty">Nothing measured yet.</p>}</div>
    </>
  );
}
