import { beforeAll, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedLoad } from "./load-fixtures";
import { taskRows, todayData, conversations, mailItems, navCounts } from "@/server/queries";
import * as queries from "@/server/queries";
import type { Ctx } from "@/lib/ctx";
import { outsideWork } from "@/domain/off-platform";
import { getPool } from "@/db/client";
import { completeManualStep } from "@/domain/step-hooks";
import { getTask } from "@/domain/engine";
import { filing, appointment, proposal, task } from "@/db/schema";
import { and, eq } from "drizzle-orm";

let ctx: TestCtx; let corpus: Awaited<ReturnType<typeof seedLoad>>;
type PageInput = { q?: string; page?: number; pageSize?: number };
// These existing helpers accept pagination on the proposed repair. A variable
// carrying options proves original ignored-options behavior without importing
// an absent export or misclassifying an API-availability error as a defect.
const pagedConversations = conversations as (ctx: Ctx, where?: PageInput) => ReturnType<typeof conversations>;
const pagedMail = mailItems as (ctx: Ctx, where?: PageInput) => ReturnType<typeof mailItems>;
type TaskPageInput = PageInput & { status?: "open" | "done" | "cancelled" | "all"; clientId?: string; held?: boolean };
const pagedTasks = taskRows as (ctx: Ctx, where?: TaskPageInput) => ReturnType<typeof taskRows>;
type PageResult<Rows> = { rows: Rows; total: number; page: number; pageSize: number };
// The metadata consumers are reached after the original old-anchor assertion.
// They are acceptance requirements for the published page API, not a claim of
// a new baseline missing-export defect.
const pageApi = queries as typeof queries & {
  taskPage: (ctx: Ctx, where?: TaskPageInput) => Promise<PageResult<Awaited<ReturnType<typeof taskRows>>>>;
  conversationPage: (ctx: Ctx, where?: PageInput) => Promise<PageResult<Awaited<ReturnType<typeof conversations>>>>;
  mailItemPage: (ctx: Ctx, where?: PageInput) => Promise<PageResult<Awaited<ReturnType<typeof mailItems>>>>;
};
beforeAll(async () => { await resetDb(); ctx = makeCtx({ now: "2026-10-03T02:00:00Z" }); corpus = await seedLoad(ctx); console.info("LOAD_MANIFEST", JSON.stringify(corpus)); }, 120_000);
it("LOAD01 old actionable manual work remains listed after 2200 newer valid tasks, without needing a proposal to find it", async () => {
  const before = { filings: await ctx.db.select().from(filing), officers: await ctx.db.select().from(appointment) };
  const counts = await navCounts(ctx);
  expect(counts.openTasks).toBeGreaterThan(1800);
  expect((await ctx.db.select().from(proposal)).some(p => p.taskId === corpus.oldManual)).toBe(false);
  const persisted = await ctx.db.select().from(task).where(and(eq(task.firmId, ctx.firmId), eq(task.clientId, "cli_c1")));
  const openClient = await taskRows(ctx, { clientId: "cli_c1", status: "open" }); const allClient = await taskRows(ctx, { clientId: "cli_c1", status: "all" });
  expect.soft(openClient.length, "Clients open count must cover the company's actual open work").toBe(persisted.filter(row => row.status === "open").length);
  expect.soft(allClient.length, "overview open/completed/outstanding facts cannot derive from a capped newest sample").toBe(persisted.length);
  const options = { status: "open" as const, page: 1, pageSize: 25 };
  const first = await pagedTasks(ctx, options); const second = await pagedTasks(ctx, { ...options, page: 2 });
  expect.soft(first.length, "staff pages remain bounded").toBeLessThanOrEqual(25);
  expect.soft(second.some(row => first.some(old => old.id === row.id)), "equal-clock rows do not repeat across adjacent pages").toBe(false);
  expect.soft((await pagedTasks(ctx, options)).map(row => row.id), "unchanged tied-clock pages have stable ordering").toEqual(first.map(row => row.id));
  const searched = await pagedTasks(ctx, { ...options, q: "LOAD oldest original manual gate" });
  expect.soft(searched.map(row => row.id), "exact original manual work remains searchable").toEqual([corpus.oldManual]);
  for (const page of [-1, 0, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1e9]) {
    const where = { ...options, q: "LOAD oldest original manual gate", page, pageSize: 1e9 };
    const pathological = await pagedTasks(ctx, where);
    expect.soft(pathological.length, "invalid/huge page values cannot dump an unbounded staff list").toBeLessThanOrEqual(100);
    expect.soft(pathological.map(row => row.id)).toEqual([corpus.oldManual]);
  }
  expect(await pagedTasks({ ...ctx, firmId: "firm_load_other" }, options), "another firm's page cannot expose these retained tasks").toEqual([]);
  const pool = getPool(ctx.config.DATABASE_URL); let queries = 0;
  const raw = pool.query.bind(pool);
  const measured = vi.spyOn(pool, "query").mockImplementation((...args: Parameters<typeof pool.query>) => { queries++; return raw(...args); });
  const start = performance.now(); let rows: Awaited<ReturnType<typeof taskRows>>;
  try { rows = await taskRows(ctx, { status: "open" }); } finally { measured.mockRestore(); }
  console.info("LOAD_TASK_QUERY", JSON.stringify({ seed: corpus.seed, rows: rows.length, queries, ms: performance.now() - start }));
  expect(rows.map(t => t.id), "staff must find older manual work through the list").toContain(corpus.oldManual);
  const metadata = await pageApi.taskPage(ctx, options);
  expect(metadata.total, "staff pagination total is the real open count").toBe(counts.openTasks); expect(metadata.page).toBe(1); expect(metadata.pageSize).toBe(25); expect(metadata.rows.map(row => row.id)).toEqual(first.map(row => row.id));
  const company = await pageApi.taskPage(ctx, { ...options, clientId: "cli_c1" }); expect(company.total).toBe(persisted.filter(row => row.status === "open").length);
  const held = await pageApi.taskPage(ctx, { ...options, clientId: "cli_c1", held: true, q: "LOAD oldest held original gate" }); expect(held.total).toBe(1); expect(held.rows.map(row => row.id)).toEqual([corpus.held]);
  const unknownCompany = await pageApi.taskPage(ctx, { ...options, clientId: "client_load_foreign" }); expect(unknownCompany.total).toBe(0); expect(unknownCompany.rows).toEqual([]);
  const foreign = await pageApi.taskPage({ ...ctx, firmId: "firm_load_other" }, options); expect(foreign.total).toBe(0); expect(foreign.rows).toEqual([]);
  for (const q of ["Fictional%review", "Fictional_original_review", "review' OR '1'='1"]) {
    const literal = await pageApi.taskPage(ctx, { ...options, q });
    expect(literal.total, "literal percent/underscore/quoted search cannot broaden absent title text into all work").toBe(0); expect(literal.rows).toEqual([]);
  }
  await completeManualStep(ctx, "load-manual-0", "Actual staff completion of original evidence");
  expect((await getTask(ctx, "load-manual-0")).status).toBe("done");
  expect({ filings: await ctx.db.select().from(filing), officers: await ctx.db.select().from(appointment) }).toEqual(before);
  expect(ctx.mail.sent()).toEqual([]);
}, 120_000);
it("LOAD02 Today retains an older overdue manual gate while the held original remains reachable through outside work", async () => {
  const data = await todayData(ctx);
  expect(data.working.map(t => t.id), "overdue original staff work cannot vanish behind newer collecting tasks").toContain(corpus.oldManual);
  expect((await outsideWork(ctx)).map(row => row.taskId)).toContain(corpus.held);
  expect(ctx.mail.sent()).toEqual([]);
}, 120_000);
it("LOAD04 retained mailbox and original-letter history beyond list limits remains accessible through staff lists", async () => {
  const firstThreads = await pagedConversations(ctx, { page: 1, pageSize: 25 }); const secondThreads = await pagedConversations(ctx, { page: 2, pageSize: 25 });
  const firstMail = await pagedMail(ctx, { page: 1, pageSize: 25 }); const secondMail = await pagedMail(ctx, { page: 2, pageSize: 25 });
  expect.soft(firstThreads.length).toBeLessThanOrEqual(25); expect.soft(firstMail.length).toBeLessThanOrEqual(25);
  expect.soft(secondThreads.some(row => firstThreads.some(old => old.id === row.id)), "conversation pages cannot repeat retained history").toBe(false);
  expect.soft(secondMail.some(row => firstMail.some(old => old.m.id === row.m.id)), "letter pages cannot repeat retained originals").toBe(false);
  expect.soft((await pagedConversations(ctx, { q: "history 0", page: 1, pageSize: 25 })).map(row => row.id)).toEqual(["load-conversation-0"]);
  expect.soft((await pagedMail(ctx, { q: "original letter 0", page: 1, pageSize: 25 })).map(row => row.m.id)).toEqual(["load-mail-0"]);
  expect(await pagedConversations({ ...ctx, firmId: "firm_load_other" }, { page: 1, pageSize: 25 })).toEqual([]);
  expect(await pagedMail({ ...ctx, firmId: "firm_load_other" }, { page: 1, pageSize: 25 })).toEqual([]);
  const threads = await conversations(ctx); const mail = await mailItems(ctx);
  expect.soft(threads.map(row => row.id), "old conversation is not deleted and must be reachable").toContain("load-conversation-0");
  expect.soft(mail.map(row => row.m.id), "old original letter must be reachable").toContain("load-mail-0");
  const threadMeta = await pageApi.conversationPage(ctx, { q: "history", page: 2, pageSize: 25 }); expect(threadMeta.total).toBe(230); expect(threadMeta.page).toBe(2); expect(threadMeta.rows).toHaveLength(25);
  const mailMeta = await pageApi.mailItemPage(ctx, { q: "original letter", page: 2, pageSize: 25 }); expect(mailMeta.total).toBe(230); expect(mailMeta.page).toBe(2); expect(mailMeta.rows).toHaveLength(25);
  expect((await pageApi.conversationPage(ctx, { q: "Fictional%review" })).total).toBe(0);
  expect((await pageApi.mailItemPage(ctx, { q: "original_letter" })).total).toBe(0);
  expect(ctx.mail.sent()).toEqual([]);
}, 120_000);
