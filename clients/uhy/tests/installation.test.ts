// UHY-ASK's installation: the annual module only, with UHY's own filing rules and email wording.
// The pilot machine's env file names the profile and adds machine paths; secrets come from the
// secrets store. Together they must pass the production guard (DECISIONS.md #56, #65).
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadConfig } from "@/lib/config";
import { enabledModules, productionProblems } from "@/lib/modules";

const root = path.resolve(__dirname, "../../..");
const envExample = () => Object.fromEntries(readFileSync(path.join(root, "deploy/windows/env.production.example"), "utf8").split("\n")
  .flatMap((l) => { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l); return m && m[2] !== "" ? [[m[1], m[2]] as const] : []; }));
// Stand-ins for what secrets.ps1 holds on the machine.
const secrets = { APP_SECRET: "s".repeat(48), or_api_key: "k", DATABASE_URL: "postgres://pilot@localhost/clerk_uhy" };

describe("UHY-ASK installation", () => {
  it("loads only the annual module, for UHY's firm and email domain", () => {
    const c = loadConfig({ INSTALLATION_PROFILE: "uhy" });
    expect([...enabledModules(c)]).toEqual(["annual"]);
    expect(c).toMatchObject({ FIRM_ID: "firm_uhy", FIRM_EMAIL_DOMAINS: "uhy-ask.com" });
  });

  it("uses UHY's own filing rules and dispatch template, kept in its client folder", () => {
    const c = loadConfig({ INSTALLATION_PROFILE: "uhy" });
    for (const f of [c.FILING_RULES, c.DISPATCH_TEMPLATE]) {
      expect(f).toMatch(/^clients\/uhy\/data\//);
      expect(existsSync(path.join(root, f!))).toBe(true);
    }
  });

  it("the pilot machine's env file, with its secrets, passes the production guard", () => {
    const env = envExample();
    expect(env.INSTALLATION_PROFILE).toBe("uhy");
    expect(productionProblems(loadConfig({ ...env, ...secrets }))).toEqual([]);
  });
});
