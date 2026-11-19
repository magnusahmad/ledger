// The pilot's background cycle (run by src/worker/annual.ts): import CSA when a newer restore exists,
// open cases, read the team mailboxes, and regenerate the status files on the share. Each step is
// isolated: a failure is recorded in the health record and the next step still runs. The health
// record holds times and error messages only, never client data.
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { appUser } from "@/db/schema";
import { kvGet, kvSet } from "@/domain/kv";
import { importCsa, latestImport } from "@/integrations/csa/import";
import type { CsaSource } from "@/integrations/csa/sql-source";
import { syncCases } from "./cases";
import { syncMailboxes, type MailboxSource, type SyncOptions } from "./mail-sync";
import { writeStatusFiles } from "./writeback";
import { readPendingReplies } from "./reply-reader";

export type CycleDeps = {
  restoreStatusFile: string | null;
  openCsa: (() => Promise<{ source: CsaSource; close: () => Promise<void> }>) | null;
  mail: MailboxSource | null; sync: SyncOptions;
  statusDir: string | null; withinDays: number;
  /** The reply reader (AR_REPLY_READER): off means no email is ever sent to the model. */
  readReplies?: boolean;
};

export type Health = {
  lastCycleAt: string; csaBackupTakenAt: string | null; csaImportedAt: string | null;
  lastMailSyncAt: string | null; lastStatusWriteAt: string | null; lastReplyReadAt?: string | null;
  errors: Partial<Record<"csa" | "cases" | "mail" | "replies" | "status", string>>;
};
const KEY = "annual.health";

export const readHealth = (ctx: Ctx) => kvGet<Health>(ctx, KEY);

export async function runAnnualCycle(ctx: Ctx, d: CycleDeps): Promise<Health> {
  const prev = await readHealth(ctx);
  const h: Health = { lastCycleAt: ctx.clock.now().toISOString(), csaBackupTakenAt: prev?.csaBackupTakenAt ?? null, csaImportedAt: prev?.csaImportedAt ?? null, lastMailSyncAt: prev?.lastMailSyncAt ?? null, lastStatusWriteAt: prev?.lastStatusWriteAt ?? null, lastReplyReadAt: prev?.lastReplyReadAt ?? null, errors: {} };
  const step = async (k: keyof Health["errors"], f: () => Promise<void>) => { try { await f(); } catch (e) { h.errors[k] = (e as Error).message.slice(0, 500); } };

  await step("csa", async () => {
    if (!d.restoreStatusFile || !d.openCsa) return;
    const s = JSON.parse(await readFile(d.restoreStatusFile, "utf8")) as { ok: boolean; backupTakenAt: string | null; error?: string };
    if (!s.ok) throw new Error(`The last CSA restore failed: ${s.error ?? "unknown error"}. The previous copy is still in use.`);
    const last = await latestImport(ctx);
    if (!s.backupTakenAt || (last && last.backupTakenAt.toISOString() >= new Date(s.backupTakenAt).toISOString())) return;
    const { source, close } = await d.openCsa();
    try { await importCsa(ctx, source, { backupTakenAt: new Date(s.backupTakenAt) }); } finally { await close(); }
    h.csaBackupTakenAt = new Date(s.backupTakenAt).toISOString();
    h.csaImportedAt = ctx.clock.now().toISOString();
  });
  await step("cases", () => syncCases(ctx, { withinDays: d.withinDays }));
  await step("mail", async () => {
    if (!d.mail || !d.sync.mailboxes.length) return;
    await syncMailboxes(ctx, d.mail, d.sync);
    h.lastMailSyncAt = ctx.clock.now().toISOString();
  });
  await step("replies", async () => {
    if (!d.readReplies) return;
    const r = await readPendingReplies(ctx);
    h.lastReplyReadAt = ctx.clock.now().toISOString();
    if (r.failed) throw new Error(`${r.failed === 1 ? "One client email" : `${r.failed} client emails`} couldn't be read by the model; staff can still review ${r.failed === 1 ? "it" : "them"} by hand.`);
  });
  await step("status", async () => {
    if (!d.statusDir) return;
    const users = await ctx.db.select({ id: appUser.id, name: appUser.name }).from(appUser).where(eq(appUser.firmId, ctx.firmId));
    await writeStatusFiles(ctx, d.statusDir, { userNames: Object.fromEntries(users.map((u) => [u.id, u.name])) });
    h.lastStatusWriteAt = ctx.clock.now().toISOString();
  });
  await kvSet(ctx, KEY, h);
  return h;
}
