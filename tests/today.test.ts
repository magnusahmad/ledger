import { beforeEach, expect, it } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { splitDeadlines, upcomingDeadlines } from "@/domain/deadlines";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: null });
});

it("an overdue or due-today deadline that hasn't been started needs staff now: it's under Needs you, not Upcoming deadlines", async () => {
  const today = ctx.clock.today();
  const { needsYou, upcoming } = splitDeadlines(await upcomingDeadlines(ctx, { withinDays: 30 }), today);
  expect(needsYou.map((d) => d.label)).toContain("Periodic KYC review"); // seeded 20 Sept, overdue
  expect(needsYou.every((d) => d.dueDate <= today)).toBe(true);
  expect(upcoming.length).toBeGreaterThan(0);
  expect(upcoming.every((d) => d.dueDate > today)).toBe(true);
});
