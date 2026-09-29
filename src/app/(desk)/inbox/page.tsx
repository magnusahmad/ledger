import Link from "next/link";
import { getCtx } from "@/server/ctx";
import { conversations } from "@/server/queries";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Pill, ago } from "@/components/ui";
import { ActionButton } from "@/components/ActionForm";
import { checkMailAction } from "@/server/actions";

export default async function Inbox() {
  const ctx = getCtx();
  const rows = await conversations(ctx);
  return (
    <>
      <div className="top"><div><h1>Inbox</h1><p className="sub">Every email from clients and prospects, read by Harbourline. Connected mailbox: {ctx.mail.address || ctx.mail.name}</p></div><div className="row"><LiveRefresh /><ActionButton action={checkMailAction}>Check mail now</ActionButton></div></div>
      <div className="card tight"><ul className="list">
        {rows.map((c) => (
          <li key={c.id} className="item">
            <div className="main"><Link href={`/inbox/${c.id}`} className="t">{c.subject || "(no subject)"}</Link>
              <div className="m">{c.clientName ?? "Unmatched"} · {c.last?.direction === "in" ? `${c.last.fromName ?? c.last.fromAddr}: ` : "You: "}{(c.last?.text ?? "").slice(0, 110)}</div></div>
            <div className="row">{c.drafts > 0 && <Pill tone="blue">Draft waiting</Pill>}<span className="small muted">{ago(c.lastMessageAt ?? c.createdAt)}</span></div>
          </li>
        ))}
        {rows.length === 0 && <li className="empty">No email yet.</li>}
      </ul></div>
    </>
  );
}
