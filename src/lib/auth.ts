// Staff sign-in for firm installations. Passwords are scrypt hashes; a session token is random,
// sent as an HttpOnly cookie, and stored only as its SHA-256. Times use the operational clock,
// never the demo offset.
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, lt } from "drizzle-orm";
import type { Ctx } from "./ctx";
import { appSession, appUser } from "@/db/schema";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const LOCKOUT_AFTER = 5;
const LOCKOUT_MS = 15 * 60_000;
export const SESSION_HOURS = 12;
const WRONG = "Wrong email or password";

export type Role = "staff" | "approver" | "admin";
export type SessionUser = { id: string; name: string; initials: string; email: string; role: Role };

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw.normalize("NFKC"), salt, 32, PARAMS);
  return `scrypt$${PARAMS.N}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, n, salt, key] = stored.split("$");
  if (alg !== "scrypt" || !salt || !key) return false;
  const want = Buffer.from(key, "base64");
  const got = await scrypt(pw.normalize("NFKC"), Buffer.from(salt, "base64"), want.length, { ...PARAMS, N: Number(n) });
  return got.length === want.length && timingSafeEqual(got, want);
}

const tokenHash = (t: string) => createHash("sha256").update(t).digest("hex");
const norm = (e: string) => e.trim().toLowerCase();
const now = (ctx: Ctx) => ctx.clock.operationalNow?.() ?? ctx.clock.now();

export async function createStaffUser(ctx: Ctx, u: { email: string; name: string; initials: string; password: string; role: Role }) {
  if (u.password.length < 12) throw new Error("Use a password of at least 12 characters");
  const id = ctx.ids.next("user");
  const row = { id, firmId: ctx.firmId, email: norm(u.email), name: u.name, initials: u.initials, role: u.role, passwordHash: await hashPassword(u.password) };
  await ctx.db.insert(appUser).values(row);
  return row;
}

export async function setPassword(ctx: Ctx, userId: string, password: string) {
  if (password.length < 12) throw new Error("Use a password of at least 12 characters");
  await ctx.db.update(appUser).set({ passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null }).where(and(eq(appUser.id, userId), eq(appUser.firmId, ctx.firmId)));
  await ctx.db.delete(appSession).where(eq(appSession.userId, userId));
}

export async function signIn(ctx: Ctx, email: string, password: string): Promise<{ ok: true; token: string; expiresAt: Date } | { ok: false; error: string }> {
  const u = await ctx.db.query.appUser.findFirst({ where: and(eq(appUser.firmId, ctx.firmId), eq(appUser.email, norm(email))) });
  const t = now(ctx);
  if (!u || !u.passwordHash || u.disabled) { await hashPassword(password); return { ok: false, error: WRONG }; } // same work either way
  if (u.lockedUntil && u.lockedUntil > t) return { ok: false, error: "Too many attempts. Try again in 15 minutes." };
  if (!(await verifyPassword(password, u.passwordHash))) {
    const failed = (u.lockedUntil && u.lockedUntil <= t ? 0 : u.failedLogins) + 1;
    await ctx.db.update(appUser).set(failed >= LOCKOUT_AFTER ? { failedLogins: 0, lockedUntil: new Date(t.getTime() + LOCKOUT_MS) } : { failedLogins: failed, lockedUntil: null }).where(eq(appUser.id, u.id));
    return { ok: false, error: WRONG };
  }
  await ctx.db.update(appUser).set({ failedLogins: 0, lockedUntil: null }).where(eq(appUser.id, u.id));
  await ctx.db.delete(appSession).where(and(eq(appSession.userId, u.id), lt(appSession.expiresAt, t)));
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(t.getTime() + SESSION_HOURS * 3600_000);
  await ctx.db.insert(appSession).values({ idHash: tokenHash(token), firmId: ctx.firmId, userId: u.id, expiresAt });
  return { ok: true, token, expiresAt };
}

export async function sessionUser(ctx: Ctx, token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const s = await ctx.db.query.appSession.findFirst({ where: and(eq(appSession.idHash, tokenHash(token)), eq(appSession.firmId, ctx.firmId)) });
  if (!s || s.expiresAt <= now(ctx)) return null;
  const u = await ctx.db.query.appUser.findFirst({ where: and(eq(appUser.id, s.userId), eq(appUser.firmId, ctx.firmId)) });
  if (!u || u.disabled) return null;
  return { id: u.id, name: u.name, initials: u.initials, email: u.email ?? "", role: u.role };
}

export async function signOut(ctx: Ctx, token: string) {
  await ctx.db.delete(appSession).where(eq(appSession.idHash, tokenHash(token)));
}
