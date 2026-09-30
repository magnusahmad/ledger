// Small presentational helpers shared by server components.
import type { ReactNode } from "react";
import { statusLabel, when } from "@/lib/display";

export function Pill({ tone, children }: { tone?: "amber" | "red" | "ok" | "blue"; children: ReactNode }) {
  return <span className={`pill${tone ? ` ${tone}` : ""}`}>{children}</span>;
}

/** A status as a coloured pill with a sentence-case label. */
export function StatusPill({ status }: { status: string }) {
  return <Pill tone={STATUS_TONE[status]}>{statusLabel(status)}</Pill>;
}

/** The one decorative signature element: a red seal for deadlines within 30 days (限 due, 逾 overdue).
 *  Further out it shows the date, or nothing when `nearOnly` (the row already shows the date). */
export function DeadlineStamp({ dueDate, today, nearOnly }: { dueDate: string | null; today: string; nearOnly?: boolean }) {
  if (!dueDate) return null;
  const days = Math.round((new Date(dueDate + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000);
  if (days > 30) return nearOnly ? null : <span className="small muted">Due {fmt(dueDate)}</span>;
  return (
    <span className="row" style={{ gap: 6 }} title={days < 0 ? `Overdue by ${-days} day(s)` : `Due in ${days} day(s)`}>
      <span className="seal" aria-hidden>{days < 0 ? "逾" : "限"}</span>
      <span className="small" style={{ color: "var(--red)" }}>{days < 0 ? `${-days}d overdue` : days === 0 ? "Due today" : `${days}d left`}</span>
    </span>
  );
}

export function fmt(d: string | Date | null | undefined, withTime = false) {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d.length === 10 ? d + "T00:00:00Z" : d) : d;
  return withTime
    ? x.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Hong_Kong" })
    : x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function ago(d: Date | string | null | undefined) {
  return when(d);
}

export const STATUS_TONE: Record<string, "amber" | "red" | "ok" | "blue" | undefined> = {
  draft: undefined, sent: "amber", part_paid: "amber", paid: "ok", void: undefined, open: "blue", done: "ok", cancelled: undefined,
  matched: "ok", proposed: "amber", unmatched: "red", clear: "ok", potential: "amber", match: "red", cleared_by_staff: "ok", escalated: "red",
};
