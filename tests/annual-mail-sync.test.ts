// Mail sync for the UHY pilot: Graph messages go through the relevance gate; only kept mail is stored
// and linked to a case. Unrelated mail can never create a prospect, task or proposal.
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { resetDb, makeCtx } from "./helpers";
import { arCase, arCaseEvent, arMail, arMailScan, client, contact, firm, proposal, task } from "@/db/schema";
import { syncMailboxes, linkManually, resolveAsk, type MailboxSource } from "@/annual/mail-sync";
import { syncCases, listCases, startAtStage, recordDraft } from "@/annual/cases";
import type { GraphMessageMeta } from "@/integrations/mail/graph";

type Msg = GraphMessageMeta & { mailbox: string; headers?: Record<string, string>; text?: string };

class FakeSource implements MailboxSource {
  msgs: Msg[] = [];
  headerCalls = 0;
  cursors: string[] = [];
  async delta(mailbox: string, folder: "inbox" | "sentitems", cursor: string | null) {
    this.cursors.push(`${mailbox}/${folder}:${cursor}`);
    const all = this.msgs.filter((m) => m.mailbox === mailbox && m.folder === folder);
    const start = cursor ? Number(cursor) : 0;
    return { messages: all.slice(start), cursor: String(all.length) };
  }
  async headers(mailbox: string, id: string) { this.headerCalls++; return this.msgs.find((m) => m.mailbox === mailbox && m.id === id)?.headers ?? {}; }
  async full(mailbox: string, id: string) {
    const m = this.msgs.find((x) => x.mailbox === mailbox && x.id === id)!;
    return { meta: m, headers: m.headers ?? {}, text: m.text ?? "Hello", inReplyTo: null, references: [], attachments: [{ filename: "signed.pdf", mime: "application/pdf", content: Buffer.from("%PDF") }] };
  }
  async createDraft() { return { draftId: "d", conversationId: "c", webLink: null }; }
}

const meta = (o: Partial<Msg>): Msg => ({ id: "m1", mailbox: "ruby@uhy.example", folder: "inbox", conversationId: "cv-x", internetMessageId: `<${o.id ?? "m1"}@x>`, subject: "Hi", from: "someone@else.example", fromName: null, to: ["ruby@uhy.example"], cc: [], receivedAt: "2026-11-05T03:00:00Z", isMeetingMessage: false, ...o });

const opts = { mailboxes: ["ruby@uhy.example", "coe@uhy.example"], firmDomains: ["uhy.example"], lookbackDays: 60 };

async function seed(ctx: ReturnType<typeof makeCtx>) {
  await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "UHY test", invoicePrefix: "U" });
  await ctx.db.insert(client).values([
    { id: "cl_a", firmId: ctx.firmId, code: "A001", nameEn: "Alpha Limited", incorporatedOn: "2015-11-20" },
    { id: "cl_b", firmId: ctx.firmId, code: "B002", nameEn: "Beta Limited", incorporatedOn: "2015-11-15" },
  ]);
  await ctx.db.insert(contact).values([
    { id: "ct_a", firmId: ctx.firmId, clientId: "cl_a", name: "Ms Chan", email: "finance@alpha.example" },
    { id: "ct_b", firmId: ctx.firmId, clientId: "cl_b", name: "Mr Lee", email: "shared@group.example" },
    { id: "ct_a2", firmId: ctx.firmId, clientId: "cl_a", name: "Group office", email: "shared@group.example" },
  ]);
  await syncCases(ctx, { withinDays: 60 });
}

