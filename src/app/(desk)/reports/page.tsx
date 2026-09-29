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
      <div className="top"><div><h1>Time saved</h1><p className="sub">Modelled opportunities from TIME_SAVED_VS_CSA.md §3a alongside recorded approval time. These are estimates, not measured savings. Document generation, register updates and screening parity are excluded.</p></div></div>
      <div className="grid3">
        <div className="card stat"><b>{Math.round(base)} min</b><span>modelled manual work</span></div>
        <div className="card stat"><b>{firm.approvals ? firm.staffMinutes : "—"} min</b><span>recorded approval time (partial)</span></div>
        <div className="card stat"><b>Not measured</b><span>overall productivity improvement</span></div>
      </div>
      <p className="small muted">Manual work, filing outside the app and time away from approval screens are not yet captured. Shared request reviews are divided across their tasks and counted once in the firm total. {firm.approvals} approvals logged; {firm.editChars.toLocaleString()} characters edited in drafts before sending.</p>
      <div className="card tight scroll-x" style={{ marginTop: 16 }}><table className="tbl"><thead><tr><th>Task</th><th>Estimate</th><th>Approval time</th><th>AI calls</th></tr></thead>
        <tbody>{rows.map(({ t, s }) => <tr key={t.id}><td><Link href={`/tasks/${t.id}`}>{t.title}</Link></td><td>{Math.round(s.baselineMinutes)} min</td><td>{s.hasMeasurements ? `${s.staffMinutes} min` : "Not measured"}</td><td>{s.aiCalls}</td></tr>)}</tbody></table>
        {rows.length === 0 && <p className="empty">Nothing measured yet.</p>}</div>
    </>
  );
}
