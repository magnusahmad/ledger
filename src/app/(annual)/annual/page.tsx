import Link from "next/link";
import { pilotCtx } from "@/server/pilot";
import { listCases, replyHolds } from "@/annual/cases";
import { nextStep, NEXT_LABEL } from "@/annual/next-step";
import { readHealth } from "@/annual/cycle";
import { mailWaiting } from "@/annual/mail-sync";
import { DeadlineStamp, fmt } from "@/components/ui";

export default async function AnnualCases() {
  const { ctx } = await pilotCtx();
  const [cases, health, waiting] = [await listCases(ctx), await readHealth(ctx), await mailWaiting(ctx)];
  const open = cases.filter((c) => c.stage !== "registered");
  const holds = await replyHolds(ctx);
  const today = ctx.clock.today();
  const problems = Object.values(health?.errors ?? {});
  return (
    <>
      <h1>Due in the next two months</h1>
      <p className="sub">{health?.recordsAsAt ? `From CSA as at ${fmt(health.recordsAsAt, true)}. Changes made in CSA since then appear after the next backup.` : "Waiting for the first copy of CSA."}</p>
      {problems.length > 0 && <div className="banner amber" style={{ marginTop: 18 }}>Something needs attention: {problems.join(" ")}</div>}
      {waiting.length > 0 && <div className="banner blue" style={{ marginTop: 18 }}><Link href="/annual/mail">{waiting.length === 1 ? "1 email needs" : `${waiting.length} emails need`} you to choose its company</Link></div>}
      {open.length === 0 ? <p className="empty" style={{ marginTop: 24 }}>Nothing due.</p> : (
        <div className="an-list">
          {open.map((c) => {
            const n = nextStep({ ...c, ...holds.get(c.id) });
            return (
              <Link key={c.id} href={`/annual/${c.id}`} className="an-row">
                <div><b>{c.clientName}</b><span className="small muted">{c.kind === "AR" ? "Annual return" : "AGM"} {c.periodYear}{c.clientCode ? ` · ${c.clientCode}` : ""}</span></div>
                <DeadlineStamp dueDate={c.dueDate} today={today} />
                <span className="an-next">{n ? NEXT_LABEL[n] : "Done"}</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
