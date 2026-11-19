import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { pilotCtx } from "@/server/pilot";
import { appUser, arCase, client as clientT } from "@/db/schema";
import { replyForReview, changeLabel } from "@/annual/reply-review";
import { CHANGE_TYPES } from "@/annual/reply-types";
import { fmt } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/ActionForm";
import * as A from "@/server/annual-actions";

type V = Record<string, string | boolean | null | undefined>;
const CHARGES: Record<string, string> = { none: "No mortgages or charges", has_charges: "Has mortgages or charges", not_answered: "Not answered in this email" };
const PAPER: Record<string, string> = { annual_return: "Signed annual return", agm_papers: "Signed AGM papers", other: "Signed document" };
const DOC: Record<string, string> = { id_document: "ID document", address_proof: "Address proof", bank_statement: "Bank statement", other: "Document" };
const DONE: Record<string, string> = { accepted: "Accepted", edited: "Corrected", rejected: "Rejected", added: "Added" };

function ChangeFields({ v }: { v?: V }) {
  return <>
    <label className="an-field">Kind of change<select name="changeType" defaultValue={String(v?.changeType ?? "")}><option value="" disabled>Choose…</option>{CHANGE_TYPES.map((t) => <option key={t} value={t}>{changeLabel(t)}</option>)}</select></label>
    <label className="an-field">Who or what<input type="text" name="subject" defaultValue={String(v?.subject ?? "")} /></label>
    <label className="an-field">What changed<textarea name="detail" defaultValue={String(v?.detail ?? "")} /></label>
    <label className="an-field">Effective date, if the client gave one<input type="date" name="effectiveDate" defaultValue={String(v?.effectiveDate ?? "")} /></label>
    <input type="hidden" name="quote" value={String(v?.quote ?? "")} /><input type="hidden" name="source" value={String(v?.source ?? "email")} />
  </>;
}

