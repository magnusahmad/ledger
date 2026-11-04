import { pilotCtx } from "@/server/pilot";
import { mailWaiting } from "@/annual/mail-sync";
import { readHealth } from "@/annual/cycle";
import { ActionForm } from "@/components/ActionForm";
import { resolveAskAction } from "@/server/annual-actions";
import { fmt } from "@/components/ui";

export default async function MailToSort() {
  const { ctx } = await pilotCtx();
  const [waiting, health] = [await mailWaiting(ctx), await readHealth(ctx)];
  return (
    <div className="an-case">
      <h1>Emails to sort</h1>
      <p className="sub">These came from a contact shared by more than one company in this cycle. Everything else unrelated stays in Outlook only.</p>
      {waiting.length === 0 ? <p className="empty" style={{ marginTop: 24 }}>Nothing to sort.</p> : waiting.map((m) => (
        <section key={m.id} className="an-step">
          <h2>{m.subject || "(no subject)"}</h2>
          <p className="small">{m.fromName ?? m.fromAddr} · {fmt(m.receivedAt, true)}</p>
          <ActionForm action={resolveAskAction.bind(null, m.id)} submit="Save">
            {m.candidates.map((c) => <label key={c.id} className="an-choice"><input type="radio" name="caseId" value={c.id} /> {c.name}</label>)}
            <label className="an-choice"><input type="radio" name="caseId" value="none" /> Not about an annual return</label>
          </ActionForm>
        </section>
      ))}
      {health?.lastMailSyncAt && <p className="small muted" style={{ marginTop: 28 }}>Mailboxes last read {fmt(health.lastMailSyncAt, true)}.</p>}
    </div>
  );
}
