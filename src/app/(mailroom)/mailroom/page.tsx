import Link from "next/link";
import { LiveRefresh } from "@/components/LiveRefresh";
import { getMailroom } from "@/server/mailroom";
import { batches } from "@/mailroom/service";
import { fmt } from "@/components/ui";
import { AddScan } from "./ui";

export default async function MailroomToday() {
  const { ctx, mr } = getMailroom();
  const list = await batches(ctx);
  return (
    <div className="mr-narrow">
      <LiveRefresh src="/api/mailroom/live" intervalMs={2000} />
      <h1>Today&apos;s post</h1>
      <p className="sub">Scan letters as usual. Each one appears here to check before it&apos;s filed.</p>
      <div style={{ marginTop: 32 }}>
        {list.length === 0 && <p className="empty">No scans yet.</p>}
        {list.map((b) => {
          const status = b.status === "failed" ? `Couldn't read this scan: ${b.error}`
            : b.status !== "ready" ? (b.letters ? `Reading ${b.letters} letters…` : "Reading…")
            : b.toReview ? `${b.toReview} to check` : "All filed";
          return (
            <Link key={b.id} href={`/mailroom/${b.id}`} className="mr-batch">
              <div><b>Scan at {fmt(b.receivedAt, true)}</b><span className="small muted">{b.letters ? `${b.letters} letters` : b.filename}</span></div>
              <span className={`pill${b.status === "failed" ? " red" : b.toReview ? " amber" : b.status === "ready" ? " ok" : ""}`}>{status}</span>
            </Link>
          );
        })}
      </div>
      <details className="mr-details">
        <summary>Add a scan by hand</summary>
        <div style={{ marginTop: 14 }}><AddScan /></div>
        <p className="small muted" style={{ marginTop: 12 }}>The copier saves scans to <span className="mono">{mr.scanDir}</span>. New files there appear by themselves.</p>
      </details>
    </div>
  );
}
