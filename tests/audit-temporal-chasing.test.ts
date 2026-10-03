import { beforeEach, expect, it } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft, action, intake } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { approveProposal, getProposal, pendingProposals } from "@/domain/proposals";
import { getPlaybook, savePlaybookVersion } from "@/domain/playbooks";
import { currentStep, getTask, taskEvents } from "@/domain/engine";
import { recordMailboxReply } from "@/domain/mailbox-replies";
import { runChasers } from "@/domain/chasing";
import type { InboundMail } from "@/integrations/types";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx({ now: "2026-09-20T02:00:00Z" });
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
  ctx.llm.on("mailbox_review", { summary: "Staff acknowledgement only", changes: [] });
});
async function openApprovedFreeWork() {
  const pb = await getPlaybook(ctx, "hk.changeOffice");
  await savePlaybookVersion(ctx, pb.id, pb.version, JSON.stringify({ ...pb, feeCents: 0, statutoryFees: [] }));
  ctx.llm.on("intake", intake({ actions: [action({ type: "start_request", playbookId: pb.id })] }));
  const inbound = await ingestMessage(ctx, { provider: "fake", providerMessageId: "temporal-client-request", providerThreadId: "temporal-thread", channel: "email",
    from: { email: "director@kbtrading.example", name: "CHAN Tai Man" }, to: [ctx.mail.address], cc: [], subject: "Office move", text: "Please change our registered office", receivedAt: ctx.clock.now(), attachments: [] });
  await processInbound(ctx, inbound.id);
  const initial = (await pendingProposals(ctx)).find(p => p.kind === "send_message" && p.payload.purpose === "request")!;
  expect(initial).toBeTruthy();
  const r = { taskIds: initial.payload.taskIds as string[], requestId: initial.requestId! };
  await approveProposal(ctx, initial.id);
  expect(currentStep(await getTask(ctx, r.taskIds[0]))?.kind).toBe("collect");
  const p = await getProposal(ctx, initial.id);
  return { r, messageId: p.payload.messageId as string, sent: ctx.mail.sent()[0] };
}
function receipt(f: Awaited<ReturnType<typeof openApprovedFreeWork>>, id: string, receivedAt: string): InboundMail {
  return { provider: "fake", providerMessageId: id, rfcMessageId: `<${id}@firm.example>`, providerThreadId: f.sent.providerThreadId,
    inReplyTo: f.sent.rfcMessageId, references: [], sentByUs: true,
    from: { email: ctx.mail.address, name: "Fictional Staff" }, to: ["director@kbtrading.example"], cc: [], subject: "Re: office move",
    text: "Acknowledged; we are awaiting the requested information.", html: null, attachments: [], receivedAt: new Date(receivedAt) };
}
it("A10-D06: a recent provider-dated staff reply restarts chasing even when recorded by an older context clock", async () => {
  const f = await openApprovedFreeWork();
  const newer = receipt(f, "recent-reply", "2026-09-29T02:00:00Z");
  // Context was opened on Sep20; provider reports the actual staff send on Sep29.
  await recordMailboxReply(ctx, newer);
  expect((await taskEvents(ctx, f.r.taskIds[0])).filter(e => e.kind === "message.mailbox_reply")).toHaveLength(1);
  const count = await taskEvents(ctx, f.r.taskIds[0]);
  await recordMailboxReply(ctx, newer); // exact replay must not add activity.
  expect(await taskEvents(ctx, f.r.taskIds[0])).toHaveLength(count.length);
  await recordMailboxReply(ctx, receipt(f, "older-out-of-order-reply", "2026-09-21T02:00:00Z"));
  ctx.clock.set("2026-09-30T02:00:00Z");
  expect(await runChasers(ctx), "the most recent actual staff reply is only one day old").toBe(0);
  expect((await pendingProposals(ctx)).filter(p => p.payload.purpose === "chase")).toHaveLength(0);
  expect(ctx.mail.sent()).toHaveLength(1);
});
it("A10-D06: a delayed old provider receipt cannot postpone an already-due chase to its ingestion day", async () => {
  const f = await openApprovedFreeWork();
  ctx.clock.set("2026-09-30T02:00:00Z");
  await recordMailboxReply(ctx, receipt(f, "delayed-staff-reply", "2026-09-25T02:00:00Z"));
  expect((await taskEvents(ctx, f.r.taskIds[0])).filter(e => e.kind === "message.mailbox_reply")).toHaveLength(1);
  expect(await runChasers(ctx), "five days passed since the real staff send despite delayed polling").toBe(1);
  const chases = (await pendingProposals(ctx)).filter(p => p.payload.purpose === "chase");
  expect(chases).toHaveLength(1); expect(chases[0].status).toBe("pending");
  expect(chases[0].payload.escalation).toBe(false);
  expect(await runChasers(ctx)).toBe(0); expect(ctx.mail.sent()).toHaveLength(1);
});
