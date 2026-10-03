import { beforeEach, expect, it } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { startManualRequest } from "@/domain/manual";
import { approveProposal, getProposal, pendingProposals } from "@/domain/proposals";
import { getPlaybook, savePlaybookVersion } from "@/domain/playbooks";
import { currentStep, getRequest, getTask, taskEvents } from "@/domain/engine";
import { recordMailboxReply } from "@/domain/mailbox-replies";
import { runChasers } from "@/domain/chasing";
import type { InboundMail } from "@/integrations/types";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx({ now: "2026-09-20T02:00:00Z" });
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
  ctx.llm.on("mailbox_review", { summary: "Staff acknowledgement only", changes: [] });
});

it("A10-D06 consumer: a manually confirmed request links a real mailbox reply to its task and restarts that task's chase clock", async () => {
  const pb = await getPlaybook(ctx, "hk.changeOffice");
  await savePlaybookVersion(ctx, pb.id, pb.version, JSON.stringify({ ...pb, feeCents: 0, statutoryFees: [] }));
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: pb.id }], confirm: true });
  expect(r.proposalId).toBeTruthy();
  await approveProposal(ctx, r.proposalId!);
  expect(currentStep(await getTask(ctx, r.taskIds[0]))?.kind).toBe("collect");
  const p = await getProposal(ctx, r.proposalId!);
  const original = await ctx.db.query.message.findFirst({ where: (m, { eq }) => eq(m.id, p.payload.messageId as string) });
  expect(original?.conversationId).toBeTruthy();
  const sent = ctx.mail.sent()[0];
  ctx.clock.set("2026-09-29T02:00:00Z");
  const reply: InboundMail = {
    provider: "fake", providerMessageId: "manual-provider-reply", rfcMessageId: "<manual-provider-reply@firm.example>",
    providerThreadId: sent.providerThreadId, inReplyTo: sent.rfcMessageId, references: [], sentByUs: true,
    from: { email: ctx.mail.address, name: "Fictional Staff" }, to: ["director@kbtrading.example"], cc: [],
    subject: "Re: office move", text: "Acknowledged; we are awaiting the requested information.", html: null,
    attachments: [], receivedAt: ctx.clock.now(),
  };
  await recordMailboxReply(ctx, reply);
  const recorded = await ctx.db.query.message.findFirst({ where: (m, { eq }) => eq(m.providerMessageId, reply.providerMessageId) });
  expect(recorded?.conversationId, "real mailbox routing retains the original confirmation conversation").toBe(original!.conversationId);
  expect.soft((await getRequest(ctx, r.requestId)).conversationId, "manual confirmation has the same request/thread association as inbound work").toBe(original!.conversationId);
  expect.soft((await taskEvents(ctx, r.taskIds[0])).filter(e => e.kind === "message.mailbox_reply")).toHaveLength(1);
  ctx.clock.set("2026-09-30T02:00:00Z");
  expect.soft(await runChasers(ctx), "the real staff acknowledgement is only one day old").toBe(0);
  expect.soft((await pendingProposals(ctx)).filter(p => p.payload.purpose === "chase")).toHaveLength(0);
  expect(ctx.mail.sent()).toHaveLength(1);
});
