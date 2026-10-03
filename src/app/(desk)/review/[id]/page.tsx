import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { readApprovedInput } from "@/domain/approval-execution";
import { invoiceDateReviewContext } from "@/domain/invoice-delivery-review";
import { deliveryPayload } from "@/domain/mail-delivery";
import { getProposal } from "@/domain/proposals";
import { getTask, tasksForRequest } from "@/domain/engine";
import { itemLabel, money } from "@/domain/labels";
import { attachment, client, document, invoice, invoiceLine, mailDelivery, message, request as requestT } from "@/db/schema";
import { ReviewForm, RedraftButtons, InlineEdit, AutoRedirect } from "./client";
import { approveAction, rejectAction, invoiceNumberAction, lineAmountAction, resumeApprovalAction, closeInterruptedAction, reviewInvoiceDatesAction } from "@/server/actions";
import { ActionButton, ActionForm } from "@/components/ActionForm";
import { deliveryEvidence, showSentEmailCheck } from "@/domain/delivery-evidence";
import { DeadlineStamp, StatusPill, ago, fmt } from "@/components/ui";
import { languageLabel, plural, sentence, valueText } from "@/lib/display";
import { getPlaybook, listPlaybooks } from "@/domain/playbooks";
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
      {!decided && (p.kind === "start_enforcement"
        ? <ActionButton action={reject} tone="secondary" confirm="Don't start this work? The client will still get a draft telling them about the letter.">Only tell the client</ActionButton>
        : <ActionButton action={reject} tone="secondary" confirm="Dismiss this without acting?">Dismiss</ActionButton>)}
    </div>
  );
  if (p.status === "processing" || p.status === "recovery") {
    const saved = readApprovedInput(ctx, p);
    const sourceKey = p.payload.messageId ? `message:${p.payload.messageId}` : null;
    const journal = sourceKey ? await ctx.db.query.mailDelivery.findFirst({ where: and(eq(mailDelivery.firmId, ctx.firmId), eq(mailDelivery.sourceKey, sourceKey)) }) : null;
    const exact = journal ? deliveryPayload(ctx, journal) : null;
    const dateReview = await invoiceDateReviewContext(ctx, p.id);
    const edits = saved?.opts.edits ?? {};
    const recipients = exact?.to ?? (typeof edits.to === "string" ? edits.to.split(/[,;\s]+/).filter(Boolean) : edits.to as string[] | undefined) ?? saved?.sourceMessage?.toAddrs ?? [];
    const body = exact?.text ?? String(edits.text ?? saved?.sourceMessage?.text ?? "");
    const approvedSigners = p.kind === "send_signing" ? (saved?.payload.signers ?? []) as { personId: string; name: string; email: string | null; role: string }[] : [];
    const invitationKeys = approvedSigners.map(s => `signer:${saved!.payload.envelopeId}:${s.personId}`);
    const invitations = invitationKeys.length ? await ctx.db.select().from(mailDelivery).where(and(eq(mailDelivery.firmId, ctx.firmId), inArray(mailDelivery.sourceKey, invitationKeys))) : [];
    const approvedEmails = (edits.emails ?? {}) as Record<string, string>;
    return <>{header}
      <div className="banner amber"><strong>{p.status === "processing" ? "In progress" : "Delivery needs review"}</strong>. The approved action has not been confirmed complete. {p.recoveryError}</div>
      <div className="card">
        <h2>Approved inputs</h2>
        {p.kind === "send_signing" && <>
          <h3>Documents approved for signature</h3>
          {saved?.signingDocuments?.length ? <ul className="small" style={{ paddingLeft: 18, overflowWrap: "anywhere" }}>{saved.signingDocuments.map(d => <li key={d.id}>{d.title}</li>)}</ul> : <p className="small muted">Original document titles were not recorded for this older approval.</p>}
          <h3>Approved signing recipients</h3>
          {approvedSigners.map(s => {
            const invitation = invitations.find(d => d.sourceKey === `signer:${saved!.payload.envelopeId}:${s.personId}`);
            const to = invitation ? deliveryPayload(ctx, invitation).to : [approvedEmails[s.personId] ?? s.email ?? "No email recorded"];
            const state = invitation?.status === "sent" && invitation.result?.providerMessageId ? "Invitation confirmed" : invitation && invitation.status !== "prepared" ? "Delivery needs review" : "Not yet sent";
            return <div key={s.personId} className="signer-recovery" style={{ marginBottom: 14, overflowWrap: "anywhere" }}><p className="small" style={{ marginBottom: 4 }}><strong>{s.name}</strong></p><p className="small" style={{ margin: "0 0 4px" }}>{to.join(", ")}</p><p className="small muted" style={{ margin: 0 }}>{state}</p></div>;
          })}
        </>}
        {!!recipients.length && <p className="small">To: {recipients.join(", ")}</p>}
        {!!body && <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{body.replace(/\/sign\/[A-Za-z0-9]+/g, "/sign/[personal link]")}</p>}
        {!!exact?.attachments?.length && <p className="small">Attached: {exact.attachments.map(a => a.filename).join(", ")}</p>}
        <p className="small muted">Recovery checks the original approved content and current task facts. A changed draft needs a fresh staff review.</p>
        <ActionButton action={resumeApprovalAction.bind(null, p.id)}>Check and resume approved action</ActionButton>
      </div>
      {dateReview && !dateReview.hasDates && <div className="card" style={{ marginTop: 18 }}>
        <h2>Review original invoice dates</h2>
        <p className="small">This older delivery did not record its invoice dates. <a className="lnk" href={`/api/review/${p.id}/invoice`} target="_blank" rel="noreferrer">View the original approved invoice PDF</a>. Enter the issue date printed on that PDF and calculate its due date using the original {dateReview.invoice.termsDays}-day credit terms. This completes bookkeeping only after delivery is confirmed, preserving the original PDF.</p>
        <ReviewForm action={reviewInvoiceDatesAction.bind(null, p.id)} submit="Approve reviewed dates and complete original action" redirectTo="/">
          <input type="hidden" name="journalId" value={dateReview.journal.id} /><input type="hidden" name="payloadHash" value={dateReview.journal.payloadHash} /><input type="hidden" name="pdfSha256" value={dateReview.pdfSha256} />
          <div className="fld"><label className="f" htmlFor="original-issued-date">Issue date on the delivered invoice</label><input id="original-issued-date" name="issuedOn" type="date" required /></div>
          <div className="fld"><label className="f" htmlFor="original-due-date">Due date using the original invoice credit terms</label><input id="original-due-date" name="dueOn" type="date" required /></div>
          <label className="small"><input type="checkbox" name="checkedOriginalInvoice" required /> I checked the original invoice issue date and payment terms</label>
          <div className="fld"><label className="f" htmlFor="invoice-date-note">Invoice date verification note</label><textarea id="invoice-date-note" name="note" required /></div>
        </ReviewForm>
      </div>}
      <div className="card" style={{ marginTop: 18 }}>
        <h2>After checking the mailbox</h2>
        <p className="small">If the original action cannot be recovered, close it and request a fresh preview. The earlier message may already have reached the client. A new message still needs approval.</p>
        <ReviewForm action={closeInterruptedAction.bind(null, p.id)} submit="Close interrupted action and request fresh review" redirectTo="/" tone="secondary">
          <label className="small"><input type="checkbox" name="checkedMailbox" required /> I checked the mailbox and understand the previous message may have been delivered</label>
          <div className="fld"><label className="f" htmlFor="recovery-note">Mailbox check note</label><textarea id="recovery-note" name="note" required /></div>
        </ReviewForm>
      </div>
    </>;
  }

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
    const extraDocIds = (p.payload.attachDocumentIds as string[] | undefined) ?? [];
    const extraDocs = extraDocIds.length ? await ctx.db.select().from(document).where(inArray(document.id, extraDocIds)) : [];
    const attachInvoice = inv && inv.status === "draft" && (draft.intake as { attachInvoiceId?: string } | null)?.attachInvoiceId === inv.id;
    const evidence = reqId && inv && p.payload.purpose === "request" ? await deliveryEvidence(ctx, reqId, draft.toAddrs) : null;
    const evidenceIds = [...new Set([evidence?.invoiceMessageId, evidence?.uploadMessageId].filter((id): id is string => !!id))];
    const evidenceMessages = evidenceIds.length ? await ctx.db.select().from(message).where(inArray(message.id, evidenceIds)) : [];
    return (
      <>
        {header}
        {cl?.lifecycle === "prospect" && conv && source && !isCosts && <p className="small muted" style={{ marginTop: -14, marginBottom: 16 }}>Not a client, e.g. a bank or law firm? <Link className="lnk" href={`/inbox/${conv.id}`}>Mark the sender as not a client</Link></p>}
        <div className="cols">
          <div className="stack">
            <div className="card">
              <div className="sec-h"><h2>Reply</h2><RedraftButtons proposalId={p.id} current={(draft.language as "en" | "tc" | "sc") ?? "en"} /></div>
              {p.payload.purpose === "chase" && <div className={`banner ${p.payload.escalation ? "red" : "amber"}`}>{p.payload.escalation ? "Escalation: the deadline is close or earlier reminders went unanswered. A call to the client has been added to the task." : "Reminder: the client hasn’t sent what’s outstanding yet."}</div>}
              {!!p.payload.replaces && <div className="banner amber">Someone replied from the mailbox. Check what was delivered, then send anything still needed or mark the sending step done.</div>}
              {evidence && showSentEmailCheck(p.payload, evidence) && <p className="small muted">Sent email check: {evidence.invoiceFound ? "current invoice attachment found" : "current invoice attachment not found"}; {evidence.uploadLinkFound ? "upload link found" : "upload link not found"}. Staff confirmation is still required.</p>}
              {evidenceMessages.map(m => <p className="small" key={m.id}><Link className="lnk" href={`/inbox/${m.conversationId}`}>View sent email: {m.subject ?? "Reply"}</Link></p>)}
              {p.payload.draftSource === "template" && <div className="banner amber">Drafted from the standard template. Check the wording before sending.</div>}
              <ReviewForm action={approve} submit={`Approve and send${attachInvoice ? " with invoice" : ""}`} redirectTo="/">
                <div className="fld"><label className="f" htmlFor="to">To</label><input id="to" type="email" name="to" defaultValue={draft.toAddrs.join(", ")} /></div>
                <div className="fld"><label className="f" htmlFor="subject">Subject</label><input id="subject" type="text" name="subject" defaultValue={draft.subject ?? ""} /></div>
                <div className="fld"><label className="f" htmlFor="text">Message</label><textarea id="text" name="text" defaultValue={draft.text ?? ""} style={{ minHeight: 360 }} lang={draft.language === "en" ? "en" : draft.language === "sc" ? "zh-Hans" : "zh-Hant"} /></div>
                {(attachInvoice || extraDocs.length > 0) && <p className="small muted" style={{ marginTop: 10 }}>Attached: {[attachInvoice && <a key="inv" className="lnk" href={`/api/invoices/${inv!.id}/pdf`} target="_blank">{inv!.number}.pdf</a>, ...extraDocs.map((d) => <a key={d.id} className="lnk" href={`/api/docs/${d.id}`} target="_blank">{d.title}</a>)].filter(Boolean).map((x, i) => <span key={i}>{i > 0 && ", "}{x}</span>)}</p>}
              </ReviewForm>
              <div style={{ marginTop: 24 }}>
                <h3>Handled elsewhere?</h3>
                <p className="small muted">Mark done after delivering this message{attachInvoice ? ", the invoice and upload details" : ""} by any medium. This records completion{attachInvoice ? " and marks the invoice sent" : ""}.</p>
                <ActionForm action={approve} submit="Mark done" tone="secondary">
                  <input type="hidden" name="completedOutside" value="on" />
                  <div className="fld"><label className="f" htmlFor="outside-note">Note (optional)</label><input id="outside-note" name="note" placeholder="e.g. sent by WeChat" /></div>
                </ActionForm>
              </div>
            </div>
          </div>
          <div className="stack">
            {p.payload.origin === "letter" && req && (
              <div className="card">
                <h2>From a letter</h2>
                <p className="small" style={{ margin: 0 }}>{req.summary}</p>
                {((p.payload.attachDocumentIds as string[] | undefined) ?? []).map((d) => <p key={d} className="small" style={{ marginBottom: 0 }}><a className="lnk" href={`/api/docs/${d}`} target="_blank">View the scan</a> · attached to the email</p>)}
              </div>
            )}
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
                  <tr><td><b>Total</b></td><td style={{ textAlign: "right", whiteSpace: "nowrap" }}><b>{money(inv.totalCents)}</b></td></tr>
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
  if (p.kind === "start_enforcement") {
    const pl = p.payload as { playbookId: string; dueDate: string | null; form: string | null; reference: string | null; amountHkd: number | null; letter: { documentId: string; sender: string; summary: string; receivedOn: string; actionNeeded: string | null } };
    const pb = await getPlaybook(ctx, pl.playbookId);
    return (<>{header}<div className="cols">
      <div className="card">
        <h2>{pb.name.en}</h2>
        <p className="small muted" style={{ marginTop: -4 }}>{pb.description}</p>
        <dl className="kv small">
          <dt>Date that matters</dt><dd>{pl.dueDate ? <span className="row" style={{ gap: 8 }}>{fmt(pl.dueDate)}<DeadlineStamp dueDate={pl.dueDate} today={ctx.clock.today()} nearOnly /></span> : <span className="muted">Not stated; set it on the task</span>}<div className="muted">{pb.deadline.rule}</div></dd>
          {pl.form && <><dt>Filing</dt><dd>{pl.form}</dd></>}
          {pl.reference && <><dt>Reference</dt><dd>{pl.reference}</dd></>}
          {pl.amountHkd != null && <><dt>Amount stated</dt><dd>{money(Math.round(pl.amountHkd * 100))}</dd></>}
          <dt>Steps</dt><dd>{pb.steps.map((s) => s.label).join(" → ")}</dd>
          <dt>Fee</dt><dd>{money(pb.feeCents)}</dd>
        </dl>
        <ReviewForm action={approve} submit="Start the response" redirectTo="/" />
        <p className="small muted" style={{ marginBottom: 0 }}>Starting it drafts an email to the client explaining the letter, with the scan and the invoice, for you to approve.</p>
      </div>
      <div className="card">
        <h2>The letter</h2>
        <p className="small muted" style={{ marginTop: -4 }}>From {pl.letter.sender} · received {fmt(pl.letter.receivedOn)} · <a className="lnk" href={`/api/docs/${pl.letter.documentId}`} target="_blank">View the scan</a></p>
        <p className="small">{pl.letter.summary}</p>
        {pl.letter.actionNeeded && <p className="small" style={{ marginBottom: 0 }}><b>It asks for:</b> {pl.letter.actionNeeded}</p>}
      </div>
    </div></>);
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
