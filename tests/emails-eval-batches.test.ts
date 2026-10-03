import { describe, expect, it } from "vitest";
import { emailBatch } from "../eval/email-batches";
import { EMAIL_CASES } from "../eval/email-cases";

describe("A second email experiment preserves the first experiment and predeclares expectations", () => {
  it("the default still selects the original emails and original artifact directory", () => {
    expect(emailBatch()).toMatchObject({ id: "1", outputDir: "eval/results/emails-eval", cases: EMAIL_CASES });
  });
  it("batch two selects ten new emails across all three languages without overwriting first-batch evidence", () => {
    const second = emailBatch("2");
    expect(second.cases).toHaveLength(10);
    expect(second.outputDir).toBe("eval/results/emails-eval-2");
    expect(new Set(second.cases.map(c => c.language))).toEqual(new Set(["en", "tc", "sc"]));
    for (const c of second.cases) {
      expect(EMAIL_CASES.some(old => old.id === c.id || old.text === c.text)).toBe(false);
      expect(c.rationale.length).toBeGreaterThan(30);
    }
  });
  it("an unknown batch is rejected before a database or artifact directory can be selected", () => {
    expect(() => emailBatch("3")).toThrow("Unknown email evaluation batch");
  });
});
