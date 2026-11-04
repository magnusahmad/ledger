// Staff sign-in for firm installations: each approval must name the person who made it,
// so every staff member has their own account (UHY pilot, DECISIONS.md #53).
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { resetDb, makeCtx } from "./helpers";
import { appSession, appUser, firm } from "@/db/schema";
import { createStaffUser, signIn, sessionUser, signOut, hashPassword, verifyPassword, LOCKOUT_AFTER } from "@/lib/auth";

async function seedFirm(ctx: ReturnType<typeof makeCtx>) {
  await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Test Firm", invoicePrefix: "T" });
}

describe("staff sign-in", () => {
  beforeEach(async () => { await resetDb(); });

  it("passwords are stored only as salted hashes that verify", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    expect(await hashPassword("correct horse battery")).not.toBe(h);
  });

  it("a password shorter than 12 characters is refused", async () => {
    const ctx = makeCtx(); await seedFirm(ctx);
    await expect(createStaffUser(ctx, { email: "ruby@uhy.example", name: "Ruby", initials: "RL", password: "short", role: "staff" })).rejects.toThrow(/12/);
  });

  it("a correct password signs in and the session names the user", async () => {
    const ctx = makeCtx(); await seedFirm(ctx);
    const u = await createStaffUser(ctx, { email: "Ruby@UHY.example", name: "Ruby", initials: "RL", password: "a long enough password", role: "staff" });
    const r = await signIn(ctx, "ruby@uhy.example", "a long enough password");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const who = await sessionUser(ctx, r.token);
    expect(who?.id).toBe(u.id);
    expect(who?.role).toBe("staff");
  });

  it("a session token is stored only as a hash", async () => {
    const ctx = makeCtx(); await seedFirm(ctx);
    await createStaffUser(ctx, { email: "coe@uhy.example", name: "Coe", initials: "CO", password: "a long enough password", role: "staff" });
    const r = await signIn(ctx, "coe@uhy.example", "a long enough password");
    if (!r.ok) throw new Error("sign-in failed");
    const rows = await ctx.db.select().from(appSession);
    expect(rows).toHaveLength(1);
    expect(rows[0].idHash).not.toBe(r.token);
    expect(JSON.stringify(rows)).not.toContain(r.token);
  });

  it("a wrong password is rejected without saying whether the account exists", async () => {
    const ctx = makeCtx(); await seedFirm(ctx);
    await createStaffUser(ctx, { email: "coe@uhy.example", name: "Coe", initials: "CO", password: "a long enough password", role: "staff" });
    const wrong = await signIn(ctx, "coe@uhy.example", "nope nope nope");
    const missing = await signIn(ctx, "nobody@uhy.example", "nope nope nope");
    expect(wrong).toEqual({ ok: false, error: "Wrong email or password" });
    expect(missing).toEqual({ ok: false, error: "Wrong email or password" });
  });

  it(`${LOCKOUT_AFTER} wrong passwords lock the account for 15 minutes, even against the right password`, async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seedFirm(ctx);
    await createStaffUser(ctx, { email: "coe@uhy.example", name: "Coe", initials: "CO", password: "a long enough password", role: "staff" });
    for (let i = 0; i < LOCKOUT_AFTER; i++) await signIn(ctx, "coe@uhy.example", "wrong password!!");
    expect(await signIn(ctx, "coe@uhy.example", "a long enough password")).toEqual({ ok: false, error: "Too many attempts. Try again in 15 minutes." });
    ctx.clock.set("2026-11-05T02:16:00Z");
    expect((await signIn(ctx, "coe@uhy.example", "a long enough password")).ok).toBe(true);
  });

  it("an expired, signed-out or disabled user's session no longer works", async () => {
    const ctx = makeCtx({ now: "2026-11-05T02:00:00Z" }); await seedFirm(ctx);
    const u = await createStaffUser(ctx, { email: "allan@uhy.example", name: "Allan", initials: "AL", password: "a long enough password", role: "approver" });
    const a = await signIn(ctx, "allan@uhy.example", "a long enough password"); if (!a.ok) throw new Error();
    ctx.clock.set("2026-11-05T15:00:00Z"); // 13 h later: past the 12-hour session
    expect(await sessionUser(ctx, a.token)).toBeNull();
    const b = await signIn(ctx, "allan@uhy.example", "a long enough password"); if (!b.ok) throw new Error();
    await signOut(ctx, b.token);
    expect(await sessionUser(ctx, b.token)).toBeNull();
    const c = await signIn(ctx, "allan@uhy.example", "a long enough password"); if (!c.ok) throw new Error();
    await ctx.db.update(appUser).set({ disabled: true }).where(eq(appUser.id, u.id));
    expect(await sessionUser(ctx, c.token)).toBeNull();
  });

  it("users of another firm cannot sign in to this installation", async () => {
    const ctx = makeCtx(); await seedFirm(ctx);
    await createStaffUser({ ...ctx, firmId: "firm_other" }, { email: "x@other.example", name: "X", initials: "X", password: "a long enough password", role: "staff" });
    expect((await signIn(ctx, "x@other.example", "a long enough password")).ok).toBe(false);
  });
});
