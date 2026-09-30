// Background worker: polls the mailbox and the bank, drains the job queue, drafts overdue
// reminders hourly and checks CR forms weekly. Runs next to the web app (npm run dev).
import "@/domain/inbound";
import { makeRuntimeCtx } from "@/lib/runtime";
import { pollMail } from "@/channels/mail-poller";
import { pollBank } from "@/domain/payments";
import { runJobs } from "@/domain/jobs";
import { runReminders } from "@/domain/reminders";
import { runChasers } from "@/domain/chasing";
import { checkForms } from "@/documents/forms-check";
import { kvGet, kvSet } from "@/domain/kv";

const ctx = makeRuntimeCtx();
const every = ctx.config.POLL_INTERVAL_MS;
let stopping = false;
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), "[worker]", ...a);

async function tick() {
  try {
    const m = await pollMail(ctx);
    if (m.processed) log(`mail: ${m.processed} processed${m.errors.length ? `, errors: ${m.errors.join("; ")}` : ""}`);
  } catch (e) { log("mail error:", (e as Error).message); }
  try {
    const b = await pollBank(ctx);
    if (b.matched || b.proposed || b.unmatched) log(`bank: ${b.matched} matched, ${b.proposed} proposed, ${b.unmatched} unmatched`);
  } catch (e) { log("bank error:", (e as Error).message); }
  try { const n = await runJobs(ctx); if (n) log(`jobs: ${n} run`); } catch (e) { log("jobs error:", (e as Error).message); }
  const now = Date.now();
  const lastRem = await kvGet<number>(ctx, "worker.lastReminders");
  if (!lastRem || now - lastRem > 3600_000) { try { const n = await runReminders(ctx); if (n) log(`reminders: ${n} drafted`); } catch (e) { log("reminders error:", (e as Error).message); } await kvSet(ctx, "worker.lastReminders", now); }
  const lastChase = await kvGet<number>(ctx, "worker.lastChasers");
  if (!lastChase || now - lastChase > 3600_000) { try { const n = await runChasers(ctx); if (n) log(`chasers: ${n} drafted`); } catch (e) { log("chasers error:", (e as Error).message); } await kvSet(ctx, "worker.lastChasers", now); }
  const lastForms = await kvGet<number>(ctx, "worker.lastFormsCheck");
  if (!lastForms || now - lastForms > 7 * 86400_000) { await kvSet(ctx, "worker.lastFormsCheck", now); checkForms(ctx).then((r) => r.changed.length && log(`FORMS CHANGED on cr.gov.hk: ${r.changed.join(", ")}`)).catch(() => {}); }
}

async function loop() {
  log(`started: mail=${ctx.config.mailProvider} bank=${ctx.config.bankProvider} accounting=${ctx.config.accountingProvider} llm=${ctx.config.llmMode}/${ctx.config.LLM_MODEL} every ${every}ms`);
  while (!stopping) {
    const t = Date.now();
    await tick();
    await new Promise((r) => setTimeout(r, Math.max(500, every - (Date.now() - t))));
  }
}
process.on("SIGINT", () => { stopping = true; process.exit(0); });
process.on("SIGTERM", () => { stopping = true; process.exit(0); });
loop();
