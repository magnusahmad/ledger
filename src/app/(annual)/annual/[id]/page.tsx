import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { pilotCtx } from "@/server/pilot";
import { arCase, client as clientT, appUser } from "@/db/schema";
import { caseEvents } from "@/annual/cases";
import { caseMail } from "@/annual/mail-sync";
import { nextStep } from "@/annual/next-step";
import { DeadlineStamp, fmt } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/ActionForm";
import * as A from "@/server/annual-actions";

const STEP: Record<string, string> = {
  started_at_stage: "Joined the pilot part-way", registry_check: "Registry checked", prepared: "Papers prepared", form_compare: "Compared with CSA's form",
  payment_confirmed: "Payment confirmed", draft_created: "Email drafted", sent: "Email sent", signed_received: "Signed copy received", filed: "Filed", registered: "Registered", gate_defect: "Email linked by hand",
};
const STAGES: [string, string][] = [["prepared", "Papers prepared"], ["payment_confirmed", "Payment confirmed"], ["sent", "Sent to the client"], ["signed_received", "Signed copy back"], ["filed", "Filed with the Registry"]];

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx } = await pilotCtx();
  const c = await ctx.db.query.arCase.findFirst({ where: and(eq(arCase.id, id), eq(arCase.firmId, ctx.firmId)) });
  if (!c) notFound();
  const cl = (await ctx.db.query.client.findFirst({ where: eq(clientT.id, c.clientId) }))!;
  const [events, mail, users] = [await caseEvents(ctx, id), await caseMail(ctx, id), await ctx.db.select().from(appUser).where(eq(appUser.firmId, ctx.firmId))];
  const who = (u: string) => users.find((x) => x.id === u)?.name ?? (u.startsWith("system:") ? "Harbourline" : u);
  const n = nextStep(c);
  const today = ctx.clock.today();
  return (
    <div className="an-case">
      <Link href="/annual" className="back">← All due</Link>
      <h1>{cl.nameEn}</h1>
      {cl.nameTc && <div className="muted" style={{ marginTop: 2 }}>{cl.nameTc}</div>}
      <div className="row" style={{ marginTop: 6 }}>
        <span className="muted">{c.kind === "AR" ? "Annual return" : "AGM"} {c.periodYear}{cl.code ? ` · ${cl.code}` : ""}</span>
        <DeadlineStamp dueDate={c.dueDate} today={today} />
      </div>

      <section className="an-step">
        {n === "registry_check" && <>
          <h2>Check the Registry</h2>
          <p>Look at the company&apos;s document index on the Registry&apos;s e-Services portal for anything filed since last year that CSA doesn&apos;t show.</p>
          <ActionForm action={A.registryCheckAction.bind(null, id)} submit="Save">
            <label className="an-choice"><input type="radio" name="result" value="no_changes" /> Nothing new</label>
            <label className="an-choice"><input type="radio" name="result" value="changes_found" /> Something changed</label>
            <label className="an-field">What changed (if anything)<textarea name="note" /></label>
          </ActionForm>
        </>}
        {n === "prepare" && <>
          <h2>Prepare the papers</h2>
          <p>{c.kind === "AR" ? "Harbourline fills the annual return from CSA and saves it to the client folder. Some companies need CSA's own form." : "Prepare the AGM papers in Word as usual, then mark them ready."}</p>
          {c.kind === "AR" && <ActionForm action={A.prepareAction.bind(null, id)} submit="Prepare the annual return">
            <label className="an-field">Return-by date for the client (optional)<input type="date" name="returnBy" defaultValue={c.returnBy ?? ""} /></label>
          </ActionForm>}
          <div style={{ marginTop: 12 }}><ActionButton action={A.useCsaFormAction.bind(null, id)}>{c.kind === "AR" ? "I'll use CSA's form" : "Papers are ready"}</ActionButton></div>
        </>}
        {n === "compare" && <>
          <h2>Compare with CSA&apos;s form</h2>
          <p>Print CSA&apos;s version and check it against <a className="lnk" href={`/api/annual/form/${id}`} target="_blank" rel="noreferrer">the one Harbourline prepared</a>. This tells us whether the generated form can replace CSA&apos;s.</p>
          <ActionForm action={A.compareAction.bind(null, id)} submit="Save">
            <label className="an-choice"><input type="radio" name="same" value="yes" /> They match</label>
            <label className="an-choice"><input type="radio" name="same" value="no" /> They differ</label>
            <label className="an-field">What differs<textarea name="notes" /></label>
          </ActionForm>
        </>}
        {n === "confirm_payment" && <>
          <h2>Has the client paid?</h2>
          <p>Check with accounting. Nothing goes to the client until payment is confirmed.</p>
          <ActionButton action={A.confirmPaymentAction.bind(null, id)} tone="primary">Payment confirmed</ActionButton>
        </>}
        {n === "draft" && <>
          <h2>Draft the email</h2>
          <p>A draft goes to your Outlook Drafts folder, in the contact&apos;s language, with the annual return attached. You review and send it from Outlook.</p>
          <ActionForm action={A.draftAction.bind(null, id)} submit="Create the draft">
            <label className="an-field">Return-by date (optional)<input type="date" name="returnBy" defaultValue={c.returnBy ?? ""} /></label>
            <label className="an-choice" style={{ marginTop: 12 }}><input type="checkbox" name="includeAgm" /> Include the AGM section (attach the AGM papers in Outlook)</label>
          </ActionForm>
        </>}
        {n === "wait_sent" && <>
          <h2>Send the draft from Outlook</h2>
          <p>It&apos;s in {c.draft?.mailbox}&apos;s Drafts folder. Harbourline notices when it&apos;s sent.</p>
          <ActionButton action={A.markSentAction.bind(null, id)}>I&apos;ve sent it</ActionButton>
        </>}
        {n === "signed_received" && <>
          <h2>Signed copy back?</h2>
          <p>Mark it when the signed papers arrive.</p>
          <ActionButton action={A.signedAction.bind(null, id)} tone="primary">Signed copy received</ActionButton>
        </>}
        {n === "filed" && <>
          <h2>Record filing</h2>
          <ActionForm action={A.filedAction.bind(null, id)} submit="Save"><label className="an-field">Delivered to the Registry on<input type="date" name="filedOn" defaultValue={today} /></label></ActionForm>
        </>}
        {n === "registered" && <>
          <h2>Record registration</h2>
          <ActionForm action={A.registeredAction.bind(null, id)} submit="Save">
            <label className="an-field">Registered on<input type="date" name="registeredOn" defaultValue={today} /></label>
            <label className="an-field">Registry receipt number (optional)<input type="text" name="reference" /></label>
          </ActionForm>
        </>}
        {n === null && <><h2>Done</h2><p>Registered on {fmt(c.registeredOn)}.</p></>}
      </section>

      {c.stage === "due" && events.length === 0 && (
        <details className="an-more">
          <summary>Already part-way through?</summary>
          <p className="small muted" style={{ margin: "12px 0" }}>If this one was started before the pilot, pick where it is now. This can be set once.</p>
          <ActionForm action={A.startAtStageAction.bind(null, id)} submit="Set stage" tone="secondary">
            <label className="an-field">It&apos;s at<select name="stage" defaultValue="">{[["", "Choose…"], ...STAGES].map(([v, l]) => <option key={v} value={v} disabled={!v}>{l}</option>)}</select></label>
          </ActionForm>
        </details>
      )}
      <details className="an-more">
        <summary>Emails ({mail.length})</summary>
        {mail.length === 0 ? <p className="empty">No emails linked yet.</p> : mail.map((m) => (
          <div key={m.id} className="an-mail">
            <div className="row" style={{ justifyContent: "space-between" }}><b style={{ fontWeight: 500 }}>{m.direction === "in" ? m.fromName ?? m.fromAddr : `To ${m.toAddrs.join(", ")}`}</b><span className="small muted">{fmt(m.receivedAt, true)}</span></div>
            <div className="small">{m.subject}{m.attachments.length ? ` · ${m.attachments.map((a) => a.filename).join(", ")}` : ""}</div>
            <pre>{m.text.slice(0, 1200)}</pre>
          </div>
        ))}
      </details>
      <details className="an-more">
        <summary>History ({events.length})</summary>
        {events.map((e) => <div key={e.id} className="an-ev"><span>{STEP[e.kind] ?? e.kind} · {who(e.userId)}</span><span className="muted small">{fmt(e.at, true)}</span></div>)}
      </details>
    </div>
  );
}
