// The generated annual return for a case, for staff to check against CSA's form. Signed-in staff
// of this firm only; served inline as a PDF.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { sessionUser } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/auth-cookie";
import { arCase } from "@/db/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = getCtx();
  const user = await sessionUser(ctx, (await cookies()).get(SESSION_COOKIE)?.value);
  if (ctx.config.authRequired && !user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await params;
  const c = await ctx.db.query.arCase.findFirst({ where: and(eq(arCase.id, id), eq(arCase.firmId, ctx.firmId)) });
  if (!c?.formDocumentId) return NextResponse.json({ error: "No generated form for this case" }, { status: 404 });
  const pdf = await ctx.storage.get(c.formDocumentId);
  const name = path.basename(c.formDocumentId).replace(/[^\w .()-]/g, "_");
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${name}"`, "cache-control": "private, no-store" } });
}
