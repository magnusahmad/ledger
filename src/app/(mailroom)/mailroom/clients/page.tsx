// The client index the mail room matches against: a read-only copy of the firm's records.
// Shows where each client comes from, details that disagree between sources, and clients
// no longer in any source. Fixing a clash happens in the firm's own files.
import Link from "next/link";
import { LiveRefresh } from "@/components/LiveRefresh";
import { getMailroom } from "@/server/mailroom";
import { clients } from "@/mailroom/service";
import { lastSync } from "@/mailroom/client-sync";
import { fmt } from "@/components/ui";

const FIELD: Record<string, string> = { code: "Client code", name: "Name", nameZh: "Chinese name", brNo: "BR number", irdFileNo: "IRD file number", crNo: "CR number", mpfNo: "MPF number", contactName: "Contact", contactEmail: "Email", language: "Language", folder: "Folder" };

export default async function MailroomClients() {
  const { ctx, mr } = getMailroom();
  const all = await clients(ctx);
  const sync = await lastSync(ctx);
  const clashes = all.filter((c) => c.active && c.conflicts.length);
  const off = all.filter((c) => !c.active);
  return (
    <div className="mr-narrow">
      <LiveRefresh src="/api/mailroom/live" intervalMs={5000} />
      <Link className="back" href="/mailroom">‹ Today</Link>
      <h1>Clients</h1>
      <p className="sub">{all.length - off.length} clients, read from {(mr.clientSources ?? []).map((s) => s.name).join(" and ") || "the client list"}{sync?.at ? `, checked ${fmt(sync.at, true)}` : ""}. Change them in your own files; this list follows.</p>
      {clashes.length > 0 && <>
        <h2 style={{ marginTop: 32 }}>Details that disagree</h2>
        <p className="small muted">The first source listed is used until the records agree.</p>
        <div className="mr-done-list">
          {clashes.map((c) => (
            <div key={c.id} className="mr-done-row" style={{ alignItems: "flex-start" }}>
              <div><b>{c.code ? `${c.code} ` : ""}{c.name}</b>
                {c.conflicts.map((k) => <div key={k.field} className="small muted">{FIELD[k.field] ?? k.field}: {k.values.map((v) => `${v.value} (${v.source})`).join(" or ")}</div>)}
              </div>
            </div>
          ))}
        </div>
      </>}
      {off.length > 0 && <>
        <h2 style={{ marginTop: 32 }}>No longer in your records</h2>
        <p className="small muted">Kept so letters already filed stay linked, but no longer offered for new letters.</p>
        <div className="mr-done-list">{off.map((c) => <div key={c.id} className="mr-done-row"><div><b>{c.code ? `${c.code} ` : ""}{c.name}</b></div></div>)}</div>
      </>}
      <h2 style={{ marginTop: 32 }}>All clients</h2>
      <div className="mr-done-list">
        {all.filter((c) => c.active).map((c) => (
          <div key={c.id} className="mr-done-row"><div><b>{c.code ? `${c.code} ` : ""}{c.name}</b><div className="small muted">{[c.irdFileNo && `IRD ${c.irdFileNo}`, c.brNo && `BR ${c.brNo}`, c.contactEmail].filter(Boolean).join(" · ") || "No reference numbers yet"}</div></div></div>
        ))}
      </div>
    </div>
  );
}
