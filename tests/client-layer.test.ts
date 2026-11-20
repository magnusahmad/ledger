// The client layer (DECISIONS.md #65): one core product, and each client's differences in its own
// folder under clients/. The core never names a client and reaches a client's folder only through
// the installation loader, so "what is bespoke for this client" is always the contents of one folder.
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { installations } from "../clients";

const root = path.resolve(__dirname, "..");
const LOADER = "src/lib/installation.ts";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) return f === "migrations" ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}
/** Comments may cite a client's brief (that is how a reader learns why code exists); code may not. */
const withoutComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const clientFolders = () => readdirSync(path.join(root, "clients")).filter((f) => statSync(path.join(root, "clients", f)).isDirectory());
const files = sourceFiles(path.join(root, "src")).map((p) => ({ rel: path.relative(root, p), code: withoutComments(readFileSync(p, "utf8")) }));

describe("the core and the client layer", () => {
  it("core code names no client: no client id or alias appears in src outside comments", () => {
    const names = Object.values(installations).flatMap((i) => [i.id, ...(i.aliases ?? [])]);
    expect(names.length).toBeGreaterThan(0);
    const found = files.flatMap((f) => names.filter((n) => new RegExp(n, "i").test(f.code)).map((n) => `${f.rel} names "${n}"`));
    expect(found).toEqual([]);
  });

  it("core imports nothing from a client folder except through the installation loader", () => {
    const found = files.filter((f) => f.rel !== LOADER && /from\s+["'][^"']*\bclients(\/|["'])|import\(\s*["'][^"']*\bclients\//.test(f.code)).map((f) => f.rel);
    expect(found).toEqual([]);
  });

  it("every client folder has an installation profile whose id is the folder name", () => {
    const folders = clientFolders();
    expect(folders.length).toBeGreaterThan(0);
    expect(Object.keys(installations).sort()).toEqual(folders.sort());
    for (const f of folders) expect(installations[f as keyof typeof installations].id).toBe(f);
  });

  it("an installation profile holds no secrets: keys, passwords and connection strings stay in the vault", () => {
    for (const i of Object.values(installations))
      for (const k of Object.keys(i.settings)) expect(k, `${i.id}: ${k}`).not.toMatch(/SECRET|KEY|PASSWORD|TOKEN|CONNECTION|DATABASE_URL/i);
  });

  it("the data files a profile names exist in the repository", () => {
    for (const i of Object.values(installations))
      for (const [k, v] of Object.entries(i.settings)) if (/\.json$/.test(v)) expect(existsSync(path.join(root, v)), `${i.id}: ${k} -> ${v}`).toBe(true);
  });
});
