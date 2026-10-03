import { describe, expect, it, vi } from "vitest";
import { emailRun, optionalEvidenceCheck, permitsEvalEndpoint } from "../eval/email-run";

describe("A model-only evaluation preserves prior evidence and never invokes the checker", () => {
  it("the default preserves the Gemini and Jev protocol and original output directory", () => {
    expect(emailRun([], { model: "google/gemini-3.8-flash", reasoning: "low" })).toMatchObject({ model: "google/gemini-3.8-flash", checkerEnabled: true, outputDir: "eval/results/emails-eval", batch: { id: "1" } });
  });
  it("GLM-only uses the literal requested alias, identical second-batch cases and separate evidence", () => {
    const run = emailRun(["--batch", "2", "--model", "~z-ai/glm-flash-latest", "--no-jev", "--output-dir", "eval/results/emails-eval-2-glm-flash"], { model: "google/gemini-3.8-flash", reasoning: "low" });
    expect(run).toMatchObject({ model: "~z-ai/glm-flash-latest", checkerEnabled: false, reasoning: "low", outputDir: "eval/results/emails-eval-2-glm-flash", batch: { id: "2" } });
    expect(run.batch.cases).toHaveLength(10);
  });
  it("changing model or checker cannot overwrite either saved Gemini experiment", () => {
    for (const args of [["--model", "~z-ai/glm-flash-latest"], ["--no-jev", "--output-dir", "eval/results/emails-eval-2"], ["--no-jev", "--output-dir", "eval/results/../emails-eval"]]) {
      expect(() => emailRun(args, { model: "gemini", reasoning: "low" })).toThrow();
    }
  });
  it("disabled evidence checking makes zero calls instead of returning a fabricated verdict", async () => {
    const checker = vi.fn(async () => ({ answers: { action: "supported" } }));
    expect(await optionalEvidenceCheck(false, checker)).toBeUndefined();
    expect(checker).not.toHaveBeenCalled();
    expect(await optionalEvidenceCheck(true, checker)).toEqual({ answers: { action: "supported" } });
    expect(checker).toHaveBeenCalledTimes(1);
  });
  it("the GLM-only network guard rejects Jev endpoints as well as business integrations", () => {
    expect(permitsEvalEndpoint(new URL("https://openrouter.ai/api/v1/chat/completions"), false)).toBe(true);
    expect(permitsEvalEndpoint(new URL("https://openrouter.ai/api/alpha/decisions"), false)).toBe(false);
    expect(permitsEvalEndpoint(new URL("https://openrouter.ai/api/alpha/decisions"), true)).toBe(true);
    expect(permitsEvalEndpoint(new URL("https://bank.example/payments"), false)).toBe(false);
  });
});
