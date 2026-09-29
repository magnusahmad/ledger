// Gmail API adapter (DECISIONS.md #25). OAuth on localhost; the refresh token lives in the
// encrypted secrets table. Polls the history API from the last historyId.
import { google, type gmail_v1 } from "googleapis";
import type { MailProvider, OutboundMail, SentMail, InboundMail } from "../types";
import { buildRaw, parseRaw } from "./mime";

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.modify", "https://www.googleapis.com/auth/gmail.send"];

export function gmailOAuthClient(clientId: string, clientSecret: string, redirectUri: string) {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export class GmailMail implements MailProvider {
  readonly name = "gmail";
  private gmail: gmail_v1.Gmail;
  constructor(readonly address: string, auth: InstanceType<typeof google.auth.OAuth2>) {
    this.gmail = google.gmail({ version: "v1", auth });
  }

  async fetchNew(cursor: string | null): Promise<{ messages: InboundMail[]; cursor: string | null }> {
    if (!cursor) {
      // First run: start from now; don't import the whole mailbox.
      const prof = await this.gmail.users.getProfile({ userId: "me" });
      return { messages: [], cursor: prof.data.historyId ?? null };
    }
    const ids = new Set<string>();
    let pageToken: string | undefined;
    let latest = cursor;
    try {
      do {
        const h = await this.gmail.users.history.list({ userId: "me", startHistoryId: cursor, historyTypes: ["messageAdded"], labelId: "INBOX", pageToken });
        for (const rec of h.data.history ?? []) for (const ma of rec.messagesAdded ?? []) if (ma.message?.id && !(ma.message.labelIds ?? []).includes("SENT")) ids.add(ma.message.id);
        latest = h.data.historyId ?? latest;
        pageToken = h.data.nextPageToken ?? undefined;
      } while (pageToken);
    } catch (e) {
      if ((e as { code?: number }).code === 404) { // history expired: restart from now
        const prof = await this.gmail.users.getProfile({ userId: "me" });
        return { messages: [], cursor: prof.data.historyId ?? null };
      }
      throw e;
    }
    const messages: InboundMail[] = [];
    for (const id of ids) {
      const r = await this.gmail.users.messages.get({ userId: "me", id, format: "raw" });
      if (!r.data.raw) continue;
      const m = await parseRaw(Buffer.from(r.data.raw, "base64url"), "gmail", id, r.data.threadId);
      if (m.from.email === this.address.toLowerCase()) continue;
      messages.push(m);
    }
    return { messages, cursor: latest };
  }

  async send(m: OutboundMail): Promise<SentMail> {
    const raw = await buildRaw(this.address, m);
    const r = await this.gmail.users.messages.send({ userId: "me", requestBody: { raw: raw.toString("base64url"), threadId: m.providerThreadId ?? undefined } });
    const sent = await this.gmail.users.messages.get({ userId: "me", id: r.data.id!, format: "metadata", metadataHeaders: ["Message-ID"] });
    const rfc = sent.data.payload?.headers?.find((h) => h.name?.toLowerCase() === "message-id")?.value ?? null;
    return { providerMessageId: r.data.id!, providerThreadId: r.data.threadId ?? null, rfcMessageId: rfc };
  }
}
