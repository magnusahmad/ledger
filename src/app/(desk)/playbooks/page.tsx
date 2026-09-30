import { getCtx } from "@/server/ctx";
import { listPlaybooks } from "@/domain/playbooks";
import { formsManifest, formCheckSummary } from "@/documents/forms-check";
import { kvGet } from "@/domain/kv";
import { itemLabel, money } from "@/domain/labels";
import { PlaybookEditor } from "@/components/PlaybookEditor";
import { Pill, fmt } from "@/components/ui";

const JUR: Record<string, string> = { HK: "Hong Kong", CN: "Mainland China", MO: "Macau", TW: "Taiwan" };

export default async function Playbooks() {
  const ctx = getCtx();
  const pbs = await listPlaybooks(ctx);
  const manifest = formsManifest();
  const check = await kvGet<{ at: string; checked?: number; changed: string[]; errors?: string[] }>(ctx, "forms.check");
  const formsSection = (
    <section className="sec"><div className="sec-h"><h2>Official Companies Registry forms</h2></div>
      <p className="small muted" style={{ marginTop: -4, overflowWrap: "anywhere" }}>{check ? `Checked against cr.gov.hk ${fmt(check.at, true)}. ${formCheckSummary({ checked: check.checked ?? Object.keys(manifest).length, changed: check.changed, errors: check.errors ?? [] })}` : "Not yet checked against cr.gov.hk."}</p>
      <div className="card tight scroll-x"><table className="tbl"><thead><tr><th>Form</th><th>Specification</th><th>Downloaded</th><th>Status</th></tr></thead><tbody>
        {Object.entries(manifest).map(([k, v]) => { const err = check?.errors?.some(e => e.startsWith(`${k}:`)); return <tr key={k}><td><a className="lnk" href={v.url} target="_blank">{k}</a></td><td>{v.specification}</td><td>{fmt(v.downloadedOn)}</td><td>{check?.changed.includes(k) ? <Pill tone="red">Changed on cr.gov.hk</Pill> : <Pill tone={err ? "amber" : check ? "ok" : undefined}>{err ? "Not verified" : check ? "Current" : "Not checked"}</Pill>}</td></tr>; })}
      </tbody></table></div></section>
  );
  return (
    <>
      <div className="top"><div><h1>Playbooks</h1><p className="sub">{pbs.length} playbooks across {new Set(pbs.map((p) => p.jurisdiction)).size} jurisdictions. Statutory rules need company secretary review before use.</p></div></div>
      {["HK", "CN", "MO", "TW"].map((j) => (
        <section className="sec" key={j}><div className="sec-h"><h2>{JUR[j]}</h2></div>
          <div className="card tight"><ul className="list">{pbs.filter((p) => p.jurisdiction === j).map((p) => (
            <li key={p.id} className="item pb">
              <details className="pb-row">
                <summary><span className="main"><span className="t">{p.name.en} <span className="muted" style={{ fontWeight: 400 }}>{p.name.tc}</span></span><span className="m">{[p.category, p.forms !== "None" && p.forms].filter(Boolean).join(" · ")}</span></span><span className="small" style={{ fontVariantNumeric: "tabular-nums" }}>{p.feeCents ? money(p.feeCents) : <span className="muted">No fee</span>}</span></summary>
                <div className="pb-body">
                  <p className="small" style={{ marginTop: 0 }}>{p.description}</p>
                  <dl className="kv small">
                    <dt>When to use</dt><dd>{p.whenToUse}</dd>
                    <dt>Collects</dt><dd>{p.requirements.map((r) => itemLabel(r.key)).join("; ")}</dd>
                    <dt>Steps</dt><dd>{p.steps.map((s) => s.label).join(" → ")}</dd>
                    <dt>Documents</dt><dd>{p.documents.map((d) => d.name).join("; ") || "—"}</dd>
                    <dt>Deadline</dt><dd>{p.deadline.kind === "none" ? "—" : p.deadline.rule}</dd>
                    {p.complianceNotes.length > 0 && <><dt>Notes</dt><dd><ul style={{ margin: 0, paddingLeft: 16 }}>{p.complianceNotes.map((n, i) => <li key={i}>{n}</li>)}</ul></dd></>}
                  </dl>
                  <PlaybookEditor playbook={p} />
                </div>
              </details>
            </li>))}</ul></div></section>
      ))}
      {formsSection}
    </>
  );
}
