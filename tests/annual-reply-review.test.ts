// Staff review of what the model read in a client's reply (UHY pilot brief, "Reply" and "AI accuracy
// and oversight"; DECISIONS.md #56 and #64). Nothing is accepted before that person has opened the
// email; there is no "accept all"; every edit, rejection and addition is recorded as a defect with
// the model's output and the final value. The charges answer is always entered by staff. An accepted
// change holds filing until it is settled, and an emailed signed scan never stands in for the paper
// original. Model answers here are scripted; nothing calls a live model.
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { resetDb, type TestCtx } from "./helpers";
import { setupSentCase, addInbound, reading, resignation, caseRow, csaSource, csaTables } from "./annual-reply-helpers";
import { aiDefect, arCaseEvent, arReply, arReplyItem } from "@/db/schema";
import { readPendingReplies } from "@/annual/reply-reader";
import * as R from "@/annual/reply-review";
import { markFiled, markSignedReceived } from "@/annual/cases";
import { importCsa } from "@/integrations/csa/import";
import { allPlaybookFiles } from "@/domain/playbooks";
import { PROMPT_VERSION } from "@/annual/reply-types";
import type { AnnualDeps } from "@/annual/service";
import template from "../seed/uhy/dispatch-template.json";

async function read(o: { text?: string; model?: Parameters<typeof reading>[0]; attachments?: { filename: string; mime: string; content: Buffer }[] } = {}) {
  const s = await setupSentCase();
  const mailId = await addInbound(s.ctx, s.caseId, { text: o.text ?? "No charges. Mr Lee resigned as director on 31 October.", attachments: o.attachments });
  s.ctx.llm.on("ar_reply", reading(o.model ?? { changes: [resignation] }));
  await readPendingReplies(s.ctx);
  const [reply] = await s.ctx.db.select().from(arReply);
  const items = await s.ctx.db.select().from(arReplyItem);
  return { ...s, mailId, reply, change: items.find((i) => i.kind === "change"), charges: items.find((i) => i.kind === "charges")!, items };
}
const defects = (ctx: TestCtx) => ctx.db.select().from(aiDefect);
const item = async (ctx: TestCtx, id: string) => (await ctx.db.select().from(arReplyItem).where(eq(arReplyItem.id, id)))[0];
const as = (ctx: TestCtx, userId: string): TestCtx => ({ ...ctx, userId });

