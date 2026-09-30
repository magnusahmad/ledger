"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { manualRequestAction, type ActionResult } from "@/server/actions";

export type PlaybookOption = { id: string; name: string; category: string; person: boolean; effDate: boolean; fields: { key: string; label: string }[] };
type Row = { id: number; playbookId: string; personId: string; newName: string; effDate: string; fields: Record<string, string> };

const NEW = "__new";
const blank = (id: number): Row => ({ id, playbookId: "", personId: "", newName: "", effDate: "", fields: {} });

/** Choosing a client reloads the page so the person lists belong to that client. */
export function ClientPicker({ clients, base }: { clients: { id: string; name: string }[]; base: string }) {
  const router = useRouter();
  return (
    <div className="fld"><label className="f" htmlFor="pick-client">Client</label>
      <select id="pick-client" defaultValue="" onChange={(e) => e.target.value && router.push(`${base}&client=${e.target.value}`)}>
        <option value="" disabled>Choose a client</option>
        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  );
}

export function ManualRequestForm({ clientId, playbooks, people }: { clientId: string; playbooks: PlaybookOption[]; people: { id: string; name: string }[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([blank(1)]);
  const [confirm, setConfirm] = useState(true);
  const [state, run, pending] = useActionState<ActionResult | null, FormData>(manualRequestAction, null);
  useEffect(() => { if (state?.ok && state.redirectTo) router.push(state.redirectTo); }, [state, router]);

  const set = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const pb = (id: string) => playbooks.find((p) => p.id === id);
  const categories = [...new Set(playbooks.map((p) => p.category))];
  const items = rows.filter((r) => r.playbookId).map((r) => ({
    playbookId: r.playbookId,
    person: r.personId === NEW ? { nameEn: r.newName } : r.personId ? { personId: r.personId } : null,
    fields: { ...r.fields, ...(r.effDate ? { effDate: r.effDate } : {}) },
  }));

  return (
    <form action={run}>
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <div className="mr-rows">
        {rows.map((r, i) => {
          const p = pb(r.playbookId);
          const extra = p?.fields.filter((f) => f.key !== "effDate") ?? [];
          const filled = extra.filter((f) => r.fields[f.key]?.trim()).length;
          return (
            <div key={r.id} className="mr-row">
              <div className="mr-head">
                <label className="f" htmlFor={`pb-${r.id}`}>{i === 0 ? "What needs doing" : "And"}</label>
                {rows.length > 1 && <button type="button" className="linkish" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>Remove</button>}
              </div>
              <select id={`pb-${r.id}`} value={r.playbookId} onChange={(e) => set(r.id, { playbookId: e.target.value, personId: "", newName: "", fields: {} })}>
                <option value="" disabled>Choose a playbook</option>
                {categories.map((c) => <optgroup key={c} label={c}>{playbooks.filter((x) => x.category === c).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>)}
              </select>
              {p && (p.person || p.effDate) && (
                <div className="grid2" style={{ marginTop: 12 }}>
                  {p.person && <div>
                    <label className="f" htmlFor={`person-${r.id}`}>Person</label>
                    <select id={`person-${r.id}`} value={r.personId} onChange={(e) => set(r.id, { personId: e.target.value })}>
                      <option value="">Not decided yet</option>
                      {people.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      <option value={NEW}>Someone new…</option>
                    </select>
                    {r.personId === NEW && <input type="text" aria-label="New person's full name" placeholder="Full name as on ID" value={r.newName} onChange={(e) => set(r.id, { newName: e.target.value })} style={{ marginTop: 8 }} />}
                  </div>}
                  {p.effDate && <div>
                    <label className="f" htmlFor={`eff-${r.id}`}>Effective date</label>
                    <input id={`eff-${r.id}`} type="date" value={r.effDate} onChange={(e) => set(r.id, { effDate: e.target.value })} />
                  </div>}
                </div>
              )}
              {extra.length > 0 && (
                <details className="more" style={{ marginTop: 12 }}>
                  <summary>Details already given{filled ? ` (${filled})` : ""}</summary>
                  <div className="grid2" style={{ marginTop: 10, gap: 12 }}>
                    {extra.map((f) => (
                      <div key={f.key}><label className="f" htmlFor={`${r.id}-${f.key}`}>{f.label}</label>
                        <input id={`${r.id}-${f.key}`} type="text" value={r.fields[f.key] ?? ""} onChange={(e) => set(r.id, { fields: { ...r.fields, [f.key]: e.target.value } })} /></div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" className="btn sm sec2" onClick={() => setRows((rs) => [...rs, blank(Math.max(...rs.map((x) => x.id)) + 1)])}>Add another</button>

      <div className="fld" style={{ marginTop: 20 }}><label className="f" htmlFor="notes">Notes <span className="muted" style={{ fontWeight: 400 }}>· internal, not sent</span></label>
        <textarea id="notes" name="notes" style={{ minHeight: 90 }} placeholder="e.g. Met Mr Chan at our office on 30 September." /></div>
      <label className="row small" style={{ marginTop: 14, gap: 8, alignItems: "flex-start" }}>
        <input type="checkbox" name="confirm" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} style={{ marginTop: 3 }} />
        <span>Draft a confirmation to the client with the invoice and upload link<span className="muted" style={{ display: "block" }}>{confirm ? "You approve it before it’s sent." : "Nothing is sent. The invoice is issued for you to hand over."}</span></span>
      </label>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" disabled={pending || items.length === 0}>{pending ? "Starting…" : "Start"}</button>
        {state?.error && <span className="small" role="alert" style={{ color: "var(--red)" }}>{state.error}</span>}
      </div>
    </form>
  );
}