describe("pilot mail sync", () => {
  beforeEach(async () => { await resetDb(); });

  it("a newsletter or unknown sender is not stored, only counted", async () => {
    const ctx = makeCtx({ now: "2026-11-05T04:00:00Z" }); await seed(ctx);
    const src = new FakeSource();
    src.msgs.push(meta({ id: "n1", from: "news@shop.example", headers: { "list-id": "<shop>" } }), meta({ id: "n2", from: "stranger@else.example" }));
    await syncMailboxes(ctx, src, opts);
    expect(await ctx.db.select().from(arMail)).toHaveLength(0);
    const [scan] = await ctx.db.select().from(arMailScan).where(eq(arMailScan.mailbox, "ruby@uhy.example"));
    expect(scan).toMatchObject({ scanned: 2, linked: 0, skipped: { unrelated: 2 } });
  });

  it("headers are fetched only for mail that could be kept", async () => {
    const ctx = makeCtx({ now: "2026-11-05T04:00:00Z" }); await seed(ctx);
    const src = new FakeSource();
    src.msgs.push(meta({ id: "n1", from: "stranger@else.example" }), meta({ id: "k1", from: "finance@alpha.example" }));
    await syncMailboxes(ctx, src, opts);
    expect(src.headerCalls).toBe(1);
  });

  it("an unknown sender or a newsletter can never create a prospect, task or proposal", async () => {
    const ctx = makeCtx({ now: "2026-11-05T04:00:00Z" }); await seed(ctx);
    const src = new FakeSource();
    src.msgs.push(meta({ id: "p1", from: "new.company@prospect.example", subject: "Please set up a company for us" }), meta({ id: "p2", from: "finance@alpha.example", headers: { "auto-submitted": "auto-replied" } }));
    await syncMailboxes(ctx, src, opts);
    expect(await ctx.db.select().from(proposal)).toHaveLength(0);
    expect(await ctx.db.select().from(task)).toHaveLength(0);
    expect((await ctx.db.select().from(client)).length).toBe(2);
  });

  it("a client contact's email is stored with its attachments and linked to that company's case", async () => {
    const ctx = makeCtx({ now: "2026-11-05T04:00:00Z" }); await seed(ctx);
    const src = new FakeSource();
    src.msgs.push(meta({ id: "k1", from: "finance@alpha.example", text: "Signed copy attached" }));
    await syncMailboxes(ctx, src, opts);
    const [m] = await ctx.db.select().from(arMail);
    const caseA = (await listCases(ctx)).find((c) => c.clientId === "cl_a")!;
    expect(m).toMatchObject({ status: "linked", caseId: caseA.id, via: "contact", text: "Signed copy attached" });
    expect(m.attachments[0].filename).toBe("signed.pdf");
    expect(await ctx.storage.get(m.attachments[0].storageKey)).toEqual(Buffer.from("%PDF"));
  });

  it("the same message seen in two mailboxes is stored once", async () => {
    const ctx = makeCtx({ now: "2026-11-05T04:00:00Z" }); await seed(ctx);
    const src = new FakeSource();
    src.msgs.push(meta({ id: "k1", from: "finance@alpha.example", internetMessageId: "<same@x>" }), meta({ id: "k1-copy", mailbox: "coe@uhy.example", from: "finance@alpha.example", to: ["coe@uhy.example"], internetMessageId: "<same@x>" }));
    await syncMailboxes(ctx, src, opts);
    expect(await ctx.db.select().from(arMail)).toHaveLength(1);
  });

  it("an email from a contact of two companies in cycle waits for staff, then links where they choose", async () => {
    const ctx = makeCtx({ now: "2026-11-05T04:00:00Z" }); await seed(ctx);
    const src = new FakeSource();
    src.msgs.push(meta({ id: "s1", from: "shared@group.example" }));
    await syncMailboxes(ctx, src, opts);
    const [m] = await ctx.db.select().from(arMail);
    expect(m.status).toBe("ask");
    expect(m.caseId).toBeNull();
    const caseB = (await listCases(ctx)).find((c) => c.clientId === "cl_b")!;
    await resolveAsk({ ...ctx, userId: "user_ruby" }, m.id, caseB.id);
    const after = await ctx.db.query.arMail.findFirst({ where: eq(arMail.id, m.id) });
    expect(after).toMatchObject({ status: "linked", caseId: caseB.id, linkedBy: "user_ruby" });
  });

  it("our sent draft seen in Sent Items moves the case to sent", async () => {
    const ctx = makeCtx({ now: "2026-11-05T04:00:00Z" }); await seed(ctx);
    const caseA = (await listCases(ctx)).find((c) => c.clientId === "cl_a")!;
    await startAtStage(ctx, caseA.id, "payment_confirmed");
    await recordDraft(ctx, caseA.id, { mailbox: "ruby@uhy.example", draftId: "d1", conversationId: "cv-dispatch" });
    const src = new FakeSource();
    src.msgs.push(meta({ id: "sent1", folder: "sentitems", conversationId: "cv-dispatch", from: "ruby@uhy.example", to: ["finance@alpha.example"] }));
    await syncMailboxes(ctx, src, opts);
    expect((await ctx.db.query.arCase.findFirst({ where: eq(arCase.id, caseA.id) }))?.stage).toBe("sent");
  });

  it("the checkpoint is saved per mailbox and folder, and the next run resumes from it", async () => {
    const ctx = makeCtx({ now: "2026-11-05T04:00:00Z" }); await seed(ctx);
    const src = new FakeSource();
    src.msgs.push(meta({ id: "k1", from: "finance@alpha.example" }));
    await syncMailboxes(ctx, src, opts);
    src.cursors = [];
    await syncMailboxes(ctx, src, opts);
    expect(src.cursors).toContain("ruby@uhy.example/inbox:1");
    expect(await ctx.db.select().from(arMail)).toHaveLength(1);
  });

  it("linking an email the gate missed records a gate defect on the case", async () => {
    const ctx = makeCtx({ now: "2026-11-05T04:00:00Z" }); await seed(ctx);
    const src = new FakeSource();
    src.msgs.push(meta({ id: "x1", from: "new.accountant@alpha-advisers.example" }));
    await syncMailboxes(ctx, src, opts);
    expect(await ctx.db.select().from(arMail)).toHaveLength(0);
    const caseA = (await listCases(ctx)).find((c) => c.clientId === "cl_a")!;
    await linkManually({ ...ctx, userId: "user_coe" }, src, { mailbox: "ruby@uhy.example", graphId: "x1", caseId: caseA.id });
    const [m] = await ctx.db.select().from(arMail);
    expect(m).toMatchObject({ via: "manual", caseId: caseA.id, linkedBy: "user_coe" });
    const ev = await ctx.db.select().from(arCaseEvent).where(eq(arCaseEvent.caseId, caseA.id));
    expect(ev.find((e) => e.kind === "gate_defect")?.userId).toBe("user_coe");
  });
});
