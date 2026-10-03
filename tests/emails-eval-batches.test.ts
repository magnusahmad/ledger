import { describe, expect, it } from "vitest";
import { emailBatch } from "../eval/email-batches";
import { EMAIL_CASES } from "../eval/email-cases";
import { EMAIL_CASES_2 } from "../eval/email-cases-2";
import { emailRun } from "../eval/email-run";

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
    expect(() => emailBatch("4")).toThrow("Unknown email evaluation batch");
  });
  it("the fresh holdout covers three languages and customer, prospect, junk, legal and impersonation handling without reusing earlier emails", () => {
    const holdout = emailBatch("3");
    expect(holdout.outputDir).toBe("eval/results/emails-eval-3-gemini");
    expect(holdout.cases).toHaveLength(10);
    expect(new Set(holdout.cases.map(c => c.id)).size).toBe(10);
    expect(new Set(holdout.cases.map(c => c.language))).toEqual(new Set(["en", "tc", "sc"]));
    expect(new Set(holdout.cases.map(c => c.disposition))).toEqual(new Set(["existing", "prospect", "non_customer", "verify_sender"]));
    for (const c of holdout.cases) {
      expect([...EMAIL_CASES, ...EMAIL_CASES_2].some(old => old.id === c.id || old.text === c.text)).toBe(false);
      expect(c.rationale.length).toBeGreaterThan(30);
    }
    expect(holdout.cases.filter(c => c.disposition === "non_customer")).toHaveLength(2);
    expect(holdout.cases.find(c => c.id === "C03")).toMatchObject({ setup: "reply", targets: { cancel_request: "officeTask", change_request: "directorTask" } });
  });
  it("the fresh holdout keeps usual Gemini and disables all Jev calls when requested", () => {
    const run = emailRun(["--batch", "3", "--no-jev"], { model: "google/gemini-3.8-flash", reasoning: "low" });
    expect(run).toMatchObject({ model: "google/gemini-3.8-flash", checkerEnabled: false, batch: { id: "3" }, outputDir: "eval/results/emails-eval-3-gemini" });
  });
});
