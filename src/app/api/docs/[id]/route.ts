// Staff document download (single-user build: no auth yet, DECISIONS.md #24).
import { and, eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { document } from "@/db/schema";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = getCtx();
  const d = await ctx.db.query.document.findFirst({ where: and(eq(document.id, id), eq(document.firmId, ctx.firmId)) });
  if (!d?.storageKey) return new Response("Not found", { status: 404 });
  const buf = await ctx.storage.get(d.storageKey);
  const name = d.title.replace(/[^\w.\- ()]/g, "_");
  // Uploaded HTML/SVG and other active formats must not execute in the app's origin.
  const inline = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"].includes(d.mime ?? "");
  return new Response(new Uint8Array(buf), { headers: {
    "Content-Type": inline ? d.mime! : "application/octet-stream",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}${d.mime === "application/pdf" && !name.endsWith(".pdf") ? ".pdf" : ""}"`,
    "X-Content-Type-Options": "nosniff",
    ...(!inline ? { "Content-Security-Policy": "sandbox" } : {}),
  } });
}
