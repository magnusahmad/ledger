// npm run screening:update — downloads the OpenSanctions consolidated sanctions list
// (bulk data, non-commercial licence) for local screening when no API key is set.
import { mkdirSync, writeFileSync } from "node:fs";
const url = "https://data.opensanctions.org/datasets/latest/sanctions/targets.simple.csv";
mkdirSync("storage/opensanctions", { recursive: true });
const r = await fetch(url);
if (!r.ok) throw new Error(`Download failed: ${r.status}`);
const buf = Buffer.from(await r.arrayBuffer());
writeFileSync("storage/opensanctions/targets.simple.csv", buf);
console.log(`Saved ${(buf.length / 1e6).toFixed(1)} MB to storage/opensanctions/targets.simple.csv`);
