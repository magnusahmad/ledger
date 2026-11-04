// Annual-return and AGM cases for the UHY pilot: one case per company and period, steps in order,
// every step recorded against the person who did it, and nothing sent without a staff action.
import { describe, it, expect, beforeEach } from "vitest";
import { and, eq } from "drizzle-orm";
import { resetDb, makeCtx } from "./helpers";
import { arCase, arCaseEvent, client, filing, firm } from "@/db/schema";
import { syncCases, listCases, startAtStage, recordRegistryCheck, markPrepared, confirmPayment, recordDraft, markSent, markSignedReceived, markFiled, markRegistered } from "@/annual/cases";
import { upcomingDeadlines } from "@/domain/deadlines";

async function seed(ctx: ReturnType<typeof makeCtx>) {
  await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Test Firm", invoicePrefix: "T" });
  await ctx.db.insert(client).values([
    { id: "cl_a", firmId: ctx.firmId, code: "A001", nameEn: "Alpha Limited", incorporatedOn: "2015-11-20", fyeMonth: 12, fyeDay: 31 },
    { id: "cl_b", firmId: ctx.firmId, code: "B002", nameEn: "Beta Limited", incorporatedOn: "2019-03-01" },
  ]);
}

describe("annual-return cases", () => {
  beforeEach(async () => { await resetDb(); });

  it("syncing opens one case per company and period due within the window, and re-running doesn't duplicate", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seed(ctx);
    await syncCases(ctx, { withinDays: 60 });
    await syncCases(ctx, { withinDays: 60 });
    const cases = await listCases(ctx);
    expect(cases.map((c) => `${c.clientCode} ${c.periodKey}`)).toEqual(["A001 NAR1:2026"]);
    expect(cases[0].dueDate).toBe("2027-01-01");
    expect(cases[0].stage).toBe("due");
  });

  it("a case can start at its current stage once, before anything else is recorded", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seed(ctx);
    await syncCases(ctx, { withinDays: 60 });
    const [c] = await listCases(ctx);
    await startAtStage({ ...ctx, userId: "user_ruby" }, c.id, "sent");
    expect((await listCases(ctx))[0].stage).toBe("sent");
    await expect(startAtStage(ctx, c.id, "prepared")).rejects.toThrow(/already/);
  });

  it("the form can't be marked prepared before the Registry check is recorded", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seed(ctx);
    await syncCases(ctx, { withinDays: 60 });
    const [c] = await listCases(ctx);
    await expect(markPrepared(ctx, c.id, { formSource: "generated" })).rejects.toThrow(/Registry check/);
    await recordRegistryCheck(ctx, c.id, { result: "no_changes" });
    await markPrepared(ctx, c.id, { formSource: "generated" });
    expect((await listCases(ctx))[0].stage).toBe("prepared");
  });

  it("no dispatch draft before payment is confirmed, and confirmation records who and when", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seed(ctx);
    await syncCases(ctx, { withinDays: 60 });
    const [c] = await listCases(ctx);
    await recordRegistryCheck(ctx, c.id, { result: "no_changes" });
    await markPrepared(ctx, c.id, { formSource: "generated" });
    await expect(recordDraft(ctx, c.id, { mailbox: "ruby@uhy.example", draftId: "d1", conversationId: "conv1" })).rejects.toThrow(/payment/i);
    await confirmPayment({ ...ctx, userId: "user_coe" }, c.id);
    const row = await ctx.db.query.arCase.findFirst({ where: eq(arCase.id, c.id) });
    expect(row?.paymentConfirmedBy).toBe("user_coe");
    expect(row?.paymentConfirmedAt).toBeInstanceOf(Date);
    await recordDraft(ctx, c.id, { mailbox: "ruby@uhy.example", draftId: "d1", conversationId: "conv1" });
    expect((await listCases(ctx))[0].stage).toBe("draft_ready");
  });

  it("a draft is not a sent email: the case moves to sent only when sending is seen or staff record it", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seed(ctx);
    await syncCases(ctx, { withinDays: 60 });
    const [c] = await listCases(ctx);
    await startAtStage(ctx, c.id, "payment_confirmed");
    await recordDraft(ctx, c.id, { mailbox: "ruby@uhy.example", draftId: "d1", conversationId: "conv1" });
    expect((await listCases(ctx))[0].stage).toBe("draft_ready");
    await markSent(ctx, c.id, { via: "seen_in_sent_items", at: new Date("2026-11-05T03:00:00Z") });
    expect((await listCases(ctx))[0].stage).toBe("sent");
  });

  it("steps can't go backwards or skip ahead", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seed(ctx);
    await syncCases(ctx, { withinDays: 60 });
    const [c] = await listCases(ctx);
    await expect(markFiled(ctx, c.id, { filedOn: "2026-12-01" })).rejects.toThrow(/signed/);
    await startAtStage(ctx, c.id, "filed");
    await expect(confirmPayment(ctx, c.id)).rejects.toThrow();
  });

  it("registered records the filing, so the deadline no longer shows as due", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seed(ctx);
    await syncCases(ctx, { withinDays: 60 });
    const [c] = await listCases(ctx);
    await startAtStage(ctx, c.id, "sent");
    await markSignedReceived(ctx, c.id);
    await markFiled(ctx, c.id, { filedOn: "2026-12-01" });
    await markRegistered({ ...ctx, userId: "user_ruby" }, c.id, { registeredOn: "2026-12-04" });
    const f = await ctx.db.select().from(filing).where(and(eq(filing.clientId, "cl_a"), eq(filing.periodKey, "NAR1:2026")));
    expect(f).toHaveLength(1);
    expect((await upcomingDeadlines(ctx, { withinDays: 60 })).some((d) => d.periodKey === "NAR1:2026")).toBe(false);
  });

  it("every step is recorded against the person who did it", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seed(ctx);
    await syncCases(ctx, { withinDays: 60 });
    const [c] = await listCases(ctx);
    await recordRegistryCheck({ ...ctx, userId: "user_ruby" }, c.id, { result: "changes_found", note: "New director filed" });
    await markPrepared({ ...ctx, userId: "user_coe" }, c.id, { formSource: "csa" });
    const ev = await ctx.db.select().from(arCaseEvent).where(eq(arCaseEvent.caseId, c.id)).orderBy(arCaseEvent.at);
    expect(ev.map((e) => [e.kind, e.userId])).toEqual([["registry_check", "user_ruby"], ["prepared", "user_coe"]]);
  });

  it("another firm's case can't be changed", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seed(ctx);
    await syncCases(ctx, { withinDays: 60 });
    const [c] = await listCases(ctx);
    await expect(recordRegistryCheck({ ...ctx, firmId: "firm_other" }, c.id, { result: "no_changes" })).rejects.toThrow(/not found/i);
  });
});
