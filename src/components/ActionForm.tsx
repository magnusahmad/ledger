"use client";
import { useActionState, useEffect, useState, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/actions";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

/** A form bound to a server action, with pending state, error and success messages. */
export function ActionForm({ action, children, submit, tone, className, confirm, stampShownAt, resetOnSuccess }: {
  action: Action; children?: ReactNode; submit: ReactNode; tone?: "primary" | "secondary" | "danger"; className?: string; confirm?: string; stampShownAt?: boolean; resetOnSuccess?: boolean;
}) {
  const [state, run, pending] = useActionState(action, null);
  const [shownAt] = useState(() => new Date().toISOString());
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => { if (state?.ok && resetOnSuccess) formRef.current?.reset(); }, [state, resetOnSuccess]);
  useEffect(() => { if (state?.ok && state.redirectTo) router.push(state.redirectTo); }, [state, router]);
  return (
    <form ref={formRef} action={run} className={className} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {stampShownAt && <input type="hidden" name="shownAt" value={shownAt} />}
      {children}
      <div className="row" style={{ marginTop: children ? 12 : 0 }}>
        <button className={`btn${tone === "secondary" ? " sec2" : tone === "danger" ? " danger" : ""}`} disabled={pending} type="submit">{pending ? "Working…" : submit}</button>
        {state?.error && <span className="small" role="alert" style={{ color: "var(--red)" }}>{state.error}</span>}
        {state?.ok && state.message && <span className="small" style={{ color: "var(--ok)" }}>{state.message}</span>}
      </div>
    </form>
  );
}

/** A single button bound to an action with no inputs. */
export function ActionButton({ action, children, tone, confirm }: { action: () => Promise<ActionResult>; children: ReactNode; tone?: "primary" | "secondary" | "danger"; confirm?: string }) {
  const [state, run, pending] = useActionState(async () => action(), null);
  return (
    <form action={run} style={{ display: "inline-flex", alignItems: "center", gap: 8 }} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      <button className={`btn sm${tone === "secondary" || !tone ? " sec2" : tone === "danger" ? " danger" : ""}`} disabled={pending}>{pending ? "Working…" : children}</button>
      {state?.error && <span className="small" role="alert" style={{ color: "var(--red)" }}>{state.error}</span>}
      {state?.ok && state.message && <span className="small" style={{ color: "var(--ok)" }}>{state.message}</span>}
    </form>
  );
}
