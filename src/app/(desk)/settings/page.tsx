import Link from "next/link";
import { getCtx } from "@/server/ctx";
import { getFirm } from "@/domain/firm";
import { listSecretNames } from "@/domain/secrets";
import { kvGet } from "@/domain/kv";
import { Pill } from "@/components/ui";

export default async function Settings({ searchParams }: { searchParams: Promise<{ connected?: string }> }) {
  const { connected } = await searchParams;
  const ctx = getCtx();
  const c = ctx.config;
  const firm = await getFirm(ctx);
  const secrets = await listSecretNames(ctx);
  const gmailAddress = await kvGet<string>(ctx, "gmail.address");
  const rows: { name: string; mode: string; live: boolean; note: string }[] = [
    { name: "Product AI (OpenRouter)", mode: c.llmMode === "live" ? c.LLM_MODEL : "Not configured", live: c.llmMode === "live", note: `Reasoning effort: ${c.LLM_REASONING}. Used only for reading, extracting, drafting and screening adjudication.` },
    { name: "Email", mode: c.mailProvider === "gmail" ? `Gmail${gmailAddress ? ` (${gmailAddress})` : ""}` : c.mailProvider === "agentmail" ? `AgentMail (${c.AGENTMAIL_INBOX})` : "Demo mailbox (Dev inbox)", live: c.mailProvider !== "fake", note: c.mailProvider === "gmail" && !secrets.some((s) => s.name === "gmail.refresh_token") ? "Client keys set, mailbox not connected yet." : "Polled every few seconds; replies are sent in the same thread after approval." },
    { name: "Bank (Airwallex)", mode: c.bankProvider === "airwallex" ? `Sandbox (${c.AIRWALLEX_BASE_URL})` : "Demo bank", live: c.bankProvider === "airwallex", note: "Deposits matched on invoice number and amount." },
    { name: "Accounting (Xero via MCP)", mode: c.accountingProvider === "xero" ? "Xero MCP server" : "Demo ledger", live: c.accountingProvider === "xero", note: "Invoices and payments synced after approval." },
    { name: "Screening (OpenSanctions)", mode: c.screeningProvider === "opensanctions-api" ? "Hosted API (sanctions + PEPs)" : "Local sanctions list", live: true, note: "Hits are adjudicated by the agent and decided by staff." },
  ];
  return (
    <>
      <div className="top"><div><h1>Settings</h1><p className="sub">{firm.legalName} · {firm.tcspLicence}</p></div><Link href="/demo" className="btn sec2">Demo panel</Link></div>
      {connected === "gmail" && <div className="banner ok">Gmail connected. New mail will be picked up within seconds.</div>}
      <div className="card tight scroll-x"><table className="tbl"><thead><tr><th>Integration</th><th>Mode</th><th></th><th>Notes</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.mode}</td><td><Pill tone={r.live ? "ok" : undefined}>{r.live ? "Live" : "Demo"}</Pill></td><td className="small muted">{r.note}</td></tr>)}</tbody></table></div>
      {c.GOOGLE_CLIENT_ID && <p><a className="btn" href="/api/integrations/gmail/start">{secrets.some((s) => s.name === "gmail.refresh_token") ? "Reconnect Gmail" : "Connect Gmail"}</a></p>}
      <p className="small muted">Credentials are stored encrypted and never displayed. Stored: {secrets.map((s) => s.name).join(", ") || "none"}. Setup steps: docs/SETUP_INTEGRATIONS.md.</p>
    </>
  );
}
