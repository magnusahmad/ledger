// Polls the connected mailbox, ingests new mail and runs the intake pipeline on each.
import type { Ctx } from "@/lib/ctx";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { kvGet, kvSet, withLease, type Lease } from "@/domain/kv";
import { recordMailboxReply } from "@/domain/mailbox-replies";
import { and, eq, isNull } from "drizzle-orm";
import { message } from "@/db/schema";

export async function pollMail(ctx: Ctx): Promise<{ fetched: number; processed: number; errors: string[] }> {
  return (await withLease(ctx, "mail", 300, lease => pollMailUnlocked(ctx, lease))) ?? { fetched: 0, processed: 0, errors: [] };
}

async function pollMailUnlocked(ctx: Ctx, lease: Lease): Promise<{ fetched: number; processed: number; errors: string[] }> {
  const key = `mail.cursor.${ctx.mail.name}`;
  const cursor = await kvGet<string>(ctx, key);
  const { messages, cursor: next } = await ctx.mail.fetchNew(cursor);
  let processed = 0;
  const errors: string[] = [];
  for (const m of messages) {
    await lease.assertCurrent();
    // The firm's own mail (Harbourline's sends, or staff replying in Gmail) joins the thread; it isn't a client request.
    if (m.sentByUs || m.from.email?.toLowerCase() === ctx.mail.address.toLowerCase()) {
      try { await recordMailboxReply(ctx, m); } catch (e) { errors.push(`${m.providerMessageId}: ${(e as Error).message}`); }
      continue;
    }
    const row = await ingestMessage(ctx, { ...m, channel: "email" });
    if (row.duplicate && row.processedAt) continue;
    try {
      await processInbound(ctx, row.id);
    } catch (e) {
      errors.push(`${row.id}: ${(e as Error).message}`);
      const { createProposal } = await import("@/domain/proposals");
      await createProposal(ctx, { kind: "triage", title: `Couldn't process a message from ${m.from.name ?? m.from.email}`, summary: (e as Error).message.slice(0, 300), payload: { messageId: row.id } });
      await ctx.db.update(message).set({ processedAt: ctx.clock.now(), error: (e as Error).message })
        .where(and(eq(message.firmId, ctx.firmId), eq(message.id, row.id)));
    }
    processed++;
  }
  // A cursor may have advanced before a prior process died: recover stored inbound work too.
  const unfinished = await ctx.db.select().from(message).where(and(eq(message.firmId, ctx.firmId), eq(message.direction, "in"), eq(message.provider, ctx.mail.name), isNull(message.processedAt)));
  for (const m of unfinished) {
    await lease.assertCurrent();
    try { await processInbound(ctx, m.id); processed++; } catch (e) { errors.push(`${m.id}: ${(e as Error).message}`); }
  }
  await lease.assertCurrent();
  if (!errors.length) await lease.setValue(key, next);
  await kvSet(ctx, "mail.lastPollAt", ctx.clock.now().toISOString());
  return { fetched: messages.length, processed, errors };
}
