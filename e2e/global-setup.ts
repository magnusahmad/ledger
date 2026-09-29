import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

export default function setup() {
  rmSync("storage/e2e", { recursive: true, force: true });
  execSync("npx tsx scripts/seed.ts", { stdio: "inherit", env: { ...process.env, DATABASE_URL: "postgres://localhost/harbourline_e2e", STORAGE_DIR: "storage/e2e", LLM_MODE: "e2e" } });
}
