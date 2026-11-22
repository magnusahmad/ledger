// Microsoft 365 mail through Microsoft Graph, app-only (pilot deploy gap, Gap 4). Access is limited to
// the team mailboxes by Exchange RBAC for Applications with the "Application Mail.ReadWrite" role,
// which can read and create drafts but cannot send. This client has no send method either.
import { createSign, randomUUID } from "node:crypto";
import type { MailAttachment } from "@/integrations/types";

export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string | Uint8Array }) => Promise<Response>;

export type GraphAuth =
  | { tenantId: string; clientId: string; clientSecret: string }
  | { tenantId: string; clientId: string; privateKeyPem: string; thumbprintHex: string };

export type GraphMessageMeta = {
  id: string; folder: string; conversationId: string | null; internetMessageId: string | null; subject: string;
  from: string; fromName: string | null; to: string[]; cc: string[]; receivedAt: string; isMeetingMessage: boolean;
};

export type GraphFullMessage = { meta: GraphMessageMeta; headers: Record<string, string>; text: string; inReplyTo: string | null; references: string[]; attachments: MailAttachment[] };

const GRAPH = "https://graph.microsoft.com/v1.0";
const SELECT = "id,conversationId,internetMessageId,subject,from,toRecipients,ccRecipients,receivedDateTime";
const SMALL_ATTACHMENT = 3 * 1024 * 1024;
const CHUNK = 320 * 1024 * 4;

const addr = (r?: { emailAddress?: { address?: string } }) => (r?.emailAddress?.address ?? "").trim().toLowerCase();

function toMeta(m: Record<string, unknown>, folder: string): GraphMessageMeta {
  const from = m.from as { emailAddress?: { address?: string; name?: string } } | undefined;
  return {
    id: String(m.id), folder, conversationId: (m.conversationId as string) ?? null, internetMessageId: (m.internetMessageId as string) ?? null,
    subject: String(m.subject ?? ""), from: addr(from), fromName: from?.emailAddress?.name ?? null,
    to: ((m.toRecipients as []) ?? []).map(addr).filter(Boolean), cc: ((m.ccRecipients as []) ?? []).map(addr).filter(Boolean),
    receivedAt: String(m.receivedDateTime ?? ""), isMeetingMessage: String(m["@odata.type"] ?? "").includes("eventMessage"),
  };
}

