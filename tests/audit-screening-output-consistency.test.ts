import { beforeEach, describe, expect, it } from "vitest";
import { seedDemo } from "@/db/seed-demo";
import { screenPerson } from "@/domain/screening";
import { FakeScreening } from "@/integrations/screening/fake";
import { makeCtx, resetDb, type TestCtx } from "./helpers";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx(); await seedDemo(ctx);
  const person = await ctx.db.query.person.findFirst({ where: (p, { eq }) => eq(p.id, "per_p1") });
  ctx.screening = new FakeScreening({ [person!.nameEn.toUpperCase()]: [
    { id: "candidate-one", caption: "Fictional Candidate", score: 0.8, topics: ["sanction"], datasets: ["fictional-test-list"] },
  ] });
});

describe("Schema-valid screening output cannot silently discard provider evidence", () => {
  it("a likely-match verdict with an inconsistent clear summary remains a match for staff review", async () => {
    ctx.llm.on("screen", { hits: [{ id: "candidate-one", verdict: "likely_match", reason: "Identifiers agree" }], overall: "clear" });
    expect((await screenPerson(ctx, "per_p1", null)).status).toBe("match");
  });

  it("a missing candidate adjudication cannot automatically clear a provider hit", async () => {
    ctx.llm.on("screen", { hits: [], overall: "clear" });
    expect((await screenPerson(ctx, "per_p1", null)).status).not.toBe("clear");
  });

  it("a false-positive verdict for an invented candidate cannot clear the real provider candidate", async () => {
    ctx.llm.on("screen", { hits: [{ id: "invented-candidate", verdict: "false_positive", reason: "Different person" }], overall: "clear" });
    expect((await screenPerson(ctx, "per_p1", null)).status).not.toBe("clear");
  });

  it("one complete false-positive assessment of a low-score candidate retains the supported clear path", async () => {
    ctx.llm.on("screen", { hits: [{ id: "candidate-one", verdict: "false_positive", reason: "Birth date differs" }], overall: "clear" });
    expect((await screenPerson(ctx, "per_p1", null)).status).toBe("clear");
  });
});