export default async function ReplyReview({ params }: { params: Promise<{ id: string; replyId: string }> }) {
  const { id, replyId } = await params;
  const { ctx, user } = await pilotCtx();
  const c = await ctx.db.query.arCase.findFirst({ where: and(eq(arCase.id, id), eq(arCase.firmId, ctx.firmId)) });
  if (!c) notFound();
  let data: Awaited<ReturnType<typeof replyForReview>>;
  try { data = await replyForReview(ctx, replyId); } catch { notFound(); }
  const { reply, mail, items } = data;
  if (reply.caseId !== c.id) notFound();
  const cl = (await ctx.db.query.client.findFirst({ where: and(eq(clientT.id, c.clientId), eq(clientT.firmId, ctx.firmId)) }))!;
  const users = await ctx.db.select().from(appUser).where(eq(appUser.firmId, ctx.firmId));
  const who = (u: string | null) => users.find((x) => x.id === u)?.name ?? "";
  const opened = !!reply.opens[user?.id ?? ctx.userId];
  const reviewed = !!reply.reviewedAt;
  const canDecide = opened && !reviewed;
  const charges = items.find((i) => i.kind === "charges");
  const rest = items.filter((i) => i.kind !== "charges");
  const undecided = items.filter((i) => i.status === "proposed").length;
  const unread = reply.attachments.filter((a) => !a.read);
  return (
    <div className="an-case">
      <Link href={`/annual/${id}`} className="back">← {cl.nameEn}</Link>
      <h1>Reply from {mail.fromName ?? mail.fromAddr}</h1>
      <div className="muted" style={{ marginTop: 4 }}>{mail.subject || "(no subject)"} · {fmt(mail.receivedAt, true)}</div>
      {reviewed && <div className="banner ok" style={{ marginTop: 18 }}>Reviewed by {who(reply.reviewedBy)} on {fmt(reply.reviewedAt, true)}.</div>}
      {reply.status === "failed" && <div className="banner amber" style={{ marginTop: 18 }}>Clerk couldn&apos;t read this email. Read it yourself and record what it says.</div>}
      {reply.status === "read" && reply.about === "other" && <div className="banner blue" style={{ marginTop: 18 }}>Clerk read this as not about the annual return. If it is, add what it says below.</div>}

      <section className="an-step">
        <h2>The email</h2>
        {reply.summary && <p>Clerk&apos;s summary: {reply.summary}</p>}
        {!opened ? <>
          <p>Open it to check each point. Nothing can be accepted before you do.</p>
          <ActionButton action={A.openSourceAction.bind(null, reply.id)} tone="primary">Open the email</ActionButton>
        </> : <>
          <pre className="an-source">{mail.text}</pre>
          {mail.attachments.length > 0 && <ul className="an-files">
            {mail.attachments.map((a, n) => {
              const r = reply.attachments[n];
              return <li key={n}><a className="lnk" href={`/api/annual/mail/${mail.id}/${n}`} target="_blank" rel="noreferrer">{a.filename}</a>{r && !r.read && <span className="an-flag">Not read by Clerk: {r.reason}</span>}</li>;
            })}
          </ul>}
        </>}
        {!opened && unread.length > 0 && <p className="small" style={{ marginTop: 14, marginBottom: 0 }}><span className="an-flag">{unread.length === 1 ? "1 attachment wasn't" : `${unread.length} attachments weren't`} read by Clerk</span></p>}
      </section>

      {charges && <section className="an-step">
        <h2>Mortgages or charges</h2>
        {charges.proposed && <p>Clerk&apos;s reading: {CHARGES[String((charges.proposed as V).answer)]}{(charges.proposed as V).details ? ` (${(charges.proposed as V).details})` : ""}.</p>}
        {charges.proposed && (charges.proposed as V).quote && <blockquote className="an-quote">{String((charges.proposed as V).quote)}{(charges.proposed as V).quoteFound === false && <span className="an-flag">These words aren&apos;t in the email text</span>}</blockquote>}
        {charges.status !== "proposed" ? <p className="an-done">You recorded: {CHARGES[String((charges.final as V).answer)]}{(charges.final as V).details ? ` (${(charges.final as V).details})` : ""} · {who(charges.decidedBy)}</p>
          : canDecide ? <ActionForm action={A.answerChargesAction.bind(null, charges.id)} submit="Save the answer">
            <label className="an-choice"><input type="radio" name="answer" value="none" /> No mortgages or charges</label>
            <label className="an-choice"><input type="radio" name="answer" value="has_charges" /> Has mortgages or charges</label>
            <label className="an-choice"><input type="radio" name="answer" value="not_answered" /> Not answered in this email</label>
            <label className="an-field">Details of the charge, if any<textarea name="details" /></label>
          </ActionForm> : <p className="small muted" style={{ marginBottom: 0 }}>You enter this answer yourself after opening the email.</p>}
      </section>}

      {rest.map((i) => {
        const v = (i.final ?? i.proposed ?? {}) as V;
        const p = (i.proposed ?? {}) as V;
        const title = i.kind === "change" ? `${changeLabel(String(v.changeType))}${v.subject ? `: ${v.subject}` : ""}` : i.kind === "signed_papers" ? PAPER[String(v.document)] ?? "Signed document" : DOC[String(v.docType)] ?? "Document";
        return (
          <section key={i.id} className="an-step">
            <h2>{title}</h2>
            <p>{i.kind === "change" ? <>{String(v.detail)}{v.effectiveDate ? ` Effective ${fmt(String(v.effectiveDate))}.` : " No date given."}</> : i.kind === "document" ? String(v.description ?? "") : "A scan by email. The case still waits for the signed original."}{v.filename || (v.source && v.source !== "email") ? ` From ${v.filename ?? v.source}.` : ""}</p>
            {p.quote && <blockquote className="an-quote">{String(p.quote)}{p.quoteFound === false && <span className="an-flag">These words aren&apos;t in the email text</span>}</blockquote>}
            {i.status !== "proposed" ? <p className="an-done">{DONE[i.status]} · {who(i.decidedBy)}</p> : canDecide ? <>
              <div className="row">
                <ActionButton action={A.acceptItemAction.bind(null, i.id)} tone="primary">Accept</ActionButton>
                <ActionButton action={A.rejectItemAction.bind(null, i.id)}>Reject</ActionButton>
              </div>
              {i.kind === "change" && <details className="an-more an-inner"><summary>Correct it</summary>
                <ActionForm action={A.editChangeAction.bind(null, i.id)} submit="Save the correction" tone="secondary"><ChangeFields v={p} /></ActionForm>
              </details>}
            </> : null}
          </section>
        );
      })}

      {canDecide && <>
        <details className="an-more">
          <summary>Add something Clerk missed</summary>
          <ActionForm action={A.addMissedAction.bind(null, reply.id)} submit="Add the change" tone="secondary" resetOnSuccess>
            <input type="hidden" name="kind" value="change" /><ChangeFields />
          </ActionForm>
          <div style={{ marginTop: 20 }}>
            <ActionForm action={A.addMissedAction.bind(null, reply.id)} submit="Add signed papers" tone="secondary" resetOnSuccess>
              <input type="hidden" name="kind" value="signed_papers" />
              <label className="an-field">Signed papers attached<select name="document" defaultValue="annual_return"><option value="annual_return">Annual return</option><option value="agm_papers">AGM papers</option><option value="other">Other</option></select></label>
            </ActionForm>
          </div>
          {!charges && c.kind === "AR" && <div style={{ marginTop: 20 }}>
            <ActionForm action={A.addMissedAction.bind(null, reply.id)} submit="Add the charges answer" tone="secondary">
              <input type="hidden" name="kind" value="charges" />
              <label className="an-choice"><input type="radio" name="answer" value="none" /> No mortgages or charges</label>
              <label className="an-choice"><input type="radio" name="answer" value="has_charges" /> Has mortgages or charges</label>
              <label className="an-field">Details of the charge, if any<textarea name="details" /></label>
            </ActionForm>
          </div>}
        </details>
        <section className="an-finish">
          <ActionForm action={A.finishReviewAction.bind(null, id, reply.id)} submit="Nothing else in this email" />
          {undecided > 0 && <p className="small muted" style={{ margin: "8px 0 0" }}>{undecided === 1 ? "1 point" : `${undecided} points`} still to decide.</p>}
        </section>
      </>}
    </div>
  );
}
