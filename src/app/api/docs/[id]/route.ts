// Staff document download (single-user build: no auth yet, DECISIONS.md #24).
import { eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { document } from "@/db/schema";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = getCtx();
  const d = await ctx.db.query.document.findFirst({ where: eq(document.id, id) });
  if (!d?.storageKey) return new Response("Not found", { status: 404 });
  const buf = await ctx.storage.get(d.storageKey);
  const name = d.title.replace(/[^\w.\- ()]/g, "_");
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": d.mime ?? "application/octet-stream", "Content-Disposition": `inline; filename="${name}${d.mime === "application/pdf" && !name.endsWith(".pdf") ? ".pdf" : ""}"` } });
}
