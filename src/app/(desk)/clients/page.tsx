import Link from "next/link";
import { and, eq, ne } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { client, appUser } from "@/db/schema";
import { upcomingDeadlines } from "@/domain/deadlines";
import { taskRows } from "@/server/queries";
import { DeadlineStamp, Pill } from "@/components/ui";

const JUR: Record<string, string> = { HK: "Hong Kong", CN: "Mainland China", MO: "Macau", TW: "Taiwan" };

export default async function Clients() {
  const ctx = getCtx();
  const rows = await ctx.db.select({ c: client, u: appUser }).from(client).leftJoin(appUser, eq(appUser.id, client.staffId)).where(and(eq(client.firmId, ctx.firmId), ne(client.lifecycle, "archived"))).orderBy(client.nameEn);
  const dl = await upcomingDeadlines(ctx, { withinDays: 365 });
  const open = await taskRows(ctx, { status: "open" });
  return (
    <>
      <div className="top"><div><h1>Clients</h1><p className="sub">{rows.length} companies across {new Set(rows.map((r) => r.c.jurisdiction)).size} jurisdictions</p></div><Link className="btn" href="/new">New request</Link></div>
      <div className="card tight scroll-x">
        <table className="tbl"><thead><tr><th>Company</th><th>Jurisdiction</th><th>Status</th><th>Staff</th><th>Open tasks</th><th>Next deadline</th></tr></thead>
          <tbody>{rows.map(({ c, u }) => {
            const next = dl.find((d) => d.clientId === c.id);
            return (
              <tr key={c.id}>
                <td><Link href={`/clients/${c.id}`}>{c.nameEn}</Link>{c.nameTc && <div className="small muted">{c.nameTc}</div>}</td>
                <td className="small">{JUR[c.jurisdiction]}</td>
                <td>{c.lifecycle === "prospect" ? <Pill tone="blue">Prospect</Pill> : c.lifecycle === "onboarding" ? <Pill tone="amber">Onboarding</Pill> : c.operatingStatus === "dormant" ? <Pill>Dormant</Pill> : <Pill tone="ok">Active</Pill>}</td>
                <td className="small">{u?.name ?? "—"}</td>
                <td>{open.filter((t) => t.clientId === c.id).length || ""}</td>
                <td>{next ? <><div className="small">{next.label}</div><DeadlineStamp dueDate={next.dueDate} today={ctx.clock.today()} /></> : <span className="muted small">—</span>}</td>
              </tr>);
          })}</tbody></table>
      </div>
    </>
  );
}
