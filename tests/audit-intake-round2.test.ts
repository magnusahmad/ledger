import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, review, goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { startManualRequest } from "@/domain/manual";
import { getRequest, getTask } from "@/domain/engine";
import { approveProposal, createProposal, getProposal, pendingProposals } from "@/domain/proposals";
import { applyReview } from "@/agent/review";
import { portalSubmitField } from "@/domain/portal";
import { invoice, request } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeOffice" })] }));
  ctx.llm.on("draft", goodDraft);
});

async function inbound() {
  return ingestMessage(ctx, { channel: "email", provider: "fake", providerMessageId: "audit-round2", from: { email: "director@kbtrading.example", name: "CHAN Tai Man" },
    to: ["desk@caineroad.example"], cc: [], subject: "Office move", text: "Please change our office.", receivedAt: ctx.clock.now(), attachments: [] });
}

describe("Reporter follow-up: adjacent intake boundaries", () => {
  it("concurrent processing of one message creates exactly one request and one invoice", async () => {
    const m = await inbound();
    await Promise.all([processInbound(ctx, m.id), processInbound(ctx, m.id), processInbound(ctx, m.id)]);
    const requests = await ctx.db.select().from(request).where(eq(request.sourceMessageId, m.id));
    expect(requests).toHaveLength(1);
    expect(await ctx.db.select().from(invoice).where(eq(invoice.requestId, requests[0].id))).toHaveLength(1);
  });

  it("replaying processed intake returns the original request and task context for callers", async () => {
    const m = await inbound();
    const original = await processInbound(ctx, m.id);
    const replay = await processInbound(ctx, m.id);
    expect(replay).toMatchObject({ clientId: original.clientId, requestId: original.requestId, taskIds: original.taskIds });
    expect(ctx.llm.callsFor("intake")).toHaveLength(1);
  });

  it("cancelling one of two unsent tasks provides a fresh safe draft for the remaining task", async () => {
    const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }, { playbookId: "hk.changeName" }], confirm: true });
    const cancellation = await createProposal(ctx, { kind: "cancel_task", taskId: r.taskIds[0], clientId: "cli_c1", requestId: r.requestId,
      title: "Cancel office move", payload: { taskId: r.taskIds[0], voidInvoice: false, reason: "Client is staying at the existing office" } });
    await approveProposal(ctx, cancellation.id);
    expect((await getProposal(ctx, r.proposalId!)).status).toBe("superseded");
    const drafts = (await pendingProposals(ctx, { kind: "send_message" })).filter(p => p.requestId === r.requestId);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].payload.taskIds).toEqual([r.taskIds[1]]);
    expect(ctx.mail.sent()).toHaveLength(0);
  });

  for (const path of ["review", "portal", "information", "change"] as const) {
    it(`${path} cannot mark an invalid effective date received while the authoritative task date is missing`, async () => {
      const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }], confirm: false });
      const t = await getTask(ctx, r.taskIds[0]);
      const invalid = "2026-13-01";
      const result = await Promise.allSettled([path === "review" ? applyReview(ctx, t.id, review({ effectiveDate: invalid, items: [{ key: "effDate", personId: null, status: "received", value: invalid, reason: "Client supplied date" }] }), { clientId: t.clientId })
        : path === "portal" ? portalSubmitField(ctx, (await getRequest(ctx, r.requestId)).uploadToken, { taskId: t.id, key: "effDate", value: invalid })
        : (async () => {
          ctx.llm.set("intake", intake({ actions: [action({ type: path === "information" ? "provide_information" : "change_request", taskId: t.id, fields: [{ key: "effDate", value: invalid, quote: invalid }] })] }));
          ctx.llm.set("review", review({ items: [] }));
          await processInbound(ctx, (await inbound()).id);
        })()]);
      void result; // rejection or triage is acceptable; an accepted received date is not.
      const after = await getTask(ctx, t.id);
      expect(after.checklist.find(e => e.key === "effDate")?.status).toBe("needed");
      expect(after.effectiveDate).toBeNull();
    });
  }

  it("an intake field naming an ID file without an actual attachment cannot satisfy the KYC document requirement", async () => {
    ctx.llm.set("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.appointDirector", person: { mode: "new", nameEn: "Jane Doe", nameZh: null, personId: null, email: null }, fields: [{ key: "idCopy", value: "ID.pdf", quote: "ID.pdf" }] })] }));
    const r = await processInbound(ctx, (await inbound()).id);
    const t = await getTask(ctx, r.taskIds[0]);
    expect(t.checklist.find(e => e.key === "idCopy")?.status).toBe("needed");
  });
});
