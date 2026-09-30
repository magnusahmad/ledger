import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { conversation, client, proposal, task as taskT } from "@/db/schema";
import { ActionForm } from "@/components/ActionForm";
import { notClientAction } from "@/server/actions";
import { findThirdPartyByEmail, ROLE_LABEL } from "@/domain/third-parties";
import { and, asc } from "drizzle-orm";
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
  const party = await findThirdPartyByEmail(ctx, conv.counterpartyEmail);
  const firstIn = msgs.find((m) => m.direction === "in");
  const canTag = !!firstIn && !party && (!cl || cl.lifecycle === "prospect");
  const openTasks = canTag ? await ctx.db.select({ t: taskT, c: client }).from(taskT).innerJoin(client, eq(client.id, taskT.clientId)).where(and(eq(taskT.firmId, ctx.firmId), eq(taskT.status, "open"))).orderBy(asc(client.nameEn)).limit(200) : [];
  const props = new Map<string, typeof proposal.$inferSelect>();
  for (const m of msgs) if (m.proposalId) { const p = await ctx.db.query.proposal.findFirst({ where: eq(proposal.id, m.proposalId) }); if (p) props.set(m.id, p); }
  return (
    <>
      <div className="top"><div><Link href="/inbox" className="back">← Inbox</Link><h1>{conv.subject || "(no subject)"}</h1><p className="sub">{party ? <>{party.name}{party.organisation ? `, ${party.organisation}` : ""} · {ROLE_LABEL[party.role]}</> : cl ? <Link className="lnk" href={`/clients/${cl.id}`}>{cl.nameEn}</Link> : "Not matched to a client"} · {conv.counterpartyEmail}</p></div>
        <div className="row"><LiveRefresh />
          {canTag && (
            <details className="pop"><summary className="btn sm sec2">Not a client</summary>
              <div className="card pop-body">
                <ActionForm action={notClientAction.bind(null, conv.id)} submit="Save">
                  <p className="small muted" style={{ marginTop: 0 }}>For banks, law firms, auditors, officials or anyone else who isn’t a client. {cl ? "The prospect made from their email is closed, with its tasks and draft invoice." : ""}</p>
                  <div className="fld"><label className="f" htmlFor="nc-as">This sender is</label><select id="nc-as" name="as" defaultValue="third_party"><option value="third_party">A third party we deal with</option><option value="ignore">Someone to ignore</option></select></div>
                  <div className="fld"><label className="f" htmlFor="nc-name">Name</label><input id="nc-name" type="text" name="name" defaultValue={firstIn?.fromName ?? ""} required /></div>
                  <div className="fld"><label className="f" htmlFor="nc-org">Organisation</label><input id="nc-org" type="text" name="organisation" /></div>
                  <div className="fld"><label className="f" htmlFor="nc-role">Role</label><select id="nc-role" name="role" defaultValue="other">{(["bank", "law_firm", "auditor", "government", "outgoing_secretary", "notary", "other"] as const).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
                  <div className="fld"><label className="f" htmlFor="nc-task">Related task</label><select id="nc-task" name="taskId" defaultValue=""><option value="">None</option>{openTasks.map(({ t, c }) => <option key={t.id} value={t.id}>{c.nameEn}: {t.title}</option>)}</select></div>
                </ActionForm>
              </div>
            </details>
          )}
        </div></div>
      <div className="stack" style={{ maxWidth: 860 }}>
        {msgs.map((m) => {
          const it = m.intake as Intake | null;
          const prop = props.get(m.id);
          const mine = atts.filter((a) => a.messageId === m.id);
          return (
            <div key={m.id} className="card" style={m.direction === "out" ? { borderColor: m.status === "draft" ? "var(--blue)" : "var(--line)", background: m.status === "draft" ? "#FAFCFF" : undefined } : undefined}>
              <div className="sec-h"><div><b>{m.direction === "in" ? (m.fromName ?? m.fromAddr) : "Caine Road Corporate Services"}</b> <span className="small muted">{m.direction === "in" ? m.fromAddr : `to ${m.toAddrs.join(", ")}`}</span></div>
                <div className="row">{m.viaMailbox && <Pill>Sent from {m.provider === "gmail" ? "Gmail" : "the mailbox"}</Pill>}{m.status === "draft" && <Pill tone="blue">Draft</Pill>}{m.status === "failed" && (m.error === "Replied from the mailbox instead" || m.error === "Sender marked as not a client" ? <Pill>Withdrawn</Pill> : <Pill tone="red">Not sent</Pill>)}<span className="small muted">{fmt(m.at, true)}</span></div></div>
              <div className="draft" style={{ background: "transparent", border: 0, padding: 0, maxHeight: "none" }}>{m.text}</div>
              {mine.length > 0 && <p className="small">Attachments: {mine.map((a) => <a key={a.id} href={`/api/docs/${a.documentId}`} target="_blank" style={{ marginRight: 8 }}>{a.filename}</a>)}</p>}
              {it?.summary && <p className="small muted" style={{ marginBottom: 0, paddingTop: 10, borderTop: "1px solid var(--line)" }}>Understood as: {it.summary}</p>}
              {prop && prop.status === "pending" && <p style={{ marginBottom: 0 }}><Link className="btn sm" href={`/review/${prop.id}`}>Review draft</Link></p>}
            </div>
          );
        })}
      </div>
    </>
  );
}
