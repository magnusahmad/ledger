// Mail room: scans arrive in a watched folder (or are dropped in the browser), are split into
// letters, read, matched to a client in code and proposed for filing with a client email.
// Nothing reaches the firm's server folders or mailbox until staff approve the letter.
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { mailroomBatch, mailroomClient, mailroomLetter, type MailroomCorrection } from "@/db/schema";
import { audit } from "@/domain/audit";
import type { DraftBox } from "./drafts";
import { fileTarget, ruleFor, safeTarget, type FilingRules } from "./rules";
import { matchLetter } from "./match";
import { extractPages, imageToPdf, pdfPages, splitPlan, type PageRange } from "./split";
import { draftClientEmail, readLetter, readSplit } from "./agents";
import { applyClients, csvRows, CSV_COLUMNS, mergeSources, type ClientSource } from "./client-sync";

export type Mailroom = { drafts: DraftBox; serverRoot: string; scanDir: string; rules: FilingRules; fromAddress: string; firmName: string; clientSources?: ClientSource[] };
export type MailroomClient = typeof mailroomClient.$inferSelect;
export type Letter = typeof mailroomLetter.$inferSelect & { candidates: MailroomClient[]; client: MailroomClient | null };

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

// ---------- Client index ----------

/** Loads the firm's client list exported as CSV: clients are updated in place by client code,
 *  and any not in the file are switched off (kept, so filed letters stay linked). */
export async function importClients(ctx: Ctx, csv: string, mr: Mailroom | null = null): Promise<number> {
  const rows = csvRows(csv, CSV_COLUMNS);
  if (csv.trim() && !rows.length) throw new Error("Every client row needs a name");
  await applyClients(ctx, mr, mergeSources([{ source: "client list (CSV)", rows }]), { deactivateMissing: true });
  return rows.length;
}

export async function clients(ctx: Ctx, o: { activeOnly?: boolean } = {}): Promise<MailroomClient[]> {
  return ctx.db.select().from(mailroomClient)
    .where(o.activeOnly ? and(eq(mailroomClient.firmId, ctx.firmId), eq(mailroomClient.active, true)) : eq(mailroomClient.firmId, ctx.firmId))
    .orderBy(asc(mailroomClient.name));
}

/** After the client index changes: letters still asking "whose letter is this?" are matched
 *  again; any that now point to exactly one client get its folder and a drafted email.
 *  Letters staff have already decided are never touched. */
export async function rematchWaiting(ctx: Ctx, mr: Mailroom): Promise<number> {
  const waiting = await ctx.db.select().from(mailroomLetter)
    .where(and(eq(mailroomLetter.firmId, ctx.firmId), eq(mailroomLetter.status, "proposed"), eq(mailroomLetter.matchKind, "ask")));
  if (!waiting.length) return 0;
  const dir = await clients(ctx, { activeOnly: true });
  let n = 0;
  for (const l of waiting) {
    if (!l.read || l.corrections.some((c) => c.field === "client")) continue;
    const m = matchLetter(l.read, dir);
    if (m.kind !== "matched") {
      if (m.kind === "ask") await ctx.db.update(mailroomLetter).set({ candidateIds: m.candidates, matchReason: m.reason }).where(eq(mailroomLetter.id, l.id));
      continue;
    }
    const client = dir.find((c) => c.id === m.clientId)!;
    const batch = (await ctx.db.select().from(mailroomBatch).where(eq(mailroomBatch.id, l.batchId)))[0];
    const target = fileTarget(mr.rules, l.read, client, hkDate(batch.receivedAt));
    const email = ruleFor(mr.rules, l.read.type).noEmail ? null : await draftFor(ctx, mr, l.read, client, batch.receivedAt);
    await ctx.db.update(mailroomLetter).set({ clientId: client.id, matchKind: "matched", matchReason: m.reason, candidateIds: [], folder: target.folder, fileName: target.fileName, ...emailFields(email, client) })
      .where(and(eq(mailroomLetter.id, l.id), eq(mailroomLetter.status, "proposed")));
    await audit(ctx, "mailroom.rematch", "mailroom_letter", l.id, { clientId: client.id, reason: m.reason });
    n++;
  }
  return n;
}

// ---------- Scans in ----------

const SCAN_TYPES: Record<string, string> = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

