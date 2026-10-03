import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { enqueue, onJob, runJobs } from "@/domain/jobs";
import { kvSet, kvGet } from "@/domain/kv";
import { job } from "@/db/schema";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });
it("an expired live worker cannot commit its local job effect and another worker cannot overlap its locked handler", async () => {
  let entered!: () => void; let release!: () => void; let calls = 0;
  const started = new Promise<void>(r => { entered = r; });
  onJob("fixture.local-recovery", async local => {
    calls++;
    if (calls === 1) { entered(); await new Promise<void>(r => { release = r; }); }
    await kvSet(local, "fixture.effect", (await kvGet<number>(local, "fixture.effect") ?? 0) + 1);
  });
  await enqueue(ctx, "fixture.local-recovery", {}, "fixture.once");
  const a = runJobs(ctx); await started;
  ctx.clock.advanceDays(1);
  try { expect(await runJobs(ctx)).toBe(0); } finally { release(); await a; }
  expect(await kvGet(ctx, "fixture.effect")).toBeNull();
  ctx.clock.advanceDays(1); await runJobs(ctx);
  expect(await kvGet(ctx, "fixture.effect")).toBe(1);
  expect((await ctx.db.query.job.findFirst({ where: eq(job.kind, "fixture.local-recovery") }))?.status).toBe("done");
});
