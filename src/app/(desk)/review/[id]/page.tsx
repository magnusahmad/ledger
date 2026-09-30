import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { getProposal } from "@/domain/proposals";
import { getTask, tasksForRequest } from "@/domain/engine";
import { itemLabel, money } from "@/domain/labels";
import { attachment, client, document, invoice, invoiceLine, message, request as requestT } from "@/db/schema";
import { ReviewForm, RedraftButtons, InlineEdit, AutoRedirect } from "./client";
import { approveAction, rejectAction, invoiceNumberAction, lineAmountAction } from "@/server/actions";
import { ActionButton } from "@/components/ActionForm";
import { StatusPill, ago, fmt } from "@/components/ui";
import { languageLabel, plural, sentence, valueText } from "@/lib/display";
import { listPlaybooks } from "@/domain/playbooks";
import type { Intake } from "@/agent/schemas";

const STATUS_ICON: Record<string, string> = { needed: "○", received: "●", on_file: "✓", not_needed: "–" };
const STATUS_TEXT: Record<string, string> = { needed: "To request", received: "Received", on_file: "On file", not_needed: "Not needed" };

function checklistSummary(list: { status: string }[]) {
  const n = (st: string) => list.filter((e) => e.status === st).length;
  return [n("needed") && `${n("needed")} to request`, n("received") && `${n("received")} already given`, n("on_file") && `${n("on_file")} on file`].filter(Boolean).join(" · ");
}

