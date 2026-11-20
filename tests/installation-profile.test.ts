// Installation profiles (DECISIONS.md #65): an installation names the client it is for, and that
// client's profile supplies its modules and the paths of its own data files. Machine paths and
// secrets stay in the environment, which also overrides the profile. An installation that names no
// profile gets no client's files: one firm's filing rules or email wording never reach another firm.
import { describe, it, expect } from "vitest";
import { loadConfig } from "@/lib/config";
import { installationProfile, type Installation } from "@/lib/installation";
import { enabledModules, productionProblems } from "@/lib/modules";

// A fictional client, so these rules don't depend on any real client's folder.
const registry: Record<string, Installation> = {
  acme: {
    id: "acme", name: "Acme Secretaries", product: "clerk", modules: ["annual"],
    settings: { FIRM_ID: "firm_acme", FILING_RULES: "clients/acme/data/filing-rules.json", DISPATCH_TEMPLATE: "clients/acme/data/dispatch-template.json" },
  },
};

describe("installation profile", () => {
  it("an installation that names its profile gets that client's modules and data files", () => {
    const c = loadConfig({ INSTALLATION_PROFILE: "acme" }, registry);
    expect([...enabledModules(c)]).toEqual(["annual"]);
    expect(c).toMatchObject({ FIRM_ID: "firm_acme", FILING_RULES: "clients/acme/data/filing-rules.json", DISPATCH_TEMPLATE: "clients/acme/data/dispatch-template.json" });
  });

  it("the environment overrides the profile, so a machine can differ without a new build", () => {
    const c = loadConfig({ INSTALLATION_PROFILE: "acme", MODULES: "annual,cdd", FIRM_ID: "firm_other" }, registry);
    expect([...enabledModules(c)].sort()).toEqual(["annual", "cdd"]);
    expect(c.FIRM_ID).toBe("firm_other");
  });

  it("an unset environment value does not blank out the profile's value", () => {
    expect(loadConfig({ INSTALLATION_PROFILE: "acme", FIRM_ID: undefined }, registry).FIRM_ID).toBe("firm_acme");
  });

  it("an unknown profile is refused rather than ignored", () => {
    expect(() => loadConfig({ INSTALLATION_PROFILE: "acmee" }, registry)).toThrow(/acmee/);
    expect(() => installationProfile("acmee", registry)).toThrow(/known: acme/);
  });

  it("an installation with no profile gets no client's filing rules or email template", () => {
    const c = loadConfig({});
    expect(c.FILING_RULES).toBeUndefined();
    expect(c.DISPATCH_TEMPLATE).toBeUndefined();
  });
});

describe("production guard for the client layer", () => {
  const base = { INSTALLATION: "production", INSTALLATION_PROFILE: "acme", AUTH: "1", APP_SECRET: "s".repeat(48), AR_REPLY_READER: "0", DATABASE_URL: "postgres://pilot@localhost/clerk_acme", DEMO_TOOLS: "0" };

  it("a production installation that names its profile and has its files may start", () => {
    expect(productionProblems(loadConfig(base, registry))).toEqual([]);
  });

  it("a production installation must name its profile, so support can tell whose build it is", () => {
    const p = productionProblems(loadConfig({ ...base, INSTALLATION_PROFILE: undefined, MODULES: "annual", DISPATCH_TEMPLATE: "x.json" }, registry));
    expect(p.join(" ")).toMatch(/INSTALLATION_PROFILE/);
  });

  it("a production annual installation without a dispatch template refuses to start", () => {
    const bare: Record<string, Installation> = { acme: { ...registry.acme, settings: { FIRM_ID: "firm_acme" } } };
    expect(productionProblems(loadConfig(base, bare)).join(" ")).toMatch(/dispatch template/i);
  });

  it("a production installation that files papers to a share needs its own filing rules", () => {
    const bare: Record<string, Installation> = { acme: { ...registry.acme, settings: { DISPATCH_TEMPLATE: "x.json" } } };
    expect(productionProblems(loadConfig({ ...base, FILING_ROOT: "\\\\server\\share" }, bare)).join(" ")).toMatch(/filing rules/i);
    expect(productionProblems(loadConfig(base, bare))).toEqual([]);
  });
});

describe("production guard for the mail room", () => {
  const room: Record<string, Installation> = { acme: { id: "acme", name: "Acme CPA", product: "clerk", modules: ["mailroom"], settings: {} } };
  const own = { MAILROOM_RULES: "clients/acme/data/rules.json", MAILROOM_CLIENT_SOURCES: "clients/acme/data/client-sources.json", MAILROOM_FIRM_NAME: "Acme CPA", MAILROOM_FROM: "mail@acme.example" };
  const base = { INSTALLATION: "production", INSTALLATION_PROFILE: "acme", AUTH: "1", APP_SECRET: "s".repeat(48), or_api_key: "k", LLM_MODE: "live", DATABASE_URL: "postgres://clerk@localhost/clerk_acme", DEMO_TOOLS: "0" };

  it("a production mail room refuses to start on the demo's filing rules, client list, firm name or sender", () => {
    const p = productionProblems(loadConfig(base, room)).join(" ");
    for (const k of ["MAILROOM_RULES", "MAILROOM_CLIENT_SOURCES", "MAILROOM_FIRM_NAME", "MAILROOM_FROM"]) expect(p).toContain(k);
  });

  it("a production mail room with the firm's own rules, client list, name and sender may start", () => {
    expect(productionProblems(loadConfig({ ...base, ...own }, room))).toEqual([]);
  });

  it("the demo's settings are still the default in development, so the demo runs with no setup", () => {
    expect(loadConfig({})).toMatchObject({ MAILROOM_RULES: "seed/mailroom/rules.json", MAILROOM_FIRM_NAME: "XYZ CPA" });
  });
});
