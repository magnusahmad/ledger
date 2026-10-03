// Audit files mutate fake mail and demo records. Give the next browser file the same
// baseline as the first one, while keeping visual evidence from every audit.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import type { TestInfo } from "@playwright/test";

export function auditEnvironment(info: TestInfo): NodeJS.ProcessEnv {
  const configured = info.config.webServer;
  const server = Array.isArray(configured) ? configured[0] : configured;
  const env = { ...process.env, ...server?.env };
  const db = env.DATABASE_URL ? new URL(env.DATABASE_URL) : null;
  const root = env.STORAGE_DIR ? path.resolve(env.STORAGE_DIR) : null;
  const relative = root ? path.relative(process.cwd(), root) : "";
  if (!db || !["localhost", "127.0.0.1", "[::1]"].includes(db.hostname) || !db.pathname.endsWith("_e2e") || env.MAIL_PROVIDER !== "fake" || env.LLM_MODE !== "e2e" || env.SCREENING_PROVIDER !== "fake" || !root || !relative || relative.startsWith("..") || path.isAbsolute(relative) || !path.basename(root).includes("e2e")) {
    throw new Error("Audit fixtures require the configured local E2E database, fake providers and dedicated E2E storage inside this worktree");
  }
  return env;
}

export function resetAuditFixtures(info: TestInfo): NodeJS.ProcessEnv {
  const env = auditEnvironment(info);
  const root = path.resolve(env.STORAGE_DIR!);
  mkdirSync(root, { recursive: true });
  for (const name of readdirSync(root)) {
    if (name !== "shots") rmSync(path.join(root, name), { recursive: true, force: true });
  }
  mkdirSync(path.join(root, "shots"), { recursive: true });
  execFileSync("node_modules/.bin/tsx", ["scripts/seed.ts"], { env, stdio: "pipe" });
  return env;
}
