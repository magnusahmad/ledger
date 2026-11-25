// A firm's own client list, read beside the records system: who is still a client, each company's
// year end and AGM month, and who to write to. An installation that has one supplies it as a
// ClientListSource (through its profile); the core never knows what kind of file it is. The list
// decides who is a client and wins on the year end. Every place it differs from the records is kept
// in a report for staff, so the records get corrected and a mistake in the list cannot move a
// deadline unseen. The incorporation date is never taken from the list: the annual return runs from
// it, so a difference is listed and the records' date stays.
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { client as clientT, contact } from "@/db/schema";
import { kvGet, kvSet } from "@/domain/kv";

export type ClientListEntry = {
  code: string; nameEn: string | null;
  /** False when the list marks the company as no longer a client; leftOutReason says how it is marked. */
  live: boolean; leftOutReason: string | null;
  incorporatedOn: string | null; yearEnd: { month: number; day: number } | null; agmMonth: number | null;
  /** Why no AGM is handled for the company, where the list says so. */
  noAgm: string | null;
  contactEmails: string[];
};
export type ClientListRead = { /** Changes whenever the list's contents may have. */ version: string; entries: ClientListEntry[]; /** What could not be read, without client data. */ problems: string[] };
export interface ClientListSource {
  label: string;
  /** How a code in the records is written in this list, where the two differ (for example the
   *  records add letters the list leaves off). Without it the codes are compared as they are. */
  codeKey?(recordsCode: string): string;
  /** The list, or null when it has not changed since the version given. */
  read(since: string | null): Promise<ClientListRead | null>;
}

export type ClientListDifference = { code: string; nameEn: string | null; kind: "leftOut" | "yearEnd" | "incorporatedOn" | "nameMismatch" | "notInList" | "notInRecords"; records: string | null; list: string | null };
export type ClientListReport = {
  label: string; version: string; appliedAt: string;
  /** The build that applied it: a new build reads the list again, since how it is applied may have changed. */
  build?: string | null;
  counts: { entries: number; live: number; leftOut: number; matched: number; yearEndsFilled: number; contactsAdded: number };
  problems: string[]; differences: ClientListDifference[];
};
/** What the list says about a company, kept with it. */
export type ClientListMark = { live: boolean; reason: string | null; agmMonth: number | null; noAgm: string | null };

const KEY = "annual.clientList";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const md = (m: number | null | undefined, d: number | null | undefined) => (m && d ? `${d} ${MONTHS[m - 1]}` : null);
const key = (code: string | null) => (code ?? "").toUpperCase().replace(/\s+/g, "");

/** A name as far as it identifies a company: case, punctuation, the company suffix, a note in brackets
 *  and anything after an asterisk are not part of it. */
const nameKey = (s: string) => s.normalize("NFKC").toUpperCase().replace(/\*.*$/, "").replace(/\([^)]*\)/g, "")
  .replace(/\b(LIMITED|LTD|COMPANY|CO|INCORPORATED|INC|CORPORATION|CORP)\b\.?/g, "").replace(/[^A-Z0-9\u3400-\u9fff]+/g, "");
/** Whether two names are the same company's. A shared code is not proof on its own: codes get reused
 *  and mistyped. A list entry with no name cannot be checked and is taken on its code. */
