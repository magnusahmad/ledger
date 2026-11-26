// The browser comes back from Microsoft with a code. Clerk checks it belongs to the sign-in this
// browser started, exchanges it for a signed statement of who signed in, and starts a session only if
// that email is a member of staff Clerk already holds (src/lib/sso.ts, src/lib/auth.ts).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCtx } from "@/server/ctx";
import { signInAs } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/auth-cookie";
import { FLOW_COOKIE, exchangeCode, fetchJwks, openFlow, redirectUri, ssoConfig, verifyIdToken, type Jwks } from "@/lib/sso";

export const dynamic = "force-dynamic";

// Microsoft's signing keys change rarely; they are fetched again when a token names one not held.
let keys: { jwks: Jwks; at: number } | null = null;
const HOUR = 3600_000;

export async function GET(req: Request) {
  const ctx = getCtx();
  const { config } = ctx;
  const jar = await cookies();
  const back = (error: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, config.APP_URL));
  const cfg = ssoConfig(config);
  if (!cfg) return back("Microsoft sign-in is not switched on.");
  const q = new URL(req.url).searchParams;
  const flow = openFlow(jar.get(FLOW_COOKIE)?.value, config.APP_SECRET, new Date());
  jar.delete({ name: FLOW_COOKIE, path: "/api/auth" });
  if (q.get("error")) return back(q.get("error") === "access_denied" ? "The Microsoft sign-in was cancelled." : `Microsoft did not complete the sign-in: ${(q.get("error_description") ?? q.get("error") ?? "").split("\n")[0].slice(0, 200)}`);
  const code = q.get("code");
  if (!flow || !code || q.get("state") !== flow.state) return back("That sign-in attempt has expired or was started in another browser. Try again.");
  try {
    const now = new Date();
    const token = await exchangeCode(cfg, (u, i) => fetch(u, i as RequestInit), { code, verifier: flow.verifier, redirectUri: redirectUri(config.APP_URL), now });
    const read = async (fresh: boolean) => {
      if (fresh || !keys || now.getTime() - keys.at > HOUR) keys = { jwks: await fetchJwks(cfg, (u, i) => fetch(u, i as RequestInit)), at: now.getTime() };
      return verifyIdToken(cfg, keys.jwks, token, { nonce: flow.nonce, now });
    };
    const who = await read(false).catch((e: Error) => { if (/signature/.test(e.message)) return read(true); throw e; });
    const r = await signInAs(ctx, who.email);
    if (!r.ok) return back(r.error);
    jar.set(SESSION_COOKIE, r.token, { httpOnly: true, secure: config.APP_URL.startsWith("https://"), sameSite: "strict", path: "/", expires: r.expiresAt });
    // A page, not a redirect: the session cookie is strict, so the browser would not send it on a
    // redirect that began on Microsoft's site. Moving on from this page is a visit from Clerk itself.
    const to = JSON.stringify(flow.next).replace(/</g, "\\u003c");
    return new NextResponse(`<!doctype html><meta charset="utf-8"><title>Signing in</title><meta http-equiv="refresh" content="0;url=${flow.next.replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`)}"><script>location.replace(${to})</script><p style="font:16px system-ui;margin:20vh auto;text-align:center">Signing you in…</p>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  } catch (e) {
    return back((e as Error).message.slice(0, 300));
  }
}
