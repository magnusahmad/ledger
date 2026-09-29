import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { conversation, client, proposal } from "@/db/schema";
import { threadMessages } from "@/server/queries";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Pill, fmt } from "@/components/ui";
import type { Intake } from "@/agent/schemas";

export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = getCtx();
  const conv = await ctx.db.query.conversation.findFirst({ where: eq(conversation.id, id) });
  if (!conv) notFound();
  const cl = conv.clientId ? await ctx.db.query.client.findFirst({ where: eq(client.id, conv.clientId) }) : null;
  const { msgs, atts } = await threadMessages(ctx, id);
  const props = new Map<string, typeof proposal.$inferSelect>();
  for (const m of msgs) if (m.proposalId) { const p = await ctx.db.query.proposal.findFirst({ where: eq(proposal.id, m.proposalId) }); if (p) props.set(m.id, p); }
  return (
    <>
      <div className="top"><div><Link href="/inbox" className="back">← Inbox</Link><h1>{conv.subject || "(no subject)"}</h1><p className="sub">{cl ? <Link href={`/clients/${cl.id}`}>{cl.nameEn}</Link> : "Unmatched"} · {conv.counterpartyEmail}</p></div><LiveRefresh /></div>
      <div className="stack" style={{ maxWidth: 860 }}>
        {msgs.map((m) => {
          const it = m.intake as Intake | null;
          const prop = props.get(m.id);
          const mine = atts.filter((a) => a.messageId === m.id);
          return (
            <div key={m.id} className="card" style={m.direction === "out" ? { borderColor: m.status === "draft" ? "var(--blue)" : "var(--line)", background: m.status === "draft" ? "#FAFCFF" : undefined } : undefined}>
              <div className="sec-h"><div><b>{m.direction === "in" ? (m.fromName ?? m.fromAddr) : "Caine Road Corporate Services"}</b> <span className="small muted">{m.direction === "in" ? m.fromAddr : `to ${m.toAddrs.join(", ")}`}</span></div>
                <div className="row">{m.status === "draft" && <Pill tone="blue">Draft</Pill>}{m.status === "failed" && <Pill tone="red">Not sent</Pill>}<span className="small muted">{fmt(m.at, true)}</span></div></div>
              <div className="draft" style={{ background: "transparent", border: 0, padding: 0, maxHeight: "none" }}>{m.text}</div>
              {mine.length > 0 && <p className="small">Attachments: {mine.map((a) => <a key={a.id} href={`/api/docs/${a.documentId}`} target="_blank" style={{ marginRight: 8 }}>{a.filename}</a>)}</p>}
              {it?.summary && <p className="small" style={{ color: "var(--blue)", marginBottom: 0 }}>Harbourline: {it.summary} ({it.actions.map((a) => a.type.replace(/_/g, " ")).join(", ") || "no action"})</p>}
              {prop && prop.status === "pending" && <p style={{ marginBottom: 0 }}><Link className="btn sm" href={`/review/${prop.id}`}>Review draft</Link></p>}
            </div>
          );
        })}
      </div>
    </>
  );
}
