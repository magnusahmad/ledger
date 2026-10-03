// Download the exact captured invoice, never a current-date re-render.
import { getCtx } from "@/server/ctx";
import { invoiceDateReviewContext } from "@/domain/invoice-delivery-review";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await invoiceDateReviewContext(getCtx(), id);
  if (!context) return new Response("Not found", { status: 404 });
  const filename = context.pdf.filename.replace(/[^\w.\- ()]/g, "_");
  return new Response(new Uint8Array(context.pdf.content), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
}
