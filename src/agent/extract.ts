// Extraction agent: reads an uploaded document (image or PDF, sent to the model directly)
// or message text, and returns values for the task's checklist items.
import type { Ctx } from "@/lib/ctx";
import type { LlmMessage } from "@/integrations/types";
import { callAgent } from "./call";
import { ExtractionZ, type Extraction } from "./schemas";
import { EXTRACT_SYSTEM } from "./prompts";
import { itemLabel, PROTECTED_KEYS } from "@/domain/labels";
import { requirementLibrary } from "@/domain/playbooks";

export async function extractFromDocument(ctx: Ctx, o: {
  taskId: string; forKey: string; wantKeys: string[]; filename: string; mime: string; content: Buffer;
  onFile: Record<string, string | null>;
}): Promise<Extraction> {
  const lib = requirementLibrary();
  const text = [
    `Document uploaded for checklist item "${o.forKey}" (${itemLabel(o.forKey)}). Filename: ${o.filename}.`,
    `Extract these checklist keys if present: ${JSON.stringify(o.wantKeys.map((k) => ({ key: k, label: itemLabel(k), hint: lib[k]?.extractionHint ?? null })))}`,
    `On-file values to compare (report conflicts, don't overwrite): ${JSON.stringify(Object.fromEntries(Object.entries(o.onFile).map(([k, v]) => [k, v && PROTECTED_KEYS.has(k) ? v : v])))}`,
    `Today's date: ${ctx.clock.today()}.`,
  ].join("\n");
  const dataUrl = `data:${o.mime};base64,${o.content.toString("base64")}`;
  const parts: Extract<LlmMessage, { content: unknown[] }>["content"] = [{ type: "text", text }];
  if (o.mime.startsWith("image/")) parts.push({ type: "image_url", image_url: { url: dataUrl } });
  else if (o.mime === "application/pdf") parts.push({ type: "file", file: { filename: o.filename, file_data: dataUrl } });
  else parts.push({ type: "text", text: `Document text:\n${o.content.toString("utf8").slice(0, 20000)}` });
  return callAgent(ctx, { agent: "extract", system: EXTRACT_SYSTEM, user: parts, schema: ExtractionZ, taskId: o.taskId });
}