/** Records a new scan. Returns null if the same file was already received. */
export async function ingestScan(ctx: Ctx, _mr: Mailroom, f: { filename: string; content: Buffer }): Promise<{ id: string } | null> {
  const mime = SCAN_TYPES[path.extname(f.filename).toLowerCase()] ?? "application/pdf";
  const content = mime.startsWith("image/") ? await imageToPdf(f.content, mime) : f.content;
  const hash = sha(f.content);
  const id = ctx.ids.next("mrb");
  const key = `mailroom/batches/${id}.pdf`;
  await ctx.storage.put(key, content);
  const [row] = await ctx.db.insert(mailroomBatch).values({ id, firmId: ctx.firmId, filename: f.filename, sha256: hash, storageKey: key, receivedAt: ctx.clock.now() })
    .onConflictDoNothing().returning({ id: mailroomBatch.id });
  return row ?? null;
}

/** Picks up new files in the scan folder the copier saves to. */
export async function pollScanFolder(ctx: Ctx, mr: Mailroom): Promise<number> {
  if (!existsSync(mr.scanDir)) return 0;
  let added = 0;
  for (const name of (await readdir(mr.scanDir)).sort()) {
    if (name.startsWith(".") || !SCAN_TYPES[path.extname(name).toLowerCase()]) continue;
    const content = await readFile(path.join(mr.scanDir, name));
    const known = await ctx.db.select({ id: mailroomBatch.id }).from(mailroomBatch).where(and(eq(mailroomBatch.firmId, ctx.firmId), eq(mailroomBatch.sha256, sha(content))));
    if (known.length) continue;
    if (await ingestScan(ctx, mr, { filename: name, content })) added++;
  }
  return added;
}

/** Splits, reads, matches and drafts every waiting batch. */
export async function processWaiting(ctx: Ctx, mr: Mailroom): Promise<number> {
  const waiting = await ctx.db.select({ id: mailroomBatch.id }).from(mailroomBatch).where(and(eq(mailroomBatch.firmId, ctx.firmId), eq(mailroomBatch.status, "new"))).orderBy(asc(mailroomBatch.receivedAt));
  for (const b of waiting) await processBatch(ctx, mr, b.id);
  return waiting.length;
}

export async function processBatch(ctx: Ctx, mr: Mailroom, batchId: string): Promise<void> {
  const [claimed] = await ctx.db.update(mailroomBatch).set({ status: "reading", error: null })
    .where(and(eq(mailroomBatch.firmId, ctx.firmId), eq(mailroomBatch.id, batchId), inArray(mailroomBatch.status, ["new", "failed"]))).returning();
  if (!claimed) return;
  try {
    const content = await ctx.storage.get(claimed.storageKey);
    const pages = await pdfPages(content);
    await ctx.db.update(mailroomBatch).set({ pages }).where(eq(mailroomBatch.id, batchId));
    const ranges: PageRange[] = pages > 1 ? splitPlan(pages, await readSplit(ctx, claimed.filename, content, pages)) : [{ fromPage: 1, toPage: 1 }];
    const letters = [];
    for (const [i, r] of ranges.entries()) {
      const part = ranges.length === 1 ? content : await extractPages(content, r);
      const id = ctx.ids.next("mrl");
      const key = `mailroom/letters/${id}.pdf`;
      await ctx.storage.put(key, part);
      letters.push({ id, firmId: ctx.firmId, batchId, seq: i + 1, pageFrom: r.fromPage, pageTo: r.toPage, storageKey: key, sha256: sha(part) });
    }
    await ctx.db.insert(mailroomLetter).values(letters);
    // Letters are read a few at a time, so they appear for review as each is ready.
    const queue = [...letters];
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
      for (let l = queue.shift(); l; l = queue.shift()) await readOne(ctx, mr, l.id, claimed.receivedAt);
    }));
    await ctx.db.update(mailroomBatch).set({ status: "ready" }).where(eq(mailroomBatch.id, batchId));
  } catch (e) {
    await ctx.db.update(mailroomBatch).set({ status: "failed", error: (e as Error).message.slice(0, 500) }).where(eq(mailroomBatch.id, batchId));
  }
}

const hkDate = (d: Date) => new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 10);