describe("reviewing what the model read", () => {
  beforeEach(async () => { await resetDb(); });

  it("a proposal can't be accepted until that staff member has opened the email", async () => {
    const { ctx, reply, change } = await read();
    await expect(R.decideItem(ctx, change!.id, { action: "accept" })).rejects.toThrow(/open the email/i);
    await R.openSource(as(ctx, "user_coe"), reply.id); // someone else opening it doesn't count
    await expect(R.decideItem(ctx, change!.id, { action: "accept" })).rejects.toThrow(/open the email/i);
    await R.openSource(ctx, reply.id);
    await R.decideItem(ctx, change!.id, { action: "accept" });
    expect(await item(ctx, change!.id)).toMatchObject({ status: "accepted", decidedBy: "user_ruby" });
  });

  it("accepting a proposal keeps the model's value, records who accepted it and no defect", async () => {
    const { ctx, reply, change } = await read();
    await R.openSource(ctx, reply.id);
    await R.decideItem(ctx, change!.id, { action: "accept" });
    const i = await item(ctx, change!.id);
    expect(i.final).toMatchObject({ changeType: "director_ceased", subject: "LEE Siu Ming", effectiveDate: "2026-10-31" });
    expect(await defects(ctx)).toHaveLength(0);
  });

  it("editing a proposal records an 'edited' defect with the model's value, the final value, the person, the model and the prompt version", async () => {
    const { ctx, reply, change, mailId, caseId } = await read();
    await R.openSource(ctx, reply.id);
    await R.decideItem(ctx, change!.id, { action: "edit", value: { ...resignation, effectiveDate: "2026-10-30" } });
    expect(await item(ctx, change!.id)).toMatchObject({ status: "edited", final: expect.objectContaining({ effectiveDate: "2026-10-30" }) });
    const [d] = await defects(ctx);
    expect(d).toMatchObject({ task: "ar_reply", kind: "edited", inputRef: mailId, itemId: change!.id, caseId, by: "user_ruby", model: "scripted", promptVersion: PROMPT_VERSION });
    expect(d.modelOutput).toMatchObject({ effectiveDate: "2026-10-31" });
    expect(d.finalValue).toMatchObject({ effectiveDate: "2026-10-30" });
  });

  it("staff can't record a date without a year: a correction or an addition needs the full date", async () => {
    const { ctx, reply, change } = await read();
    await R.openSource(ctx, reply.id);
    await expect(R.decideItem(ctx, change!.id, { action: "edit", value: { ...resignation, effectiveDate: "10-31" } })).rejects.toThrow(/year/i);
    await expect(R.decideItem(ctx, change!.id, { action: "edit", value: { ...resignation, effectiveDate: "--10-31" } })).rejects.toThrow(/year/i);
    await expect(R.addMissed(ctx, reply.id, { kind: "change", value: { ...resignation, effectiveDate: "31/10" } })).rejects.toThrow(/year/i);
    await expect(R.decideItem(ctx, change!.id, { action: "edit", value: { ...resignation, effectiveDate: "2026-02-30" } })).rejects.toThrow(/date/i);
    expect((await item(ctx, change!.id)).status).toBe("proposed");
    await R.decideItem(ctx, change!.id, { action: "edit", value: { ...resignation, effectiveDate: "" } }); // no date at all is allowed
    expect((await item(ctx, change!.id)).final).toMatchObject({ effectiveDate: null });
  });

  it("accepting a date whose year Clerk assumed keeps that mark with the record", async () => {
    const { ctx, reply, change } = await read({ model: { changes: [{ ...resignation, effectiveDate: "--10-31" }] } });
    await R.openSource(ctx, reply.id);
    await R.decideItem(ctx, change!.id, { action: "accept" });
    expect((await item(ctx, change!.id)).final).toMatchObject({ effectiveDate: "2026-10-31", yearAssumed: true });
    expect(await defects(ctx)).toHaveLength(0);
  });

  it("rejecting a proposal records a 'rejected' defect and the change holds nothing", async () => {
    const { ctx, reply, change, caseId } = await read();
    await R.openSource(ctx, reply.id);
    await R.decideItem(ctx, change!.id, { action: "reject" });
    expect((await defects(ctx)).map((d) => d.kind)).toEqual(["rejected"]);
    expect(await R.openChanges(ctx, caseId)).toHaveLength(0);
  });

  it("a decided proposal can't be decided a second time", async () => {
    const { ctx, reply, change } = await read();
    await R.openSource(ctx, reply.id);
    await R.decideItem(ctx, change!.id, { action: "accept" });
    await expect(R.decideItem(ctx, change!.id, { action: "reject" })).rejects.toThrow(/already/i);
  });

  it("something staff add that the model missed is a 'missed' defect", async () => {
    const { ctx, reply, mailId } = await read({ model: {} });
    await R.openSource(ctx, reply.id);
    await R.addMissed(ctx, reply.id, { kind: "change", value: resignation });
    const added = (await ctx.db.select().from(arReplyItem)).find((i) => i.origin === "staff")!;
    expect(added).toMatchObject({ kind: "change", status: "added", proposed: null, decidedBy: "user_ruby" });
    expect(await defects(ctx)).toEqual([expect.objectContaining({ kind: "missed", inputRef: mailId, itemId: added.id, modelOutput: null })]);
  });

  it("what staff record on a failed reading is not counted as missed, because the model produced nothing to compare", async () => {
    const s = await setupSentCase();
    await addInbound(s.ctx, s.caseId);
    s.ctx.llm.on("ar_reply", () => { throw new Error("model unavailable"); });
    await readPendingReplies(s.ctx);
    const [reply] = await s.ctx.db.select().from(arReply);
    await R.openSource(s.ctx, reply.id);
    await R.addMissed(s.ctx, reply.id, { kind: "change", value: resignation });
    await R.addMissed(s.ctx, reply.id, { kind: "charges", value: { answer: "none", details: null } });
    expect(await defects(s.ctx)).toHaveLength(0);
    expect((await caseRow(s.ctx, s.caseId)).chargesAnswer).toMatchObject({ answer: "none" });
  });

  it("the charges answer is entered by staff: agreeing with the model is no defect, and the answer is stored on the case", async () => {
    const { ctx, reply, charges, caseId } = await read();
    await expect(R.answerCharges(ctx, charges.id, { answer: "none" })).rejects.toThrow(/open the email/i);
    await R.openSource(ctx, reply.id);
    await expect(R.decideItem(ctx, charges.id, { action: "accept" })).rejects.toThrow(/charges/i); // no one-click accept
    await R.answerCharges(ctx, charges.id, { answer: "none" });
    expect(await item(ctx, charges.id)).toMatchObject({ status: "accepted", final: expect.objectContaining({ answer: "none" }) });
    expect((await caseRow(ctx, caseId)).chargesAnswer).toMatchObject({ answer: "none", by: "user_ruby", itemId: charges.id });
    expect(await defects(ctx)).toHaveLength(0);
  });

  it("a charges answer the model said wasn't there is a 'missed' defect; a different answer is 'edited'", async () => {
    const a = await read({ model: { charges: { answer: "not_answered", details: null, quote: null } } });
    await R.openSource(a.ctx, a.reply.id);
    await R.answerCharges(a.ctx, a.charges.id, { answer: "has_charges", details: "Mortgage to Example Bank, HK$2,000,000" });
    expect((await defects(a.ctx)).map((d) => d.kind)).toEqual(["missed"]);
    expect((await caseRow(a.ctx, a.caseId)).chargesAnswer).toMatchObject({ answer: "has_charges", details: "Mortgage to Example Bank, HK$2,000,000" });
    await resetDb();
    const b = await read();
    await R.openSource(b.ctx, b.reply.id);
    await R.answerCharges(b.ctx, b.charges.id, { answer: "not_answered" });
    expect((await defects(b.ctx)).map((d) => d.kind)).toEqual(["edited"]);
    expect((await caseRow(b.ctx, b.caseId)).chargesAnswer).toBeNull(); // "not answered in this email" records nothing on the case
  });

  it("a 'no changes' reading still needs a staff review, and a review can't finish with a proposal undecided", async () => {
    const { ctx, reply, charges, change, caseId } = await read();
    await expect(R.finishReview(ctx, reply.id)).rejects.toThrow(/open the email/i);
    await R.openSource(ctx, reply.id);
    await R.answerCharges(ctx, charges.id, { answer: "none" });
    await expect(R.finishReview(ctx, reply.id)).rejects.toThrow(/undecided|decide/i);
    await R.decideItem(ctx, change!.id, { action: "reject" });
    await R.finishReview(ctx, reply.id);
    expect(await R.repliesToReview(ctx, caseId)).toHaveLength(0);
    const ev = (await ctx.db.select().from(arCaseEvent).where(eq(arCaseEvent.caseId, caseId))).find((e) => e.kind === "reply_reviewed")!;
    expect(ev).toMatchObject({ userId: "user_ruby" });
    await resetDb();
    const n = await read({ text: "No charges. Nothing has changed.", model: {} });
    expect(await R.repliesToReview(n.ctx, n.caseId)).toHaveLength(1);
  });

  it("an unreviewed client reply holds filing", async () => {
    const { ctx, reply, charges, change, caseId } = await read();
    await markSignedReceived(ctx, caseId);
    await expect(markFiled(ctx, caseId, { filedOn: "2026-11-06" })).rejects.toThrow(/review/i);
    await R.openSource(ctx, reply.id);
    await R.answerCharges(ctx, charges.id, { answer: "none" });
    await R.decideItem(ctx, change!.id, { action: "reject" });
    await R.finishReview(ctx, reply.id);
    await markFiled(ctx, caseId, { filedOn: "2026-11-06" });
    expect((await caseRow(ctx, caseId)).stage).toBe("filed");
  });

  it("an accepted change holds filing until it is settled, and 'doesn't affect this return' needs a reason", async () => {
    const { ctx, reply, charges, change, caseId } = await read();
    await R.openSource(ctx, reply.id);
    await R.answerCharges(ctx, charges.id, { answer: "none" });
    await R.decideItem(ctx, change!.id, { action: "accept" });
    await R.finishReview(ctx, reply.id);
    await markSignedReceived(ctx, caseId);
    expect(await R.openChanges(ctx, caseId)).toHaveLength(1);
    await expect(markFiled(ctx, caseId, { filedOn: "2026-11-06" })).rejects.toThrow(/change/i);
    await expect(R.settleChange(ctx, change!.id, { reason: " " })).rejects.toThrow(/reason/i);
    await R.settleChange(ctx, change!.id, { reason: "Resigned after the made-up date, so the return still shows him." });
    expect((await item(ctx, change!.id)).resolution).toMatchObject({ kind: "not_affecting", by: "user_ruby" });
    await markFiled(ctx, caseId, { filedOn: "2026-11-06" });
  });

  it("preparing again waits for a records copy newer than the change, then regenerates the return with the charges answer and sends the case back to drafting", async () => {
    const { ctx, reply, charges, change, caseId } = await read();
    const root = await mkdtemp(path.join(tmpdir(), "uhy-reply-"));
    const deps: AnnualDeps = { mail: null, mailboxes: [], filingRoot: root, filingRules: { clientFolder: "{code}-{client}", annualReturn: "{code}-Annual Return-{madeUp}", agm: "{code}-AGM-{year}" }, template };
    await R.openSource(ctx, reply.id);
    await R.answerCharges(ctx, charges.id, { answer: "none" });
    await R.decideItem(ctx, change!.id, { action: "accept" });
    await R.finishReview(ctx, reply.id);
    const early = await R.prepareAgain(ctx, deps, caseId);
    expect(early).toMatchObject({ ok: false, reason: expect.stringMatching(/copy/i) });
    // Staff update the records; the next copy no longer shows the director who resigned.
    ctx.clock.set("2026-11-06T05:00:00Z");
    const saved = csaTables.officers;
    csaTables.officers = saved.filter((o) => o.nameEn !== "LEE Siu Ming");
    try { await importCsa(ctx, csaSource(), { backupTakenAt: new Date("2026-11-06T04:30:00Z") }); } finally { csaTables.officers = saved; }
    const again = await R.prepareAgain(ctx, deps, caseId);
    expect(again.ok).toBe(true);
    const c = await caseRow(ctx, caseId);
    expect(c.stage).toBe("prepared"); // this case joined at "sent" with no payment recorded, so payment is confirmed again
    expect(c.formSource).toBe("generated");
    expect(await R.openChanges(ctx, caseId)).toHaveLength(0);
    expect((await item(ctx, change!.id)).resolution).toMatchObject({ kind: "prepared_again" });
    expect(again.ok && again.charges).toBe("Nil");
  });

  it("an emailed signed scan is noted on the case, and the case still waits for the paper original", async () => {
    const { ctx, reply, charges, items, caseId } = await read({
      text: "Signed annual return attached. No charges.", attachments: [{ filename: "signed-ar.pdf", mime: "application/pdf", content: Buffer.from("%PDF-1.4") }],
      model: { signedPapers: [{ document: "annual_return", filename: "signed-ar.pdf", quote: "Signed annual return attached." }] },
    });
    const scan = items.find((i) => i.kind === "signed_papers")!;
    await R.openSource(ctx, reply.id);
    await R.answerCharges(ctx, charges.id, { answer: "none" });
    await R.decideItem(ctx, scan.id, { action: "accept" });
    await R.finishReview(ctx, reply.id);
    expect((await caseRow(ctx, caseId)).stage).toBe("sent");
    expect((await ctx.db.select().from(arCaseEvent).where(eq(arCaseEvent.caseId, caseId))).some((e) => e.kind === "signed_scan_noted")).toBe(true);
  });

  it("a change that needs its own filing names the form from playbook data", () => {
    const pbs = allPlaybookFiles();
    expect(R.changeFiling("director_ceased", pbs)).toMatchObject({ playbookId: "hk.resignDirector", form: "ND2A" });
    expect(R.changeFiling("registered_office", pbs)).toMatchObject({ form: "NR1" });
    expect(R.changeFiling("other", pbs)).toBeNull();
    const edited = pbs.map((p) => (p.id === "hk.resignDirector" ? { ...p, forms: "ND2A (test)" } : p));
    expect(R.changeFiling("director_ceased", edited)).toMatchObject({ form: "ND2A (test)" });
  });

  it("another firm's proposals can't be opened or decided", async () => {
    const a = await read();
    const b = await setupSentCase({ firmId: "firm_other" });
    await expect(R.openSource(b.ctx, a.reply.id)).rejects.toThrow(/not found/i);
    await expect(R.decideItem(b.ctx, a.change!.id, { action: "reject" })).rejects.toThrow(/not found/i);
  });
});

