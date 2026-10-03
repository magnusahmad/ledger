import { beforeEach, expect, it } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { action, intake, goodDraft } from "./agent-fixtures";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { approveProposal, getProposal, pendingProposals, resumeApprovedProposal } from "@/domain/proposals";
import { mailDelivery, message } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FakeMail, type StoredOutbound } from "@/integrations/mail/fake";
import { MemoryList } from "@/integrations/json-store";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); });
async function lostAcceptedReply() {
  ctx.llm.set("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeOffice" })] })); ctx.llm.set("draft", goodDraft);
  const incoming = await ingestMessage(ctx, { channel: "email", provider: "fake", providerMessageId: "store-identity-input", from: { email: "director@kbtrading.example", name: "Fixture director" }, to: [ctx.mail.address], cc: [], subject: "Move office", text: "Change office", receivedAt: ctx.clock.now(), attachments: [] });
  await processInbound(ctx, incoming.id);
  const p = (await pendingProposals(ctx, { kind: "send_message" }))[0];
  const send = ctx.mail.send.bind(ctx.mail);
  ctx.mail.send = async mail => { await send(mail); throw new Error("Fixture accepted original delivery but lost acknowledgement"); };
  await expect(approveProposal(ctx, p.id)).rejects.toThrow(/review|acknowledgement/i);
  expect(ctx.mail.sent()).toHaveLength(1); expect((await getProposal(ctx, p.id)).status).toBe("recovery");
  return p;
}

it("REC12 an empty replacement outbox with the same provider and sender cannot authorize an ambiguous resend", async () => {
  const p = await lostAcceptedReply(); const original = ctx.mail;
  const journal = (await ctx.db.select().from(mailDelivery))[0];
  const replacement = new FakeMail(original.address); const send = replacement.send.bind(replacement); let calls = 0;
  replacement.send = async mail => { calls++; return send(mail); };
  const restarted = { ...ctx, mail: replacement };
  await resumeApprovedProposal(restarted, p.id).catch(() => undefined);
  expect(calls).toBe(0); expect(replacement.sent()).toHaveLength(0); expect(original.sent()).toHaveLength(1);
  expect((await getProposal(ctx, p.id)).status).toBe("recovery");
  expect((await getProposal(ctx, p.id)).recoveryError).toMatch(/review|mailbox|unknown/i);
  expect((await ctx.db.select().from(mailDelivery))[0]).toMatchObject({ id: journal.id, correlationId: journal.correlationId, payloadHash: journal.payloadHash });
}, 120_000);

it("a restarted adapter sharing the original actual outbox can reconcile acceptance without a transport call", async () => {
  const store = new MemoryList<StoredOutbound>(); const address = ctx.mail.address;
  ctx.mail = new FakeMail(address, undefined, store);
  const p = await lostAcceptedReply();
  const replacement = new FakeMail(address, undefined, store); const send = replacement.send.bind(replacement); let calls = 0;
  replacement.send = async mail => { calls++; return send(mail); };
  await resumeApprovedProposal({ ...ctx, mail: replacement }, p.id);
  expect(calls).toBe(0); expect(store.all()).toHaveLength(1); expect((await getProposal(ctx, p.id)).status).toBe("approved");
  expect(await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) })).toMatchObject({ status: "sent", providerMessageId: store.all()[0].providerMessageId });
}, 120_000);
