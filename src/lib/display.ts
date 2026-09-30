// How stored codes and states read on staff screens. Pure functions, shared by pages.

const STATUS: Record<string, string> = {
  draft: "Draft", sent: "Unpaid", part_paid: "Part paid", paid: "Paid", void: "Void",
  open: "Open", done: "Done", cancelled: "Cancelled",
  matched: "Matched", proposed: "To confirm", unmatched: "Unmatched",
  clear: "Clear", potential: "Possible match", match: "Match", cleared_by_staff: "Cleared by staff", escalated: "Escalated",
};

/** Sentence-case label for an invoice, task, payment or screening status. */
export function statusLabel(status: string) {
  return STATUS[status] ?? sentence(status);
}

/** Where a task stands: waiting steps say what they wait for; other steps use the playbook's label. */
export function stepStatus(step: { kind: string; label: string } | null | undefined, taskStatus = "open") {
  if (taskStatus === "done") return "Completed";
  if (taskStatus === "cancelled") return "Cancelled";
  if (!step) return "";
  if (step.kind === "pay") return "Awaiting payment";
  if (step.kind === "collect") return "Waiting for the client";
  if (step.kind === "sign") return "Awaiting signatures";
  return step.label;
}

/** Relative time for the last week, then the date. */
export function when(d: Date | string | null | undefined, now = new Date()) {
  if (!d) return "";
  const x = new Date(d);
  const s = Math.round((now.getTime() - x.getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)}d ago`;
  return x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Hong_Kong" });
}

/** Timeline wording for a task event; null hides it. */
export function timelineText(e: { kind: string; summary: string }) {
  if (e.kind === "step.entered") return null;
  if (e.kind === "task.created") return "Task opened";
  if (e.kind === "step.completed") return e.summary.replace(/^Done: /, "Completed: ");
  return e.summary;
}

const LANG: Record<string, string> = { en: "English", tc: "Traditional Chinese", sc: "Simplified Chinese" };
export const languageLabel = (l: string | null | undefined) => (l ? LANG[l] ?? l : "—");

const JUR: Record<string, string> = { HK: "Hong Kong", CN: "Mainland China", MO: "Macau", TW: "Taiwan" };
export const jurisdictionLabel = (j: string) => JUR[j] ?? j;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const fyeLabel = (day: number | null | undefined, month: number | null | undefined) => (day && month ? `${day} ${MONTHS[month - 1]}` : "—");

const SOURCE: Record<string, string> = { generated: "Prepared by Harbourline", signed: "Signed copy", upload: "Uploaded by client", email: "From email", scan: "Scanned", seed: "On file" };
export const documentSourceLabel = (s: string) => SOURCE[s] ?? sentence(s);

export function plural(n: number, noun: string, many = `${noun}s`) {
  return `${n} ${n === 1 ? noun : many}`;
}

/** "part_paid" -> "Part paid". */
export function sentence(s: string) {
  const t = s.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** A checklist value as shown: ISO dates as dates, anything else as given. */
export function valueText(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return new Date(`${v}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const WAITING: Record<string, string> = { us: "Us", client: "The client", third_party: "A third party" };
export const waitingLabel = (w: string | null | undefined) => (w ? WAITING[w] ?? sentence(w) : "—");
