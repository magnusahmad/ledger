// Build identity (DECISIONS.md #65): what a running installation answers when support asks which
// build it is. The stamp (commit, version, schema level) is written by scripts/build-stamp.mjs
// where git is available and travels with the copy as build.json; the rest comes from the
// installation's own config. Reported by the health check (src/app/api/health/route.ts).
import { readFileSync } from "node:fs";
import path from "node:path";
import pkg from "../../package.json";
import { PROMPT_VERSION } from "@/annual/reply-types";
import type { Config } from "./config";
import { enabledModules, usesModel } from "./modules";

export type BuildStamp = { product: "clerk"; version: string; commit: string | null; branch: string | null; dirty: boolean | null; schema: string | null; stampedAt: string };
export type BuildReport = Omit<BuildStamp, "stampedAt"> & {
  stampedAt: string | null;
  /** The client profile this installation names (clients/<id>), and the modules it loads. */
  installation: string | null; modules: string[];
  /** The model and prompt versions in use; none when nothing in this installation calls the model. */
  model: string | null; prompts: Record<string, string>;
};

export function readBuildStamp(file = path.join(process.cwd(), "build.json")): BuildStamp | null {
  try { return JSON.parse(readFileSync(file, "utf8")) as BuildStamp; } catch { return null; }
}

export function buildReport(c: Config, stamp: BuildStamp | null): BuildReport {
  let modules: string[] = [];
  try { modules = [...enabledModules(c)]; } catch { /* reported by productionProblems */ }
  const readsReplies = modules.includes("annual") && c.AR_REPLY_READER === "1";
  return {
    product: "clerk", version: stamp?.version ?? pkg.version, commit: stamp?.commit ?? null, branch: stamp?.branch ?? null,
    dirty: stamp?.dirty ?? null, schema: stamp?.schema ?? null, stampedAt: stamp?.stampedAt ?? null,
    installation: c.INSTALLATION_PROFILE ?? null, modules,
    model: usesModel(c) ? c.LLM_MODEL : null,
    prompts: readsReplies ? { "annual.reply": PROMPT_VERSION } : {},
  };
}
