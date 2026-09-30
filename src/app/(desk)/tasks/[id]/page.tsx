import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { getTask, outstanding, stepData } from "@/domain/engine";
import { getPlaybook } from "@/domain/playbooks";
import { itemLabel, itemKind } from "@/domain/labels";
import { pendingProposals } from "@/domain/proposals";
import { envelopeStatus } from "@/domain/signing";
import { client, document, request as requestT, invoice } from "@/db/schema";
import { taskTimeline } from "@/server/queries";
import { ActionForm } from "@/components/ActionForm";
import { tickAction, manualStepAction } from "@/server/actions";
import { DeadlineStamp, Pill, StatusPill, ago, fmt } from "@/components/ui";
import { ChecklistTick } from "@/components/ChecklistTick";
import { documentSourceLabel, stepStatus, timelineText, valueText } from "@/lib/display";
import { LiveRefresh } from "@/components/LiveRefresh";
import { money } from "@/domain/labels";

const ICON: Record<string, string> = { needed: "○", received: "●", on_file: "✓", not_needed: "–" };

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = getCtx();
  const t = await getTask(ctx, id).catch(() => null);
  if (!t) notFound();
  const pb = await getPlaybook(ctx, t.playbookId, t.playbookVersion);
  const cl = (await ctx.db.query.client.findFirst({ where: eq(client.id, t.clientId) }))!;
  const person = t.personId ? await ctx.db.query.person.findFirst({ where: (p, { eq }) => eq(p.id, t.personId!) }) : null;
  const props = await pendingProposals(ctx, { taskId: t.id });
  const docs = await ctx.db.select().from(document).where(eq(document.taskId, t.id)).orderBy(desc(document.createdAt));
  const envs = await envelopeStatus(ctx, t.id);
  const tl = await taskTimeline(ctx, t.id);
  const req = t.requestId ? await ctx.db.query.request.findFirst({ where: eq(requestT.id, t.requestId) }) : null;
  const inv = req?.invoiceId ? await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, req.invoiceId) }) : null;
  const cur = t._steps[t.stepIndex];
  const out = outstanding(t);
  return (
    <>
      <div className="top">
        <div>
          <Link href="/tasks" className="back">← Tasks</Link>
          <h1>{t.title}</h1>
          <p className="sub"><Link className="lnk" href={`/clients/${cl.id}`}>{cl.nameEn}</Link>{[pb.forms !== "None" && pb.forms, stepStatus(cur, t.status)].filter(Boolean).map((x) => ` · ${x}`).join("")}</p>
        </div>
        <div className="row"><LiveRefresh /><DeadlineStamp dueDate={t.status === "open" ? t.dueDate : null} today={ctx.clock.today()} /></div>
      </div>
      {props.length > 0 && <div className="banner blue">Needs your approval: {props.map((p, i) => <span key={p.id}>{i > 0 && " · "}<Link href={`/review/${p.id}`}>{p.title}</Link></span>)}</div>}
      <div className="cols">
        <div className="stack">
          <div className="card">
            <h2>Steps</h2>
            <ol className="steps">
              {t._steps.map((s, i) => {
                const sd = stepData(t, i);
                const state = t.status === "done" || i < t.stepIndex ? (sd.skipped || (s.kind === "pay" && t.onCredit) ? "skip" : "done") : i === t.stepIndex && t.status === "open" ? "cur" : "";
                return (
                  <li key={i} className={`step ${state}`}><span className="dot" aria-hidden /><div><span className="lbl">{s.label}</span>
                    {state === "skip" && <span className="small muted"> · {s.kind === "pay" ? "skipped: credit terms" : String(sd.skipped ?? "skipped")}</span>}
                    {typeof sd.reference === "string" && <span className="small muted"> · ref {sd.reference}</span>}
                    {state === "cur" && s.kind === "task" && (
                      <ActionForm action={manualStepAction.bind(null, t.id)} submit="Mark done" tone="secondary">
                        {s.instructions && <p className="small muted" style={{ margin: "4px 0" }}>{s.instructions}</p>}
                        <input type="text" name="note" placeholder="Note (optional)" style={{ marginTop: 6 }} />
                      </ActionForm>
                    )}
                    {state === "cur" && s.kind === "collect" && out.length > 0 && <div className="small muted">Waiting for {out.length === 1 ? "1 item" : `${out.length} items`} from the client</div>}
                    {state === "cur" && s.kind === "pay" && inv && <div className="small muted">Waiting for {money(inv.totalCents - inv.paidCents)} against {inv.number}</div>}
                  </div></li>
                );
              })}
            </ol>
          </div>
          <div className="card">
            <div className="sec-h"><h2>Checklist</h2>{req && t.status === "open" && <a className="small muted" href={`/u/${req.uploadToken}`} target="_blank">Open client upload link ↗</a>}</div>
            {t.checklist.map((e, i) => (
              <div key={i} className="chk">
                <span className="ic" aria-hidden>{ICON[e.status]}</span>
                <span>{itemLabel(e.key, "en", t.params)}{e.optional ? <span className="muted"> (optional)</span> : null}
                  {e.value && !["idNo", "resAddr"].includes(e.key) && <div className="small muted">{valueText(e.value)}</div>}
                  {e.documentId && <div className="small"><a href={`/api/docs/${e.documentId}`} target="_blank">View document</a></div>}
                  {e.reason && <div className="small muted">{e.reason}</div>}
                </span>
                <span>{e.status === "needed" && t.status === "open"
                  ? <ChecklistTick action={tickAction.bind(null, t.id, e.key)} label={itemLabel(e.key, "en", t.params)} file={itemKind(e.key, t.params) === "file"} />
                  : <span className="small muted">{e.status === "on_file" ? "On file" : e.status === "received" ? "Received" : e.status === "not_needed" ? "Not needed" : "To request"}</span>}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h2>Documents</h2>
            {docs.length === 0 ? <p className="empty">None yet.</p> : (
              <ul className="list">{docs.map((d) => (
                <li key={d.id} className="item"><div className="main"><a className="t" href={`/api/docs/${d.id}`} target="_blank">{d.title}</a><div className="m">{documentSourceLabel(d.source)} · {ago(d.createdAt)}</div></div>{d.source === "signed" && <Pill tone="ok">Signed</Pill>}</li>
              ))}</ul>
            )}
            {envs.map((e) => (
              <div key={e.id} style={{ marginTop: 12 }}>
                <h3>Signatures</h3>
                {e.signers.map((s) => <div key={s.email} className="chk"><span className="ic">{s.signedAt ? "●" : "○"}</span><span>{s.name} <span className="muted small">{s.email}</span></span><span className="small muted">{s.signedAt ? `Signed ${ago(s.signedAt)}` : e.status === "draft" ? "Not sent yet" : "Waiting"}</span></div>)}
              </div>
            ))}
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <h2>Details</h2>
            <dl className="kv small">
              <dt>Client</dt><dd><Link className="lnk" href={`/clients/${cl.id}`}>{cl.nameEn}</Link></dd>
              {person && <><dt>Person</dt><dd>{person.nameEn}{person.nameZh ? ` ${person.nameZh}` : ""}</dd></>}
              {t.effectiveDate && <><dt>Effective</dt><dd>{fmt(t.effectiveDate)}</dd></>}
              {t.dueDate && <><dt>Deadline</dt><dd>{fmt(t.dueDate)}{pb.deadline.kind !== "none" && <div className="muted">{pb.deadline.rule}</div>}</dd></>}
              {inv && <><dt>Invoice</dt><dd><span className="row" style={{ gap: 8 }}><Link className="lnk" href={`/invoices/${inv.id}`}>{inv.number}</Link><StatusPill status={inv.status} /></span></dd></>}
              <dt>Payment</dt><dd>{t.onCredit ? "On credit terms" : "Upfront"}</dd>
            </dl>
            <details className="more" style={{ marginTop: 10 }}><summary>Compliance notes</summary><ul className="small">{pb.complianceNotes.map((n, i) => <li key={i}>{n}</li>)}</ul><p className="small muted">{pb.verifyNote}</p></details>
          </div>
          <div className="card">
            <h2>Timeline</h2>
            <ul className="timeline">
              {tl.ev.filter((e) => timelineText(e) !== null).map((e) => (
                <li key={e.id} className={e.actor === "agent" ? "agent" : ""}><div>{timelineText(e)}</div><div className="when">{fmt(e.at, true)} · {e.actor === "agent" ? "Harbourline" : e.actor === "system" ? "Automatic" : e.actor === "client" ? "Client" : e.actor === "mailbox" ? "Mailbox" : "Karen Yip"}</div></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
