import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { action, intake, goodDraft } from "./agent-fixtures";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { approveProposal, getProposal, pendingProposals, recoverApprovals, resumeApprovedProposal, resolveInterruptedProposal } from "@/domain/proposals";
import { getTask, setChecklist } from "@/domain/engine";
import { auditLog, invoice, job, mailDelivery, message, proposal, task, taskEvent } from "@/db/schema";
import type { MailProvider } from "@/integrations/types";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); });

async function interrupted(unknown = true) {
  ctx.llm.set("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeOffice", fields: [{ key: "newAddr", value: "Audit office", quote: null }] })] }));
  ctx.llm.set("draft", goodDraft);
  const incoming = await ingestMessage(ctx, { channel: "email", provider: "fake", providerMessageId: "recovery-guard-input", from: { email: "director@kbtrading.example", name: "Fixture director" }, to: [ctx.mail.address], cc: [], subject: "Move office", text: "Change our office", receivedAt: ctx.clock.now(), attachments: [] });
  await processInbound(ctx, incoming.id);
  const p = (await pendingProposals(ctx, { kind: "send_message" }))[0];
  const reconcile = ctx.mail.reconcileDelivery.bind(ctx.mail);
  const transport: MailProvider = ctx.mail;
  if (unknown) transport.reconcileDelivery = async () => ({ status: "unknown" });
  const send = ctx.mail.send.bind(ctx.mail); let calls = 0;
  ctx.mail.send = async mail => { calls++; const accepted = await send(mail); if (calls === 1) throw new Error("Fixture loses accepted response"); return accepted; };
  await expect(approveProposal(ctx, p.id)).rejects.toThrow(/review|accepted/i);
  expect((await getProposal(ctx, p.id)).status).toBe("recovery");
  expect(ctx.mail.sent()).toHaveLength(1);
  return { p, reconcile, calls: () => calls };
}

async function durableState() {
  return {
    proposals: await ctx.db.select().from(proposal), messages: await ctx.db.select().from(message),
    deliveries: await ctx.db.select().from(mailDelivery), invoices: await ctx.db.select().from(invoice),
    tasks: await ctx.db.select().from(task), jobs: await ctx.db.select().from(job),
    events: await ctx.db.select().from(taskEvent), audit: await ctx.db.select().from(auditLog),
  };
}

it("another firm cannot discover, resume or close an interrupted approval, while its owner can recover it", async () => {
  const { p, reconcile, calls } = await interrupted();
  // Persist the stale owner state that discovery must scope to the caller's firm.
  await ctx.db.update(proposal).set({ status: "processing", executionToken: "expired-fixture-owner", leaseUntil: new Date(0) }).where(eq(proposal.id, p.id));
  const before = await durableState(); const foreign = { ...ctx, firmId: "firm_foreign", userId: "user_foreign" };
  expect(await recoverApprovals(foreign)).toHaveLength(0);
  await expect(resumeApprovedProposal(foreign, p.id)).rejects.toThrow(/not found/i);
  await expect(resolveInterruptedProposal(foreign, p.id, { checkedMailbox: true, note: "Foreign staff claims a mailbox check" })).rejects.toThrow(/not found/i);
  expect(await durableState()).toEqual(before); expect(calls()).toBe(1); expect(ctx.mail.sent()).toHaveLength(1);
  expect(await recoverApprovals(ctx)).toHaveLength(1);
  ctx.mail.reconcileDelivery = reconcile;
  await resumeApprovedProposal(ctx, p.id);
  expect((await getProposal(ctx, p.id)).status).toBe("approved"); expect(calls()).toBe(1);
}, 120_000);

for (const input of [
  { label: "a false mailbox check", value: { checkedMailbox: false, note: "Checked" } },
  { label: "a missing mailbox check", value: { note: "Checked" } },
  { label: "a blank mailbox note", value: { checkedMailbox: true, note: " \t\n " } },
]) it(`closing interrupted work rejects ${input.label} without changing any durable work`, async () => {
  const { p, calls } = await interrupted(); const before = await durableState();
  await expect(resolveInterruptedProposal(ctx, p.id, input.value as Parameters<typeof resolveInterruptedProposal>[2])).rejects.toThrow(/check|record|mailbox/i);
  expect(await durableState()).toEqual(before); expect(calls()).toBe(1); expect(ctx.mail.sent()).toHaveLength(1);
}, 120_000);

it("a changed effective date prevents old approval recovery from sending or advancing the revised task", async () => {
  const { p, calls } = await interrupted(false);
  const current = await getTask(ctx, (p.payload.taskIds as string[])[0]);
  expect(current.checklist.some(e => e.key === "effDate")).toBe(true);
  await setChecklist(ctx, current.id, current.checklist.map(e => e.key === "effDate" ? { ...e, status: "received", value: "2026-10-15" } : e), "Client changed effective date before recovery", ctx.userId);
  const changed = await getTask(ctx, current.id); expect(changed.effectiveDate).toBe("2026-10-15");
  const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.requestId, p.requestId!) }); expect(inv?.status).toBe("draft");
  const journal = (await ctx.db.select().from(mailDelivery))[0];
  await expect(resumeApprovedProposal(ctx, p.id)).rejects.toThrow(/facts changed|fresh review/i);
  expect(calls()).toBe(1); expect(ctx.mail.sent()).toHaveLength(1);
  expect((await getTask(ctx, current.id)).effectiveDate).toBe("2026-10-15");
  expect((await getTask(ctx, current.id)).stepIndex).toBe(changed.stepIndex);
  expect((await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv!.id) }))?.status).toBe("draft");
  expect((await getProposal(ctx, p.id)).status).toBe("recovery");
  expect((await getProposal(ctx, p.id)).recoveryError).toMatch(/facts changed|fresh review/i);
  expect((await ctx.db.select().from(mailDelivery))[0]).toMatchObject({ id: journal.id, correlationId: journal.correlationId, payloadHash: journal.payloadHash });
  expect((await ctx.db.select().from(auditLog)).filter(a => a.action === "proposal.approve.send_message" && a.entityId === p.id)).toHaveLength(0);
}, 120_000);
