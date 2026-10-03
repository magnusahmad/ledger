import { describe, expect, it } from "vitest";
import { jsonSchemaOf } from "@/agent/call";
import { IntakeZ, DraftZ, ReviewZ, PlanZ } from "@/agent/schemas";
import type { LlmRequest } from "@/integrations/types";
import { sonnetEvalRequest } from "../eval/sonnet-schema";
function unions(x: unknown): number {
  if (Array.isArray(x)) return x.reduce((s, v) => s + unions(v), 0);
  if (!x || typeof x !== "object") return 0;
  const o = x as Record<string, unknown>;
  return (Array.isArray(o.type) || "anyOf" in o ? 1 : 0) + Object.values(o).reduce<number>((s, v) => s + unions(v), 0);
}
const request = (): LlmRequest => ({ agent: "intake", schemaName: "intake", schema: jsonSchemaOf(IntakeZ), messages: [{ role: "user", content: "Please change the office date to 2026-11-20. No attachments." }] });
describe("Sonnet's evaluation-only schema specialization preserves the business output contract", () => {
  it("the intake transport fits 16 unions while the original 17-union schema remains unchanged", () => {
    const original = request(), frozen = structuredClone(original);
    expect(unions(original.schema)).toBe(17);
    expect(unions(sonnetEvalRequest(original, true).schema)).toBe(16);
    expect(original).toEqual(frozen);
  });
  it("only the absent-attachment person field is specialized to null; messages, action fields and required shape stay unchanged", () => {
    const original = request(), expected = structuredClone(original);
    const schema = expected.schema as { properties: { actions: { items: { properties: { attachments: { items: { properties: { personId: unknown } } } } } } } };
    schema.properties.actions.items.properties.attachments.items.properties.personId = { type: "null" };
    expect(sonnetEvalRequest(original, true)).toEqual(expected);
  });
  it("strict calls and all non-intake schemas are passed through unchanged", () => {
    const original = request(); expect(sonnetEvalRequest(original, false)).toBe(original);
    for (const [agent, schema] of [["draft", DraftZ], ["review", ReviewZ], ["plan", PlanZ]] as const) {
      const other = { ...original, agent, schema: jsonSchemaOf(schema) };
      expect(sonnetEvalRequest(other, true)).toBe(other);
    }
  });
});
