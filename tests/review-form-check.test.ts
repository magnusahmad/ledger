import { expect, it } from "vitest";
import { formCheckSummary as summary } from "@/documents/forms-check";
it("a failed Registry download is reported as unverified and never as all current", () => {
  expect(summary({ checked: 11, changed: [], errors: ["NAR1: fetch failed"] })).toMatch(/incomplete|could not verify/i);
  expect(summary({ checked: 11, changed: [], errors: ["NAR1: fetch failed"] })).not.toMatch(/all.*match|all current/i);
});
it("a mixed form check reports both changed forms and failed checks", () => {
  const result = summary({ checked: 11, changed: ["ND4"], errors: ["NAR1: fetch failed"] });
  expect(result).toContain("ND4");
  expect(result).toContain("NAR1");
});
it("only a complete unchanged form check reports all forms match", () => {
  expect(summary({ checked: 11, changed: [], errors: [] })).toBe("All 11 forms match the manifest.");
});
