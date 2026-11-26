// Release bundles (DECISIONS.md #66): what is copied to a client's machine is cut from a commit and
// holds only what that client's installation runs on. It never carries another client's folder,
// CRV's own documents, tests or demos, and it names no other client anywhere.
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bundlePackageJson, bundlePlan, bundleStamp } from "../scripts/release.mjs";
import { installations } from "../clients";

const root = path.resolve(__dirname, "..");
const tree = [
  "package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "next-env.d.ts", "drizzle.config.ts", "README.md", "AGENTS.md", "CLAUDE.md", ".gitignore", ".env.example", "vitest.config.ts",
  "src/lib/config.ts", "src/db/migrations/0000_init.sql", "public/file.svg", "seed/playbooks/hk.json", "forms/hk-cr/NAR1.pdf", "assets/fonts/x.ttf",
  "scripts/migrate.ts", "scripts/firm-init.ts", "scripts/user-add.ts", "scripts/user-password.ts", "scripts/build-stamp.mjs", "scripts/release.mjs", "scripts/reset.ts", "scripts/eval-llm.ts",
  "deploy/windows/install.ps1", "docs/DECISIONS.md", "docs/PRODUCT_SPEC.md", "tests/m1-seed.test.ts", "e2e/demo.spec.ts", "eval/cases.ts", "demos/a.mp4", "prototype/p.html", ".claude/launch.json",
  "clients/README.md", "clients/index.ts",
  "clients/acme/installation.ts", "clients/acme/README.md", "clients/acme/data/rules.json", "clients/acme/src/reader.ts", "clients/acme/ops/restore.ps1", "clients/acme/docs/PILOT.md", "clients/acme/tests/reader.test.ts",
  "clients/zeta/installation.ts", "clients/zeta/data/rules.json",
];

