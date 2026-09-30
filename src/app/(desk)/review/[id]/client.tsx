"use client";
import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/actions";
import { redraftAction } from "@/server/actions";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

export function ReviewForm({ action, submit, children, redirectTo, tone }: { action: Action; submit: string; children?: ReactNode; redirectTo?: string; tone?: "danger" | "secondary" }) {
  const [state, run, pending] = useActionState(action, null);
  const [shownAt] = useState(() => new Date().toISOString());
  const router = useRouter();
  useEffect(() => { if (state?.ok && redirectTo) router.push(redirectTo); }, [state, redirectTo, router]);
  return (
    <form action={run}>
      <input type="hidden" name="shownAt" value={shownAt} />
      {children}
      <div className="row" style={{ marginTop: 14 }}>
        <button className={`btn${tone === "danger" ? " danger" : tone === "secondary" ? " sec2" : ""}`} disabled={pending}>{pending ? "Working…" : submit}</button>
        {state?.error && <span className="small" role="alert" style={{ color: "var(--red)" }}>{state.error}</span>}
        {state?.ok && <span className="small" style={{ color: "var(--ok)" }}>{state.message ?? "Done"}</span>}
      </div>
    </form>
  );
}

const LANGS: { k: "en" | "tc" | "sc"; label: string }[] = [{ k: "en", label: "EN" }, { k: "tc", label: "繁" }, { k: "sc", label: "简" }];

export function RedraftButtons({ proposalId, current }: { proposalId: string; current: "en" | "tc" | "sc" }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="row" role="group" aria-label="Draft language">
      <span className="seg">{LANGS.map((l) => (
        <button key={l.k} type="button" disabled={pending} aria-pressed={l.k === current}
          onClick={() => start(async () => { const r = await redraftAction(proposalId, l.k); setErr(r.error ?? null); if (r.ok) window.location.reload(); })}>
          {l.label}
        </button>
      ))}</span>
      {pending && <span className="small muted">Redrafting…</span>}
      {err && <span className="small" style={{ color: "var(--red)" }}>{err}</span>}
    </div>
  );
}

/** Click-to-edit value (invoice number, line price) saved through a server action. */
export function InlineEdit({ action, name, value, label, display }: { action: Action; name: string; value: string; label: string; display?: string }) {
  const [editing, setEditing] = useState(false);
  const [state, run, pending] = useActionState(async (p: ActionResult | null, f: FormData) => { const r = await action(p, f); if (r.ok) setEditing(false); return r; }, null);
  if (!editing) return (
    <span>
      <button type="button" className="txt" onClick={() => setEditing(true)} aria-label={`Edit ${label}`} title="Click to edit">{display ?? value}</button>
      {state?.error && <span className="small" style={{ color: "var(--red)", display: "block" }}>{state.error}</span>}
    </span>
  );
  return (
    <form action={run} className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
      <input type="text" name={name} defaultValue={value} aria-label={label} autoFocus style={{ width: 150, padding: "4px 8px" }} />
      <button className="btn sm" disabled={pending}>Save</button>
      <button type="button" className="btn sm sec2" onClick={() => setEditing(false)}>Cancel</button>
    </form>
  );
}

export function AutoRedirect({ to, ms = 900 }: { to: string; ms?: number }) {
  const router = useRouter();
  useEffect(() => { const t = setTimeout(() => router.push(to), ms); return () => clearTimeout(t); }, [router, to, ms]);
  return null;
}
