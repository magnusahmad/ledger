import Link from "next/link";
import { getCtx } from "@/server/ctx";
import { getFirm } from "@/domain/firm";
import { listSecretNames } from "@/domain/secrets";
import { kvGet } from "@/domain/kv";
import { Pill } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { chaseRulesAction } from "@/server/actions";
import { chaseRules } from "@/domain/chasing";

export default async function Settings({ searchParams }: { searchParams: Promise<{ connected?: string }> }) {
  const { connected: connected_ } = await searchParams;
  const ctx = getCtx();
  const c = ctx.config;
  const firm = await getFirm(ctx);
  const secrets = await listSecretNames(ctx);
  const gmailAddress = await kvGet<string>(ctx, "gmail.address");
  const rules = await chaseRules(ctx);
  const connected = (live: boolean, text: string) => (live ? text : "Not connected");
  const rows: { name: string; mode: string; live: boolean; note: string }[] = [
    { name: "AI model", mode: connected(c.llmMode === "live", c.LLM_MODEL), live: c.llmMode === "live", note: "Reads messages and documents, drafts replies and reviews screening hits. Staff approve everything it prepares." },
    { name: "Email", mode: c.mailProvider === "gmail" ? `Gmail${gmailAddress ? ` · ${gmailAddress}` : ""}` : c.mailProvider === "agentmail" ? `AgentMail · ${c.AGENTMAIL_INBOX}` : "Not connected", live: c.mailProvider !== "fake", note: c.mailProvider === "gmail" && !secrets.some((s) => s.name === "gmail.refresh_token") ? "Mailbox not connected yet." : "Replies go out in the same thread once approved." },
    { name: "Bank", mode: connected(c.bankProvider === "airwallex", "Airwallex"), live: c.bankProvider === "airwallex", note: "Deposits are matched to invoices by number and amount." },
    { name: "Accounting", mode: connected(c.accountingProvider === "xero", "Xero"), live: c.accountingProvider === "xero", note: "Invoices and payments are added once approved." },
    { name: "Screening", mode: c.screeningProvider === "opensanctions-api" ? "OpenSanctions · sanctions and PEPs" : "OpenSanctions · sanctions list", live: true, note: "Possible matches are reviewed by staff." },
  ];
  return (
    <>
      <div className="top"><div><h1>Settings</h1><p className="sub">{firm.legalName} · TCSP licence {firm.tcspLicence}</p></div></div>
      {connected_ === "gmail" && <div className="banner ok">Gmail connected.</div>}
      <section className="sec"><div className="sec-h"><h2>Connections</h2>{c.GOOGLE_CLIENT_ID && <a className="btn sm sec2" href="/api/integrations/gmail/start">{secrets.some((s) => s.name === "gmail.refresh_token") ? "Reconnect Gmail" : "Connect Gmail"}</a>}</div>
        <div className="card tight scroll-x"><table className="tbl"><thead><tr><th>Service</th><th>Account</th><th>Status</th><th className="hide-sm">What it does</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.mode}</td><td><Pill tone={r.live ? "ok" : undefined}>{r.live ? "Connected" : "Off"}</Pill></td><td className="small muted hide-sm">{r.note}</td></tr>)}</tbody></table></div>
        <p className="small muted">Credentials are stored encrypted and are never shown.</p>
      </section>
      <section className="sec"><div className="sec-h"><h2>Chasing</h2></div>
        <div className="card" style={{ maxWidth: 760 }}>
          <p className="small muted" style={{ marginTop: 0 }}>When a client owes information or signatures, Harbourline drafts a reminder for you to approve. It escalates, and adds a call to the task, when the deadline is close or reminders go unanswered.</p>
          <ActionForm action={chaseRulesAction} submit="Save">
            <div className="grid2">
              <div><label className="f" htmlFor="cr1">First reminder after (days)</label><input id="cr1" type="number" name="firstAfterDays" min={1} max={365} defaultValue={rules.firstAfterDays} /></div>
              <div><label className="f" htmlFor="cr2">Then every (days)</label><input id="cr2" type="number" name="repeatEveryDays" min={1} max={365} defaultValue={rules.repeatEveryDays} /></div>
              <div><label className="f" htmlFor="cr3">Escalate when the deadline is within (days)</label><input id="cr3" type="number" name="escalateWithinDays" min={1} max={365} defaultValue={rules.escalateWithinDays} /></div>
              <div><label className="f" htmlFor="cr4">Escalate after this many reminders</label><input id="cr4" type="number" name="escalateAfterChases" min={1} max={365} defaultValue={rules.escalateAfterChases} /></div>
            </div>
          </ActionForm>
        </div>
      </section>
      <section className="sec"><div className="sec-h"><h2>Reports</h2></div>
        <div className="card tight"><ul className="list"><li className="item"><div className="main"><Link className="t" href="/reports">Time saved</Link><div className="m">Estimated manual work handled, and recorded approval time</div></div></li></ul></div>
      </section>
    </>
  );
}
