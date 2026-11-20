// Reading a client's reply on an annual-return case (UHY pilot brief, "Reply" and "AI accuracy and
// oversight"). The model only proposes: what it finds is stored for staff to accept, edit or reject,
// and nothing on the case changes. A reading that fails is kept as a failure, never as "no changes".
// Attachments the model was not given are listed as not read. All model answers here are scripted.
import { describe, it, expect, beforeEach } from "vitest";
import { and, eq } from "drizzle-orm";
import { resetDb } from "./helpers";
import { setupSentCase, addInbound, reading, resignation, caseRow } from "./annual-reply-helpers";
import { arReply, arReplyItem, arCaseEvent } from "@/db/schema";
import { readPendingReplies, readReply, quoteFound } from "@/annual/reply-reader";
import { repliesToReview } from "@/annual/reply-review";
import { runAnnualCycle, type CycleDeps } from "@/annual/cycle";
import { PROMPT_VERSION } from "@/annual/reply-types";

const userText = (req: { messages: { role: string; content: unknown }[] }) => {
  const c = req.messages.find((m) => m.role === "user")!.content;
  return typeof c === "string" ? c : (c as { type: string; text?: string }[]).filter((p) => p.type === "text").map((p) => p.text).join("\n");
};

describe("reading a client reply", () => {
  beforeEach(async () => { await resetDb(); });

  it("a client reply linked to a case is read once, and what the model found is stored as proposals without changing the case", async () => {
    const { ctx, caseId } = await setupSentCase();
    const mailId = await addInbound(ctx, caseId, { text: "Dear Ruby,\n\nNo charges. Mr Lee resigned as director on 31 October.\n\nMs Chan" });
    ctx.llm.on("ar_reply", reading({ summary: "No charges; a director resigned.", changes: [resignation] }));
    const before = await caseRow(ctx, caseId);
    await readPendingReplies(ctx);
    await readPendingReplies(ctx);
    expect(ctx.llm.callsFor("ar_reply")).toHaveLength(1);
    const [r] = await ctx.db.select().from(arReply);
    expect(r).toMatchObject({ mailId, caseId, status: "read", about: "this_return", model: "scripted", promptVersion: PROMPT_VERSION, reviewedAt: null });
    const items = await ctx.db.select().from(arReplyItem).where(eq(arReplyItem.replyId, r.id));
    expect(items.map((i) => `${i.kind}:${i.origin}:${i.status}`).sort()).toEqual(["change:model:proposed", "charges:model:proposed"]);
    expect(items.every((i) => i.final === null && i.decidedBy === null)).toBe(true);
    const after = await caseRow(ctx, caseId);
    expect(after).toMatchObject({ stage: before.stage, chargesAnswer: null });
    expect(await ctx.db.select().from(arCaseEvent).where(and(eq(arCaseEvent.caseId, caseId), eq(arCaseEvent.kind, "reply_reviewed")))).toHaveLength(0);
  });

  it("a reply the model reads as about something else gets no proposals", async () => {
    const { ctx, caseId } = await setupSentCase();
    await addInbound(ctx, caseId, { text: "Could you send me last year's audit report?" });
    ctx.llm.on("ar_reply", reading({ about: "other", summary: "Asks for last year's audit report.", changes: [resignation] }));
    await readPendingReplies(ctx);
    const [r] = await ctx.db.select().from(arReply);
    expect(r.about).toBe("other");
    expect(await ctx.db.select().from(arReplyItem)).toHaveLength(0);
    expect(await repliesToReview(ctx, caseId)).toHaveLength(1); // still reviewed by a person
  });

  it("the model is given the company's current particulars and the earlier emails on the case, without ID numbers", async () => {
    const { ctx, caseId } = await setupSentCase();
    await addInbound(ctx, caseId, { direction: "out", text: "Please confirm whether the Company has any mortgages or charges.", receivedAt: "2026-11-04T03:00:00Z" });
    await addInbound(ctx, caseId, { text: "No charges." });
    ctx.llm.on("ar_reply", reading());
    await readPendingReplies(ctx);
    const sent = userText(ctx.llm.callsFor("ar_reply")[0]);
    expect(sent).toContain("LEE Siu Ming");
    expect(sent).toContain("1 Example Road");
    expect(sent).toContain("Please confirm whether the Company has any mortgages or charges.");
    expect(sent).not.toContain("A1234563");
    expect(sent).not.toContain("B7654321");
  });

  it("PDFs and images go to the model; any other attachment is listed as not read", async () => {
    const { ctx, caseId } = await setupSentCase();
    await addInbound(ctx, caseId, { attachments: [
      { filename: "signed-ar.pdf", mime: "application/pdf", content: Buffer.from("%PDF-1.4 fictional") },
      { filename: "new-address.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", content: Buffer.from("PK") },
    ] });
    ctx.llm.on("ar_reply", reading());
    await readPendingReplies(ctx);
    const parts = ctx.llm.callsFor("ar_reply")[0].messages.find((m) => m.role === "user")!.content as { type: string; file?: { filename: string } }[];
    expect(parts.filter((p) => p.type === "file").map((p) => p.file!.filename)).toEqual(["signed-ar.pdf"]);
    const [r] = await ctx.db.select().from(arReply);
    expect(r.attachments).toEqual([{ filename: "signed-ar.pdf", read: true }, { filename: "new-address.docx", read: false, reason: expect.stringMatching(/Word|type/i) }]);
  });

  it("a quote that isn't in the email is marked as not found", async () => {
    const { ctx, caseId } = await setupSentCase();
    await addInbound(ctx, caseId, { text: "No charges.  Mr Lee\nresigned as director on 31 October." });
    ctx.llm.on("ar_reply", reading({ changes: [resignation, { ...resignation, changeType: "registered_office", subject: null, detail: "Moved to 9 Invented Road", quote: "we have moved to 9 Invented Road" }] }));
    await readPendingReplies(ctx);
    const changes = (await ctx.db.select().from(arReplyItem)).filter((i) => i.kind === "change").map((i) => i.proposed as { changeType: string; quoteFound: boolean });
    expect(changes.find((c) => c.changeType === "director_ceased")!.quoteFound).toBe(true); // spacing and line breaks don't matter
    expect(changes.find((c) => c.changeType === "registered_office")!.quoteFound).toBe(false);
    expect(quoteFound("a  b\nc", "A b c")).toBe(true);
  });

  it("the year of a date the client wrote without one is the model's judgement from context, stored when the email is read and marked as assumed", async () => {
    const { ctx, caseId } = await setupSentCase();
    // Received on 5 January 2027; "31 December" is plainly last year's. Working that out is the model's job.
    await addInbound(ctx, caseId, { text: "Mr Lee resigned on 31 December.", receivedAt: "2027-01-05T01:30:00Z" });
    ctx.clock.set("2027-01-05T02:00:00Z");
    ctx.llm.on("ar_reply", reading({ changes: [{ ...resignation, effectiveDate: "2026-12-31", yearAssumed: true }, { ...resignation, changeType: "registered_office", effectiveDate: "2026-09-01", yearAssumed: false }] }));
    await readPendingReplies(ctx);
    const stored = async () => (await ctx.db.select().from(arReplyItem)).filter((i) => i.kind === "change").map((i) => i.proposed as { changeType: string; effectiveDate: string | null; yearAssumed?: boolean });
    expect((await stored()).find((c) => c.changeType === "director_ceased")).toMatchObject({ effectiveDate: "2026-12-31", yearAssumed: true });
    expect((await stored()).find((c) => c.changeType === "registered_office")).toMatchObject({ effectiveDate: "2026-09-01", yearAssumed: false });
    // Looked at again a year later, the date is what was stored; the email is not read again.
    ctx.clock.set("2028-02-01T02:00:00Z");
    await readPendingReplies(ctx);
    expect((await stored()).find((c) => c.changeType === "director_ceased")).toMatchObject({ effectiveDate: "2026-12-31" });
    expect(ctx.llm.callsFor("ar_reply")).toHaveLength(1);
  });

  it("the model is told when the email arrived, so it can judge whether a date is past or future", async () => {
    const { ctx, caseId } = await setupSentCase();
    await addInbound(ctx, caseId, { text: "Mr Lee resigned on 31 December.", receivedAt: "2027-01-05T01:30:00Z" });
    ctx.llm.on("ar_reply", reading());
    await readPendingReplies(ctx);
    const req = ctx.llm.callsFor("ar_reply")[0];
    expect(userText(req)).toContain("2027-01-05");
    expect(String(req.messages[0].content)).toMatch(/without a year/i);
  });

  it("code never adds a year itself: a date the model returns without one, or one that doesn't exist, is left empty", async () => {
    const { ctx, caseId } = await setupSentCase();
    await addInbound(ctx, caseId, { text: "From 31 October." });
    ctx.llm.on("ar_reply", reading({ changes: [{ ...resignation, effectiveDate: "--10-31", yearAssumed: true }, { ...resignation, changeType: "registered_office", effectiveDate: "2026-02-30", yearAssumed: true }] }));
    await readPendingReplies(ctx);
    const changes = (await ctx.db.select().from(arReplyItem)).filter((i) => i.kind === "change").map((i) => i.proposed);
    expect(changes).toHaveLength(2);
    for (const c of changes) expect(c).toMatchObject({ effectiveDate: null, yearAssumed: false });
  });

  it("a failed reading is recorded and retried, and is never treated as 'no changes'", async () => {
    const { ctx, caseId } = await setupSentCase();
    await addInbound(ctx, caseId);
    ctx.llm.on("ar_reply", () => { throw new Error("model unavailable"); });
    await readPendingReplies(ctx);
    let [r] = await ctx.db.select().from(arReply);
    expect(r).toMatchObject({ status: "failed", about: null, attempts: 1 });
    expect(r.error).toMatch(/model unavailable/);
    expect(await repliesToReview(ctx, caseId)).toHaveLength(1);
    ctx.llm.set("ar_reply", reading());
    await readPendingReplies(ctx);
    [r] = await ctx.db.select().from(arReply);
    expect(r).toMatchObject({ status: "read", attempts: 2, error: null });
    expect(await ctx.db.select().from(arReply)).toHaveLength(1);
  });

  it("a reading that keeps failing stops after three tries and waits for staff", async () => {
    const { ctx, caseId } = await setupSentCase();
    await addInbound(ctx, caseId);
    ctx.llm.on("ar_reply", () => { throw new Error("model unavailable"); });
    for (let i = 0; i < 5; i++) await readPendingReplies(ctx);
    const [r] = await ctx.db.select().from(arReply);
    expect(r).toMatchObject({ status: "failed", attempts: 3 });
  });

  it("sent mail and mail waiting to be sorted are never read", async () => {
    const { ctx, caseId } = await setupSentCase();
    await addInbound(ctx, caseId, { direction: "out" });
    await addInbound(ctx, caseId, { status: "ask" });
    ctx.llm.on("ar_reply", reading());
    await readPendingReplies(ctx);
    expect(ctx.llm.calls).toHaveLength(0);
    expect(await ctx.db.select().from(arReply)).toHaveLength(0);
  });

  it("nothing is read while the reader is switched off for the installation", async () => {
    const { ctx, caseId } = await setupSentCase();
    await addInbound(ctx, caseId);
    ctx.llm.on("ar_reply", reading());
    const deps: CycleDeps = { restoreStatusFile: null, openCsa: null, mail: null, sync: { mailboxes: [], firmDomains: [], lookbackDays: 60 }, statusDir: null, withinDays: 60, readReplies: false };
    await runAnnualCycle(ctx, deps);
    expect(ctx.llm.calls).toHaveLength(0);
    const h = await runAnnualCycle(ctx, { ...deps, readReplies: true });
    expect(ctx.llm.callsFor("ar_reply")).toHaveLength(1);
    expect(h.lastReplyReadAt).not.toBeNull();
  });

  it("another firm's replies are never read or shown", async () => {
    const a = await setupSentCase();
    const b = await setupSentCase({ firmId: "firm_other" });
    const mailB = await addInbound(b.ctx, b.caseId);
    a.ctx.llm.on("ar_reply", reading());
    await readPendingReplies(a.ctx);
    expect(a.ctx.llm.calls).toHaveLength(0);
    await expect(readReply(a.ctx, mailB)).rejects.toThrow(/not found/i);
    b.ctx.llm.on("ar_reply", reading());
    await readPendingReplies(b.ctx);
    expect(await repliesToReview(a.ctx, b.caseId)).toHaveLength(0);
    expect(await repliesToReview(b.ctx, b.caseId)).toHaveLength(1);
  });
});