export class GraphMail {
  private token: { value: string; expires: number } | null = null;
  private readonly fetch: FetchLike;
  private readonly now: () => Date;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly auth: GraphAuth, o: { fetch?: FetchLike; now?: () => Date; sleep?: (ms: number) => Promise<void> } = {}) {
    this.fetch = o.fetch ?? ((u, i) => fetch(u, i as RequestInit));
    this.now = o.now ?? (() => new Date());
    this.sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  private async accessToken(): Promise<string> {
    const t = this.now().getTime();
    if (this.token && this.token.expires - 60_000 > t) return this.token.value;
    const url = `https://login.microsoftonline.com/${encodeURIComponent(this.auth.tenantId)}/oauth2/v2.0/token`;
    const form = new URLSearchParams({ grant_type: "client_credentials", client_id: this.auth.clientId, scope: "https://graph.microsoft.com/.default" });
    if ("clientSecret" in this.auth) form.set("client_secret", this.auth.clientSecret);
    else {
      form.set("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer");
      form.set("client_assertion", this.assertion(url, t));
    }
    const res = await this.fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form.toString() });
    const j = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
    if (!res.ok || !j.access_token) throw new Error(`Microsoft 365 sign-in failed: ${j.error_description ?? res.status}`);
    this.token = { value: j.access_token, expires: t + (j.expires_in ?? 3600) * 1000 };
    return j.access_token;
  }

  private assertion(aud: string, nowMs: number): string {
    if (!("privateKeyPem" in this.auth)) throw new Error("No certificate configured");
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const iat = Math.floor(nowMs / 1000);
    const head = b64({ alg: "RS256", typ: "JWT", x5t: Buffer.from(this.auth.thumbprintHex.replace(/[^0-9a-f]/gi, ""), "hex").toString("base64url") });
    const body = b64({ aud, iss: this.auth.clientId, sub: this.auth.clientId, jti: randomUUID(), nbf: iat - 30, iat, exp: iat + 600 });
    const sig = createSign("RSA-SHA256").update(`${head}.${body}`).sign(this.auth.privateKeyPem).toString("base64url");
    return `${head}.${body}.${sig}`;
  }

  private async call<T>(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
    if (!url.startsWith(`${GRAPH}/`)) throw new Error("Refusing to call a URL outside Microsoft Graph");
    for (let attempt = 0; ; attempt++) {
      const res = await this.fetch(url, { method, headers: { authorization: `Bearer ${await this.accessToken()}`, ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
      if ((res.status === 429 || res.status === 503) && attempt < 5) { await this.sleep(Number(res.headers.get("retry-after") ?? 2 ** attempt) * 1000); continue; }
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(`Microsoft Graph ${method} failed (${res.status}): ${json?.error?.message ?? text.slice(0, 200)}`);
      return json as T;
    }
  }

  /** Messages in one well-known folder, newer than the checkpoint (or `since` on the first read). */
  async delta(mailbox: string, folder: "inbox" | "sentitems", cursor: string | null, o: { since: string }): Promise<{ messages: GraphMessageMeta[]; cursor: string }> {
    let url = cursor ?? `${GRAPH}/users/${encodeURIComponent(mailbox)}/mailFolders/${folder}/messages/delta?$select=${SELECT}&$filter=${encodeURIComponent(`receivedDateTime ge ${o.since}T00:00:00Z`)}`;
    if (!url.startsWith(`${GRAPH}/`)) throw new Error("Saved mail checkpoint is not a Microsoft Graph link");
    const messages: GraphMessageMeta[] = [];
    for (;;) {
      const page = await this.call<{ value: Record<string, unknown>[]; "@odata.nextLink"?: string; "@odata.deltaLink"?: string }>("GET", url, undefined, { prefer: "odata.maxpagesize=50" });
      for (const m of page.value) {
        if (m["@removed"]) continue;
        messages.push(toMeta(m, folder));
      }
      if (page["@odata.deltaLink"]) return { messages, cursor: page["@odata.deltaLink"] };
      if (!page["@odata.nextLink"]) throw new Error("Microsoft Graph returned neither a next link nor a delta link");
      url = page["@odata.nextLink"];
    }
  }

  /** Internet headers only, for the relevance gate. */
  async headers(mailbox: string, id: string): Promise<Record<string, string>> {
    const r = await this.call<{ internetMessageHeaders?: { name: string; value: string }[] }>("GET", `${GRAPH}/users/${encodeURIComponent(mailbox)}/messages/${encodeURIComponent(id)}?$select=internetMessageHeaders`);
    return Object.fromEntries((r.internetMessageHeaders ?? []).map((h) => [h.name.toLowerCase(), h.value]));
  }

  /** Body as plain text, headers and attachments, for a message the gate kept or staff linked. */
  async full(mailbox: string, id: string, folder = "inbox"): Promise<GraphFullMessage> {
    const base = `${GRAPH}/users/${encodeURIComponent(mailbox)}/messages/${encodeURIComponent(id)}`;
    const m = await this.call<Record<string, unknown> & { body?: { content?: string }; internetMessageHeaders?: { name: string; value: string }[] }>("GET", `${base}?$select=${SELECT},body,internetMessageHeaders`, undefined, { prefer: 'outlook.body-content-type="text"' });
    const headers = Object.fromEntries((m.internetMessageHeaders ?? []).map((h) => [h.name.toLowerCase(), h.value]));
    const atts = await this.call<{ value: { "@odata.type": string; name: string; contentType: string; contentBytes?: string }[] }>("GET", `${base}/attachments`);
    return {
      meta: toMeta(m, folder), headers, text: m.body?.content ?? "",
      inReplyTo: headers["in-reply-to"] ?? null, references: (headers["references"] ?? "").split(/\s+/).filter(Boolean),
      attachments: atts.value.filter((a) => a["@odata.type"].endsWith("fileAttachment") && a.contentBytes).map((a) => ({ filename: a.name, mime: a.contentType, content: Buffer.from(a.contentBytes!, "base64") })),
    };
  }

  /** Saves a draft in the mailbox for staff to review and send from Outlook. Never sends. */
  async createDraft(mailbox: string, m: { to: string[]; cc?: string[]; subject: string; text: string; attachments?: MailAttachment[]; replyToId?: string }): Promise<{ draftId: string; conversationId: string | null; webLink: string | null }> {
    const user = `${GRAPH}/users/${encodeURIComponent(mailbox)}`;
    const fields = { subject: m.subject, body: { contentType: "Text", content: m.text }, toRecipients: m.to.map((a) => ({ emailAddress: { address: a } })), ccRecipients: (m.cc ?? []).map((a) => ({ emailAddress: { address: a } })) };
    let d: { id: string; conversationId?: string; webLink?: string };
    if (m.replyToId) {
      const r = await this.call<{ id: string }>("POST", `${user}/messages/${encodeURIComponent(m.replyToId)}/createReply`, {});
      d = await this.call("PATCH", `${user}/messages/${encodeURIComponent(r.id)}`, fields);
    } else d = await this.call("POST", `${user}/messages`, fields);
    for (const a of m.attachments ?? []) {
      if (a.content.length <= SMALL_ATTACHMENT) await this.call("POST", `${user}/messages/${d.id}/attachments`, { "@odata.type": "#microsoft.graph.fileAttachment", name: a.filename, contentType: a.mime, contentBytes: a.content.toString("base64") });
      else await this.upload(`${user}/messages/${d.id}/attachments/createUploadSession`, a);
    }
    return { draftId: d.id, conversationId: d.conversationId ?? null, webLink: d.webLink ?? null };
  }

  private async upload(sessionUrl: string, a: MailAttachment) {
    const s = await this.call<{ uploadUrl: string }>("POST", sessionUrl, { AttachmentItem: { attachmentType: "file", name: a.filename, size: a.content.length, contentType: a.mime } });
    if (!/^https:\/\/[^/]*(outlook\.office(365)?\.com|graph\.microsoft\.com)\//.test(s.uploadUrl)) throw new Error("Unexpected upload address from Microsoft Graph");
    for (let start = 0; start < a.content.length; start += CHUNK) {
      const end = Math.min(start + CHUNK, a.content.length) - 1;
      // The upload URL is pre-authorised; sending the bearer token to it is refused by Graph.
      const res = await this.fetch(s.uploadUrl, { method: "PUT", headers: { "content-length": String(end - start + 1), "content-range": `bytes ${start}-${end}/${a.content.length}` }, body: a.content.subarray(start, end + 1) });
      if (!res.ok) throw new Error(`Attachment upload failed (${res.status})`);
    }
  }
}
