// The product is called Clerk (ao1 Clerk in full); it was called Harbourline Desk until
// November 2026 (DECISIONS.md #60). Staff, clients' emails, the pilot machine and its
// install scripts must all use the new name. One deliberate exception: the encryption
// key derivation keeps its original "harbourline:" salt, because changing it would make
// every stored ID number and integration secret unreadable.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");
const SCANNED_DIRS = ["src", "seed", "deploy", "scripts", "tests", "e2e", "forms"];
const SCANNED_FILES = ["package.json", "README.md", ".env.example", "drizzle.config.ts", "vitest.config.ts", "playwright.config.ts"];
const TEXT = /\.(ts|tsx|js|mjs|json|md|ps1|sh|sql|xml|txt|cmd|css|html|example)$|Caddyfile$/;
const ALLOWED = [{ file: "src/lib/crypto.ts", line: /createHash\("sha256"\)\.update\("harbourline:" \+ secret\)/ }];

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (TEXT.test(name)) out.push(p);
  }
  return out;
}

describe("product name", () => {
  it("the old name Harbourline appears nowhere in the app, its seeds, tests or pilot install scripts, except the encryption salt", () => {
    const files = [
      ...SCANNED_DIRS.flatMap((d) => { try { return walk(path.join(ROOT, d)); } catch { return []; } }),
      ...SCANNED_FILES.map((f) => path.join(ROOT, f)),
    ].filter((f) => f !== __filename);
    const hits: string[] = [];
    for (const f of files) {
      const rel = path.relative(ROOT, f);
      readFileSync(f, "utf8").split("\n").forEach((line, i) => {
        if (!/harbourline/i.test(line)) return;
        if (ALLOWED.some((a) => a.file === rel && a.line.test(line))) return;
        hits.push(`${rel}:${i + 1}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it("the browser tab names the product ao1 Clerk", () => {
    // layout.tsx loads next/font, which only runs inside Next, so read the source.
    const layout = readFileSync(path.join(ROOT, "src/app/layout.tsx"), "utf8");
    expect(layout).toMatch(/metadata: Metadata = \{ title: "ao1 Clerk"/);
  });
});
