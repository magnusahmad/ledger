import { pilotCtx } from "@/server/pilot";
import { readClientListReport } from "@/annual/client-list";
import { differencesView } from "@/annual/client-list-view";
import { recordsFromConfig } from "@/annual/runtime";
import { fmt } from "@/components/ui";

export default async function Differences() {
  const { ctx } = await pilotCtx();
  const report = await readClientListReport(ctx);
  const records = recordsFromConfig(ctx.config).label;
  if (!report) return (
    <div className="an-case">
      <h1>Differences</h1>
      <p className="empty" style={{ marginTop: 24 }}>Nothing to compare {records} with yet.</p>
    </div>
  );
  const v = differencesView(report, records);
  return (
    <div className="an-case an-wide">
      <h1>Differences</h1>
      <p className="sub">Where {records} and {report.label} disagree. Correct whichever is wrong; this page updates when either changes.</p>
      {v.sections.length === 0 && <p className="empty" style={{ marginTop: 24 }}>Nothing differs.</p>}
      {v.sections.map((s) => (
        <section key={s.title} className="an-step">
          <h2>{s.title} <span className="muted">{s.rows.length}</span></h2>
          {s.note && <p>{s.note}</p>}
          <div className="an-diffs">
            {s.rows.map((r, i) => (
              <div key={`${r.code}${i}`} className="an-diff">
                {r.code && <span className="an-code">{r.code}</span>}
                <span className="an-name" style={r.code ? undefined : { gridColumn: "1 / -1" }}>{r.name}</span>
                {r.detail && <span className="an-detail">{r.detail}</span>}
              </div>
            ))}
          </div>
        </section>
      ))}
      <p className="small muted" style={{ marginTop: 28 }}>
        {cap(report.label)} last read {fmt(report.appliedAt, true)}.
        {v.onlyInList > 0 && ` ${v.onlyInList === 1 ? "1 of its current clients is" : `${v.onlyInList} of its current clients are`} not in Clerk, which holds only the companies it takes from ${records}.`}
      </p>
    </div>
  );
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
