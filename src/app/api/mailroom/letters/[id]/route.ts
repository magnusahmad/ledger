// The scan of one letter, for the review screen.
import { getCtx } from "@/server/ctx";
import { getLetter } from "@/mailroom/service";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = getCtx();
  const l = await getLetter(ctx, id).catch(() => null);
  if (!l) return new Response("Not found", { status: 404 });
  const buf = await ctx.storage.get(l.storageKey);
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${(l.fileName ?? "letter.pdf").replace(/[^\w.\- ()]/g, "_")}"`, "X-Content-Type-Options": "nosniff" } });
}