async function readOne(ctx: Ctx, mr: Mailroom, letterId: string, receivedAt: Date) {
  const l = await getLetter(ctx, letterId);
  try {
    const r = await readLetter(ctx, mr.rules, `letter-${l.seq}.pdf`, await ctx.storage.get(l.storageKey));
    const dir = await clients(ctx, { activeOnly: true });
    const m = matchLetter(r, dir);
    const client = m.kind === "matched" ? dir.find((c) => c.id === m.clientId)! : null;
    const target = fileTarget(mr.rules, r, client, hkDate(receivedAt));
    const email = client && !ruleFor(mr.rules, r.type).noEmail ? await draftFor(ctx, mr, r, client, receivedAt) : null;
    await ctx.db.update(mailroomLetter).set({
      read: r, matchKind: m.kind, matchReason: m.kind === "junk" ? null : m.reason, candidateIds: m.kind === "ask" ? m.candidates : [],
      clientId: client?.id ?? null, folder: m.kind === "ask" ? null : target.folder, fileName: target.fileName, ...emailFields(email, client), status: "proposed",
    }).where(eq(mailroomLetter.id, letterId));
  } catch (e) {
    await ctx.db.update(mailroomLetter).set({ status: "failed", error: (e as Error).message.slice(0, 500) }).where(eq(mailroomLetter.id, letterId));
  }
}

async function draftFor(ctx: Ctx, mr: Mailroom, r: NonNullable<Letter["read"]>, client: MailroomClient, receivedAt: Date) {
  return draftClientEmail(ctx, {
    language: client.language, contactName: client.contactName, clientName: client.language === "en" ? client.name : client.nameZh ?? client.name,
    firmName: mr.firmName, receivedOn: hkDate(receivedAt),
    letter: { type: ruleFor(mr.rules, r.type).label, sender: r.sender, summary: r.summaryEn, actionNeeded: r.actionNeeded, dueDate: r.dueDate, amountHkd: r.amountHkd, taxYear: r.taxYear },
  });
}

const emailFields = (e: { subject: string; body: string } | null, client: MailroomClient | null) => ({
  emailTo: e ? client?.contactEmail ?? null : null, emailSubject: e?.subject ?? null, emailBody: e?.body ?? null, emailLang: e ? client?.language ?? null : null,
});

// ---------- Reading state ----------

async function withClients(ctx: Ctx, rows: (typeof mailroomLetter.$inferSelect)[]): Promise<Letter[]> {
  const ids = [...new Set(rows.flatMap((r) => [...r.candidateIds, ...(r.clientId ? [r.clientId] : [])]))];
  const cs = ids.length ? await ctx.db.select().from(mailroomClient).where(and(eq(mailroomClient.firmId, ctx.firmId), inArray(mailroomClient.id, ids))) : [];
  const by = new Map(cs.map((c) => [c.id, c]));
  return rows.map((r) => ({ ...r, client: r.clientId ? by.get(r.clientId) ?? null : null, candidates: r.candidateIds.map((id) => by.get(id)).filter((c): c is MailroomClient => !!c) }));
}

export async function lettersFor(ctx: Ctx, batchId: string): Promise<Letter[]> {
  return withClients(ctx, await ctx.db.select().from(mailroomLetter).where(and(eq(mailroomLetter.firmId, ctx.firmId), eq(mailroomLetter.batchId, batchId))).orderBy(asc(mailroomLetter.seq)));
}

export async function getLetter(ctx: Ctx, id: string): Promise<Letter> {
  const rows = await ctx.db.select().from(mailroomLetter).where(and(eq(mailroomLetter.firmId, ctx.firmId), eq(mailroomLetter.id, id)));
  if (!rows.length) throw new Error("No such letter");
  return (await withClients(ctx, rows))[0];
}

export async function batches(ctx: Ctx) {
  return ctx.db.select({
    id: mailroomBatch.id, filename: mailroomBatch.filename, status: mailroomBatch.status, error: mailroomBatch.error, pages: mailroomBatch.pages, receivedAt: mailroomBatch.receivedAt,
    letters: sql<number>`(select count(*)::int from mailroom_letter l where l.batch_id = mailroom_batch.id)`,
    toReview: sql<number>`(select count(*)::int from mailroom_letter l where l.batch_id = mailroom_batch.id and l.status = 'proposed')`,
    reading: sql<number>`(select count(*)::int from mailroom_letter l where l.batch_id = mailroom_batch.id and l.status = 'reading')`,
  }).from(mailroomBatch).where(eq(mailroomBatch.firmId, ctx.firmId)).orderBy(sql`${mailroomBatch.receivedAt} desc`);
}

