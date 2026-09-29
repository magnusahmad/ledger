// Fake mailbox: the Dev inbox page and tests "deliver" inbound mail here; sent mail is captured.
import type { InboundMail, MailProvider, OutboundMail, SentMail } from "../types";
import { MemoryList, type ListStore } from "../json-store";

type StoredInbound = Omit<InboundMail, "attachments" | "receivedAt"> & {
  receivedAt: string;
  attachments: { filename: string; mime: string; base64: string }[];
};
export type StoredOutbound = OutboundMail & { providerMessageId: string; rfcMessageId: string; sentAt: string; attachments?: never; attachmentNames: string[] };

export class FakeMail implements MailProvider {
  readonly name = "fake";
  private seq = 0;
  constructor(
    readonly address = "desk@caineroad.example",
    private inbox: ListStore<StoredInbound> = new MemoryList(),
    private outbox: ListStore<StoredOutbound> = new MemoryList(),
  ) {}

  /** Simulate an email arriving. */
  deliver(m: Partial<InboundMail> & { from: InboundMail["from"]; subject: string; text: string }): InboundMail {
    const n = this.inbox.all().length + 1;
    const mail: InboundMail = {
      provider: "fake",
      providerMessageId: m.providerMessageId ?? `fake-in-${n}-${Date.now()}`,
      providerThreadId: m.providerThreadId ?? null,
      rfcMessageId: m.rfcMessageId ?? `<in-${n}-${Date.now()}@client.example>`,
      inReplyTo: m.inReplyTo ?? null,
      references: m.references ?? [],
      to: m.to ?? [this.address],
      cc: m.cc ?? [],
      html: m.html ?? null,
      receivedAt: m.receivedAt ?? new Date(),
      attachments: m.attachments ?? [],
      from: m.from,
      subject: m.subject,
      text: m.text,
    };
    this.inbox.push({
      ...mail,
      receivedAt: mail.receivedAt.toISOString(),
      attachments: mail.attachments.map((a) => ({ filename: a.filename, mime: a.mime, base64: a.content.toString("base64") })),
    });
    return mail;
  }

  async fetchNew(cursor: string | null) {
    const all = this.inbox.all();
    const start = cursor ? Number(cursor) : 0;
    const messages: InboundMail[] = all.slice(start).map((m) => ({
      ...m,
      receivedAt: new Date(m.receivedAt),
      attachments: m.attachments.map((a) => ({ filename: a.filename, mime: a.mime, content: Buffer.from(a.base64, "base64") })),
    }));
    return { messages, cursor: String(all.length) };
  }

  async send(mail: OutboundMail): Promise<SentMail> {
    const id = `fake-out-${this.outbox.all().length + 1}-${++this.seq}`;
    const rfc = `<${id}@caineroad.example>`;
    const { attachments, ...rest } = mail;
    this.outbox.push({ ...rest, providerMessageId: id, rfcMessageId: rfc, sentAt: new Date().toISOString(), attachmentNames: (attachments ?? []).map((a) => a.filename) } as StoredOutbound);
    return { providerMessageId: id, providerThreadId: mail.providerThreadId ?? `fake-thread-${id}`, rfcMessageId: rfc };
  }

  sent(): StoredOutbound[] { return this.outbox.all(); }
}
