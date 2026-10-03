import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { action, intake, goodDraft } from "./agent-fixtures";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { approveProposal, getProposal, pendingProposals, resolveInterruptedProposal } from "@/domain/proposals";
import { mailDelivery, message } from "@/db/schema";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); });
async function draft() {
  ctx.llm.set("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeOffice" })] })); ctx.llm.set("draft", goodDraft);
  const m = await ingestMessage(ctx, { channel: "email", provider: "fake", providerMessageId: "approval-control", from: { email: "director@kbtrading.example", name: "Fixture" }, to: [ctx.mail.address], cc: [], subject: "Move office", text: "Move office", receivedAt: ctx.clock.now(), attachments: [] });
  await processInbound(ctx, m.id); return (await pendingProposals(ctx, { kind: "send_message" }))[0];
}
it("a known missing recipient before any delivery attempt stays editable and a corrected approval sends once", async () => {
  const p = await draft();
  await expect(approveProposal(ctx, p.id, { edits: { to: "" } })).rejects.toThrow(/recipient/);
  expect((await getProposal(ctx, p.id)).status).toBe("pending");
  expect((await getProposal(ctx, p.id)).approvedInput).toBeNull();
  expect(await ctx.db.select().from(mailDelivery)).toHaveLength(0); expect(ctx.mail.sent()).toHaveLength(0);
  await approveProposal(ctx, p.id, { edits: { to: "corrected@fictional.example" } });
  expect(ctx.mail.sent()).toHaveLength(1); expect(ctx.mail.sent()[0].to).toEqual(["corrected@fictional.example"]);
});
it("closing an uncertain delivery requires a mailbox check and creates a fresh draft namespace before a new human send", async () => {
  const p = await draft(); const send = ctx.mail.send.bind(ctx.mail);
  ctx.mail.send = async m => { await send(m); throw new Error("Fixture lost acceptance response"); };
  // No authoritative reconciliation for this simulated transport.
  ctx.mail.reconcileDelivery = async () => ({ status: "unknown" } as never);
  await approveProposal(ctx, p.id).catch(() => undefined);
  const before = await ctx.db.select().from(mailDelivery); expect(before).toHaveLength(1);
  await ctx.db.update(message).set({ text: "Fresh approved wording", toAddrs: ["fresh@fictional.example"] }).where(eq(message.id, p.payload.messageId as string));
  await expect(resolveInterruptedProposal(ctx, p.id, { checkedMailbox: false, note: "Checked" })).rejects.toThrow(/Check/);
  await expect(resolveInterruptedProposal(ctx, p.id, { checkedMailbox: true, note: " " })).rejects.toThrow(/record/);
  const fresh = (await resolveInterruptedProposal(ctx, p.id, { checkedMailbox: true, note: "Mailbox checked; staff requests fresh review" }))!;
  expect(fresh.status).toBe("pending"); expect(fresh.payload.messageId).not.toBe(p.payload.messageId);
  expect((await getProposal(ctx, p.id)).status).toBe("superseded"); expect(ctx.mail.sent()).toHaveLength(1);
  expect(await ctx.db.select().from(mailDelivery)).toEqual(before);
  ctx.mail.send = send;
  await approveProposal(ctx, fresh.id);
  expect(ctx.mail.sent()).toHaveLength(2); expect(ctx.mail.sent()[1]).toMatchObject({ text: "Fresh approved wording", to: ["fresh@fictional.example"] });
  expect(await ctx.db.select().from(mailDelivery)).toHaveLength(2);
});

it("a different fake outbox cannot prove non-delivery for an earlier ambiguous accepted message", async () => {
  const p = await draft(); const originalMail = ctx.mail; const send = originalMail.send.bind(originalMail);
  originalMail.send = async mail => { await send(mail); throw new Error("Fixture lost response after acceptance in the original outbox"); };
  await approveProposal(ctx, p.id).catch(() => undefined);
  expect(originalMail.sent()).toHaveLength(1);
  const { FakeMail } = await import("@/integrations/mail/fake");
  const replacement = new FakeMail(originalMail.address);
  const freshCtx = { ...ctx, mail: replacement };
  await approveProposal(freshCtx, p.id).catch(() => undefined);
  expect(originalMail.sent()).toHaveLength(1);
  expect(replacement.sent()).toHaveLength(0);
  expect((await getProposal(ctx, p.id)).status).toBe("recovery");
});
