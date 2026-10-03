// Extraction agent: reads an uploaded document (image or PDF, sent to the model directly)
// or message text, and returns values for the task's checklist items.
import type { Ctx } from "@/lib/ctx";
import type { LlmMessage } from "@/integrations/types";
import { PDFDocument } from "pdf-lib";
import { AgentError } from "./call";
import { callAgent } from "./call";
import { ExtractionZ, type Extraction } from "./schemas";
import { EXTRACT_SYSTEM } from "./prompts";
import { itemLabel, PROTECTED_KEYS } from "@/domain/labels";
import { requirementLibrary } from "@/domain/playbooks";

export async function extractFromDocument(ctx: Ctx, o: {
  taskId: string; forKey: string; wantKeys: string[]; filename: string; mime: string; content: Buffer;
  onFile: Record<string, string | null>;
}): Promise<Extraction> {
  // A tiny full-page raster cannot support reliable field extraction. Keep the
  // upload available for staff; this abstention is not an OCR quality guarantee.
  if (["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(o.mime)) {
    let size: { width: number; height: number } | undefined;
    try {
      const probe = await PDFDocument.create();
      if (o.mime === "image/png") {
        // Read the fixed-size header before a decoder can allocate its raster.
        const bytes = o.content;
        if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR") throw new Error("Invalid PNG header");
        size = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
        assertRasterBudget(size);
        await probe.embedPng(bytes);
      }
      else if (o.mime === "image/jpeg") size = await probe.embedJpg(o.content);
      else if (o.mime === "image/webp") size = webpDimensions(o.content);
      else await PDFDocument.load(o.content);
    } catch (error) {
      if (error instanceof AgentError) throw error;
      throw new AgentError("This file could not be read as its stated format. Upload a readable image or PDF, or ask staff to enter the details.", "extract");
    }
    if (size) assertRasterBudget(size);
    if (size && Math.max(size.width, size.height) < 256) throw new AgentError("This image is too small to read reliably. Upload a clearer, higher-resolution image or ask staff to enter the details.", "extract");
  }
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

function assertRasterBudget({ width, height }: { width: number; height: number }) {
  // Extraction's 16-megapixel operating limit bounds a single RGBA raster to
  // 64 MiB before decoder overhead. Larger originals remain available to staff.
  if (width <= 0 || height <= 0 || width * height > 16_777_216) throw new AgentError("This image is outside the supported reading size. Upload a resized readable image or ask staff to enter the details.", "extract");
}

// WebP RIFF canvas dimensions; validate chunk boundaries before reading them.
// https://developers.google.com/speed/webp/docs/riff_container
function webpDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP" || bytes.length < 20) throw new Error("Invalid WebP");
  const end = bytes.readUInt32LE(4) + 8;
  if (end > bytes.length) throw new Error("Truncated WebP");
  for (let pos = 12; pos + 8 <= end;) {
    const kind = bytes.toString("ascii", pos, pos + 4), length = bytes.readUInt32LE(pos + 4), start = pos + 8;
    if (start + length > end) throw new Error("Truncated WebP chunk");
    if (kind === "VP8X" && length >= 10) return { width: bytes.readUIntLE(start + 4, 3) + 1, height: bytes.readUIntLE(start + 7, 3) + 1 };
    if (kind === "VP8 " && length >= 10 && bytes.subarray(start + 3, start + 6).equals(Buffer.from([0x9d, 0x01, 0x2a]))) return { width: bytes.readUInt16LE(start + 6) & 0x3fff, height: bytes.readUInt16LE(start + 8) & 0x3fff };
    if (kind === "VP8L" && length >= 5 && bytes[start] === 0x2f) {
      const bits = bytes.readUInt32LE(start + 1);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    pos = start + length + (length % 2);
  }
  throw new Error("WebP has no image dimensions");
}
