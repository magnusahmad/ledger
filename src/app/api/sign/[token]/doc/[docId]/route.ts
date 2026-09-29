// A signer can view only the documents in their own envelope.
import { eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { document, signEnvelope, signer } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; docId: string }> }) {
  const { token, docId } = await params;
  const ctx = getCtx();
  const s = await ctx.db.query.signer.findFirst({ where: eq(signer.tokenHash, Crypto.sha256(token)) });
  const env = s ? await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, s.envelopeId) }) : null;
  if (!env || !env.documentIds.includes(docId)) return new Response("Not found", { status: 404 });
  const d = (await ctx.db.query.document.findFirst({ where: eq(document.id, docId) }))!;
  return new Response(new Uint8Array(await ctx.storage.get(d.storageKey!)), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline" } });
}
