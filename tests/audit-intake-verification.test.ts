import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, review, goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { startManualRequest } from "@/domain/manual";
import { cancelTask, getRequest, getTask } from "@/domain/engine";
import { markInvoiceSent } from "@/domain/invoices";
import { applyReview } from "@/agent/review";
import { portalSubmitField } from "@/domain/portal";
import { invoice, invoiceLine, task } from "@/db/schema";

let ctx: TestCtx;
let delivery = 0;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeOffice" })] }));
  ctx.llm.on("draft", goodDraft);
});

async function incoming() {
  return ingestMessage(ctx, { channel: "email", provider: "fake", providerMessageId: `audit-verify-${delivery++}`, from: { email: "director@kbtrading.example", name: "CHAN Tai Man" },
    to: ["desk@caineroad.example"], cc: [], subject: "Office move", text: "Please change our office.", receivedAt: ctx.clock.now(), attachments: [] });
}
const PATHS = ["review", "portal", "information", "change"] as const;
type Path = typeof PATHS[number];
async function setDate(path: Path, taskId: string, token: string, value: string) {
  if (path === "review") return applyReview(ctx, taskId, review({ items: [{ key: "effDate", personId: null, status: "received", value, reason: "Client supplied date" }] }), { clientId: "cli_c1" });
  if (path === "portal") return portalSubmitField(ctx, token, { taskId, key: "effDate", value });
  ctx.llm.set("intake", intake({ actions: [action({ type: path === "information" ? "provide_information" : "change_request", taskId, fields: [{ key: "effDate", value, quote: value }] })] }));
  ctx.llm.set("review", review({ items: [] }));
  return processInbound(ctx, (await incoming()).id);
}

describe("Final intake reporter verification", () => {
  for (const path of PATHS) {
    it(`${path} rejects or ignores ten malformed dates without changing the authoritative task`, async () => {
      const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }], confirm: false });
      const token = (await getRequest(ctx, r.requestId)).uploadToken;
      const before = await ctx.db.query.task.findFirst({ where: eq(task.id, r.taskIds[0]) });
      for (const value of ["2026-02-30", "2026-04-31", "2026-13-01", "0000-01-01", "2026-00-10", "2026-01-00", "2026-1-1", "not a date", "2026-10-01\u0000", "２０２６-１０-０１"]) {
        await Promise.allSettled([setDate(path, r.taskIds[0], token, value)]);
        expect(await ctx.db.query.task.findFirst({ where: eq(task.id, r.taskIds[0]) }), `${path}: ${JSON.stringify(value)}`).toEqual(before);
      }
    });

    it(`${path} synchronizes a valid checklist date with the effective date and statutory deadline`, async () => {
      const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }], confirm: false });
      await setDate(path, r.taskIds[0], (await getRequest(ctx, r.requestId)).uploadToken, "2026-11-01");
      const t = await getTask(ctx, r.taskIds[0]);
      expect(t.checklist.find(e => e.key === "effDate")).toMatchObject({ status: "received", value: "2026-11-01" });
      expect(t.effectiveDate).toBe("2026-11-01");
      expect(t.dueDate).toBe("2026-11-16");
      expect(ctx.mail.sent()).toHaveLength(0);
    });
  }

  it("all concurrent replay callers receive identical persisted client request task and proposal IDs", async () => {
    const m = await incoming();
    const results = await Promise.all([processInbound(ctx, m.id), processInbound(ctx, m.id), processInbound(ctx, m.id)]);
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
    expect(results[0].requestId).toBeTruthy();
    expect(ctx.llm.callsFor("intake")).toHaveLength(1);
  });

  it("an ambiguous sender's triage result preserves its proposal IDs on replay", async () => {
    ctx.llm.set("intake", intake({ client: { kind: "unclear", clientId: null, companyName: null, companyNumber: null, senderName: "Unknown sender", reason: "Cannot identify company" }, actions: [] }));
    const m = await ingestMessage(ctx, { channel: "email", provider: "fake", providerMessageId: "audit-unclear", from: { email: "unknown@unmatched.example", name: "Unknown sender" },
      to: ["desk@caineroad.example"], cc: [], subject: "Which company", text: "Please help with our company.", receivedAt: ctx.clock.now(), attachments: [] });
    const original = await processInbound(ctx, m.id);
    expect(original.proposalIds).toHaveLength(1);
    expect(await processInbound(ctx, m.id)).toEqual(original);
    expect(ctx.llm.callsFor("intake")).toHaveLength(1);
  });

  it("a fixture intake failure preserves the early triage result without repeating either failed model attempt", async () => {
    ctx.llm.set("intake", { invalid: "Recorded malformed model output" });
    const m = await incoming();
    const original = await processInbound(ctx, m.id);
    expect(original.proposalIds).toHaveLength(1);
    expect(original.requestId).toBeNull();
    expect(await processInbound(ctx, m.id)).toEqual(original);
    expect(ctx.llm.callsFor("intake")).toHaveLength(2);
    expect(ctx.mail.sent()).toHaveLength(0);
  });

  it("general correspondence preserves its client context on replay without creating work or sending", async () => {
    ctx.llm.set("intake", intake({ actions: [action({ type: "general_correspondence", description: "Thank you for your help" })] }));
    const m = await incoming();
    const original = await processInbound(ctx, m.id);
    expect(original).toMatchObject({ clientId: "cli_c1", requestId: null, taskIds: [], proposalIds: [] });
    expect(await processInbound(ctx, m.id)).toEqual(original);
    expect(ctx.llm.callsFor("intake")).toHaveLength(1);
    expect(ctx.mail.sent()).toHaveLength(0);
  });

  it("partial cancellation preserves an issued invoice until staff explicitly approve a revision", async () => {
    const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }, { playbookId: "hk.changeName" }], confirm: true });
    const req = await getRequest(ctx, r.requestId);
    await markInvoiceSent(ctx, req.invoiceId!);
    const before = await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, req.invoiceId!) });
    const lines = await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId, req.invoiceId!));
    await cancelTask(ctx, r.taskIds[0], "Client cancelled office move after invoice delivery");
    expect(await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, req.invoiceId!) })).toEqual(before);
    expect(await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId, req.invoiceId!))).toEqual(lines);
    expect(ctx.mail.sent()).toHaveLength(0);
  });
});
