// Matching a letter to a client happens here, in code. The model only reads identifiers and
// the addressee off the page; a letter is matched when they point to exactly one client.
import type { MailroomRead } from "@/db/schema";

export type DirectoryClient = { id: string; name: string; nameZh: string | null; brNo: string | null; irdFileNo: string | null; crNo: string | null; mpfNo: string | null };
export type Match = { kind: "matched"; clientId: string; reason: string } | { kind: "ask"; reason: string; candidates: string[] } | { kind: "junk" };

const ID_FIELDS = [
  ["irdFileNo", "IRD file number"],
  ["brNo", "BR number"],
  ["crNo", "CR number"],
  ["mpfNo", "MPF employer number"],
] as const;

export function normaliseId(s: string): string {
  return s.replace(/[\s\-/.]/g, "").toUpperCase();
}

const SUFFIX = /\b(limited|ltd|company|co|holdings|hk|hong kong|international|group)\b/g;
export function normaliseName(s: string): string {
  return s.toLowerCase().replace(/\blimited\b/g, "ltd").replace(/\bcompany\b/g, "co").replace(/有限公司/g, "").replace(/[^\p{L}\p{N}]/gu, "");
}
function coreTokens(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/\(.*?\)|（.*?）/g, " ").replace(SUFFIX, " ").split(/[^\p{L}\p{N}]+/u).filter(Boolean));
}
function lookAlike(a: string, b: string): boolean {
  const x = coreTokens(a), y = coreTokens(b);
  if (!x.size || !y.size) return false;
  const shared = [...x].filter((t) => y.has(t)).length;
  return shared === Math.min(x.size, y.size) || shared / new Set([...x, ...y]).size >= 0.6;
}

export function matchLetter(r: MailroomRead, dir: DirectoryClient[]): Match {
  if (r.type === "junk") return { kind: "junk" };
  const byId = new Map<string, string>();
  for (const [field, label] of ID_FIELDS) {
    const v = r.identifiers[field];
    if (!v || !normaliseId(v)) continue;
    for (const c of dir) if (c[field] && normaliseId(c[field]!) === normaliseId(v)) byId.set(c.id, `${label} ${v.trim()}`);
  }
  const addressee = normaliseName(r.addressee ?? "");
  const exact = addressee ? dir.filter((c) => normaliseName(c.name) === addressee || (c.nameZh && normaliseName(c.nameZh) === addressee)).map((c) => c.id) : [];
  const near = (r.addressee ?? "").trim() ? dir.filter((c) => lookAlike(r.addressee, c.name)).map((c) => c.id) : [];

  if (byId.size > 1) return { kind: "ask", reason: "Its reference numbers belong to more than one client", candidates: [...byId.keys()] };
  if (byId.size === 1) {
    const [[id, reason]] = [...byId];
    const other = exact.filter((x) => x !== id);
    if (other.length) return { kind: "ask", reason: "The reference number and the company name point to different clients", candidates: [id, ...other] };
    return { kind: "matched", clientId: id, reason };
  }
  if (exact.length === 1 && near.every((x) => x === exact[0])) return { kind: "matched", clientId: exact[0], reason: "company name" };
  const candidates = [...new Set([...exact, ...near])].slice(0, 5);
  return { kind: "ask", reason: candidates.length > 1 ? "Several clients have a similar name" : candidates.length ? "Only the name looks familiar, with no reference number" : "We couldn't find this company in your client list", candidates };
}
