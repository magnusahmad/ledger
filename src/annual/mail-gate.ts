// Email relevance gate (pilot deploy gap, Gap 5). Runs on message metadata before anything is stored:
// folder, Exchange's spam verdict, automated and bulk mail, calendar items and internal-only mail are
// skipped; a message is kept only when it belongs to a dispatch thread or comes from (or goes to) a
// contact of a company in the annual-return cycle. Everything here is deterministic; the model never
// decides relevance. Skipped mail is only counted by reason.

export type GateMessage = {
  mailbox: string;
  /** Graph well-known folder name of the message's folder. */
  folder: string;
  from: string; to: string[]; cc: string[];
  conversationId: string | null; internetMessageId: string | null; inReplyTo: string | null; references: string[];
  /** Internet headers, keys lower-case. */
  headers: Record<string, string>;
  contentType?: string | null;
  isMeetingMessage?: boolean;
  receivedAt: string;
};

export type GateContext = {
  firmDomains: string[];
  /** Threads of emails the pilot drafted: Graph conversation ids and RFC Message-IDs of sent copies. */
  threads: { caseId: string; clientId: string; conversationIds: string[]; messageIds: string[] }[];
  /** Contacts of companies with a case in the cycle, and the dates mail from them belongs to that case. */
  contacts: { caseId: string; clientId: string; dueDate: string; emails: string[]; windowFrom: string; windowTo: string }[];
};

export type SkipReason = "folder" | "spam" | "automated" | "bulk" | "calendar" | "internal" | "unrelated";
export type GateResult =
  | { decision: "skip"; reason: SkipReason }
  | { decision: "link"; caseId: string; via: "thread" | "contact" }
  | { decision: "ask"; caseIds: string[] };

export const READ_FOLDERS = ["inbox", "sentitems"];

const low = (s: string) => s.trim().toLowerCase();
const domainOf = (e: string) => low(e).split("@")[1] ?? "";

function isSpam(h: Record<string, string>) {
  const report = h["x-forefront-antispam-report"] ?? "";
  const scl = Number(/SCL:(-?\d+)/i.exec(report)?.[1] ?? h["x-ms-exchange-organization-scl"] ?? -1);
  return /SFV:(SPM|SKS|BLK)/i.test(report) || scl >= 5;
}

function isAutomated(m: GateMessage) {
  const h = m.headers;
  const auto = h["auto-submitted"];
  if (auto && low(auto) !== "no") return true;
  if (h["x-autoreply"] || h["x-autorespond"] || /^(auto|ooo)/i.test(h["x-auto-response"] ?? "")) return true;
  if (/multipart\/report|message\/delivery-status/i.test(m.contentType ?? "")) return true;
  return /^(mailer-daemon|postmaster|microsoftexchange[0-9a-f]*)@/i.test(m.from);
}

function isBulk(h: Record<string, string>) {
  return !!(h["list-id"] || h["list-unsubscribe"]) || /^(bulk|list|junk)$/i.test(h["precedence"] ?? "");
}

export function gateMessage(m: GateMessage, ctx: GateContext): GateResult {
  if (!READ_FOLDERS.includes(low(m.folder))) return { decision: "skip", reason: "folder" };
  if (isSpam(m.headers)) return { decision: "skip", reason: "spam" };
  if (isAutomated(m)) return { decision: "skip", reason: "automated" };
  if (isBulk(m.headers)) return { decision: "skip", reason: "bulk" };
  if (m.isMeetingMessage || /text\/calendar/i.test(m.contentType ?? "")) return { decision: "skip", reason: "calendar" };

  const firm = new Set(ctx.firmDomains.map(low));
  const participants = [m.from, ...m.to, ...m.cc].filter(Boolean).map(low);
  const outsiders = participants.filter((p) => !firm.has(domainOf(p)));
  if (!outsiders.length) return { decision: "skip", reason: "internal" };

  const refs = new Set([m.inReplyTo, ...m.references].filter((x): x is string => !!x));
  const byThread = ctx.threads.filter((t) => (m.conversationId && t.conversationIds.includes(m.conversationId)) || t.messageIds.some((id) => refs.has(id)));
  if (byThread.length) return pick(byThread.map((t) => ({ caseId: t.caseId, clientId: t.clientId, dueDate: "" })), "thread");

  const sentByFirm = firm.has(domainOf(m.from));
  const correspondents = new Set(sentByFirm ? outsiders : [low(m.from)]);
  const day = m.receivedAt.slice(0, 10);
  const byContact = ctx.contacts.filter((c) => day >= c.windowFrom && day <= c.windowTo && c.emails.some((e) => correspondents.has(low(e))));
  if (byContact.length) return pick(byContact, "contact");
  return { decision: "skip", reason: "unrelated" };
}

/** One company: its earliest-due case. More than one company: staff choose. */
function pick(cases: { caseId: string; clientId: string; dueDate: string }[], via: "thread" | "contact"): GateResult {
  const clients = new Set(cases.map((c) => c.clientId));
  if (clients.size > 1) return { decision: "ask", caseIds: [...new Set(cases.map((c) => c.caseId))].sort() };
  const first = [...cases].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return { decision: "link", caseId: first.caseId, via };
}

export type GateTally = { scanned: number; linked: number; ask: number; skipped: Partial<Record<SkipReason, number>> };

export function tallySkips(results: GateResult[], into: GateTally = { scanned: 0, linked: 0, ask: 0, skipped: {} }): GateTally {
  for (const r of results) {
    into.scanned++;
    if (r.decision === "link") into.linked++;
    else if (r.decision === "ask") into.ask++;
    else into.skipped[r.reason] = (into.skipped[r.reason] ?? 0) + 1;
  }
  return into;
}