describe("leaving shadow mode", () => {
  const ok = { proposals: 2, changed: 0, missed: 0 };
  it("a task can leave shadow mode only with 30 items, no missed in the last 30 and under 1 in 10 edited or rejected", () => {
    expect(R.shadowRecord(Array(29).fill(ok))).toMatchObject({ items: 29, canLeave: false });
    expect(R.shadowRecord(Array(30).fill(ok))).toMatchObject({ items: 30, missedInLast30: 0, canLeave: true });
    expect(R.shadowRecord([...Array(29).fill(ok), { ...ok, missed: 1 }])).toMatchObject({ missedInLast30: 1, canLeave: false });
    expect(R.shadowRecord([{ ...ok, missed: 1 }, ...Array(30).fill(ok)])).toMatchObject({ missedInLast30: 0, canLeave: true }); // an old miss has aged out
    expect(R.shadowRecord(Array(30).fill({ proposals: 2, changed: 1, missed: 0 }))).toMatchObject({ changedRate: 0.5, canLeave: false });
    expect(R.shadowRecord([...Array(27).fill({ proposals: 10, changed: 0, missed: 0 }), ...Array(3).fill({ proposals: 10, changed: 10, missed: 0 })])).toMatchObject({ changedRate: 0.1, canLeave: false }); // exactly 1 in 10 is not "fewer than"
  });
});

describe("the reply reader's own record", () => {
  beforeEach(async () => { await resetDb(); });
  it("counts each reviewed reply once, with what staff changed and what the model missed", async () => {
    const { ctx, reply, charges, change } = await read();
    expect(await R.replyShadowRecord(ctx)).toMatchObject({ items: 0, canLeave: false }); // unreviewed replies don't count
    await R.openSource(ctx, reply.id);
    await R.answerCharges(ctx, charges.id, { answer: "none" });
    await R.decideItem(ctx, change!.id, { action: "reject" });
    await R.addMissed(ctx, reply.id, { kind: "change", value: { ...resignation, changeType: "registered_office", subject: null, detail: "Moved office" } });
    await R.finishReview(ctx, reply.id);
    expect(await R.replyShadowRecord(ctx)).toMatchObject({ items: 1, missedInLast30: 1, changedRate: 0.5, canLeave: false });
  });
});
