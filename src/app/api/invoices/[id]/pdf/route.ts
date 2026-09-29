import { eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { invoice } from "@/db/schema";
import { renderInvoicePdf } from "@/documents/invoice-pdf";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = getCtx();
  const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, id) });
  if (!inv) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(await renderInvoicePdf(ctx, id)), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${inv.number}.pdf"` } });
}