describe("release bundle contents", () => {
  const plan = bundlePlan(tree, "acme");

  it("a client's bundle carries that client's folder and no other client's", () => {
    expect(plan.include).toContain("clients/acme/installation.ts");
    expect(plan.include.filter((f) => f.startsWith("clients/zeta/"))).toEqual([]);
  });

  it("the bundle leaves out tests, evals, demos, the prototype and CRV's own documents", () => {
    for (const f of ["tests/m1-seed.test.ts", "e2e/demo.spec.ts", "eval/cases.ts", "demos/a.mp4", "prototype/p.html", "docs/DECISIONS.md", "docs/PRODUCT_SPEC.md", "README.md", "AGENTS.md", "CLAUDE.md", "clients/README.md", ".claude/launch.json", ".env.example", "vitest.config.ts"])
      expect(plan.include, f).not.toContain(f);
  });

  it("the client's profile, data, code and ops scripts go in; its pilot documents and tests stay out", () => {
    expect(plan.include).toEqual(expect.arrayContaining(["clients/acme/installation.ts", "clients/acme/data/rules.json", "clients/acme/src/reader.ts", "clients/acme/ops/restore.ps1"]));
    for (const f of ["clients/acme/docs/PILOT.md", "clients/acme/tests/reader.test.ts", "clients/acme/README.md"]) expect(plan.include, f).not.toContain(f);
  });

  it("the bundle keeps what the installation runs on: source, migrations, seeds, forms, fonts and the installer", () => {
    expect(plan.include).toEqual(expect.arrayContaining(["package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "src/lib/config.ts", "src/db/migrations/0000_init.sql", "public/file.svg", "seed/playbooks/hk.json", "forms/hk-cr/NAR1.pdf", "assets/fonts/x.ttf", "deploy/windows/install.ps1"]));
  });

  it("only the scripts the installer uses are shipped: no reset, seed or evaluation script reaches a client's machine", () => {
    expect(plan.include.filter((f) => f.startsWith("scripts/")).sort()).toEqual(["scripts/build-stamp.mjs", "scripts/firm-init.ts", "scripts/migrate.ts", "scripts/user-add.ts", "scripts/user-password.ts"]);
  });

  it("the client registry in the bundle lists only that client", () => {
    expect(plan.include).not.toContain("clients/index.ts");
    const registry = plan.generated["clients/index.ts"];
    expect(registry).toContain('import acme from "./acme/installation"');
    expect(registry).toMatch(/installations: Record<string, Installation> = \{ acme \}/);
    expect(registry).not.toContain("zeta");
  });

  it("the bundle's package.json keeps the packages and only the commands an installation uses: no reset, seed, demo or test command", () => {
    const pkg = JSON.parse(bundlePackageJson(JSON.stringify({ name: "clerk", version: "0.1.0", dependencies: { next: "16.0.0" }, scripts: { dev: "next dev", build: "next build", prebuild: "node scripts/build-stamp.mjs", start: "next start", test: "vitest run", "db:reset": "tsx scripts/reset.ts", "db:seed": "tsx scripts/seed.ts", "db:migrate": "tsx scripts/migrate.ts", "mailroom:reset": "x", "user:add": "y", "user:password": "z", "firm:init": "z", "worker:annual": "w" } })));
    expect(Object.keys(pkg.scripts).sort()).toEqual(["build", "db:migrate", "firm:init", "prebuild", "start", "user:add", "user:password", "worker:annual"]);
    expect(pkg).toMatchObject({ name: "clerk", version: "0.1.0", dependencies: { next: "16.0.0" } });
  });

  it("an unknown client is refused rather than bundled with nothing", () => {
    expect(() => bundlePlan(tree, "acmee")).toThrow(/acmee.*known: acme, zeta/);
  });
});

describe("release bundle stamp", () => {
  const git = (answers: Record<string, string>) => (args: string) => { if (!(args in answers)) throw new Error("not a git repository"); return answers[args]; };
  const o = { version: "0.1.0", migrations: ["0000_init.sql", "0017_annual_replies.sql"], now: new Date("2026-11-22T03:00:00Z") };

  it("a bundle's stamp names the commit it was cut from and is not marked dirty, because it is built from the commit and not the working folder", () => {
    const s = bundleStamp({ ...o, git: git({ "rev-parse HEAD": "abc123\n", "rev-parse --abbrev-ref HEAD": "main\n", "status --porcelain": " M src/lib/config.ts\n" }) });
    expect(s).toMatchObject({ commit: "abc123", branch: "main", dirty: false, schema: "0017_annual_replies", version: "0.1.0" });
  });

  it("a release cannot be cut where there is no git history to cut it from", () => {
    expect(() => bundleStamp({ ...o, git: git({}) })).toThrow(/git/i);
  });
});

describe("release bundles of the real repository", () => {
  const tracked = execSync("git ls-files", { cwd: root, encoding: "utf8" }).split("\n").filter((f) => f && existsSync(path.join(root, f)));
  const TEXT = /\.(ts|tsx|mjs|js|json|md|sql|ps1|cmd|sh|css|xml|example|txt|csv|svg)$|Caddyfile$/;
  const others = (client: string) => Object.values(installations).filter((i) => i.id !== client).flatMap((i) => [i.id, ...(i.aliases ?? [])]);
  // package.json is rewritten for the bundle; the lock file is package names and hashes, where a
  // short alias can turn up by chance.
  const content = (f: string) => { const text = readFileSync(path.join(root, f), "utf8"); return f === "package.json" ? bundlePackageJson(text) : text; };
  const leaks = (client: string) => {
    const plan = bundlePlan(tracked, client);
    const names = others(client).map((n) => new RegExp(n, "i"));
    return plan.include.flatMap((f) => {
      const hit = (s: string) => names.find((n) => n.test(s));
      if (hit(f)) return [`${f} (file name)`];
      return TEXT.test(f) && f !== "package-lock.json" && hit(content(f)) ? [f] : [];
    });
  };

  it("UHY's bundle names no other client in any file name or file content", () => {
    expect(leaks("uhy")).toEqual([]);
  });

  // deploy/windows is UHY's installer (its host and service account names). A CWCCPA bundle must not
  // carry it; this becomes a real test when CWCCPA has an installer of its own.
  it.todo("CWCCPA's bundle names no other client in any file name or file content");
});
