"use client";
import { useActionState, useState } from "react";
import type { ActionResult } from "@/server/actions";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

/** Marks one checklist item received, with an optional value, without leaving the task page. */
export function ChecklistTick({ action, label, file }: { action: Action; label: string; file?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useActionState(async (p: ActionResult | null, f: FormData) => { const r = await action(p, f); if (r.ok) setOpen(false); return r; }, null);
  if (!open) return <button type="button" className="linkish" onClick={() => setOpen(true)} aria-label={`Mark ${label} received`}>Mark received</button>;
  return (
    <form action={run} className="tick">
      {!file && <input type="text" name="value" placeholder="Value, if any" aria-label={`${label} value`} autoFocus />}
      <button className="btn sm" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      <button type="button" className="btn sm sec2" onClick={() => setOpen(false)}>Cancel</button>
      {state?.error && <span className="small" role="alert" style={{ color: "var(--red)", flexBasis: "100%", textAlign: "right" }}>{state.error}</span>}
    </form>
  );
}
