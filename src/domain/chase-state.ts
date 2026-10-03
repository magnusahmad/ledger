// A signing reminder describes only invitations whose acceptance is recorded.
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { mailDelivery, signEnvelope, signer } from "@/db/schema";

export async function invitedSignatureRecipients(ctx: Ctx, taskId: string): Promise<string[]> {
  const env = await ctx.db.query.signEnvelope.findFirst({ where: and(eq(signEnvelope.firmId, ctx.firmId), eq(signEnvelope.taskId, taskId), eq(signEnvelope.status, "sent")), orderBy: desc(signEnvelope.createdAt) });
  if (!env) return [];
  const people = await ctx.db.select().from(signer).where(and(eq(signer.firmId, ctx.firmId), eq(signer.envelopeId, env.id), isNull(signer.signedAt)));
  const recipients: string[] = [];
  for (const person of people) {
    const delivery = await ctx.db.query.mailDelivery.findFirst({ where: and(eq(mailDelivery.firmId, ctx.firmId), eq(mailDelivery.sourceKey, `signer:${env.id}:${person.personId}`), eq(mailDelivery.status, "sent")) });
    if (delivery?.result?.providerMessageId) recipients.push(person.email);
  }
  return [...new Set(recipients)].sort();
}
