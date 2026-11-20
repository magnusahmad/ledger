// Build identity (DECISIONS.md #65): support has to be able to ask a running installation which
// build it is. The stamp is written where git is available (scripts/build-stamp.mjs) and travels
// with the copy; the health check reports it with the client profile, modules and model in use.
import { describe, it, expect } from "vitest";
import { makeStamp } from "../scripts/build-stamp.mjs";
import { buildReport, type BuildStamp } from "@/lib/build";
import { loadConfig } from "@/lib/config";
import type { Installation } from "@/lib/installation";

const at = new Date("2026-11-20T03:00:00Z");
const migrations = ["0000_init.sql", "0017_annual_replies.sql", "0009_firm_bank_identity.sql", "meta"];
const git = (answers: Record<string, string>) => (args: string) => { if (!(args in answers)) throw new Error("not a git repository"); return answers[args]; };

describe("build stamp", () => {
  it("the stamp names the commit, version and latest schema migration", () => {
    const s = makeStamp({ git: git({ "rev-parse HEAD": "e88f4e4a1b2c3d4e5f60718293a4b5c6d7e8f901\n", "status --porcelain": "", "rev-parse --abbrev-ref HEAD": "main\n" }), version: "0.1.0", migrations, now: at, existing: null });
    expect(s).toEqual({ product: "clerk", version: "0.1.0", commit: "e88f4e4a1b2c3d4e5f60718293a4b5c6d7e8f901", branch: "main", dirty: false, schema: "0017_annual_replies", stampedAt: "2026-11-20T03:00:00.000Z" });
  });

  it("a build made with uncommitted changes is marked, because its commit does not describe it", () => {
    const s = makeStamp({ git: git({ "rev-parse HEAD": "abc\n", "status --porcelain": " M src/lib/config.ts\n", "rev-parse --abbrev-ref HEAD": "main\n" }), version: "0.1.0", migrations, now: at, existing: null });
    expect(s.dirty).toBe(true);
  });

  it("a copy without git keeps the stamp it was shipped with", () => {
    const shipped: BuildStamp = { product: "clerk", version: "0.1.0", commit: "abc", branch: "main", dirty: false, schema: "0017_annual_replies", stampedAt: "2026-11-19T00:00:00.000Z" };
    expect(makeStamp({ git: git({}), version: "0.1.0", migrations, now: at, existing: shipped })).toEqual(shipped);
  });

  it("a copy without git and without a shipped stamp says the commit is unknown rather than guessing", () => {
    const s = makeStamp({ git: git({}), version: "0.1.0", migrations, now: at, existing: null });
    expect(s).toMatchObject({ commit: null, dirty: null, branch: null, schema: "0017_annual_replies" });
  });
});

describe("build report", () => {
  const registry: Record<string, Installation> = { acme: { id: "acme", name: "Acme Secretaries", product: "clerk", modules: ["annual"], settings: {} } };
  const stamp: BuildStamp = { product: "clerk", version: "0.1.0", commit: "abc", branch: "main", dirty: false, schema: "0017_annual_replies", stampedAt: "2026-11-19T00:00:00.000Z" };

  it("the report names the client profile, its modules and the model and prompt in use", () => {
    const r = buildReport(loadConfig({ INSTALLATION_PROFILE: "acme", AR_REPLY_READER: "1", LLM_MODEL: "vendor/model-x" }, registry), stamp);
    expect(r).toMatchObject({ commit: "abc", version: "0.1.0", schema: "0017_annual_replies", installation: "acme", modules: ["annual"], model: "vendor/model-x" });
    expect(r.prompts).toEqual({ "annual.reply": expect.stringMatching(/^ar-reply-/) });
  });

  it("an installation where nothing calls the model reports no model", () => {
    const r = buildReport(loadConfig({ INSTALLATION_PROFILE: "acme", AR_REPLY_READER: "0" }, registry), stamp);
    expect(r).toMatchObject({ model: null, prompts: {} });
  });

  it("a build that was never stamped reports an unknown commit, not a made-up one", () => {
    expect(buildReport(loadConfig({}), null)).toMatchObject({ commit: null, installation: null });
  });
});