/** Changes whenever anything in the mail room changes, so open pages can refresh. */
export async function mailroomVersion(ctx: Ctx): Promise<string> {
  const r = await ctx.db.execute(sql`select (select count(*) from mailroom_batch where firm_id = ${ctx.firmId}) || ':' || (select coalesce(string_agg(status || coalesce(client_id, '') || coalesce(filed_path, ''), ',' order by id), '') from mailroom_letter where firm_id = ${ctx.firmId}) || ':' || (select coalesce(string_agg(status, ',' order by id), '') from mailroom_batch where firm_id = ${ctx.firmId}) as v`);
  return createHash("sha1").update(String((r.rows[0] as { v: string }).v)).digest("hex");
}

// ---------- Staff actions ----------

/** Starts the review clock the first time staff open a letter. */
export async function openLetter(ctx: Ctx, id: string): Promise<void> {
  await ctx.db.update(mailroomLetter).set({ openedAt: ctx.clock.now() })
    .where(and(eq(mailroomLetter.firmId, ctx.firmId), eq(mailroomLetter.id, id), sql`${mailroomLetter.openedAt} is null`));
}

const correction = (ctx: Ctx, field: string, from: string | null, to: string | null): MailroomCorrection => ({ field, from, to, at: ctx.clock.now().toISOString(), by: ctx.userId });

async function proposed(ctx: Ctx, id: string) {
  const l = await getLetter(ctx, id);
  if (l.status !== "proposed") throw new Error("This letter has already been filed. Undo it first to change it.");
  return l;
}

/** "Not this client" or "whose letter is this?": staff choose the client; folder and email follow. */
export async function chooseClient(ctx: Ctx, mr: Mailroom, id: string, clientId: string): Promise<void> {
  const l = await proposed(ctx, id);
  const client = (await clients(ctx)).find((c) => c.id === clientId);
  if (!client) throw new Error("No such client");
  if (!l.read) throw new Error("This letter hasn't been read yet");
  const batch = (await ctx.db.select().from(mailroomBatch).where(eq(mailroomBatch.id, l.batchId)))[0];
  const target = fileTarget(mr.rules, l.read, client, hkDate(batch.receivedAt));
  const email = ruleFor(mr.rules, l.read.type).noEmail ? null : await draftFor(ctx, mr, l.read, client, batch.receivedAt);
  await ctx.db.update(mailroomLetter).set({
    clientId, matchKind: "matched", matchReason: "chosen by staff", folder: target.folder, fileName: target.fileName, ...emailFields(email, client),
    corrections: [...l.corrections, correction(ctx, "client", l.clientId, clientId)],
  }).where(eq(mailroomLetter.id, id));
  await audit(ctx, "mailroom.choose_client", "mailroom_letter", id, { from: l.clientId, to: clientId });
}

/** A letter for a company the firm doesn't act for: kept in the unsorted folder, no email. */
export async function notForAClient(ctx: Ctx, mr: Mailroom, id: string): Promise<void> {
  const l = await proposed(ctx, id);
  if (!l.read) throw new Error("This letter hasn't been read yet");
  const batch = (await ctx.db.select().from(mailroomBatch).where(eq(mailroomBatch.id, l.batchId)))[0];
  const { fileName } = fileTarget(mr.rules, l.read, null, hkDate(batch.receivedAt));
  await ctx.db.update(mailroomLetter).set({
    clientId: null, matchKind: "junk", matchReason: "not a client", folder: `${mr.rules.unsortedFolder}/Not a client`, fileName, ...emailFields(null, null),
    corrections: [...l.corrections, correction(ctx, "client", l.clientId, null)],
  }).where(eq(mailroomLetter.id, id));
  await audit(ctx, "mailroom.not_a_client", "mailroom_letter", id, { from: l.clientId });
}

