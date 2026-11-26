// Sends the browser to the firm's Microsoft 365 to sign in (src/lib/sso.ts). What it needs on the way
// back is kept in a short-lived sealed cookie, so nothing is stored for a sign-in nobody finishes.
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCtx } from "@/server/ctx";
import { FLOW_COOKIE, authorizeUrl, pkceChallenge, redirectUri, sealFlow, ssoConfig } from "@/lib/sso";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { config } = getCtx();
  const cfg = ssoConfig(config);
  if (!cfg) return NextResponse.redirect(new URL("/login", config.APP_URL));
  const next = new URL(req.url).searchParams.get("next") ?? "";
  const rand = () => randomBytes(32).toString("base64url");
  const flow = { state: rand(), nonce: rand(), verifier: rand(), next: next.startsWith("/") && !next.startsWith("//") ? next : "/" };
  // Lax, not strict: the browser comes back from Microsoft's site, and has to bring this with it.
  (await cookies()).set(FLOW_COOKIE, sealFlow(flow, config.APP_SECRET, new Date()), { httpOnly: true, secure: config.APP_URL.startsWith("https://"), sameSite: "lax", path: "/api/auth", maxAge: 600 });
  return NextResponse.redirect(authorizeUrl(cfg, { state: flow.state, nonce: flow.nonce, challenge: pkceChallenge(flow.verifier), redirectUri: redirectUri(config.APP_URL) }));
}
