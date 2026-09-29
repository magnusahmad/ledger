// npm run forms:check — compares the Registry's current forms with forms/hk-cr/manifest.json.
import { makeRuntimeCtx } from "@/lib/runtime";
import { checkForms, formCheckSummary } from "@/documents/forms-check";
import { closePools } from "@/db/client";
const r = await checkForms(makeRuntimeCtx());
console.log(formCheckSummary(r));
if (r.errors.length || r.changed.length) process.exitCode = 1;
await closePools();
