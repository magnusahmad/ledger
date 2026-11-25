// The pilot's background cycle (run by src/worker/annual.ts): bring in a newer copy of the records
// when there is one, open cases, read the team mailboxes, and regenerate the status files on the share. Each step is
// isolated: a failure is recorded in the health record and the next step still runs. The health
// record holds times and error messages only, never client data.
import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { appUser } from "@/db/schema";
import { kvGet, kvSet } from "@/domain/kv";
import { syncCases } from "./cases";
import { syncMailboxes, type MailboxSource, type SyncOptions } from "./mail-sync";
import { writeStatusFiles } from "./writeback";
import { readPendingReplies } from "./reply-reader";
import type { RecordsSource } from "./records";
import { applyClientList, type ClientListSource } from "./client-list";
import { readBuildStamp } from "@/lib/build";

export type CycleDeps = {
  /** Where the company's current particulars come from (records.ts). */
  records: RecordsSource;
  /** The firm's own client list, where the installation has one (client-list.ts). */
  clientList?: ClientListSource | null;
  mail: MailboxSource | null; sync: SyncOptions;
  statusDir: string | null; withinDays: number;
  /** The reply reader (AR_REPLY_READER): off means no email is ever sent to the model. */
  readReplies?: boolean;
};

export type Health = {
  lastCycleAt: string; recordsAsAt: string | null; recordsImportedAt: string | null;
  lastMailSyncAt: string | null; lastStatusWriteAt: string | null; lastReplyReadAt?: string | null;
  /** When the firm's client list was last read and applied. */
  clientListReadAt?: string | null;
  errors: Partial<Record<"records" | "clientList" | "cases" | "mail" | "replies" | "status", string>>;
};
const KEY = "annual.health";

export const readHealth = (ctx: Ctx) => kvGet<Health>(ctx, KEY);

export async function runAnnualCycle(ctx: Ctx, d: CycleDeps): Promise<Health> {
  const prev = await readHealth(ctx);
  const h: Health = { lastCycleAt: ctx.clock.now().toISOString(), recordsAsAt: prev?.recordsAsAt ?? null, recordsImportedAt: prev?.recordsImportedAt ?? null, lastMailSyncAt: prev?.lastMailSyncAt ?? null, lastStatusWriteAt: prev?.lastStatusWriteAt ?? null, lastReplyReadAt: prev?.lastReplyReadAt ?? null, errors: {} };
  const step = async (k: keyof Health["errors"], f: () => Promise<void>) => { try { await f(); } catch (e) { h.errors[k] = (e as Error).message.slice(0, 500); } };

  let newRecords = false;
  await step("records", async () => {
    const r = await d.records.refresh(ctx);
    if (!r) return;
    newRecords = true;
    h.recordsAsAt = r.asAt;
    h.recordsImportedAt = ctx.clock.now().toISOString();
  });
  h.clientListReadAt = prev?.clientListReadAt ?? null;
  await step("clientList", async () => {
    if (!d.clientList) return;
    if (await applyClientList(ctx, d.clientList, { force: newRecords, build: readBuildStamp()?.commit ?? null })) h.clientListReadAt = ctx.clock.now().toISOString();
  });
  await step("cases", () => syncCases(ctx, { withinDays: d.withinDays }));
  await step("mail", async () => {
    if (!d.mail || !d.sync.mailboxes.length) return;
    await syncMailboxes(ctx, d.mail, d.sync);
    h.lastMailSyncAt = ctx.clock.now().toISOString();
  });
  await step("replies", async () => {
    if (!d.readReplies) return;
    const r = await readPendingReplies(ctx, d.records);
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
