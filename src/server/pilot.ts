// Request context for firm-installation pages and actions: the signed-in staff member becomes
// ctx.userId, so every recorded step names a real person. Without sign-in (development) the
// single demo user is used, as elsewhere in the app.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCtx } from "./ctx";
import { sessionUser, type SessionUser } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/auth-cookie";
import type { Ctx } from "@/lib/ctx";

export async function pilotCtx(): Promise<{ ctx: Ctx; user: SessionUser | null }> {
  const base = getCtx();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await sessionUser(base, token);
  if (base.config.authRequired && !user) redirect("/login");
  return { ctx: user ? { ...base, userId: user.id } : base, user };
}
