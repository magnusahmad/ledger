// MIME helpers shared by mailbox adapters.
import { simpleParser } from "mailparser";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import type { InboundMail, OutboundMail } from "../types";

/** Removes quoted history ("On ... wrote:", "> ..." lines, Outlook headers) from a reply. */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const cut = lines.findIndex((l, i) =>
    /^On .{3,200}wrote:\s*$/.test(l) || /^On .{3,200}$/.test(l) && /wrote:\s*$/.test(lines[i + 1] ?? "") ||
    /^-{2,}\s*Original Message\s*-{2,}/i.test(l) || /^From: .+/.test(l) && /^(Sent|Date): /.test(lines[i + 1] ?? "") ||
    /^於.{2,80}寫道[:：]\s*$/.test(l) || /^在.{2,80}写道[:：]\s*$/.test(l));
  const kept = (cut >= 0 ? lines.slice(0, cut) : lines).filter((l) => !/^>/.test(l));
  return kept.join("\n").trim();
}

export async function parseRaw(raw: Buffer, provider: string, providerMessageId: string, providerThreadId?: string | null): Promise<InboundMail> {
  const p = await simpleParser(raw);
  const addr = (a: unknown) => {
    const v = a as { value?: { address?: string; name?: string }[] } | { value?: { address?: string }[] }[] | undefined;
    const list = Array.isArray(v) ? v.flatMap((x) => x.value ?? []) : v?.value ?? [];
    return list.map((x) => (x.address ?? "").toLowerCase()).filter(Boolean);
  };
  const from = (p.from?.value?.[0] ?? {}) as { address?: string; name?: string };
  const refs = Array.isArray(p.references) ? p.references : p.references ? [p.references] : [];
  return {
    provider, providerMessageId, providerThreadId: providerThreadId ?? null,
    rfcMessageId: p.messageId ?? null, inReplyTo: p.inReplyTo ?? null, references: refs,
    from: { email: (from.address ?? "").toLowerCase(), name: from.name || null },
    to: addr(p.to), cc: addr(p.cc), subject: p.subject ?? "",
    text: stripQuoted(p.text ?? (p.html ? String(p.html).replace(/<[^>]+>/g, " ") : "")),
    html: typeof p.html === "string" ? p.html : null,
    receivedAt: p.date ?? new Date(),
    attachments: (p.attachments ?? []).filter((a) => a.contentDisposition !== "inline" || !a.contentId).map((a) => ({ filename: a.filename ?? "attachment", mime: a.contentType, content: a.content })),
  };
}

export async function buildRaw(from: string, m: OutboundMail): Promise<Buffer> {
  const composer = new MailComposer({
    from, to: m.to, cc: m.cc, subject: m.subject, text: m.text, html: m.html,
    inReplyTo: m.inReplyTo ?? undefined, references: m.references?.length ? m.references : undefined,
    attachments: (m.attachments ?? []).map((a) => ({ filename: a.filename, content: a.content, contentType: a.mime })),
  });
  return composer.compile().build();
}
