import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { todayData } from "@/server/queries";
import { LiveRefresh } from "@/components/LiveRefresh";
import { DeadlineStamp, Pill, ago, fmt } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { batchAction } from "@/server/actions";
import { message } from "@/db/schema";
import { money } from "@/domain/labels";
import { plural, waitingLabel } from "@/lib/display";
import { outsideWork } from "@/domain/off-platform";

const KIND_LABEL: Record<string, string> = {
  send_message: "Reply to approve", record_filing: "Record filing", register_change: "Register update", send_signing: "Signing pack",
  match_payment: "Payment to check", screening_review: "Screening hit", conflict: "Conflicting details", custom_plan: "One-off plan",
  cancel_task: "Cancellation", mailbox_update: "Mailbox reply", start_enforcement: "Enforcement", triage: "Needs a look", change_request: "Change of scope", revise_invoice: "Invoice revision", new_request: "New request",
};
const KIND_TONE: Record<string, "amber" | "red" | "blue" | "ok" | undefined> = { start_enforcement: "red", screening_review: "red", conflict: "amber", triage: "amber", match_payment: "amber", send_message: "blue" };

export default async function Today() {
  const ctx = getCtx();
  const d = await todayData(ctx);
  const today = ctx.clock.today();
  const outside = await outsideWork(ctx);
  const reading = await ctx.db.select().from(message).where(and(eq(message.firmId, ctx.firmId), eq(message.direction, "in"), isNull(message.processedAt)));
  return (
    <>
      <div className="top">
        <div>
          <h1>Today</h1>
          <p className="sub">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Hong_Kong" })} {d.proposals.length ? ` · ${d.proposals.length} thing${d.proposals.length > 1 ? "s" : ""} need${d.proposals.length > 1 ? "" : "s"} you` : ""}</p>
        </div>
        <div className="row"><LiveRefresh /><Link href="/new" className="btn">New request</Link></div>
      </div>

      <section className="sec" aria-labelledby="needs">
        <div className="sec-h"><h2 id="needs">Needs you</h2></div>
        <div className="card tight">
          {reading.map((m) => (
            <div key={m.id} className="item new-flash">
              <div className="main"><div className="t">New email from {m.fromName ?? m.fromAddr}</div><div className="m">{m.subject ? `${m.subject} · ` : ""}Reading it now</div></div>
              <Pill tone="blue">Reading</Pill>
            </div>
          ))}
          {d.proposals.length === 0 && reading.length === 0 && <p className="empty">You’re all caught up.</p>}
          <ul className="list">
            {d.proposals.map((p) => (
              <li key={p.id} className="item">
                <div className="main">
                  <Link href={`/review/${p.id}`} className="t" style={{ textDecoration: "none" }}>{p.title}</Link>
                  <div className="m">{p.clientName ? <>{p.clientName}{p.clientLifecycle === "prospect" ? " · new prospect" : ""} · </> : null}{ago(p.createdAt)}{p.summary ? ` · ${p.summary.split("\n")[0].slice(0, 140)}` : ""}</div>
                </div>
                <div className="row">{p.payload.purpose === "chase" ? <Pill tone={p.payload.escalation ? "red" : "amber"}>{p.payload.escalation ? "Escalation" : "Reminder"}</Pill> : KIND_TONE[p.kind] && KIND_TONE[p.kind] !== "blue" && <Pill tone={KIND_TONE[p.kind]}>{KIND_LABEL[p.kind] ?? p.kind}</Pill>}<Link className="btn sm" href={`/review/${p.id}`}>Review</Link></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {d.deadlines.length > 0 && (
        <section className="sec" aria-labelledby="dl">
          <div className="sec-h"><h2 id="dl">Upcoming deadlines</h2><span className="small muted">Next 30 days, not yet started</span></div>
          <div className="card tight"><ul className="list">
            {d.deadlines.map((x) => (
              <li key={`${x.clientId}-${x.periodKey}`} className="item">
                <div className="main"><div className="t">{x.label}</div><div className="m"><Link href={`/clients/${x.clientId}`}>{x.clientName}</Link> · Due {fmt(x.dueDate)}</div></div>
                <div className="row">
                  <DeadlineStamp dueDate={x.dueDate} today={today} />
                  <ActionForm action={batchAction} submit="Start" tone="secondary">
                    <input type="hidden" name="playbookId" value={x.playbookId} /><input type="hidden" name="clientId" value={x.clientId} /><input type="hidden" name="periodYear" value={x.periodYear} />
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul></div>
        </section>
      )}

      {outside.length > 0 && (
        <section className="sec" aria-labelledby="out">
          <div className="sec-h"><h2 id="out">Outside the platform</h2><span className="small muted">Off-platform steps and tasks on hold</span></div>
          <div className="card tight"><ul className="list">
            {outside.map((r) => (
              <li key={`${r.kind}-${r.id}`} className="item">
                <div className="main"><Link href={`/tasks/${r.taskId}`} className="t">{r.kind === "hold" ? `On hold: ${r.title}` : r.title}</Link>
                  <div className="m">{r.clientName} · {r.taskTitle} · Waiting on {r.partyName ?? waitingLabel(r.waitingOn).toLowerCase()}</div></div>
                <div className="row">{r.followUpDue ? <Pill tone="amber">{(r.followUpOn ?? r.dueDate)! < today ? "Follow-up overdue" : "Follow up today"}</Pill> : (r.followUpOn || r.dueDate) ? <span className="small muted">{r.followUpOn ? `Follow up ${fmt(r.followUpOn)}` : `Due ${fmt(r.dueDate)}`}</span> : null}</div>
              </li>
            ))}
          </ul></div>
        </section>
      )}

      {d.overdue.length > 0 && (
        <section className="sec" aria-labelledby="ov">
          <div className="sec-h"><h2 id="ov">Overdue invoices</h2><Link href="/invoices" className="small">All invoices</Link></div>
          <div className="card tight"><ul className="list">
            {d.overdue.map((i) => (
              <li key={i.id} className="item">
                <div className="main"><Link href={`/invoices/${i.id}`} className="t">{i.number}</Link><div className="m">{i.clientName} · {money(i.totalCents - i.paidCents)} outstanding</div></div>
                <DeadlineStamp dueDate={i.dueOn} today={today} />
              </li>
            ))}
          </ul></div>
        </section>
      )}

      <div className="grid2">
        <section className="sec" aria-labelledby="wc">
          <div className="sec-h"><h2 id="wc">Waiting on clients</h2></div>
          <div className="card tight"><ul className="list">
            {d.waitingClient.length === 0 && <li className="empty">Nothing waiting.</li>}
            {d.waitingClient.map((t) => (
              <li key={t.id} className="item">
                <div className="main"><Link href={`/tasks/${t.id}`} className="t">{t.title}</Link><div className="m">{t.clientName} · {t.stepKind === "sign" ? "Signatures" : plural(t.outstanding.length, "item") + " outstanding"}</div></div>
              </li>
            ))}
          </ul></div>
        </section>
        <section className="sec" aria-labelledby="ap">
          <div className="sec-h"><h2 id="ap">Awaiting payment</h2></div>
          <div className="card tight"><ul className="list">
            {d.awaitingPayment.length === 0 && <li className="empty">Nothing waiting.</li>}
            {d.awaitingPayment.map((t) => (
              <li key={t.id} className="item">
                <div className="main"><Link href={`/tasks/${t.id}`} className="t">{t.title}</Link><div className="m">{t.clientName}{t.invoice ? ` · ${t.invoice.number}` : ""}</div></div>
                {t.invoice && <span className="small" style={{ fontVariantNumeric: "tabular-nums" }}>{t.invoice.total}</span>}
              </li>
            ))}
          </ul></div>
        </section>
      </div>

      {d.working.length > 0 && (
        <section className="sec" aria-labelledby="wk">
          <div className="sec-h"><h2 id="wk">In progress</h2><Link href="/tasks" className="small">All tasks</Link></div>
          <div className="card tight"><ul className="list">
            {d.working.map((t) => (
              <li key={t.id} className="item">
                <div className="main"><Link href={`/tasks/${t.id}`} className="t">{t.title}</Link><div className="m">{t.clientName} · {t.stepLabel}</div></div>
                <div className="row"><DeadlineStamp dueDate={t.dueDate} today={today} nearOnly />{t.waitingOn === "you" && <Pill tone="blue">With you</Pill>}</div>
              </li>
            ))}
          </ul></div>
        </section>
      )}

      {d.done.length > 0 && (
        <section className="sec" aria-labelledby="dn">
          <div className="sec-h"><h2 id="dn">Completed this week</h2></div>
          <div className="card tight"><ul className="list">
            {d.done.map((t) => (<li key={t.id} className="item"><div className="main"><Link href={`/tasks/${t.id}`} className="t">{t.title}</Link><div className="m">{t.clientName} · {ago(t.completedAt)}</div></div><Pill tone="ok">Done</Pill></li>))}
          </ul></div>
        </section>
      )}
    </>
  );
}
