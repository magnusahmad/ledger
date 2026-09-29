// Weekly check that the Companies Registry hasn't revised a form we fill.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Ctx } from "@/lib/ctx";
import { Crypto } from "@/lib/crypto";
import { kvSet } from "@/domain/kv";
import { FORMS_DIR } from "./cr-forms";

type Manifest = Record<string, { url: string; sha256: string; specification: string; downloadedOn: string }>;

export function formsManifest(): Manifest {
  return JSON.parse(readFileSync(path.join(FORMS_DIR, "manifest.json"), "utf8"));
}

export async function checkForms(ctx: Ctx, fetcher: (url: string) => Promise<Buffer> = defaultFetch) {
  const m = formsManifest();
  const changed: string[] = [];
  const errors: string[] = [];
  for (const [code, info] of Object.entries(m)) {
    try {
      const buf = await fetcher(info.url);
      if (Crypto.sha256(buf) !== info.sha256) changed.push(code);
    } catch (e) { errors.push(`${code}: ${(e as Error).message}`); }
  }
  await kvSet(ctx, "forms.check", { at: ctx.clock.now().toISOString(), changed, errors });
  return { checked: Object.keys(m).length, changed, errors };
}

async function defaultFetch(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Harbourline form check" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
