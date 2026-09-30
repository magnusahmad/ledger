"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionResult } from "@/server/actions";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

/** The upload link's single form: every item on one page, sent with one button. */
export function PortalForm({ action, children, t }: { action: Action; children: ReactNode; t: { send: string; sending: string; sent: string; empty: string; failed: string } }) {
  const [state, run, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  const error = state?.error ? (/at least one/i.test(state.error) ? t.empty : t.failed) : null;
  return (
    <form ref={ref} action={run}>
      {children}
      <div className="portal-send">
        <button className="btn" disabled={pending}>{pending ? t.sending : t.send}</button>
        {error && <span className="small" role="alert" style={{ color: "var(--red)" }}>{error}</span>}
        {state?.ok && !pending && <span className="small" role="status" style={{ color: "var(--ok)" }}>{t.sent}</span>}
      </div>
    </form>
  );
}
