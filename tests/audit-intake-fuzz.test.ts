import { beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { startManualRequest } from "@/domain/manual";
import { createRequest, getTask, startTask, tasksForRequest } from "@/domain/engine";
import { addOffPlatformStep } from "@/domain/off-platform";
import { approveProposal } from "@/domain/proposals";
import { attachment, client, document, invoice, request, task, taskAction } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeOffice" })] }));
  ctx.llm.on("draft", goodDraft);
});

const inbound = (attachments: { filename: string; mime: string; content: Buffer }[] = []) => ingestMessage(ctx, {
  channel: "email", provider: "fake", providerMessageId: "audit-delivery", from: { email: "director@kbtrading.example", name: "CHAN Tai Man" },
  to: ["desk@caineroad.example"], cc: [], subject: "Move office", text: "Please change our registered office.", receivedAt: ctx.clock.now(), attachments,
});

describe("Intake adversarial business boundaries", () => {
  it("cancelling an unsent request withdraws its old invoice draft so stale approval cannot send it", async () => {
    const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }], confirm: true });
    const { cancelTask } = await import("@/domain/engine");
    await cancelTask(ctx, r.taskIds[0], "Client cancelled before the invoice was sent");
    await expect(approveProposal(ctx, r.proposalId!)).rejects.toThrow();
    expect(ctx.mail.sent()).toHaveLength(0);
  });

  it("reprocessing the same inbound message cannot create a second request or invoice", async () => {
    const m = await inbound();
    await processInbound(ctx, m.id);
    await processInbound(ctx, m.id);
    const requests = await ctx.db.select().from(request).where(eq(request.sourceMessageId, m.id));
    expect(requests).toHaveLength(1);
  });

  it("a mainland client cannot receive a Hong Kong task from an incorrect intake fixture", async () => {
    await ctx.db.update(client).set({ jurisdiction: "CN" }).where(eq(client.id, "cli_c1"));
    const m = await inbound();
    const result = await processInbound(ctx, m.id);
    const tasks = result.requestId ? await tasksForRequest(ctx, result.requestId) : [];
    expect(tasks.filter(t => t.playbookId.startsWith("hk."))).toHaveLength(0);
  });

  for (const filenames of [["ID.pdf", "ID.pdf"], ["身份.pdf", "地址.pdf"]]) {
    it(`each attachment preserves its original bytes when filenames collide: ${filenames.join(" / ")}`, async () => {
      const bytes = [Buffer.from("%PDF-1.4 FIRST ID DOCUMENT"), Buffer.from("%PDF-1.4 SECOND ADDRESS DOCUMENT")];
      const m = await inbound(filenames.map((filename, i) => ({ filename, mime: "application/pdf", content: bytes[i] })));
      const atts = await ctx.db.select().from(attachment).where(eq(attachment.messageId, m.id));
      const docs = await ctx.db.select().from(document).where(inArray(document.id, atts.map(a => a.documentId!)));
      expect(docs).toHaveLength(2);
      for (const [i, d] of docs.entries()) expect(await ctx.storage.get(d.storageKey!)).toEqual(bytes[i]);
    });
  }

  it("an impossible effective date rejects a manual request without leaving orphaned work", async () => {
    const before = await ctx.db.select().from(request);
    await expect(startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice", fields: { effDate: "2026-02-30" } }], confirm: true })).rejects.toThrow(/date/i);
    expect(await ctx.db.select().from(request)).toHaveLength(before.length);
  });

  it("a fractional blocking step is rejected before an off-platform action is persisted", async () => {
    const req = await createRequest(ctx, { clientId: "cli_c1" });
    const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.changeOffice" });
    await expect(addOffPlatformStep(ctx, t.id, { title: "Must confirm authority", waitingOn: "us", beforeStep: 1.5 })).rejects.toThrow(/step/i);
    expect(await ctx.db.select().from(taskAction)).toHaveLength(0);
    expect((await getTask(ctx, t.id)).status).toBe("open");
  });
});

// Reproducible LCG corpus, seed 0x48415242 ("HARB"): 24 multilingual inputs.
// PostgreSQL snapshots are compared on every rejected input, including a NUL byte.
const CORPUS_SEED = 0x48415242;
function corpus() {
  let state = CORPUS_SEED;
  const values = ["黃嘉敏", "王小明", "Jane Doe", "𠮷田", "Name 👩🏽‍💻", "A\nB", "A\tB", "<script>alert(1)</script>", "O'Reilly", "ＡＢＣ", "e\u0301", "x".repeat(4096)];
  return Array.from({ length: 24 }, (_, i) => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return `${values[state % values.length]} ${i}`; });
}

async function workState() {
  return {
    requests: await ctx.db.select().from(request),
    tasks: await ctx.db.select().from(task),
    invoices: await ctx.db.select().from(invoice),
  };
}

describe("Seeded manual-request corpus (0x48415242)", () => {
  it("24 multilingual, control-whitespace, markup and long fields retain exact data and never send mail", async () => {
    for (const value of corpus()) {
      const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice", fields: { newAddr: value } }], confirm: false });
      const t = await getTask(ctx, r.taskIds[0]);
      expect(t.checklist.find(e => e.key === "newAddr")?.value).toBe(value);
      expect(ctx.mail.sent()).toHaveLength(0);
    }
  });

  it("a NUL byte rejected by Postgres leaves no partial manual request, task or invoice", async () => {
    const before = await workState();
    await expect(startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice", fields: { newAddr: "Room 1\u0000Injection" } }], confirm: false })).rejects.toThrow();
    expect(await workState()).toEqual(before);
  });

  for (const date of ["2026-02-30", "2026-04-31", "2026-13-01", "0000-01-01", "2026-00-10", "2026-01-00", "2026-1-1", "not a date"]) {
    it(`an invalid effective date ${date} cannot count as received information or leave partial work`, async () => {
      const before = await workState();
      await expect(startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice", fields: { effDate: date } }], confirm: false })).rejects.toThrow();
      expect(await workState()).toEqual(before);
    });
  }
});
