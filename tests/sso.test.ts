// Staff sign in with their Microsoft 365 account (DECISIONS.md #67): no second password, and every
// action still tied to a person. Clerk sends the browser to the firm's own Microsoft tenant, gets back
// proof of who signed in, and starts a session only for a staff email it already holds. Nothing here
// calls Microsoft: the token endpoint and the signing keys are faked.
import { describe, it, expect } from "vitest";
import { generateKeyPairSync, createSign } from "node:crypto";
import { loadConfig } from "@/lib/config";
import { productionProblems } from "@/lib/modules";
import { ssoConfig, authorizeUrl, sealFlow, openFlow, exchangeCode, verifyIdToken, pkceChallenge, type SsoConfig } from "@/lib/sso";

const cfg: SsoConfig = { tenantId: "tenant-1", clientId: "app-1", auth: { tenantId: "tenant-1", clientId: "app-1", clientSecret: "shh" } };
const SECRET = "s".repeat(48);
const at = new Date("2026-12-05T02:00:00Z");

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwks = { keys: [{ ...publicKey.export({ format: "jwk" }), kid: "k1", use: "sig" }] };
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
function idToken(claims: Record<string, unknown> = {}, o: { kid?: string; key?: typeof privateKey } = {}) {
  const head = b64({ alg: "RS256", typ: "JWT", kid: o.kid ?? "k1" });
  const body = b64({ iss: "https://login.microsoftonline.com/tenant-1/v2.0", aud: "app-1", tid: "tenant-1", nonce: "n-1", exp: Math.floor(at.getTime() / 1000) + 600, iat: Math.floor(at.getTime() / 1000), preferred_username: "Ruby@Firm.example", name: "Ruby Lam", ...claims });
  return `${head}.${body}.${createSign("RSA-SHA256").update(`${head}.${body}`).sign(o.key ?? privateKey).toString("base64url")}`;
}

describe("Microsoft sign-in: settings", () => {
  const on = { SSO: "microsoft", GRAPH_TENANT_ID: "tenant-1", GRAPH_CLIENT_ID: "app-1", GRAPH_CLIENT_SECRET: "shh" };

  it("is off unless switched on, and then uses the firm's Microsoft app registration", () => {
    expect(ssoConfig(loadConfig({ GRAPH_TENANT_ID: "tenant-1", GRAPH_CLIENT_ID: "app-1", GRAPH_CLIENT_SECRET: "shh" }))).toBeNull();
    expect(ssoConfig(loadConfig(on))).toMatchObject({ tenantId: "tenant-1", clientId: "app-1" });
  });

  it("a production installation with Microsoft sign-in switched on but not set up refuses to start", () => {
    const base = { INSTALLATION: "production", AUTH: "1", APP_SECRET: SECRET, AR_REPLY_READER: "0", DATABASE_URL: "postgres://pilot@localhost/clerk_x", DEMO_TOOLS: "0", MODULES: "annual", DISPATCH_TEMPLATE: "x.json", APP_URL: "https://clerk.firm.example" };
    const problems = (env: Record<string, string>) => productionProblems(loadConfig({ ...base, ...env })).join(" ");
    expect(problems({ SSO: "microsoft" })).toMatch(/Microsoft sign-in/);
    expect(problems({ ...on, APP_URL: "http://clerk.firm.example" })).toMatch(/https/);
    expect(problems(on)).not.toMatch(/Microsoft sign-in/);
  });
});

