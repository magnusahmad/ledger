// What the request proxy does with a path: pure, so it is tested without Next.js.
// The proxy only checks that a session cookie exists; pages and actions verify it (src/lib/auth.ts).
import type { Config } from "./config";
import { enabledModules, homePath, moduleForPath } from "./modules";

export type ProxyDecision =
  | { kind: "pass" } | { kind: "not_found" } | { kind: "unauthorized" }
  | { kind: "login"; next: string } | { kind: "redirect"; to: string };

export function proxyDecision(pathname: string, req: { hasSession: boolean }, config: Config): ProxyDecision {
  const mods = enabledModules(config);
  const mod = moduleForPath(pathname);
  if (mod === null) return { kind: "pass" };
  if (mod === "signing") return mods.has("signing") ? { kind: "pass" } : { kind: "not_found" }; // public signing links carry their own token
  if (config.authRequired && !req.hasSession) return pathname.startsWith("/api/") ? { kind: "unauthorized" } : { kind: "login", next: pathname };
  if (pathname === "/" && !mods.has("desk")) return { kind: "redirect", to: homePath(mods) };
  return mods.has(mod) ? { kind: "pass" } : { kind: "not_found" };
}
