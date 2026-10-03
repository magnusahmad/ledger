import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { invoice } from "@/db/schema";
import { enqueue, runJobs } from "@/domain/jobs";
import "@/domain/accounting-sync";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });
it("an accounting provider failure remains visible on the invoice while retrying and clears after a successful retry", async () => {
  const [inv] = await ctx.db.insert(invoice).values({ id: "failed-sync-invoice", firmId: ctx.firmId, clientId: "cli_c1", number: "FAILED-SYNC-1", status: "sent", totalCents: 10000 }).returning();
  const find = ctx.accounting.findInvoiceByNumber.bind(ctx.accounting);
  ctx.accounting.findInvoiceByNumber = async () => { throw new Error("Fixture accounting outage"); };
  await enqueue(ctx, "xero.sync_invoice", { invoiceId: inv.id }); await runJobs(ctx);
  expect((await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))?.xeroStatus).toBe("error");
  expect((await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))?.xeroError).toContain("Fixture accounting outage");
  expect((await ctx.db.query.job.findFirst())?.status).toBe("queued");
  ctx.accounting.findInvoiceByNumber = find; ctx.clock.advanceSeconds(30); await runJobs(ctx);
  expect((await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))?.xeroStatus).toBe("synced");
  expect((await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))?.xeroError).toBeNull();
});

it("a queued job cannot sync or publish an error against another firm's invoice", async () => {
  const [foreign] = await ctx.db.insert(invoice).values({ id: "foreign-job-invoice", firmId: "other-firm", clientId: "cli_c1", number: "FOREIGN-JOB-1", status: "sent", totalCents: 10000 }).returning();
  await enqueue(ctx, "xero.sync_invoice", { invoiceId: foreign.id }); await runJobs(ctx);
  const stored = await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, foreign.id) });
  expect(stored?.xeroInvoiceId).toBeNull(); expect(stored?.xeroStatus).toBe("not_synced");
  expect(stored?.xeroError).toBeNull(); expect(ctx.accounting.invoices.size).toBe(0);
});