describe("Microsoft sign-in: leaving for Microsoft and coming back", () => {
  it("the browser is sent to the firm's own tenant, asking only who the person is", () => {
    const u = new URL(authorizeUrl(cfg, { state: "s-1", nonce: "n-1", challenge: "c-1", redirectUri: "https://clerk.firm.example/api/auth/microsoft/callback" }));
    expect(u.origin + u.pathname).toBe("https://login.microsoftonline.com/tenant-1/oauth2/v2.0/authorize");
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ client_id: "app-1", response_type: "code", scope: "openid profile email", state: "s-1", nonce: "n-1", code_challenge: "c-1", code_challenge_method: "S256", redirect_uri: "https://clerk.firm.example/api/auth/microsoft/callback" });
  });

  it("what the browser carries while away can only be read back unchanged, by this installation, within ten minutes", () => {
    const sealed = sealFlow({ state: "s-1", nonce: "n-1", verifier: "v-1", next: "/annual" }, SECRET, at);
    expect(openFlow(sealed, SECRET, new Date(at.getTime() + 9 * 60_000))).toEqual({ state: "s-1", nonce: "n-1", verifier: "v-1", next: "/annual" });
    expect(openFlow(sealed, SECRET, new Date(at.getTime() + 11 * 60_000))).toBeNull();
    expect(openFlow(sealed, "t".repeat(48), at)).toBeNull();
    expect(openFlow(sealed.replace(/.$/, (c) => (c === "A" ? "B" : "A")), SECRET, at)).toBeNull();
    expect(openFlow("", SECRET, at)).toBeNull();
  });

  it("the code is exchanged with the proof this browser started the sign-in, and the app proves who it is", async () => {
    const calls: { url: string; body: string }[] = [];
    const fake = async (url: string, init?: { body?: string | Uint8Array }) => { calls.push({ url, body: String(init?.body) }); return new Response(JSON.stringify({ id_token: "the-token" }), { status: 200 }); };
    expect(await exchangeCode(cfg, fake, { code: "code-1", verifier: "v-1", redirectUri: "https://clerk.firm.example/api/auth/microsoft/callback", now: at })).toBe("the-token");
    expect(calls[0].url).toBe("https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token");
    expect(Object.fromEntries(new URLSearchParams(calls[0].body))).toMatchObject({ grant_type: "authorization_code", code: "code-1", code_verifier: "v-1", client_id: "app-1", client_secret: "shh" });
  });

  it("a refused exchange says so in Microsoft's words, without the code", async () => {
    const fake = async () => new Response(JSON.stringify({ error_description: "AADSTS70008: The code has expired." }), { status: 400 });
    await expect(exchangeCode(cfg, fake, { code: "code-1", verifier: "v-1", redirectUri: "https://x/cb", now: at })).rejects.toThrow(/expired/);
  });

  it("the challenge sent to Microsoft is the hash of the verifier kept by the browser", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("Microsoft sign-in: who signed in", () => {
  it("a token Microsoft signed for this app and this tenant gives the person's email and name", () => {
    expect(verifyIdToken(cfg, jwks, idToken(), { nonce: "n-1", now: at })).toEqual({ email: "ruby@firm.example", name: "Ruby Lam" });
  });

  it("a token for another tenant, another app, an earlier sign-in, or past its time is refused", () => {
    const bad = (claims: Record<string, unknown>) => () => verifyIdToken(cfg, jwks, idToken(claims), { nonce: "n-1", now: at });
    expect(bad({ tid: "tenant-2", iss: "https://login.microsoftonline.com/tenant-2/v2.0" })).toThrow(/tenant/);
    expect(bad({ aud: "app-2" })).toThrow(/another app/);
    expect(bad({ nonce: "n-0" })).toThrow(/sign-in attempt/);
    expect(bad({ exp: Math.floor(at.getTime() / 1000) - 600 })).toThrow(/expired/);
  });

  it("a token not signed by one of Microsoft's keys is refused", () => {
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
    expect(() => verifyIdToken(cfg, jwks, idToken({}, { key: other }), { nonce: "n-1", now: at })).toThrow(/signature/);
    expect(() => verifyIdToken(cfg, jwks, idToken({}, { kid: "unknown" }), { nonce: "n-1", now: at })).toThrow(/signature|key/);
    const unsigned = `${b64({ alg: "none", typ: "JWT" })}.${idToken().split(".")[1]}.`;
    expect(() => verifyIdToken(cfg, jwks, unsigned, { nonce: "n-1", now: at })).toThrow();
  });

  it("a token that names no email is refused", () => {
    expect(() => verifyIdToken(cfg, jwks, idToken({ preferred_username: undefined, email: undefined }), { nonce: "n-1", now: at })).toThrow(/email/);
  });
});
