// Installation modules (DECISIONS.md #56): one codebase and schema; each installation lists the
// modules it loads. A switched-off module's pages and API routes answer "not found".
import { loadConfig, type Config } from "./config";

export const MODULE_IDS = ["desk", "annual", "cdd", "mailroom", "signing"] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export function enabledModules(env: { MODULES?: string }): Set<ModuleId> {
  const raw = (env.MODULES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!raw.length) return new Set(MODULE_IDS);
  const bad = raw.filter((m) => !(MODULE_IDS as readonly string[]).includes(m));
  if (bad.length) throw new Error(`Unknown module in MODULES: ${bad.join(", ")} (known: ${MODULE_IDS.join(", ")})`);
  return new Set(raw as ModuleId[]);
}

const OPEN = [/^\/login(\/|$)/, /^\/api\/auth\//, /^\/api\/health$/, /^\/_next\//, /^\/favicon\.ico$/, /^\/fonts\//];
const PREFIXES: [RegExp, ModuleId][] = [
  [/^\/(api\/)?annual(\/|$)/, "annual"],
  [/^\/(api\/)?cdd(\/|$)/, "cdd"],
  [/^\/(api\/)?mailroom(\/|$)/, "mailroom"],
  [/^\/(api\/)?sign(\/|$)/, "signing"],
  [/^\/u(\/|$)/, "signing"],
];

/** The module a route belongs to; null for sign-in, health and static assets. Everything else is the desk. */
export function moduleForPath(pathname: string): ModuleId | null {
  if (OPEN.some((r) => r.test(pathname))) return null;
  for (const [r, m] of PREFIXES) if (r.test(pathname)) return m;
  return "desk";
}

/** First page for an installation without the desk. */
export function homePath(mods: Set<ModuleId>): string {
  if (mods.has("desk")) return "/";
  for (const m of ["annual", "cdd", "mailroom"] as const) if (mods.has(m)) return `/${m}`;
  return "/login";
}

/** Whether anything this installation loads calls the model. The annual module does only through the
 *  reply reader; an installation without it sends nothing to the model and needs no key. */
export function usesModel(c: Config): boolean {
  let mods: Set<ModuleId>;
  try { mods = enabledModules(c); } catch { return true; }
  return [...mods].some((m) => m !== "annual") || c.AR_REPLY_READER === "1";
}

const DEFAULT_SECRET = "dev-only-secret-change-me-dev-only-secret";

/** Reasons a production installation must not start. Empty when it may. */
export function productionProblems(c: Config): string[] {
  if (c.INSTALLATION !== "production") return [];
  const p: string[] = [];
  if (usesModel(c) && (c.llmMode !== "live" || !c.or_api_key)) p.push("AI is not live (fixture or missing OpenRouter key)");
  if (c.demoTools) p.push("demo tools are switched on");
  if (c.APP_SECRET === DEFAULT_SECRET) p.push("APP_SECRET is the development default secret");
  if (!c.authRequired) p.push("staff sign-in is switched off");
  if (c.DATABASE_URL === "postgres://localhost/clerk") p.push("DATABASE_URL is the development database");
  if (!c.INSTALLATION_PROFILE) p.push("INSTALLATION_PROFILE is not set, so this installation doesn't say which client it is for");
  try {
    if (enabledModules(c).has("mailroom")) {
      // The development defaults are the anonymised demo's; a firm files and writes under its own.
      const demo = loadConfig({});
      for (const k of ["MAILROOM_RULES", "MAILROOM_CLIENT_SOURCES", "MAILROOM_FIRM_NAME", "MAILROOM_FROM"] as const)
        if (c[k] === demo[k]) p.push(`the mail room is still on the demo's ${k}; set the firm's own`);
    }
    if (enabledModules(c).has("annual")) {
      if (!c.DISPATCH_TEMPLATE) p.push("the annual module has no dispatch template (DISPATCH_TEMPLATE), so client emails can't be drafted");
      if (c.FILING_ROOT && !c.FILING_RULES) p.push("papers are filed to a share (FILING_ROOT) but the firm's filing rules (FILING_RULES) are not set");
    }
  } catch (e) { p.push((e as Error).message); }
  return p;
}
