import { getCtx } from "@/server/ctx";
import { listPlaybooks } from "@/domain/playbooks";
import { formsManifest } from "@/documents/forms-check";
import { kvGet } from "@/domain/kv";
import { itemLabel, money } from "@/domain/labels";
import { Pill, fmt } from "@/components/ui";

const JUR: Record<string, string> = { HK: "Hong Kong", CN: "Mainland China", MO: "Macau", TW: "Taiwan" };

export default async function Playbooks() {
  const ctx = getCtx();
  const pbs = await listPlaybooks(ctx);
  const manifest = formsManifest();
  const check = await kvGet<{ at: string; changed: string[] }>(ctx, "forms.check");
  return (
    <>
      <div className="top"><div><h1>Playbooks</h1><p className="sub">{pbs.length} playbooks across {new Set(pbs.map((p) => p.jurisdiction)).size} jurisdictions. Playbooks are data: company secretaries review and edit them. Every statutory rule needs company secretary verification.</p></div></div>
      <section className="sec"><div className="sec-h"><h2>Official Companies Registry forms</h2><span className="small muted">{check ? `Last checked against cr.gov.hk ${fmt(check.at, true)}${check.changed.length ? `: CHANGED ${check.changed.join(", ")}` : ": all current"}` : "Run npm run forms:check to compare with cr.gov.hk"}</span></div>
        <div className="card tight scroll-x"><table className="tbl"><thead><tr><th>Form</th><th>Specification</th><th>Downloaded</th><th>Status</th></tr></thead><tbody>
          {Object.entries(manifest).map(([k, v]) => <tr key={k}><td><a href={v.url} target="_blank">{k}</a></td><td>{v.specification}</td><td>{fmt(v.downloadedOn)}</td><td>{check?.changed.includes(k) ? <Pill tone="red">Changed on cr.gov.hk</Pill> : <Pill tone="ok">Mapped and tested</Pill>}</td></tr>)}
        </tbody></table></div></section>
      {["HK", "CN", "MO", "TW"].map((j) => (
        <section className="sec" key={j}><div className="sec-h"><h2>{JUR[j]}</h2></div>
          <div className="card tight"><ul className="list">{pbs.filter((p) => p.jurisdiction === j).map((p) => (
            <li key={p.id} className="item" style={{ alignItems: "flex-start" }}>
              <div className="main"><details className="more"><summary className="t" style={{ color: "var(--ink)" }}>{p.name.en} <span className="muted">{p.name.tc}</span></summary>
                <p className="small">{p.description} <span className="muted">When to use: {p.whenToUse}</span></p>
                <p className="small"><b>Collects:</b> {p.requirements.map((r) => itemLabel(r.key)).join("; ")}</p>
                <p className="small"><b>Steps:</b> {p.steps.map((s) => s.label).join(" → ")}</p>
                <p className="small"><b>Documents:</b> {p.documents.map((d) => d.name).join("; ") || "—"}</p>
                <p className="small"><b>Deadline:</b> {p.deadline.kind === "none" ? "—" : p.deadline.rule}</p>
                <ul className="small">{p.complianceNotes.map((n, i) => <li key={i}>{n}</li>)}</ul></details>
                <div className="m">{p.category} · {p.forms}</div></div>
              <div className="row"><span className="small">{money(p.feeCents)}</span></div>
            </li>))}</ul></div></section>
      ))}
    </>
  );
}
