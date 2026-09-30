"use client";
import { useActionState, useState } from "react";
import type { PlaybookDef } from "@/domain/playbook-types";
import { savePlaybookAction } from "@/server/playbook-actions";

export function PlaybookEditor({ playbook }: { playbook: PlaybookDef }) {
  const [json, setJson] = useState(() => JSON.stringify(playbook, null, 2));
  const [version, setVersion] = useState(playbook.version);
  const [state, run, pending] = useActionState(async (previous: Awaited<ReturnType<typeof savePlaybookAction>> | null, form: FormData) => {
    const result = await savePlaybookAction(previous, form);
    if (result.json && result.version) { setJson(result.json); setVersion(result.version); }
    return result;
  }, null);
  return <details className="pb-edit">
    <summary>Edit definition <span className="muted">· version {version}</span></summary>
    <p className="small muted">Saving creates a new version. Tasks already under way keep the version they started with. Keep the id, jurisdiction and version fields as they are.</p>
    <form action={run}>
      <input type="hidden" name="id" value={playbook.id} />
      <input type="hidden" name="version" value={version} />
      <label className="small" htmlFor={`definition-${playbook.id}`}>Definition · {playbook.name.en} / {playbook.name.tc}</label>
      <textarea id={`definition-${playbook.id}`} name="definition" value={json} onChange={e => setJson(e.target.value)} spellCheck={false} rows={18} style={{ display: "block", width: "100%", maxWidth: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "monospace", fontSize: 13, lineHeight: 1.5, marginTop: 8 }} />
      <button className="btn" type="submit" disabled={pending} style={{ marginTop: 12 }}>{pending ? "Saving…" : "Save new version"}</button>
      {state?.error && <p className="small" role="alert" style={{ color: "var(--red)", overflowWrap: "anywhere" }}>{state.error}</p>}
      {state?.message && !state.error && <p className="small" role="status" style={{ color: "var(--ok)" }}>{state.message}</p>}
    </form>
  </details>;
}
