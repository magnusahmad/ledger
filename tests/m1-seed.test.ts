import { describe, it, expect, beforeAll } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { officersAsAt } from "@/domain/records";
import { membersAsAt } from "@/domain/shares";
import { findClientsBySenderEmail } from "@/domain/lookup";
import { hasCurrentCdd } from "@/domain/engine";

let ctx: TestCtx;
beforeAll(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "investor-test@example.com" });
});

describe("Demo seed", () => {
  it("the configured demo test address is recognised as the instructing director of the showcase client", async () => {
    const matches = await findClientsBySenderEmail(ctx, "Investor-Test@Example.com");
    expect(matches.map((m) => m.client.nameEn)).toEqual(["Kowloon Bay Trading Limited"]);
    expect(matches[0].personId).toBe("per_p1");
  });

  it("the showcase client's registers reconcile: one director, two members holding 70% and 30%", async () => {
    expect((await officersAsAt(ctx, "cli_c1", "2026-09-29", "director")).map((o) => o.person.nameEn)).toEqual(["CHAN Tai Man"]);
    expect((await membersAsAt(ctx, "cli_c1", "2026-09-29")).map((m) => [m.name, m.percent])).toEqual([["CHAN Tai Man", 70], ["LEE Siu Ling", 30]]);
  });

  it("the showcase director has current CDD on file, so his KYC documents won't be asked for again", async () => {
    expect(await hasCurrentCdd(ctx, "per_p1")).not.toBeNull();
  });

  it("Silverstrand's members register replays the 2023 transfer and 2024 preference allotment", async () => {
    const m = await membersAsAt(ctx, "cli_c2", "2026-09-29");
    expect(m.map((x) => [x.name, x.className, x.quantity])).toEqual([
      ["HO Wing Yan", "Ordinary", 800000],
      ["Brightwater Ventures Limited (BVI)", "Ordinary", 200000],
      ["Brightwater Ventures Limited (BVI)", "Preference", 200000],
    ]);
  });
});
