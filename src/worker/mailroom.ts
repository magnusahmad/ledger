// Mail room worker for a mail-room-only installation: watches the copier's scan folder and reads
// new batches. It runs nothing else (no mailbox, bank or reminder polling).
import { makeRuntimeCtx } from "@/lib/runtime";
import { withLease } from "@/domain/kv";
import { makeMailroom } from "@/mailroom/runtime";
import { pollScanFolder, processWaiting } from "@/mailroom/service";
import { syncClients } from "@/mailroom/client-sync";

const ctx = makeRuntimeCtx();
const every = Math.min(ctx.config.POLL_INTERVAL_MS, 3000);
let lastSyncCheck = 0;
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), "[mail room]", ...a);

async function tick() {
  try {
    // A short lease, renewed while this worker runs, so a restarted worker takes over within a minute.
    const r = await withLease(ctx, "mailroom", 60, async () => {
      const mr = makeMailroom(ctx);
      // The firm's client records first, so a letter for a new client can match on arrival.
      // Checked at most every 30 seconds: the sources may sit on a network share.
      const due = Date.now() - lastSyncCheck > 30_000;
      const sync = due && mr.clientSources?.length ? await syncClients(ctx, mr, mr.clientSources) : null;
      if (due) lastSyncCheck = Date.now();
      return { sync, added: await pollScanFolder(ctx, mr), read: await processWaiting(ctx, mr) };
    });
    if (r?.sync?.applied) log(`client list: ${r.sync.added} added, ${r.sync.updated} updated, ${r.sync.deactivated} switched off, ${r.sync.rematched} letters matched, ${r.sync.conflicts} with clashes`);
    if (r?.sync?.error) log("client list not updated:", r.sync.error);
    if (r?.added || r?.read) log(`${r.added} new scans, ${r.read} batches read`);
  } catch (e) { log("error:", (e as Error).message); }
}

async function loop() {
  const mr = makeMailroom(ctx);
  log(`started: scans=${mr.scanDir} server=${mr.serverRoot} drafts=${mr.drafts.name} llm=${ctx.config.llmMode}/${ctx.config.LLM_MODEL}`);
  for (;;) {
    const t = Date.now();
    await tick();
    await new Promise((r) => setTimeout(r, Math.max(500, every - (Date.now() - t))));
  }
}
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
loop();