export function sameCompanyName(a: string | null, b: string | null): boolean {
  if (!a || !b) return true;
  const x = nameKey(a), y = nameKey(b);
  if (!x || !y || x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 8 && long.includes(short);
}

export const readClientListReport = (ctx: Ctx) => kvGet<ClientListReport>(ctx, KEY);
/** Whether the firm's client list marks this company as no longer a client. */
export const leftOutOfClientList = (c: { jurisdictionData: unknown }) => (c.jurisdictionData as { clientList?: ClientListMark } | null)?.clientList?.live === false;

/** Reads the list and applies it. Returns null when the list has not changed (force reads it anyway:
 *  a newer copy of the records brings back the records' own year ends, which the list must replace again). */
export async function applyClientList(ctx: Ctx, src: ClientListSource, o: { force?: boolean; build?: string | null } = {}): Promise<ClientListReport | null> {
  const prev = await readClientListReport(ctx);
  const build = o.build ?? prev?.build ?? null;
  const read = await src.read(o.force || build !== (prev?.build ?? null) ? null : prev?.version ?? null);
  if (!read) return null;
  const clients = await ctx.db.select().from(clientT).where(eq(clientT.firmId, ctx.firmId));
  const listKey = (c: { code: string | null }) => { const k = key(c.code); return k ? key(src.codeKey?.(k) ?? k) : ""; };
  const byCode = new Map<string, typeof clients>();
  for (const c of clients) { const k = listKey(c); if (k) byCode.set(k, [...(byCode.get(k) ?? []), c]); }
  const seen = new Set<string>();
  const differences: ClientListDifference[] = [];
  const counts = { entries: read.entries.length, live: 0, leftOut: 0, matched: 0, yearEndsFilled: 0, contactsAdded: 0 };

  await ctx.db.transaction(async (db) => {
    /** Takes back what the list did to a company it no longer speaks for: its mark, and the year end it replaced. */
    const unmark = async (c: (typeof clients)[number]) => {
      const data = c.jurisdictionData as Record<string, unknown> & { fromRecords?: { fyeMonth: number | null; fyeDay: number | null } };
      if (!data.clientList) return;
      const { clientList: _gone, ...rest } = data; void _gone;
      await db.update(clientT).set({ ...(data.fromRecords ? { fyeMonth: data.fromRecords.fyeMonth, fyeDay: data.fromRecords.fyeDay } : {}), jurisdictionData: rest }).where(and(eq(clientT.id, c.id), eq(clientT.firmId, ctx.firmId)));
    };
    for (const e of read.entries) {
      const k = key(e.code);
      if (e.live) counts.live++; else counts.leftOut++;
      const sameCode = byCode.get(k) ?? [];
      if (!sameCode.length) { if (e.live) differences.push({ code: k, nameEn: e.nameEn, kind: "notInRecords", records: null, list: e.nameEn }); continue; }
      for (const c of sameCode) {
      seen.add(c.id);
      // Same code, another company's name: nothing is applied, and staff are shown both names.
      if (!sameCompanyName(c.nameEn, e.nameEn)) { differences.push({ code: key(c.code), nameEn: c.nameEn, kind: "nameMismatch", records: c.nameEn, list: e.nameEn }); await unmark(c); continue; }
      counts.matched++;
      const code = key(c.code);
      const data = c.jurisdictionData as Record<string, unknown> & { fromRecords?: { fyeMonth: number | null; fyeDay: number | null } };
      if (!e.live) differences.push({ code, nameEn: c.nameEn, kind: "leftOut", records: "current", list: e.leftOutReason });
      // The records' own year end: kept by the records import, so the comparison survives this list replacing it.
      const own = data.fromRecords ?? { fyeMonth: c.fyeMonth, fyeDay: c.fyeDay };
      const theirs = md(own.fyeMonth, own.fyeDay), ours = md(e.yearEnd?.month, e.yearEnd?.day);
      const patch: Partial<typeof clientT.$inferInsert> = {};
      if (ours && ours !== theirs) {
        if (theirs) differences.push({ code, nameEn: c.nameEn, kind: "yearEnd", records: theirs, list: ours });
        else counts.yearEndsFilled++;
      }
      if (ours && (c.fyeMonth !== e.yearEnd!.month || c.fyeDay !== e.yearEnd!.day)) { patch.fyeMonth = e.yearEnd!.month; patch.fyeDay = e.yearEnd!.day; }
      if (e.incorporatedOn && c.incorporatedOn && e.incorporatedOn !== c.incorporatedOn) differences.push({ code, nameEn: c.nameEn, kind: "incorporatedOn", records: c.incorporatedOn, list: e.incorporatedOn });
      const mark: ClientListMark = { live: e.live, reason: e.live ? null : e.leftOutReason, agmMonth: e.agmMonth, noAgm: e.noAgm };
      await db.update(clientT).set({ ...patch, jurisdictionData: { ...data, fromRecords: own, clientList: mark } }).where(and(eq(clientT.id, c.id), eq(clientT.firmId, ctx.firmId)));
      for (const email of new Set(e.contactEmails.map((x) => x.trim().toLowerCase()).filter(Boolean))) {
        const has = await db.query.contact.findFirst({ where: and(eq(contact.firmId, ctx.firmId), eq(contact.clientId, c.id), eq(contact.email, email)) });
        if (has) continue;
        await db.insert(contact).values({ id: ctx.ids.next("ct"), firmId: ctx.firmId, clientId: c.id, name: email, email, role: "Client list contact" });
        counts.contactsAdded++;
      }
      }
    }
    // A company the list no longer mentions is not marked by it any more.
    for (const c of clients) {
      const k = key(c.code);
      if (!k || seen.has(c.id)) continue;
      differences.push({ code: k, nameEn: c.nameEn, kind: "notInList", records: c.nameEn, list: null });
      await unmark(c);
    }
  });
  differences.sort((a, b) => a.kind.localeCompare(b.kind) || a.code.localeCompare(b.code));
  const report: ClientListReport = { label: src.label, version: read.version, appliedAt: ctx.clock.now().toISOString(), build, counts, problems: read.problems, differences };
  await kvSet(ctx, KEY, report);
  return report;
}