type Editable = "folder" | "fileName" | "emailSubject" | "emailBody" | "emailTo";
export async function editLetter(ctx: Ctx, _mr: Mailroom, id: string, e: Partial<Record<Editable, string>>): Promise<void> {
  const l = await proposed(ctx, id);
  const changes: Partial<Record<Editable, string>> = {};
  const fixes: MailroomCorrection[] = [];
  for (const [k, v] of Object.entries(e) as [Editable, string | undefined][]) {
    if (v === undefined) continue;
    let value = v.replace(/\r\n?/g, "\n").trim();
    if (k === "fileName" && value && !/\.pdf$/i.test(value)) value += ".pdf";
    if (value === (l[k] ?? "").trim()) continue;
    changes[k] = value;
    fixes.push(correction(ctx, k, l[k] ?? null, value));
  }
  if (!fixes.length) return;
  await ctx.db.update(mailroomLetter).set({ ...changes, corrections: [...l.corrections, ...fixes] }).where(eq(mailroomLetter.id, id));
}

/** The first unused name, so a file already in the folder (even an identical one) is never touched. */
function freePath(full: string): string {
  const ext = path.extname(full), base = full.slice(0, -ext.length);
  for (let n = 1; n < 100; n++) {
    const p = n === 1 ? full : `${base} (${n})${ext}`;
    if (!existsSync(p)) return p;
  }
  throw new Error("Too many files with this name in the folder");
}

/** The approval gate: files the scan into the firm's folder and saves the email as a draft. */
export async function approveLetter(ctx: Ctx, mr: Mailroom, id: string): Promise<void> {
  const l = await getLetter(ctx, id);
  if (l.status === "approved") return;
  if (l.matchKind !== "junk" && !l.clientId) throw new Error("Say whose letter this is before approving it.");
  if (!l.folder || !l.fileName) throw new Error("This letter has no folder yet.");
  const target = safeTarget(mr.serverRoot, l.folder, l.fileName);
  const [claimed] = await ctx.db.update(mailroomLetter).set({ status: "filing" })
    .where(and(eq(mailroomLetter.firmId, ctx.firmId), eq(mailroomLetter.id, id), eq(mailroomLetter.status, "proposed"))).returning({ id: mailroomLetter.id });
  if (!claimed) return;
  let filed: string | null = null, draftRef: string | null = null;
  try {
    const content = await ctx.storage.get(l.storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    const free = freePath(target);
    await writeFile(free, content, { flag: "wx" });
    filed = free;
    if (l.emailBody) draftRef = await mr.drafts.save({ to: l.emailTo ? [l.emailTo] : [], subject: l.emailSubject ?? "", text: l.emailBody, attachments: [{ filename: path.basename(filed), mime: "application/pdf", content }] });
    const now = ctx.clock.now();
    await ctx.db.update(mailroomLetter).set({ status: "approved", approvedBy: ctx.userId, approvedAt: now, filedPath: filed, draftRef, reviewMs: l.openedAt ? now.getTime() - l.openedAt.getTime() : null }).where(eq(mailroomLetter.id, id));
    await audit(ctx, "mailroom.approve", "mailroom_letter", id, { filedPath: filed, draft: !!draftRef });
  } catch (e) {
    if (draftRef) await mr.drafts.remove(draftRef).catch(() => {});
    if (filed) await unlink(filed).catch(() => {});
    await ctx.db.update(mailroomLetter).set({ status: "proposed" }).where(eq(mailroomLetter.id, id));
    throw e;
  }
}

/** Takes a filing back: removes our copy (only if untouched) and the draft. */
export async function undoLetter(ctx: Ctx, mr: Mailroom, id: string): Promise<void> {
  const l = await getLetter(ctx, id);
  if (l.status !== "approved") return;
  if (l.filedPath && existsSync(l.filedPath)) {
    if (sha(await readFile(l.filedPath)) !== l.sha256) throw new Error("The filed copy has changed since it was filed, so it was left in place. Remove it by hand if it should go.");
    await unlink(l.filedPath);
  }
  if (l.draftRef) await mr.drafts.remove(l.draftRef);
  await ctx.db.update(mailroomLetter).set({ status: "proposed", filedPath: null, draftRef: null, approvedAt: null, approvedBy: null, reviewMs: null }).where(eq(mailroomLetter.id, id));
  await audit(ctx, "mailroom.undo", "mailroom_letter", id, { filedPath: l.filedPath });
}
