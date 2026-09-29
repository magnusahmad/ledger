// AgentMail adapter (fallback mailbox). Uses extracted_text to drop quoted history.
import { AgentMailClient } from "agentmail";
import type { InboundMail, MailProvider, OutboundMail, SentMail } from "../types";
import { stripQuoted } from "./mime";

export class AgentMailMail implements MailProvider {
  readonly name = "agentmail";
  private client: AgentMailClient;
  constructor(apiKey: string, readonly address: string) {
    this.client = new AgentMailClient({ apiKey });
  }

  async fetchNew(cursor: string | null) {
    const after = cursor ? new Date(cursor) : new Date(Date.now() - 60_000);
    const list = await this.client.inboxes.messages.list(this.address, { after, ascending: true, limit: 50, labels: ["received"] });
    const messages: InboundMail[] = [];
    let latest = after;
    for (const item of list.messages) {
      const m = await this.client.inboxes.messages.get(this.address, item.messageId);
      const created = new Date(m.createdAt);
      if (created > latest) latest = created;
      const fromMatch = m.from.match(/^(.*?)\s*<([^>]+)>$/);
      const fromEmail = (fromMatch?.[2] ?? m.from).toLowerCase();
      if (fromEmail === this.address.toLowerCase()) continue;
      const atts = [];
      for (const a of m.attachments ?? []) {
        const meta = await this.client.inboxes.messages.getAttachment(this.address, m.messageId, a.attachmentId);
        const res = await fetch(meta.downloadUrl);
        atts.push({ filename: a.filename ?? "attachment", mime: a.contentType ?? "application/octet-stream", content: Buffer.from(await res.arrayBuffer()) });
      }
      messages.push({
        provider: "agentmail", providerMessageId: m.messageId, providerThreadId: m.threadId,
        rfcMessageId: m.messageId, inReplyTo: m.inReplyTo ?? null, references: m.references ?? [],
        from: { email: fromEmail, name: fromMatch?.[1]?.replace(/"/g, "") || null },
        to: m.to, cc: m.cc ?? [], subject: m.subject ?? "", text: m.extractedText ?? stripQuoted(m.text ?? ""), html: m.html ?? null,
        receivedAt: created, attachments: atts,
      });
    }
    return { messages, cursor: new Date(latest.getTime() + 1).toISOString() };
  }

  async send(m: OutboundMail): Promise<SentMail> {
    const attachments = (m.attachments ?? []).map((a) => ({ filename: a.filename, contentType: a.mime, content: a.content.toString("base64") }));
    const r = m.inReplyTo
      ? await this.client.inboxes.messages.reply(this.address, m.inReplyTo, { text: m.text, html: m.html, attachments, to: m.to, cc: m.cc })
      : await this.client.inboxes.messages.send(this.address, { to: m.to, cc: m.cc, subject: m.subject, text: m.text, html: m.html, attachments });
    return { providerMessageId: r.messageId, providerThreadId: r.threadId, rfcMessageId: r.messageId };
  }
}
