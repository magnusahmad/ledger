// npm run forms:check — compares the Registry's current forms with forms/hk-cr/manifest.json.
import { makeRuntimeCtx } from "@/lib/runtime";
import { checkForms } from "@/documents/forms-check";
import { closePools } from "@/db/client";
const r = await checkForms(makeRuntimeCtx());
console.log(r.changed.length ? `Changed on cr.gov.hk: ${r.changed.join(", ")}. Re-map these forms before filing.` : `All ${r.checked} forms match the manifest.`);
if (r.errors.length) console.log("Errors:", r.errors);
await closePools();
