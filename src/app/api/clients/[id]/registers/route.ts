import { getCtx } from "@/server/ctx";
import { getClient } from "@/domain/records";
import { renderRegisters, validRegisterDate } from "@/documents/register-export";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = getCtx();
  const date = new URL(req.url).searchParams.get("asAt") ?? ctx.clock.today();
  if (!validRegisterDate(date)) return new Response("Choose a valid register date", { status: 400 });
  if (!await getClient(ctx, id).catch(() => null)) return new Response("Not found", { status: 404 });
  const result = await renderRegisters(ctx, id, date);
  return new Response(new Uint8Array(result.pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="registers-${date}.pdf"`, "Cache-Control": "private, no-store" } });
}
