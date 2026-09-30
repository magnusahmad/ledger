import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { getTask, outstanding, stepData } from "@/domain/engine";
import { getPlaybook } from "@/domain/playbooks";
import { itemLabel, itemKind } from "@/domain/labels";
import { pendingProposals } from "@/domain/proposals";
import { envelopeStatus } from "@/domain/signing";
import { client, document, request as requestT, invoice, taskAction } from "@/db/schema";
import { taskTimeline } from "@/server/queries";
import { ActionForm } from "@/components/ActionForm";
import { tickAction, manualStepAction, addStepAction, addPartyAction, completeStepAction, dropStepAction, holdAction, releaseHoldAction, followedUpAction } from "@/server/actions";
import { DeadlineStamp, Pill, StatusPill, ago, fmt } from "@/components/ui";
import { ChecklistTick } from "@/components/ChecklistTick";
import { ActionButton } from "@/components/ActionForm";
import { listThirdParties, partiesForTask, ROLE_LABEL } from "@/domain/third-parties";
import { documentSourceLabel, stepStatus, timelineText, valueText, waitingLabel } from "@/lib/display";
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
  const steps = await ctx.db.select().from(taskAction).where(eq(taskAction.taskId, t.id)).orderBy(asc(taskAction.createdAt));
  const openSteps = steps.filter((a) => a.status === "open");
  const today = ctx.clock.today();
  const [parties, allParties] = await Promise.all([partiesForTask(ctx, t.id), listThirdParties(ctx)]);
  const partyName = (id: string | null) => { const p = parties.find((x) => x.id === id) ?? allParties.find((x) => x.id === id); return p ? `${p.name}${p.organisation ? `, ${p.organisation}` : ""}` : null; };
  const partySelect = parties.length > 0 && <div><label className="f">Which third party</label><select name="partyId" defaultValue=""><option value="">Not specified</option>{parties.map((p) => <option key={p.id} value={p.id}>{partyName(p.id)}</option>)}</select></div>;
  const waitingSelect = (def: string) => <select name="waitingOn" defaultValue={def}><option value="us">Us</option><option value="client">The client</option><option value="third_party">A third party</option></select>;
  return (
    <>
      <div className="top">
        <div>
          <Link href="/tasks" className="back">← Tasks</Link>
          <h1>{t.title}</h1>
          <p className="sub"><Link className="lnk" href={`/clients/${cl.id}`}>{cl.nameEn}</Link>{[pb.forms !== "None" && pb.forms, t.holdReason && t.status === "open" ? "On hold" : stepStatus(cur, t.status)].filter(Boolean).map((x) => ` · ${x}`).join("")}</p>
        </div>
        <div className="row"><LiveRefresh /><DeadlineStamp dueDate={t.status === "open" ? t.dueDate : null} today={ctx.clock.today()} />
          {t.status === "open" && !t.holdReason && (
            <details className="pop"><summary className="btn sm sec2">Put on hold</summary>
              <div className="card pop-body">
                <ActionForm action={holdAction.bind(null, t.id)} submit="Put on hold">
                  <div className="fld"><label className="f" htmlFor="hold-reason">Why</label><input id="hold-reason" type="text" name="reason" required placeholder="e.g. Waiting for the outgoing secretary’s minute book" /></div>
                  <div className="grid2" style={{ marginTop: 12 }}>
                    <div><label className="f">Waiting on</label>{waitingSelect("third_party")}</div>
                    <div><label className="f" htmlFor="hold-fu">Follow up on</label><input id="hold-fu" type="date" name="followUpOn" required /></div>
                    {partySelect}
                  </div>
                </ActionForm>
              </div>
            </details>
          )}
        </div>
      </div>
      {t.holdReason && t.status === "open" && (
        <div className="banner amber hold">
          <div><b>On hold</b> since {fmt(t.holdSince)}: {t.holdReason}. Waiting on {partyName(t.holdPartyId) ?? waitingLabel(t.holdWaitingOn).toLowerCase()}. {t.holdFollowUpOn && (t.holdFollowUpOn < today ? <b>Follow-up overdue since {fmt(t.holdFollowUpOn)}.</b> : t.holdFollowUpOn === today ? <b>Follow up today.</b> : <>Follow up on {fmt(t.holdFollowUpOn)}.</>)}</div>
          <div className="row" style={{ marginTop: 10, alignItems: "flex-start" }}>
            <ActionForm action={releaseHoldAction.bind(null, t.id)} submit="Release hold" />
            <details className="pop"><summary className="btn sec2">Followed up</summary>
              <div className="card pop-body" style={{ left: 0, right: "auto" }}>
                <ActionForm action={followedUpAction.bind(null, "hold", t.id)} submit="Save">
                  <div className="fld"><label className="f" htmlFor="fu-note">What they said</label><input id="fu-note" type="text" name="note" /></div>
                  <div className="fld"><label className="f" htmlFor="fu-next">Next follow-up</label><input id="fu-next" type="date" name="next" required /></div>
                </ActionForm>
              </div>
            </details>
          </div>
        </div>
      )}
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
                    {openSteps.filter((a) => a.beforeStep != null && a.beforeStep === i).map((a) => <div key={a.id} className="small" style={{ color: "var(--amber)" }}>Waits for: {a.title}</div>)}
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
            <div className="sec-h"><h2>Off-platform steps</h2></div>
            {steps.length === 0 && <p className="empty" style={{ paddingTop: 0 }}>Anything done outside Harbourline, such as stamping, a notary or chasing a bank.</p>}
            <ul className="list">
              {steps.map((a) => (
                <li key={a.id} className="item" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div className="main">
                    <div className="t" style={a.status !== "open" ? { color: "var(--muted)", fontWeight: 400 } : undefined}>{a.status === "done" ? "✓ " : a.status === "cancelled" ? "– " : ""}{a.title}</div>
                    <div className="m">{a.status === "open"
                      ? [`Waiting on ${partyName(a.partyId) ?? waitingLabel(a.waitingOn).toLowerCase()}`, a.dueDate && `due ${fmt(a.dueDate)}`, a.followUpOn && (a.followUpOn <= today ? `follow-up due ${fmt(a.followUpOn)}` : `follow up ${fmt(a.followUpOn)}`), a.beforeStep != null && `before “${t._steps[a.beforeStep]?.label}”`].filter(Boolean).join(" · ")
                      : a.status === "done" ? [`Done ${fmt(a.completedAt)}`, a.proofReference && `ref ${a.proofReference}`, a.proofNote].filter(Boolean).join(" · ") : "Dropped"}
                      {a.proofDocumentId && <> · <a className="lnk" href={`/api/docs/${a.proofDocumentId}`} target="_blank">Proof</a></>}</div>
                  </div>
                  {a.status === "open" && t.status === "open" && (
                    <details className="more" style={{ flexBasis: "100%" }}><summary>Mark done or follow up</summary>
                      <div className="grid2" style={{ marginTop: 10 }}>
                        <ActionForm action={completeStepAction.bind(null, a.id)} submit="Mark done">
                          <p className="small muted" style={{ margin: "0 0 8px" }}>Proof: a reference, a note or a document.</p>
                          <input type="text" name="reference" placeholder="Reference, e.g. Stamp Office number" aria-label="Reference" />
                          <input type="text" name="note" placeholder="Note" aria-label="Note" style={{ marginTop: 8 }} />
                          <input type="file" name="file" aria-label="Proof document" style={{ marginTop: 8 }} />
                        </ActionForm>
                        <div>
                          <ActionForm action={followedUpAction.bind(null, "step", a.id)} submit="Followed up" tone="secondary">
                            <p className="small muted" style={{ margin: "0 0 8px" }}>Chased them? Set the next check.</p>
                            <input type="text" name="note" placeholder="What they said" aria-label="What they said" />
                            <input type="date" name="next" required aria-label="Next follow-up" style={{ marginTop: 8 }} />
                          </ActionForm>
                          <div style={{ marginTop: 12 }}><ActionButton action={dropStepAction.bind(null, a.id)} confirm="Drop this step?">No longer needed</ActionButton></div>
                        </div>
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
            {t.status === "open" && (
              <details className="more" style={{ marginTop: 12 }}><summary>Add an off-platform step</summary>
                <div style={{ marginTop: 10 }}>
                  <ActionForm action={addStepAction.bind(null, t.id)} submit="Add step" resetOnSuccess>
                    <div className="fld"><label className="f" htmlFor="ops-title">What needs doing</label><input id="ops-title" type="text" name="title" required placeholder="e.g. Stamp the instrument of transfer at the IRD Stamp Office" /></div>
                    <div className="grid2" style={{ marginTop: 12 }}>
                      <div><label className="f">Waiting on</label>{waitingSelect("us")}</div>
                      <div><label className="f" htmlFor="ops-before">Must be done before</label><select id="ops-before" name="beforeStep" defaultValue=""><option value="">No particular step</option>{t._steps.map((s, i) => i > t.stepIndex ? <option key={i} value={i}>{s.label}</option> : null)}</select></div>
                      <div><label className="f" htmlFor="ops-due">Due</label><input id="ops-due" type="date" name="dueDate" /></div>
                      <div><label className="f" htmlFor="ops-fu">Follow up on</label><input id="ops-fu" type="date" name="followUpOn" /></div>
                      {partySelect}
                    </div>
                  </ActionForm>
                </div>
              </details>
            )}
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
              <dt>Third parties</dt><dd>{parties.length ? parties.map((p) => <div key={p.id}>{partyName(p.id)} <span className="muted">· {ROLE_LABEL[p.role]}{p.email ? ` · ${p.email}` : ""}</span></div>) : <span className="muted">None</span>}
                {t.status === "open" && <details className="more" style={{ marginTop: 6 }}><summary>Add a third party</summary>
                  <div style={{ marginTop: 8 }}><ActionForm action={addPartyAction.bind(null, t.id)} submit="Add" resetOnSuccess>
                    {allParties.length > 0 && <div className="fld"><label className="f" htmlFor="tp-pick">Someone already known</label><select id="tp-pick" name="partyId" defaultValue=""><option value="">Someone new (below)</option>{allParties.filter((p) => !parties.some((x) => x.id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}{p.organisation ? `, ${p.organisation}` : ""}</option>)}</select></div>}
                    <div className="fld"><label className="f" htmlFor="tp-name">Name</label><input id="tp-name" type="text" name="name" /></div>
                    <div className="fld"><label className="f" htmlFor="tp-org">Organisation</label><input id="tp-org" type="text" name="organisation" /></div>
                    <div className="fld"><label className="f" htmlFor="tp-email">Email</label><input id="tp-email" type="email" name="email" /></div>
                    <div className="fld"><label className="f" htmlFor="tp-role">Role</label><select id="tp-role" name="role" defaultValue="other">{(["bank", "law_firm", "auditor", "government", "outgoing_secretary", "notary", "other"] as const).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
                  </ActionForm></div>
                </details>}
              </dd>
            </dl>
            <details className="more" style={{ marginTop: 10 }}><summary>Compliance notes</summary><ul className="small">{pb.complianceNotes.map((n, i) => <li key={i}>{n}</li>)}</ul><p className="small muted">{pb.verifyNote}</p></details>
          </div>
          <div className="card">
            <h2>Timeline</h2>
            <ul className="timeline">
              {tl.ev.filter((e) => timelineText(e) !== null).map((e) => (
                <li key={e.id} className={e.actor === "agent" ? "agent" : ""}><div>{timelineText(e)}</div><div className="when">{fmt(e.at, true)} · {e.actor === "agent" ? "Harbourline" : e.actor === "system" ? "Automatic" : e.actor === "client" ? "Client" : e.actor === "mailbox" ? "Mailbox" : e.actor === "third_party" ? "Third party" : "Karen Yip"}</div></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
