import { beforeEach, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { ingestMessage } from "@/domain/inbound";
import { message } from "@/db/schema";
import { liveVersion } from "@/server/queries";

vi.mock("server-only", () => ({}));

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx);
});

it("finishing an inbound email refreshes Reading even when it creates no reply or task event", async () => {
  const mail = ctx.mail.deliver({ from: { email: "director@kbtrading.example" }, subject: "Thanks", text: "Thanks, noted." });
  const row = await ingestMessage(ctx, { ...mail, channel: "email" });
  const before = await liveVersion(ctx);
  await ctx.db.update(message).set({ processedAt: ctx.clock.now() }).where(eq(message.id, row.id));
  expect(await liveVersion(ctx)).not.toBe(before);
});

it("each finished email refreshes Reading even if another email already has the same completion timestamp", async () => {
  const rows = [];
  for (let n = 0; n < 2; n++) {
    const mail = ctx.mail.deliver({ from: { email: "director@kbtrading.example" }, subject: `Thanks ${n}`, text: "Thanks, noted." });
    rows.push(await ingestMessage(ctx, { ...mail, channel: "email" }));
  }
  await ctx.db.update(message).set({ processedAt: ctx.clock.now() }).where(eq(message.id, rows[0].id));
  const before = await liveVersion(ctx);
  await ctx.db.update(message).set({ processedAt: ctx.clock.now() }).where(eq(message.id, rows[1].id));
  expect(await liveVersion(ctx)).not.toBe(before);
});
