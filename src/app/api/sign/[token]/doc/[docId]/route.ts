// A signer can view only the documents in their own envelope.
import { getCtx } from "@/server/ctx";
import { downloadSigningDocument } from "@/domain/signing";
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; docId: string }> }) {
  const { token, docId } = await params;
  const ctx = getCtx();
  try {
    const bytes = await downloadSigningDocument(ctx, token, docId);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline" } });
  } catch { return new Response("Not found", { status: 404 }); }
}
