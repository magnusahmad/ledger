// Writes build.json: which build this copy of Clerk is (DECISIONS.md #65). Run where git is
// available, before the code is copied to a client's machine: `npm run build:stamp`. It also runs
// before every `npm run build`; on a machine without git it keeps the stamp the copy came with.
// Plain Node with no packages, so it runs before `npm ci`. The health check reports the stamp
// together with the client profile, modules and model in use (src/lib/build.ts).
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {{ product: "clerk", version: string, commit: string | null, branch: string | null, dirty: boolean | null, schema: string | null, stampedAt: string }} BuildStamp
 * @param {{ git: (args: string) => string, version: string, migrations: string[], now: Date, existing: BuildStamp | null }} o
 * @returns {BuildStamp}
 */
export function makeStamp({ git, version, migrations, now, existing }) {
  const schema = migrations.filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort().pop()?.replace(/\.sql$/, "") ?? null;
  let commit = null, branch = null, dirty = null;
  try {
    commit = git("rev-parse HEAD").trim();
    branch = git("rev-parse --abbrev-ref HEAD").trim();
    // Uncommitted or untracked files mean the commit does not describe what is being built.
    dirty = git("status --porcelain").trim() !== "";
  } catch {
    if (existing) return existing;
    commit = null; branch = null; dirty = null;
  }
  return { product: "clerk", version, commit, branch, dirty, schema, stampedAt: now.toISOString() };
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const file = path.join(root, "build.json");
  const existing = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  const stamp = makeStamp({
    git: (args) => execSync(`git ${args}`, { cwd: root, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" }),
    version: JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version,
    migrations: readdirSync(path.join(root, "src/db/migrations")),
    now: new Date(), existing,
  });
  writeFileSync(file, JSON.stringify(stamp, null, 2) + "\n");
  const what = stamp.commit ? `${stamp.commit.slice(0, 7)}${stamp.dirty ? " with uncommitted changes" : ""}` : "an unknown commit (no git here and no stamp shipped with this copy)";
  console.log(`Build stamp: Clerk ${stamp.version}, ${what}, schema ${stamp.schema}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
