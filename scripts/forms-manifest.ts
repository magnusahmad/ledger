// Records source, date, hash and specification number of each official form in forms/hk-cr.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const dir = "forms/hk-cr";
const manifest: Record<string, unknown> = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith(".pdf")).sort()) {
  const code = f.replace(".pdf", "");
  const buf = readFileSync(`${dir}/${f}`);
  let spec = "";
  try { spec = execFileSync("pdftotext", ["-f", "1", "-l", "1", `${dir}/${f}`, "-"]).toString().match(/Specification No\.[^)]*\)/)?.[0] ?? ""; } catch { /* poppler optional */ }
  manifest[code] = {
    url: `https://www.cr.gov.hk/en/companies_ordinance/docs/${code}_fillable.pdf`,
    downloadedOn: "2026-09-29",
    sha256: createHash("sha256").update(buf).digest("hex"),
    specification: spec,
  };
}
writeFileSync(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
console.log(manifest);
