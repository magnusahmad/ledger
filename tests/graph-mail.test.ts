// Microsoft 365 mail through Graph (UHY deploy gap, Gap 4): app-only sign-in, delta reading per
// mailbox folder with a resumable checkpoint, and drafts in a staff mailbox. The client has no way
// to send: staff send every email themselves from Outlook.
import { describe, it, expect } from "vitest";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { GraphMail, type FetchLike } from "@/integrations/mail/graph";

type Call = { method: string; url: string; body?: string; headers: Record<string, string> };

function fakeFetch(routes: (c: Call) => { status?: number; json?: unknown; headers?: Record<string, string> } | undefined) {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    const c: Call = { method: init?.method ?? "GET", url: String(url), body: typeof init?.body === "string" ? init.body : init?.body ? "<binary>" : undefined, headers: Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v])) };
    calls.push(c);
    if (c.url.includes("/oauth2/v2.0/token")) return new Response(JSON.stringify({ access_token: `tok${calls.filter((x) => x.url.includes("token")).length}`, expires_in: 3600 }), { status: 200 });
    const r = routes(c);
    if (!r) return new Response(JSON.stringify({ error: { message: `no route ${c.method} ${c.url}` } }), { status: 404 });
    return new Response(r.json === undefined ? null : JSON.stringify(r.json), { status: r.status ?? 200, headers: r.headers });
  };
  return { fetch, calls };
}

const secretAuth = { tenantId: "tenant-1", clientId: "app-1", clientSecret: "s3cret" };

describe("Graph sign-in", () => {
  it("a client secret uses the client-credentials grant, and the token is reused until it expires", async () => {
    const { fetch, calls } = fakeFetch((c) => (c.url.includes("/mailFolders/inbox/messages/delta") ? { json: { value: [], "@odata.deltaLink": "https://graph.microsoft.com/v1.0/delta?token=1" } } : undefined));
    const g = new GraphMail(secretAuth, { fetch, now: () => new Date("2026-11-05T02:00:00Z") });
    await g.delta("ruby@uhy.example", "inbox", null, { since: "2026-09-06" });
    await g.delta("ruby@uhy.example", "inbox", null, { since: "2026-09-06" });
    const tokenCalls = calls.filter((c) => c.url.includes("token"));
    expect(tokenCalls).toHaveLength(1);
    expect(tokenCalls[0].url).toBe("https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token");
    expect(tokenCalls[0].body).toContain("grant_type=client_credentials");
    expect(tokenCalls[0].body).toContain("scope=https%3A%2F%2Fgraph.microsoft.com%2F.default");
    expect(calls.find((c) => c.url.includes("delta"))?.headers.authorization).toBe("Bearer tok1");
  });

  it("certificate sign-in sends a client assertion signed with the private key and naming the certificate thumbprint", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const { fetch, calls } = fakeFetch(() => ({ json: { value: [], "@odata.deltaLink": "x" } }));
    const g = new GraphMail({ tenantId: "tenant-1", clientId: "app-1", privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(), thumbprintHex: "A1B2C3D4E5F60718293A4B5C6D7E8F9001122334" }, { fetch, now: () => new Date("2026-11-05T02:00:00Z") });
    await g.delta("ruby@uhy.example", "inbox", null, { since: "2026-09-06" });
    const body = new URLSearchParams(calls[0].body!);
    expect(body.get("client_assertion_type")).toBe("urn:ietf:params:oauth:client-assertion-type:jwt-bearer");
    expect(body.get("client_secret")).toBeNull();
    const [h, p, s] = body.get("client_assertion")!.split(".");
    const header = JSON.parse(Buffer.from(h, "base64url").toString());
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    expect(header).toMatchObject({ alg: "RS256", typ: "JWT", x5t: Buffer.from("A1B2C3D4E5F60718293A4B5C6D7E8F9001122334", "hex").toString("base64url") });
    expect(payload).toMatchObject({ iss: "app-1", sub: "app-1", aud: "https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token" });
    expect(createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(s, "base64url"))).toBe(true);
  });
});

