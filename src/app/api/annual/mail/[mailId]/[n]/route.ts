// One attachment of an email kept by the pilot's mail gate, for staff checking a client's reply.
// Signed-in staff of this firm only. PDFs and images open in the browser; anything else downloads.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { sessionUser } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/auth-cookie";
import { arMail } from "@/db/schema";

const INLINE = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export async function GET(_req: Request, { params }: { params: Promise<{ mailId: string; n: string }> }) {
  const ctx = getCtx();
  const user = await sessionUser(ctx, (await cookies()).get(SESSION_COOKIE)?.value);
  if (ctx.config.authRequired && !user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { mailId, n } = await params;
  const m = await ctx.db.query.arMail.findFirst({ where: and(eq(arMail.id, mailId), eq(arMail.firmId, ctx.firmId)) });
  const a = m?.attachments[Number(n)];
  if (!m || !a || !/^\d+$/.test(n)) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  const content = await ctx.storage.get(a.storageKey);
  const inline = INLINE.has(a.mime);
  const name = a.filename.replace(/[^\w .()-]/g, "_");
  return new NextResponse(new Uint8Array(content), { headers: {
    "content-type": inline ? a.mime : "application/octet-stream", "content-disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
    "cache-control": "private, no-store", "x-content-type-options": "nosniff",
  } });
}
