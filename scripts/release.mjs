// Cuts the bundle that is copied to a client's machine (DECISIONS.md #66):
//   npm run release -- <client> [--out <folder>] [--zip]
// The bundle is built from the current commit, never from the working folder, so nothing uncommitted
// or untracked can travel with it. It holds what that client's installation runs on and nothing else:
// no other client's folder, no tests, evaluations, demos or internal documents. Its build.json names
// the commit, so the installation can say which build it is. Plain Node with no packages.
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeStamp, sameFile } from "./build-stamp.mjs";

/** Top-level files and folders an installation runs on. Everything else stays in the repository. */
const ROOT_FILES = ["package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "next-env.d.ts", "drizzle.config.ts"];
const FOLDERS = ["src/", "public/", "seed/", "forms/", "assets/", "deploy/"];
/** The scripts the installer and its guide run. No reset, seed, demo or evaluation script is shipped. */
const SCRIPTS = ["scripts/migrate.ts", "scripts/firm-init.ts", "scripts/user-add.ts", "scripts/build-stamp.mjs"];
/** The npm commands an installation uses. Development, demo, reset, seed and test commands are dropped. */
const COMMANDS = ["prebuild", "build", "build:stamp", "start", "worker:annual", "db:migrate", "firm:init", "user:add"];
/** What goes from the client's own folder: its profile and what the installation or its operator uses. */
const CLIENT_PARTS = ["installation.ts", "data/", "src/", "ops/"];

/**
 * Which tracked files go into a client's bundle, and the files written for it.
 * @param {string[]} files  every tracked file in the commit
 * @param {string} client   the client's folder name under clients/
 * @returns {{ include: string[], generated: Record<string, string> }}
 */
export function bundlePlan(files, client) {
  const known = [...new Set(files.flatMap((f) => { const m = /^clients\/([^/]+)\/installation\.ts$/.exec(f); return m ? [m[1]] : []; }))].sort();
  if (!known.includes(client)) throw new Error(`Unknown client: ${client} (known: ${known.join(", ") || "none"})`);
  const own = `clients/${client}/`;
  const include = files.filter((f) =>
    ROOT_FILES.includes(f) || SCRIPTS.includes(f) || FOLDERS.some((d) => f.startsWith(d))
    || (f.startsWith(own) && CLIENT_PARTS.some((p) => f === own + p || (p.endsWith("/") && f.startsWith(own + p)))));
  const registry = [
    "// Written by scripts/release.mjs: this copy is for one installation.",
    'import type { Installation } from "../src/lib/installation";',
    `import ${client} from "./${client}/installation";`,
    "",
    `export const installations: Record<string, Installation> = { ${client} };`,
    "",
  ].join("\n");
  return { include, generated: { "clients/index.ts": registry } };
}

/**
 * The bundle's package.json: the same packages, with only the commands an installation uses.
 * @param {string} text  the repository's package.json
 */
export function bundlePackageJson(text) {
  const pkg = JSON.parse(text);
  pkg.scripts = Object.fromEntries(Object.entries(pkg.scripts ?? {}).filter(([k]) => COMMANDS.includes(k)));
  return JSON.stringify(pkg, null, 2) + "\n";
}

/**
 * The bundle's stamp. A bundle is cut from the commit, so it is never "dirty", whatever the state
 * of the working folder; without git history there is nothing to cut it from.
 * @param {{ git: (args: string) => string, version: string, migrations: string[], now: Date }} o
 */
export function bundleStamp(o) {
  const s = makeStamp({ ...o, existing: null });
  if (!s.commit) throw new Error("A release is cut from a commit: run this in the git checkout of the repository");
  return { ...s, dirty: false };
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const args = process.argv.slice(2);
  const client = args.find((a) => !a.startsWith("--"));
  const outAt = args.indexOf("--out");
  if (!client) { console.error("Usage: npm run release -- <client> [--out <folder>] [--zip]"); process.exit(2); }
  const git = (a) => execSync(`git ${a}`, { cwd: root, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const files = git("ls-tree -r --name-only HEAD").split("\n").filter(Boolean);
  const plan = bundlePlan(files, client);
  const migrations = files.filter((f) => f.startsWith("src/db/migrations/")).map((f) => path.basename(f));
  const stamp = bundleStamp({ git, version: JSON.parse(git("show HEAD:package.json")).version, migrations, now: new Date() });
  const out = path.resolve(outAt >= 0 ? args[outAt + 1] : path.join(root, "dist", `clerk-${client}-${stamp.commit.slice(0, 7)}`));
  if (existsSync(out) && readdirSync(out).length) { console.error(`${out} already exists and is not empty; remove it or choose another folder with --out`); process.exit(1); }
  mkdirSync(out, { recursive: true });
  const tar = execFileSync("git", ["archive", "--format=tar", "HEAD", "--", ...plan.include], { cwd: root, maxBuffer: 1024 * 1024 * 1024 });
  execFileSync("tar", ["-xf", "-", "-C", out], { input: tar });
  for (const [f, text] of Object.entries(plan.generated)) { mkdirSync(path.dirname(path.join(out, f)), { recursive: true }); writeFileSync(path.join(out, f), text); }
  writeFileSync(path.join(out, "package.json"), bundlePackageJson(git("show HEAD:package.json")));
  writeFileSync(path.join(out, "build.json"), JSON.stringify(stamp, null, 2) + "\n");
  const pending = git("status --porcelain --untracked-files=no").trim().split("\n").filter(Boolean).length;
  console.log(`Bundle for ${client}: ${plan.include.length + Object.keys(plan.generated).length + 1} files from commit ${stamp.commit.slice(0, 7)} (${stamp.branch}), schema ${stamp.schema}`);
  console.log(out);
  if (args.includes("--zip")) {
    // One file is easier to send over a remote-desktop file transfer than a folder of 380.
    execFileSync("zip", ["-rq", `${path.basename(out)}.zip`, path.basename(out)], { cwd: path.dirname(out) });
    console.log(`${out}.zip`);
  }
  if (pending) console.log(`Note: ${pending} tracked file${pending === 1 ? " has" : "s have"} uncommitted changes in the working folder. They are not in the bundle.`);
  if (stamp.branch !== "main") console.log(`Note: this bundle is cut from the branch "${stamp.branch}", not from main.`);
}

if (process.argv[1] && sameFile(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) {
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}
