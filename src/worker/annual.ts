// Background worker for the annual-return pilot (src/annual/cycle.ts). Refuses to start when a
// production installation is misconfigured (DECISIONS.md #56).
import { makeRuntimeCtx } from "@/lib/runtime";
import { enabledModules, productionProblems } from "@/lib/modules";
import { withLease } from "@/domain/kv";
import { runAnnualCycle } from "@/annual/cycle";
import { cycleDeps, recordsLinked } from "@/annual/runtime";
import { closePools } from "@/db/client";

const ctx = { ...makeRuntimeCtx(), userId: "system:worker" };
const problems = productionProblems(ctx.config);
if (problems.length) { console.error(`Refusing to start:\n- ${problems.join("\n- ")}`); process.exit(1); }
if (!enabledModules(ctx.config).has("annual")) { console.error("The annual module is switched off for this installation."); process.exit(1); }
const deps = cycleDeps(ctx.config);
let stopping = false;
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => { stopping = true; });

console.log(`Annual worker started: mailboxes ${deps.sync.mailboxes.length}, ${deps.records.label} ${recordsLinked(ctx.config) ? "on" : "off"}, status files ${deps.statusDir ? "on" : "off"}`);
while (!stopping) {
  try {
    const h = await withLease(ctx, "annual-cycle", Math.ceil(ctx.config.ANNUAL_POLL_MS / 1000) + 600, () => runAnnualCycle(ctx, deps));
    if (h && Object.keys(h.errors).length) console.error(`Cycle finished with problems: ${JSON.stringify(h.errors)}`);
  } catch (e) { console.error("Cycle failed:", (e as Error).message); }
  for (let waited = 0; waited < ctx.config.ANNUAL_POLL_MS && !stopping; waited += 1000) await new Promise((r) => setTimeout(r, 1000));
}
await closePools();