describe("delta reading", () => {
  it("follows next links, ignores removed items, and returns the delta link as the new checkpoint", async () => {
    const { fetch, calls } = fakeFetch((c) => {
      if (c.url.includes("page=2")) return { json: { value: [{ "@removed": { reason: "deleted" }, id: "gone" }, { id: "m2", conversationId: "cv2", from: { emailAddress: { address: "b@x.example" } }, toRecipients: [], ccRecipients: [], receivedDateTime: "2026-11-02T00:00:00Z" }], "@odata.deltaLink": "https://graph.microsoft.com/v1.0/users/ruby/mailFolders/inbox/messages/delta?$deltatoken=D2" } };
      if (c.url.includes("/mailFolders/inbox/messages/delta")) return { json: { value: [{ id: "m1", conversationId: "cv1", internetMessageId: "<m1@x>", subject: "Hi", from: { emailAddress: { address: "A@X.example", name: "A" } }, toRecipients: [{ emailAddress: { address: "ruby@uhy.example" } }], ccRecipients: [], receivedDateTime: "2026-11-01T00:00:00Z" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/next?page=2" } };
    });
    const g = new GraphMail(secretAuth, { fetch });
    const r = await g.delta("ruby@uhy.example", "inbox", null, { since: "2026-09-06" });
    expect(r.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(r.messages[0]).toMatchObject({ from: "a@x.example", to: ["ruby@uhy.example"], conversationId: "cv1", folder: "inbox" });
    expect(r.cursor).toContain("deltatoken=D2");
    const first = calls.find((c) => c.url.includes("/mailFolders/inbox/messages/delta"))!;
    expect(decodeURIComponent(first.url)).toContain("receivedDateTime ge 2026-09-06");
    expect(first.url).toContain("users/ruby%40uhy.example");
  });

  it("a later read resumes from the saved checkpoint instead of starting over", async () => {
    const { fetch, calls } = fakeFetch((c) => (c.url.startsWith("https://graph.microsoft.com/v1.0/saved-delta") ? { json: { value: [], "@odata.deltaLink": "https://graph.microsoft.com/v1.0/saved-delta?t=3" } } : undefined));
    const g = new GraphMail(secretAuth, { fetch });
    const r = await g.delta("ruby@uhy.example", "inbox", "https://graph.microsoft.com/v1.0/saved-delta?t=2", { since: "2026-09-06" });
    expect(r.cursor).toBe("https://graph.microsoft.com/v1.0/saved-delta?t=3");
    expect(calls.filter((c) => !c.url.includes("token")).map((c) => c.url)).toEqual(["https://graph.microsoft.com/v1.0/saved-delta?t=2"]);
  });

  it("a throttled request waits for Retry-After and tries again", async () => {
    let n = 0;
    const { fetch } = fakeFetch((c) => (c.url.includes("delta") ? (n++ === 0 ? { status: 429, json: { error: {} }, headers: { "retry-after": "0" } } : { json: { value: [], "@odata.deltaLink": "d" } }) : undefined));
    const g = new GraphMail(secretAuth, { fetch, sleep: async () => {} });
    expect((await g.delta("ruby@uhy.example", "inbox", null, { since: "2026-09-06" })).cursor).toBe("d");
  });

  it("only a delta link from Microsoft Graph is followed", async () => {
    const { fetch } = fakeFetch(() => undefined);
    const g = new GraphMail(secretAuth, { fetch });
    await expect(g.delta("ruby@uhy.example", "inbox", "https://evil.example/steal", { since: "2026-09-06" })).rejects.toThrow(/Graph/);
  });
});

describe("drafts", () => {
  it("creating a draft never calls send, and returns its id and conversation", async () => {
    const { fetch, calls } = fakeFetch((c) => {
      if (c.method === "POST" && c.url.endsWith("/users/ruby%40uhy.example/messages")) return { status: 201, json: { id: "draft1", conversationId: "cv9", webLink: "https://outlook.office.com/x" } };
      if (c.method === "POST" && c.url.endsWith("/messages/draft1/attachments")) return { status: 201, json: { id: "att1" } };
    });
    const g = new GraphMail(secretAuth, { fetch });
    const d = await g.createDraft("ruby@uhy.example", { to: ["finance@alpha.example"], subject: "Alpha - 2026 Annual Return", text: "Dear Ms Chan", attachments: [{ filename: "NAR1.pdf", mime: "application/pdf", content: Buffer.from("%PDF-1.7") }] });
    expect(d).toEqual({ draftId: "draft1", conversationId: "cv9", webLink: "https://outlook.office.com/x" });
    expect(calls.some((c) => /\/send\b|sendMail/i.test(c.url))).toBe(false);
    const created = JSON.parse(calls.find((c) => c.url.endsWith("/messages"))!.body!);
    expect(created).toMatchObject({ subject: "Alpha - 2026 Annual Return", body: { contentType: "Text", content: "Dear Ms Chan" }, toRecipients: [{ emailAddress: { address: "finance@alpha.example" } }] });
  });

  it("an attachment over 3 MB goes through an upload session", async () => {
    const big = Buffer.alloc(3_500_000, 1);
    const { fetch, calls } = fakeFetch((c) => {
      if (c.method === "POST" && c.url.endsWith("/messages")) return { status: 201, json: { id: "draft2", conversationId: "cv2", webLink: "w" } };
      if (c.url.endsWith("/attachments/createUploadSession")) return { status: 201, json: { uploadUrl: "https://outlook.office.com/upload/abc" } };
      if (c.url.startsWith("https://outlook.office.com/upload/abc")) return { status: c.headers["content-range"]?.endsWith(`/${big.length}`) && c.headers["content-range"].includes(`-${big.length - 1}/`) ? 201 : 200, json: {} };
    });
    const g = new GraphMail(secretAuth, { fetch });
    await g.createDraft("ruby@uhy.example", { to: ["a@x.example"], subject: "s", text: "t", attachments: [{ filename: "AGM.pdf", mime: "application/pdf", content: big }] });
    const puts = calls.filter((c) => c.method === "PUT");
    expect(puts.length).toBeGreaterThan(1);
    expect(puts.every((p) => !("authorization" in p.headers))).toBe(true);
  });

  it("a reply draft is created in the original email's thread", async () => {
    const { fetch, calls } = fakeFetch((c) => {
      if (c.url.endsWith("/messages/orig1/createReply")) return { status: 201, json: { id: "draft3", conversationId: "cv-orig", webLink: "w" } };
      if (c.method === "PATCH" && c.url.endsWith("/messages/draft3")) return { json: { id: "draft3", conversationId: "cv-orig", webLink: "w" } };
    });
    const g = new GraphMail(secretAuth, { fetch });
    const d = await g.createDraft("ruby@uhy.example", { to: ["a@x.example"], subject: "Re: s", text: "t", replyToId: "orig1" });
    expect(d.conversationId).toBe("cv-orig");
    expect(calls.map((c) => c.method)).toContain("PATCH");
  });
});
