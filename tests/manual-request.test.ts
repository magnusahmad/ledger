// Starting a request by hand: after a meeting or call, staff choose the playbooks and enter
// what they already know. Nothing reaches the client without an approval.
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { startManualRequest } from "@/domain/manual";
import { getTask, tasksForRequest, taskEvents } from "@/domain/engine";
import { getPersonProtected } from "@/domain/records";
import { pendingProposals } from "@/domain/proposals";
import { templateEmail, type ReplyFacts } from "@/agent/draft";
import { invoice, message, request as requestT } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
});

const appointWong = { playbookId: "hk.appointDirector", person: { nameEn: "WONG Ka Man" }, fields: { effDate: "2026-11-01", corrAddr: "Unit 1502, Kowloon Bay Centre" } };

describe("Start manually", () => {
  it("a request started manually creates its tasks, the invoice and a confirmation draft for approval, and sends nothing", async () => {
    const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [appointWong, { playbookId: "hk.changeOffice" }], notes: "Met Mr Chan at our office.", confirm: true });
    const tasks = await tasksForRequest(ctx, r.requestId);
    expect(tasks.map((t) => t.playbookId).sort()).toEqual(["hk.appointDirector", "hk.changeOffice"]);
    const req = (await ctx.db.query.request.findFirst({ where: eq(requestT.id, r.requestId) }))!;
    const inv = (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, req.invoiceId!) }))!;
    expect(inv.status).toBe("draft");
    const [p] = await pendingProposals(ctx, { kind: "send_message" });
    expect(p).toMatchObject({ id: r.proposalId, requestId: r.requestId, clientId: "cli_c1", payload: { origin: "manual" } });
    const draft = (await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) }))!;
    expect(draft).toMatchObject({ status: "draft", toAddrs: ["director@kbtrading.example"] });
    expect(ctx.mail.sent()).toHaveLength(0);
  });

  it("details agreed in person tick their checklist items and go on the new person's record", async () => {
    const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [appointWong], confirm: true });
    const t = await getTask(ctx, r.taskIds[0]);
    expect(t.title).toBe("Appoint a director: WONG Ka Man");
    expect(t.effectiveDate).toBe("2026-11-01");
    expect(t.checklist.find((e) => e.key === "corrAddr")).toMatchObject({ status: "received", value: "Unit 1502, Kowloon Bay Centre" });
    expect((await getPersonProtected(ctx, t.personId!)).correspondenceAddress).toBe("Unit 1502, Kowloon Bay Centre");
  });

  it("a request agreed in person with no confirmation skips the send step and issues the invoice, still sending nothing", async () => {
    const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }], confirm: false });
    expect(r.proposalId).toBeNull();
    const t = await getTask(ctx, r.taskIds[0]);
    expect(t.stepState["0"]).toMatchObject({ skipped: "Agreed with the client in person" });
    expect(t.stepIndex).toBeGreaterThan(0);
    const req = (await ctx.db.query.request.findFirst({ where: eq(requestT.id, r.requestId) }))!;
    expect((await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, req.invoiceId!) }))?.status).toBe("sent");
    expect(await pendingProposals(ctx, { kind: "send_message" })).toHaveLength(0);
    expect(ctx.mail.sent()).toHaveLength(0);
  });

  it("a manual request is recorded as taken in person by staff, not as a message from the client", async () => {
    const before = (await ctx.db.select().from(message)).filter((m) => m.direction === "in").length;
    const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }], notes: "Phone call with Mr Chan", confirm: true });
    expect((await ctx.db.select().from(message)).filter((m) => m.direction === "in")).toHaveLength(before);
    const req = (await ctx.db.query.request.findFirst({ where: eq(requestT.id, r.requestId) }))!;
    expect(req.summary).toBe("Phone call with Mr Chan");
    const ev = (await taskEvents(ctx, r.taskIds[0])).find((e) => e.kind === "request.manual");
    expect(ev).toMatchObject({ actor: ctx.userId });
    expect(ev?.summary).toContain("Phone call with Mr Chan");
  });

  it("a manual request needs at least one playbook, and rejects one that doesn't exist", async () => {
    await expect(startManualRequest(ctx, { clientId: "cli_c1", items: [], confirm: true })).rejects.toThrow(/at least one/i);
    await expect(startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.nope" }], confirm: true })).rejects.toThrow();
    await expect(startManualRequest(ctx, { clientId: "cli_missing", items: [{ playbookId: "hk.changeOffice" }], confirm: true })).rejects.toThrow(/client/i);
  });

  it("a confirmation after a meeting thanks the client for meeting, not for their message", () => {
    const f: ReplyFacts = { language: "en", context: "meeting", recipientName: "Mr Chan", clientName: "Kowloon Bay Trading Limited", signOff: "Karen Yip", newRequests: [], updates: [], changes: [], cancellations: [], questions: [], clarifications: [], invoice: null, uploadUrl: null };
    const body = templateEmail(f).body;
    expect(body).toContain("Thank you for meeting with us");
    expect(body).not.toContain("Thank you for your message");
  });
});
