import { describe, expect, it } from "vitest";
import { actionStats, agreement, flagged, isolatedDatabase, JevEvidence, latencyStats, safeEvalCtx } from "../eval/email-evidence";
import { ScriptedLlm } from "@/integrations/llm/scripted";

describe("Email evaluation protects the meaning of the measured business results", () => {
  it("unsupported actions are flagged while strongly supported actions are retained", () => {
    expect(flagged({ type: "choice", choice: "unsupported", confidence: .99, probabilities: { unsupported: .99 } })).toBe(true);
    expect(flagged({ type: "choice", choice: "supported", confidence: .85, probabilities: { supported: .9 } })).toBe(false);
    expect(flagged({ type: "choice", choice: "supported", confidence: .99 })).toBe(true);
  });
  it("a mixed request counts every missed action and separates false flags from caught mistakes", () => {
    expect(actionStats([{ correct: false, flagged: true }, { correct: true, flagged: true }, { correct: true, flagged: false }], ["appoint", "resign"], ["appoint"])).toEqual({ incorrect: 1, incorrectCaught: 1, correct: 2, correctFlagged: 1, expected: 2, missed: 1 });
    expect(actionStats([], ["appoint", "appoint"], ["appoint"]).missed).toBe(1);
  });
  it("repeat agreement compares normalized decision sets using all pairs", () => {
    expect(agreement([["a", "b"], ["b", "a"], ["a"]])).toBeCloseTo(1 / 3);
    expect(agreement([["a"]])).toBeNaN();
  });
  it("added latency reports measured median and p95 without inventing unmeasured cases", () => {
    expect(latencyStats([100, 400, 200, 300])).toEqual({ n: 4, totalMs: 1000, medianMs: 250, p95Ms: 400 });
    expect(latencyStats([])).toEqual({ n: 0, totalMs: 0, medianMs: null, p95Ms: null });
  });
  it("evaluation refuses the working and test databases and uses only fake business integrations", () => {
    expect(isolatedDatabase("postgres://localhost/harbourline_emails_eval")).toBe("postgres://localhost/harbourline_emails_eval");
    for (const url of ["postgres://localhost/harbourline", "postgres://localhost/harbourline_test", "postgres://remote/harbourline_emails_eval"]) expect(() => isolatedDatabase(url)).toThrow("isolated");
    const ctx = safeEvalCtx("postgres://localhost/harbourline_emails_eval", new ScriptedLlm());
    expect([ctx.mail.name, ctx.bank.name, ctx.accounting.name, ctx.screening.name]).toEqual(["fake", "fake", "fake", "fake"]);
    expect(ctx.config.or_api_key).toBeUndefined();
  });
  it("even an accidental evaluation send is rejected before any delivery", async () => {
    const ctx = safeEvalCtx("postgres://localhost/harbourline_emails_eval", new ScriptedLlm());
    await expect(ctx.mail.send({ to: ["fictional@example.test"], subject: "Must not send", text: "Test" })).rejects.toThrow("cannot send mail");
    expect(ctx.mail.sent()).toHaveLength(0);
  });
  it("Jev preserves raw confidence separately from selected-label probability", async () => {
    let request: unknown;
    const raw = { model: "typesafe/jev-1.13", answers: { action: { type: "choice", choice: "supported", confidence: .7, probabilities: { supported: .8, unsupported: .1, uncertain: .1 } } }, usage: { cost: .00001 } };
    const transport = (async (_url: unknown, init: RequestInit) => { request = JSON.parse(init.body as string); return new Response(JSON.stringify(raw)); }) as typeof fetch;
    const result = await new JevEvidence("fictional-test-key", transport).check({ email: "Please appoint Wong." }, { action: { type: "choice", instructions: "Is the appointment supported?", criteria: { supported: "Explicit instruction", unsupported: "Contradicts instruction", uncertain: "Insufficient evidence" } } });
    expect(result.answers.action.confidence).toBe(.7);
    expect(result.answers.action.probabilities?.supported).toBe(.8);
    expect(result.raw).toEqual(raw);
    expect(request).toMatchObject({ model: "typesafe/jev-1.13" });
  });
  it("missing or malformed Jev answers fail validation rather than passing an action", async () => {
    for (const raw of [{ answers: {} }, { answers: { action: { type: "choice", choice: "invented", confidence: 2 } } }]) {
      const transport = (async () => new Response(JSON.stringify(raw))) as typeof fetch;
      await expect(new JevEvidence("fictional-test-key", transport).check({}, { action: {} })).rejects.toThrow();
    }
  });
});
