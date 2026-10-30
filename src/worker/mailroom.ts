// Mail room worker for a CWCCPA-style installation: watches the copier's scan folder and reads
// new batches. It runs nothing else (no mailbox, bank or reminder polling).
import { makeRuntimeCtx } from "@/lib/runtime";
import { withLease } from "@/domain/kv";
import { makeMailroom } from "@/mailroom/runtime";
import { pollScanFolder, processWaiting } from "@/mailroom/service";

const ctx = makeRuntimeCtx();
const every = Math.min(ctx.config.POLL_INTERVAL_MS, 3000);
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), "[mail room]", ...a);

async function tick() {
  try {
    const r = await withLease(ctx, "mailroom", 600, async () => {
      const mr = makeMailroom(ctx);
      return { added: await pollScanFolder(ctx, mr), read: await processWaiting(ctx, mr) };
    });
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
