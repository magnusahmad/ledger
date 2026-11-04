// Installation modules (DECISIONS.md #56): one codebase and schema; each installation lists the
// modules it loads. A switched-off module's pages and API routes answer "not found".
import type { Config } from "./config";

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

const DEFAULT_SECRET = "dev-only-secret-change-me-dev-only-secret";

/** Reasons a production installation must not start. Empty when it may. */
export function productionProblems(c: Config): string[] {
  if (c.INSTALLATION !== "production") return [];
  const p: string[] = [];
  if (c.llmMode !== "live" || !c.or_api_key) p.push("AI is not live (fixture or missing OpenRouter key)");
  if (c.demoTools) p.push("demo tools are switched on");
  if (c.APP_SECRET === DEFAULT_SECRET) p.push("APP_SECRET is the development default secret");
  if (!c.authRequired) p.push("staff sign-in is switched off");
  if (c.DATABASE_URL === "postgres://localhost/harbourline") p.push("DATABASE_URL is the development database");
  try { enabledModules(c); } catch (e) { p.push((e as Error).message); }
  return p;
}