export default async function Review({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = getCtx();
  const p = await getProposal(ctx, id).catch(() => null);
  if (!p) notFound();
  const cl = p.clientId ? await ctx.db.query.client.findFirst({ where: eq(client.id, p.clientId) }) : null;
  const decided = p.status !== "pending";
  const approve = approveAction.bind(null, p.id);
  const reject = rejectAction.bind(null, p.id);

  const header = (
    <div className="top">
      <div>
        <Link href="/" className="back">← Today</Link>
        <h1>{p.title}</h1>
        <p className="sub">{cl ? <><Link href={`/clients/${cl.id}`}>{cl.nameEn}</Link>{cl.lifecycle === "prospect" ? " · new prospect" : ""} · </> : null}{ago(p.createdAt)}{decided ? ` · ${p.status === "superseded" ? "Withdrawn" : sentence(p.status)}` : ""}</p>
      </div>
      {!decided && <ActionButton action={reject} tone="secondary" confirm="Dismiss this without acting?">Dismiss</ActionButton>}
    </div>
  );
  if (decided) {
    const recent = p.decidedAt && ctx.clock.now().getTime() - p.decidedAt.getTime() < 15_000;
    if (p.status === "superseded") {
      const byMailbox = p.payload.supersededBy === "mailbox_reply";
      const convId = byMailbox ? (await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.replyMessageId as string) }))?.conversationId : null;
      return <>{header}<div className="banner amber">{byMailbox ? <>Withdrawn: someone replied to this thread from the mailbox, so this draft wasn’t sent. {convId && <Link href={`/inbox/${convId}`}>View the thread</Link>}</> : <>Replaced by a newer version. <Link href="/">Back to Today</Link></>}</div></>;
    }
    return <>{header}<div className={`banner ${p.status === "approved" ? "ok" : "amber"}`}>{p.status === "approved" ? "Approved" : "Dismissed"}{p.decidedAt && !recent ? ` ${fmt(p.decidedAt, true)}` : ""}. {recent ? "Taking you back to Today…" : <Link href="/">Back to Today</Link>}</div>{recent && <AutoRedirect to="/" />}</>;
  }

  if (p.kind === "send_message") {
    const draft = (await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) }))!;
    const conv = await ctx.db.query.conversation.findFirst({ where: (c, { eq }) => eq(c.id, draft.conversationId) });
    const isCosts = p.payload.purpose === "costs";
    const source = isCosts ? null : draft.inReplyTo ? await ctx.db.query.message.findFirst({ where: eq(message.rfcMessageId, draft.inReplyTo) }) : conv ? (await ctx.db.select().from(message).where(eq(message.conversationId, conv.id)).orderBy(asc(message.at))).filter((m) => m.direction === "in").at(-1) : null;
    const srcAtts = source ? await ctx.db.select().from(attachment).where(eq(attachment.messageId, source.id)) : [];
    const intake = source?.intake as { intake?: Intake } | Intake | null;
    const it = (intake && "actions" in intake ? intake : (intake as { intake?: Intake } | null)?.intake) as Intake | undefined;
    const reqId = (p.payload.requestId as string | null) ?? null;
    const req = reqId ? await ctx.db.query.request.findFirst({ where: eq(requestT.id, reqId) }) : null;
    const invId = (p.payload.invoiceId as string | undefined) ?? req?.invoiceId ?? null;
    const inv = invId ? await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, invId) }) : null;
    const lines = inv ? await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId, inv.id)).orderBy(asc(invoiceLine.sort)) : [];
    const tasks = [] as Awaited<ReturnType<typeof getTask>>[];
    for (const tid of (p.payload.taskIds as string[]) ?? []) tasks.push(await getTask(ctx, tid));
    if (!tasks.length && reqId && !isCosts) for (const t of await tasksForRequest(ctx, reqId)) tasks.push(await getTask(ctx, t.id));
    const pbNames = new Map((await listPlaybooks(ctx)).map((x) => [x.id, x.name.en]));
    const attachInvoice = inv && inv.status === "draft" && (draft.intake as { attachInvoiceId?: string } | null)?.attachInvoiceId === inv.id;
    return (
      <>
        {header}
        {cl?.lifecycle === "prospect" && conv && source && !isCosts && <p className="small muted" style={{ marginTop: -14, marginBottom: 16 }}>Not a client, e.g. a bank or law firm? <Link className="lnk" href={`/inbox/${conv.id}`}>Mark the sender as not a client</Link></p>}
        <div className="cols">
          <div className="stack">
            <div className="card">
              <div className="sec-h"><h2>Reply</h2><RedraftButtons proposalId={p.id} current={(draft.language as "en" | "tc" | "sc") ?? "en"} /></div>
              {p.payload.purpose === "chase" && <div className={`banner ${p.payload.escalation ? "red" : "amber"}`}>{p.payload.escalation ? "Escalation: the deadline is close or earlier reminders went unanswered. A call to the client has been added to the task." : "Reminder: the client hasn’t sent what’s outstanding yet."}</div>}
              {!!p.payload.replaces && <div className="banner amber">Someone replied to this client from the mailbox, so this didn’t go out. It still carries the invoice and upload link. Edit it to follow on from that reply.</div>}
              {p.payload.draftSource === "template" && <div className="banner amber">Drafted from the standard template. Check the wording before sending.</div>}
              <ReviewForm action={approve} submit={`Approve and send${attachInvoice ? " with invoice" : ""}`} redirectTo="/">
                <div className="fld"><label className="f" htmlFor="to">To</label><input id="to" type="email" name="to" defaultValue={draft.toAddrs.join(", ")} /></div>
                <div className="fld"><label className="f" htmlFor="subject">Subject</label><input id="subject" type="text" name="subject" defaultValue={draft.subject ?? ""} /></div>
                <div className="fld"><label className="f" htmlFor="text">Message</label><textarea id="text" name="text" defaultValue={draft.text ?? ""} style={{ minHeight: 360 }} lang={draft.language === "en" ? "en" : draft.language === "sc" ? "zh-Hans" : "zh-Hant"} /></div>
                {attachInvoice && <p className="small muted" style={{ marginTop: 10 }}>Attached: <a href={`/api/invoices/${inv!.id}/pdf`} target="_blank">{inv!.number}.pdf</a></p>}
              </ReviewForm>
            </div>
          </div>
          <div className="stack">
            {p.payload.origin === "manual" && req && (
              <div className="card">
                <h2>From a meeting or call</h2>
                <p className="small" style={{ margin: 0 }}>{req.summary && req.summary !== "Taken in person" ? req.summary : "Started manually. No notes were added."}</p>
              </div>
            )}
            {source && (
              <div className="card">
                <h2>From the client</h2>
                <p className="small muted" style={{ marginTop: -4 }}>{source.fromName ?? ""} &lt;{source.fromAddr}&gt; · {fmt(source.at, true)}</p>
                <div className="draft" style={{ maxHeight: 220 }}>{source.text}</div>
                {srcAtts.length > 0 && <p className="small">Attachments: {srcAtts.map((a) => <a key={a.id} href={`/api/docs/${a.documentId}`} target="_blank" style={{ marginRight: 8 }}>{a.filename}</a>)}</p>}
                {it && (
                  <>
                    <h3>Understood as</h3>
                    <p className="small" style={{ margin: 0 }}>{it.summary}</p>
                    {(it.actions.filter((a) => a.playbookId).length > 1 || it.actions.some((a) => a.playbookId && a.confidence < 0.7)) && <ul className="small" style={{ paddingLeft: 18, margin: "6px 0 0" }}>
                      {it.actions.filter((a) => a.playbookId).map((a, i) => <li key={i}>{pbNames.get(a.playbookId!) ?? a.playbookId}{a.confidence < 0.7 && <span style={{ color: "var(--amber)" }}> · uncertain, please check</span>}</li>)}
                    </ul>}
                    <p className="small muted" style={{ marginBottom: 0 }}>{it.client.kind === "new_prospect" ? "New prospect" : it.client.kind === "existing" ? "Existing client" : "Client not identified"} · Replying in {languageLabel(it.language)}</p>
                  </>
                )}
              </div>
            )}
            {tasks.map((t) => (
              <div className="card" key={t.id}>
                <div className="sec-h"><h2><Link href={`/tasks/${t.id}`}>{t.title}</Link></h2>{t.dueDate && <span className="small muted">Due {fmt(t.dueDate)}</span>}</div>
                <p className="small muted" style={{ margin: "-4px 0 6px" }}>{checklistSummary(t.checklist)}</p>
                <div>
                  {t.checklist.map((e, i) => (
                    <div key={i} className="chk"><span className="ic" aria-hidden>{STATUS_ICON[e.status]}</span><span>{itemLabel(e.key, "en", t.params)}{e.value && !["idNo", "resAddr"].includes(e.key) && e.status !== "on_file" ? <span className="muted">: {valueText(e.value)}</span> : null}</span><span className="small muted">{e.status === "needed" ? "" : STATUS_TEXT[e.status]}</span></div>
                  ))}
                </div>
              </div>
            ))}
            {inv && (
              <div className="card">
                <div className="sec-h"><h2>Invoice</h2><StatusPill status={inv.status} /></div>
                {inv.status === "draft" ? <InlineEdit action={invoiceNumberAction.bind(null, inv.id)} name="number" value={inv.number} label="Invoice number" /> : <p className="mono">{inv.number}</p>}
                <table className="tbl" style={{ marginTop: 8 }}><tbody>
                  {lines.map((l) => (
                    <tr key={l.id}><td>{l.description}{l.kind === "disbursement" && <div className="small muted">Disbursement</div>}</td><td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{inv.status === "draft" ? <InlineEdit action={lineAmountAction.bind(null, l.id)} name="amount" value={(l.amountCents / 100).toFixed(0)} display={money(l.amountCents)} label="Amount (HK$)" /> : money(l.amountCents)}</td></tr>
                  ))}
                  <tr><td><b>Total</b></td><td style={{ textAlign: "right" }}><b>{money(inv.totalCents)}</b></td></tr>
                </tbody></table>
                <p className="small muted" style={{ marginBottom: 0 }}>{isCosts ? (inv.termsDays ? `Payable within ${inv.termsDays} days.` : "Payable on receipt.") : inv.termsDays ? `${inv.termsDays} days credit. Work starts now.` : "Payable upfront. Work starts once paid."}</p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ---------- Other kinds ----------
  const task = p.taskId ? await getTask(ctx, p.taskId).catch(() => null) : null;
  const taskLink = task ? <p className="small">Task: <Link href={`/tasks/${task.id}`}>{task.title}</Link></p> : null;
  const summary = p.summary ? <div className="draft" style={{ maxHeight: 300 }}>{p.summary}</div> : null;

  if (p.kind === "record_filing") {
    const docs = task ? await ctx.db.select().from(document).where(eq(document.taskId, task.id)) : [];
    return (<>{header}<div className="card" style={{ maxWidth: 720 }}>
      {taskLink}
      <p>{p.summary}</p>
      <h3>Documents to file</h3>
      <ul className="small">{docs.map((d) => <li key={d.id}><a href={`/api/docs/${d.id}`} target="_blank">{d.title}</a></li>)}</ul>
      <ReviewForm action={approve} submit="Record filing" redirectTo="/">
        <div className="grid2">
          <div className="fld"><label className="f" htmlFor="reference">Filing reference</label><input id="reference" type="text" name="reference" placeholder="e.g. e-Registry submission number" required /></div>
          <div className="fld" style={{ marginTop: 0 }}><label className="f" htmlFor="filedOn">Filed on</label><input id="filedOn" type="date" name="filedOn" defaultValue={ctx.clock.today()} /></div>
          {task?.playbookId === "hk.incorporation" && <>
            <div className="fld"><label className="f" htmlFor="companyNumber">Company number on certificate</label><input id="companyNumber" name="companyNumber" type="text" required /></div>
            <div className="fld"><label className="f" htmlFor="incorporatedOn">Incorporation date on certificate</label><input id="incorporatedOn" name="incorporatedOn" type="date" required /></div>
          </>}
        </div>
      </ReviewForm>
    </div></>);
  }
  if (p.kind === "register_change") {
    return (<>{header}<div className="card" style={{ maxWidth: 720 }}>{taskLink}<h3>These changes will be made to the statutory records</h3>
      <ul>{((p.payload.preview as string[]) ?? []).map((x, i) => <li key={i} style={{ marginBottom: 6 }}>{x}</li>)}</ul>
      <ReviewForm action={approve} submit="Update registers" redirectTo="/" /></div></>);
  }
  if (p.kind === "send_signing") {
    const signers = (p.payload.signers as { personId: string; name: string; email: string | null; role: string; docIds: string[] }[]) ?? [];
    const docs = await ctx.db.select().from(document).where(inArray(document.id, signers.flatMap((s) => s.docIds).concat(["_"])));
    return (<>{header}<div className="card" style={{ maxWidth: 760 }}>{taskLink}
      <h3>Documents</h3><ul className="small">{docs.map((d) => <li key={d.id}><a href={`/api/docs/${d.id}`} target="_blank">{d.title}</a></li>)}</ul>
      <ReviewForm action={approve} submit="Send for signature" redirectTo="/">
        {signers.map((s) => (<div key={s.personId} className="fld"><label className="f" htmlFor={`e-${s.personId}`}>{s.name} · {s.role} · {plural(s.docIds.length, "document")}</label><input id={`e-${s.personId}`} type="email" name={`email:${s.personId}`} defaultValue={s.email ?? ""} required /></div>))}
        <p className="small muted">Each signer gets a personal link and confirms a 6-digit code sent to their email.</p>
      </ReviewForm>
    </div></>);
  }
  if (p.kind === "screening_review") {
    return (<>{header}<div className="card" style={{ maxWidth: 760 }}>{taskLink}{summary}
      <div className="grid2" style={{ marginTop: 16 }}>
        <ReviewForm action={approve} submit="Clear: not the same person" redirectTo="/"><input type="hidden" name="decision" value="clear" /><div className="fld"><label className="f" htmlFor="note">Reason</label><input id="note" type="text" name="note" placeholder="e.g. different date of birth on HKID" required /></div></ReviewForm>
        <ReviewForm action={approve} submit="Escalate to MLRO" tone="danger" redirectTo="/"><input type="hidden" name="decision" value="escalate" /><p className="small muted">The task stays on hold.</p></ReviewForm>
      </div></div></>);
  }
  if (p.kind === "conflict") {
    const pl = p.payload as { onFile: string; incoming: string; question: string };
    return (<>{header}<div className="card" style={{ maxWidth: 720 }}>{taskLink}
      <dl className="kv"><dt>On file</dt><dd>{pl.onFile}</dd><dt>Client now says</dt><dd><b>{pl.incoming}</b></dd><dt>Suggested question</dt><dd>{pl.question}</dd></dl>
      <div className="row" style={{ marginTop: 16 }}>
        <ReviewForm action={approve} submit="Use the new value" redirectTo="/"><input type="hidden" name="accept" value="incoming" /></ReviewForm>
        <ReviewForm action={approve} submit="Keep what's on file" tone="secondary" redirectTo="/"><input type="hidden" name="accept" value="onFile" /></ReviewForm>
      </div></div></>);
  }
  if (p.kind === "mailbox_update") {
    const reply = await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) });
    const changes = (p.payload.changes as { type: string; taskId: string | null; text: string; evidence: string | null }[]) ?? [];
    const titles = new Map<string, string>();
    for (const c of changes) if (c.taskId && !titles.has(c.taskId)) titles.set(c.taskId, (await getTask(ctx, c.taskId).catch(() => null))?.title ?? "");
    return (<>{header}<div className="cols">
      <div className="card">
        <h2>Suggested updates</h2>
        <p className="small muted" style={{ marginTop: -4 }}>Someone replied to this client from the mailbox. These changes would bring the tasks in line with what they wrote. Untick any that are wrong.</p>
        <ReviewForm action={approve} submit="Apply selected" redirectTo="/">
          <input type="hidden" name="selection" value="explicit" />
          {changes.map((c, i) => (
            <label key={i} className="chk" style={{ gridTemplateColumns: "20px minmax(0,1fr)", cursor: "pointer" }}>
              <input type="checkbox" name={`apply:${i}`} defaultChecked style={{ marginTop: 4 }} />
              <span>{c.text}{c.taskId && titles.get(c.taskId) ? <span className="small muted" style={{ display: "block" }}>{titles.get(c.taskId)}</span> : c.type === "start" ? <span className="small muted" style={{ display: "block" }}>New request, with a confirmation and invoice for you to approve</span> : null}</span>
            </label>
          ))}
        </ReviewForm>
      </div>
      {reply && <div className="card">
        <h2>Reply from the mailbox</h2>
        <p className="small muted" style={{ marginTop: -4 }}>To {reply.toAddrs.join(", ")} · {fmt(reply.at, true)} · <Link className="lnk" href={`/inbox/${reply.conversationId}`}>View thread</Link></p>
        <div className="draft" style={{ maxHeight: 320 }}>{reply.text}</div>
      </div>}
    </div></>);
  }
  if (p.kind === "custom_plan" && task) {
    const plan = task.params.plan as { title: string; items: { labelEn: string }[]; steps: string[]; feeHkd: number; caveats: string[] };
    return (<>{header}<div className="card" style={{ maxWidth: 760 }}>{taskLink}
      <p>{String(task.params.description ?? "")}</p>
      <h3>Planned checklist</h3><ul>{plan.items.map((x, i) => <li key={i}>{x.labelEn}</li>)}</ul>
      <h3>Steps</h3><ol>{plan.steps.map((x, i) => <li key={i}>{x}</li>)}</ol>
      {plan.caveats.length > 0 && <><h3>Caveats</h3><ul className="small">{plan.caveats.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
      <ReviewForm action={approve} submit="Approve plan" redirectTo="/">
        <div className="grid2"><div className="fld"><label className="f" htmlFor="title">Title</label><input id="title" type="text" name="title" defaultValue={plan.title} /></div><div className="fld" style={{ marginTop: 0 }}><label className="f" htmlFor="fee">Fee (HK$)</label><input id="fee" type="number" name="feeHkd" defaultValue={plan.feeHkd} min={0} /></div></div>
      </ReviewForm></div></>);
  }
  const verb: Record<string, string> = { match_payment: "Record payment", cancel_task: "Cancel task", change_request: "Apply change", revise_invoice: "Issue revised invoice", triage: "Mark handled" };
  const srcMsg = p.payload.messageId ? await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) }) : null;
  return (<>{header}<div className="card" style={{ maxWidth: 760 }}>{taskLink}{summary}
    {srcMsg && srcMsg.direction === "in" && <><h3>Message</h3><p className="small muted">{srcMsg.fromName} &lt;{srcMsg.fromAddr}&gt;</p><div className="draft">{srcMsg.text}</div></>}
    {p.kind === "triage" && <p className="small muted">Start the work by hand from <Link href="/new">New request</Link> if needed.</p>}
    <div style={{ marginTop: 16 }}><ReviewForm action={approve} submit={verb[p.kind] ?? "Approve"} redirectTo="/" /></div>
  </div></>);
}
