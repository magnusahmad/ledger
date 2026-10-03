import type { LlmRequest } from "../src/integrations/types";
// This profile is only for the ten attachment-free fixtures, not a production schema.
export function sonnetEvalRequest(request: LlmRequest, enabled: boolean): LlmRequest {
  if (!enabled || request.agent !== "intake") return request;
  const schema = structuredClone(request.schema);
  let node: unknown = schema;
  for (const key of ["properties", "actions", "items", "properties", "attachments", "items", "properties"]) {
    if (!node || typeof node !== "object" || !(key in node)) throw new Error("Unexpected intake schema for Sonnet evaluation");
    node = (node as Record<string, unknown>)[key];
  }
  if (!node || typeof node !== "object" || !("personId" in node)) throw new Error("Missing attachment person schema");
  (node as Record<string, unknown>).personId = { type: "null" };
  return { ...request, schema };
}
