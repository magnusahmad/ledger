import Link from "next/link";
import { LiveRefresh } from "@/components/LiveRefresh";
import { getMailroom } from "@/server/mailroom";
import { batches, clients } from "@/mailroom/service";
import { lastSync } from "@/mailroom/client-sync";
import { fmt } from "@/components/ui";
import { AddScan } from "./ui";

export default async function MailroomToday() {
  const { ctx, mr } = getMailroom();
  const list = await batches(ctx);
  const sync = await lastSync(ctx);
  const all = await clients(ctx);
  const active = all.filter((c) => c.active).length;
  const clashes = all.filter((c) => c.active && c.conflicts.length).length;
  return (
    <div className="mr-narrow">
      <LiveRefresh src="/api/mailroom/live" intervalMs={2000} />
      <h1>Today&apos;s post</h1>
      <p className="sub">Scan letters as usual. Each one appears here to check before it&apos;s filed.</p>
      <div style={{ marginTop: 32 }}>
        {list.length === 0 && <p className="empty">No scans yet.</p>}
        {list.map((b) => {
          const status = b.status === "failed" ? `Couldn't read this scan: ${b.error}`
            : b.status !== "ready" ? (b.letters ? `Reading ${b.letters} ${b.letters === 1 ? "letter" : "letters"}…` : "Reading…")
            : b.toReview ? `${b.toReview} to check` : "All filed";
          return (
            <Link key={b.id} href={`/mailroom/${b.id}`} className="mr-batch">
              <div><b>Scan at {fmt(b.receivedAt, true)}</b><span className="small muted">{b.letters ? `${b.letters} ${b.letters === 1 ? "letter" : "letters"}` : b.filename}</span></div>
              <span className={`pill${b.status === "failed" ? " red" : b.toReview ? " amber" : b.status === "ready" ? " ok" : ""}`}>{status}</span>
            </Link>
          );
        })}
      </div>
      <p className="small muted" style={{ marginTop: 28 }}>
        {sync?.error ? <span style={{ color: "var(--red)" }}>Client list not updated: {sync.error}. Letters match against the last good copy. </span> : null}
        {active} clients{sync?.at ? `, client list checked ${fmt(sync.at, true)}` : ""}.{" "}
        {clashes ? <Link className="lnk" href="/mailroom/clients">{clashes} {clashes === 1 ? "client has" : "clients have"} details that disagree between your records</Link> : <Link className="lnk" href="/mailroom/clients">See clients</Link>}
      </p>
      <details className="mr-details">
        <summary>Add a scan by hand</summary>
        <div style={{ marginTop: 14 }}><AddScan /></div>
        <p className="small muted" style={{ marginTop: 12 }}>The copier saves scans to <span className="mono">{mr.scanDir}</span>. New files there appear by themselves.</p>
      </details>
    </div>
  );
}
