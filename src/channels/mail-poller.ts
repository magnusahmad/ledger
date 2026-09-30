// Polls the connected mailbox, ingests new mail and runs the intake pipeline on each.
import type { Ctx } from "@/lib/ctx";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { kvGet, kvSet, withLease } from "@/domain/kv";
import { recordMailboxReply } from "@/domain/mailbox-replies";

export async function pollMail(ctx: Ctx): Promise<{ fetched: number; processed: number; errors: string[] }> {
  return (await withLease(ctx, "mail", 300, () => pollMailUnlocked(ctx))) ?? { fetched: 0, processed: 0, errors: [] };
}

async function pollMailUnlocked(ctx: Ctx): Promise<{ fetched: number; processed: number; errors: string[] }> {
  const key = `mail.cursor.${ctx.mail.name}`;
  const cursor = await kvGet<string>(ctx, key);
  const { messages, cursor: next } = await ctx.mail.fetchNew(cursor);
  let processed = 0;
  const errors: string[] = [];
  for (const m of messages) {
    // The firm's own mail (Harbourline's sends, or staff replying in Gmail) joins the thread; it isn't a client request.
    if (m.sentByUs || m.from.email?.toLowerCase() === ctx.mail.address.toLowerCase()) {
      try { await recordMailboxReply(ctx, m); } catch (e) { errors.push(`${m.providerMessageId}: ${(e as Error).message}`); }
      continue;
    }
    const row = await ingestMessage(ctx, { ...m, channel: "email" });
    if (row.duplicate) continue;
    try {
      await processInbound(ctx, row.id);
    } catch (e) {
      errors.push(`${row.id}: ${(e as Error).message}`);
      const { createProposal } = await import("@/domain/proposals");
      await createProposal(ctx, { kind: "triage", title: `Couldn't process a message from ${m.from.name ?? m.from.email}`, summary: (e as Error).message.slice(0, 300), payload: { messageId: row.id } });
    }
    processed++;
  }
  await kvSet(ctx, key, next);
  await kvSet(ctx, "mail.lastPollAt", ctx.clock.now().toISOString());
  return { fetched: messages.length, processed, errors };
}
