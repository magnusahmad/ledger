// Staff sign-in through the firm's Microsoft 365 (OpenID Connect, authorisation code with PKCE). Clerk
// never sees a Microsoft password: the browser goes to the firm's own tenant and comes back with a
// code, which Clerk exchanges for a signed statement of who signed in. That proves an email address;
// whether its owner may use Clerk is still Clerk's list of staff (auth.ts, signInAs).
// It uses the same app registration as the mailboxes (GRAPH_*), asking only for identity.
import { createHash, createHmac, createPublicKey, createVerify, timingSafeEqual, type JsonWebKey } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Config } from "./config";
import { clientAssertion, type FetchLike, type GraphAuth } from "@/integrations/mail/graph";

export type SsoConfig = { tenantId: string; clientId: string; auth: GraphAuth };
export type Jwks = { keys: (JsonWebKey & { kid?: string })[] };
/** What the browser carries, sealed, between leaving for Microsoft and coming back. */
export type Flow = { state: string; nonce: string; verifier: string; next: string };

export const FLOW_COOKIE = "clerk_sso";
const FLOW_MINUTES = 10;
const base = (tenant: string) => `https://login.microsoftonline.com/${encodeURIComponent(tenant)}`;
const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");

/** Null unless Microsoft sign-in is switched on and the app registration is fully set up. */
export function ssoConfig(c: Config): SsoConfig | null {
  if (c.SSO !== "microsoft" || !c.GRAPH_TENANT_ID || !c.GRAPH_CLIENT_ID) return null;
  const id = { tenantId: c.GRAPH_TENANT_ID, clientId: c.GRAPH_CLIENT_ID };
  const pem = c.GRAPH_PRIVATE_KEY_PEM ?? (c.GRAPH_PRIVATE_KEY_FILE ? readFileSync(c.GRAPH_PRIVATE_KEY_FILE, "utf8") : null);
  if (pem && c.GRAPH_CERT_THUMBPRINT) return { ...id, auth: { ...id, privateKeyPem: pem, thumbprintHex: c.GRAPH_CERT_THUMBPRINT } };
  if (c.GRAPH_CLIENT_SECRET) return { ...id, auth: { ...id, clientSecret: c.GRAPH_CLIENT_SECRET } };
  return null;
}

export const redirectUri = (appUrl: string) => `${appUrl.replace(/\/+$/, "")}/api/auth/microsoft/callback`;
export const pkceChallenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

export function authorizeUrl(cfg: SsoConfig, o: { state: string; nonce: string; challenge: string; redirectUri: string }): string {
  const q = new URLSearchParams({
    client_id: cfg.clientId, response_type: "code", response_mode: "query", redirect_uri: o.redirectUri, scope: "openid profile email",
    state: o.state, nonce: o.nonce, code_challenge: o.challenge, code_challenge_method: "S256", prompt: "select_account",
  });
  return `${base(cfg.tenantId)}/oauth2/v2.0/authorize?${q}`;
}

const mac = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

export function sealFlow(f: Flow, secret: string, now: Date): string {
  const payload = b64(JSON.stringify({ ...f, exp: now.getTime() + FLOW_MINUTES * 60_000 }));
  return `${payload}.${mac(payload, secret)}`;
}

/** The flow as sealed by this installation, or null if it was changed, came from elsewhere, or is too old. */
export function openFlow(sealed: string | undefined | null, secret: string, now: Date): Flow | null {
  const [payload, sig] = (sealed ?? "").split(".");
  if (!payload || !sig) return null;
  const want = Buffer.from(mac(payload, secret)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const { exp, ...f } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Flow & { exp: number };
    return exp > now.getTime() ? f : null;
  } catch { return null; }
}

/** Exchanges the code for the identity token. The verifier proves this is the browser that started. */
export async function exchangeCode(cfg: SsoConfig, fetchFn: FetchLike, o: { code: string; verifier: string; redirectUri: string; now: Date }): Promise<string> {
  const url = `${base(cfg.tenantId)}/oauth2/v2.0/token`;
  const form = new URLSearchParams({ grant_type: "authorization_code", client_id: cfg.clientId, code: o.code, code_verifier: o.verifier, redirect_uri: o.redirectUri, scope: "openid profile email" });
  if ("clientSecret" in cfg.auth) form.set("client_secret", cfg.auth.clientSecret);
  else { form.set("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"); form.set("client_assertion", clientAssertion(cfg.auth, url, o.now.getTime())); }
  const res = await fetchFn(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form.toString() });
  const j = (await res.json().catch(() => ({}))) as { id_token?: string; error_description?: string };
  if (!res.ok || !j.id_token) throw new Error(`Microsoft did not complete the sign-in: ${(j.error_description ?? `status ${res.status}`).split("\n")[0]}`);
  return j.id_token;
}

export async function fetchJwks(cfg: SsoConfig, fetchFn: FetchLike): Promise<Jwks> {
  const res = await fetchFn(`${base(cfg.tenantId)}/discovery/v2.0/keys`);
  if (!res.ok) throw new Error(`Could not get Microsoft's signing keys (status ${res.status})`);
  return (await res.json()) as Jwks;
}

/** Who signed in, from a token Microsoft signed for this app, this tenant and this sign-in attempt. */
export function verifyIdToken(cfg: SsoConfig, jwks: Jwks, token: string, o: { nonce: string; now: Date }): { email: string; name: string | null } {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) throw new Error("Microsoft's reply has no valid signature");
  const head = JSON.parse(Buffer.from(h, "base64url").toString("utf8")) as { alg?: string; kid?: string };
  const key = head.alg === "RS256" ? jwks.keys.find((k) => k.kid === head.kid) : undefined;
  if (!key || !createVerify("RSA-SHA256").update(`${h}.${p}`).verify(createPublicKey({ key, format: "jwk" }), Buffer.from(s, "base64url"))) throw new Error("Microsoft's reply has no valid signature");
  const c = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as { iss?: string; aud?: string; tid?: string; nonce?: string; exp?: number; preferred_username?: string; email?: string; name?: string };
  if (c.tid !== cfg.tenantId || c.iss !== `${base(cfg.tenantId)}/v2.0`) throw new Error("That Microsoft account belongs to another tenant, not this firm's");
  if (c.aud !== cfg.clientId) throw new Error("Microsoft's reply was issued for another app");
  if (c.nonce !== o.nonce) throw new Error("Microsoft's reply does not belong to this sign-in attempt");
  if (!c.exp || c.exp * 1000 <= o.now.getTime() - 60_000) throw new Error("Microsoft's reply has expired; sign in again");
  const email = (c.preferred_username ?? c.email ?? "").trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Microsoft's reply names no email address");
  return { email, name: c.name ?? null };
}
