// Installation module switches and the production guard (DECISIONS.md #56): a design-partner
// installation loads only its modules and refuses to run with demo or fixture parts.
import { describe, it, expect } from "vitest";
import { enabledModules, moduleForPath, productionProblems } from "@/lib/modules";
import { proxyDecision } from "@/lib/proxy-decision";
import { loadConfig } from "@/lib/config";

describe("installation modules", () => {
  it("a development install with no module list keeps every module on", () => {
    const m = enabledModules({});
    expect(m.has("desk")).toBe(true);
    expect(m.has("annual")).toBe(true);
    expect(m.has("mailroom")).toBe(true);
  });

  it("an installation that lists modules gets only those", () => {
    const m = enabledModules({ MODULES: "annual, cdd" });
    expect([...m].sort()).toEqual(["annual", "cdd"]);
  });

  it("an unknown module name is refused rather than ignored", () => {
    expect(() => enabledModules({ MODULES: "annual,anual" })).toThrow(/anual/);
  });

  it("each route belongs to one module, and sign-in and health belong to none", () => {
    expect(moduleForPath("/annual")).toBe("annual");
    expect(moduleForPath("/annual/case_1")).toBe("annual");
    expect(moduleForPath("/api/annual/x")).toBe("annual");
    expect(moduleForPath("/mailroom/b1")).toBe("mailroom");
    expect(moduleForPath("/")).toBe("desk");
    expect(moduleForPath("/tasks/t1")).toBe("desk");
    expect(moduleForPath("/invoices")).toBe("desk");
    expect(moduleForPath("/sign/abc")).toBe("signing");
    expect(moduleForPath("/login")).toBeNull();
    expect(moduleForPath("/api/health")).toBeNull();
    expect(moduleForPath("/_next/static/x.js")).toBeNull();
  });
});

describe("request gate", () => {
  const uhy = loadConfig({ MODULES: "annual", AUTH: "1", APP_SECRET: "x".repeat(40) });
  const dev = loadConfig({});

  it("a switched-off module's pages return not found", () => {
    expect(proxyDecision("/tasks/t1", { hasSession: true }, uhy)).toEqual({ kind: "not_found" });
    expect(proxyDecision("/mailroom", { hasSession: true }, uhy)).toEqual({ kind: "not_found" });
  });

  it("a signed-out request to a module page is sent to the login page", () => {
    expect(proxyDecision("/annual", { hasSession: false }, uhy)).toEqual({ kind: "login", next: "/annual" });
  });

  it("a signed-out API request gets 401 instead of a redirect", () => {
    expect(proxyDecision("/api/annual/cases", { hasSession: false }, uhy)).toEqual({ kind: "unauthorized" });
  });

  it("the login page and health check are reachable without a session", () => {
    expect(proxyDecision("/login", { hasSession: false }, uhy)).toEqual({ kind: "pass" });
    expect(proxyDecision("/api/health", { hasSession: false }, uhy)).toEqual({ kind: "pass" });
  });

  it("the home page of an installation without the desk opens its first module", () => {
    expect(proxyDecision("/", { hasSession: true }, uhy)).toEqual({ kind: "redirect", to: "/annual" });
  });

  it("development without AUTH keeps today's open single-user behaviour", () => {
    expect(proxyDecision("/tasks/t1", { hasSession: false }, dev)).toEqual({ kind: "pass" });
  });
});

describe("production guard", () => {
  const base = { INSTALLATION: "production", MODULES: "annual", AUTH: "1", APP_SECRET: "s".repeat(48), or_api_key: "k", LLM_MODE: "live", DATABASE_URL: "postgres://pilot@localhost/harbourline_uhy", DEMO_TOOLS: "0" };

  it("a correctly configured production installation has no problems", () => {
    expect(productionProblems(loadConfig(base))).toEqual([]);
  });

  it("a production installation refuses fixture AI, demo tools, the default secret or no sign-in", () => {
    const p = productionProblems(loadConfig({ ...base, LLM_MODE: "fixture", DEMO_TOOLS: "1", APP_SECRET: undefined, AUTH: "0" }));
    expect(p.join(" ")).toMatch(/AI/);
    expect(p.join(" ")).toMatch(/demo/i);
    expect(p.join(" ")).toMatch(/secret/i);
    expect(p.join(" ")).toMatch(/sign-in/i);
  });

  it("production turns sign-in on by default", () => {
    expect(loadConfig({ INSTALLATION: "production" }).authRequired).toBe(true);
    expect(loadConfig({}).authRequired).toBe(false);
  });
});
