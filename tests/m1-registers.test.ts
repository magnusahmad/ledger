import { describe, it, expect, beforeEach } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { ensureFirm } from "@/domain/firm";
import { createClient, createPerson, appoint, ceaseAppointment, officersAsAt, getPersonProtected, publicPerson } from "@/domain/records";
import { createShareClass, allot, transfer, membersAsAt, issuedAsAt, RegisterError } from "@/domain/shares";
import { setSecret, getSecret, listSecretNames } from "@/domain/secrets";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await ensureFirm(ctx);
});

async function company() {
  return createClient(ctx, { nameEn: "Test Co Limited", incorporatedOn: "2020-01-02" });
}

describe("Register of directors (effective-dated)", () => {
  it("a register queried as at 2025-03-01 excludes a director who resigned on 2025-02-28", async () => {
    const c = await company();
    const p = await createPerson(ctx, { nameEn: "CHAN Tai Man" });
    const a = await appoint(ctx, { clientId: c.id, personId: p.id, role: "director", fromDate: "2020-01-02" });
    await ceaseAppointment(ctx, a.id, "2025-02-28");
    expect((await officersAsAt(ctx, c.id, "2025-03-01", "director")).map((o) => o.personId)).toEqual([]);
    expect((await officersAsAt(ctx, c.id, "2025-02-27", "director")).map((o) => o.personId)).toEqual([p.id]);
  });

  it("a director appointed with effect from a future date is not on today's register but is on the register as at that date", async () => {
    const c = await company();
    const p = await createPerson(ctx, { nameEn: "WONG Ka Man" });
    await appoint(ctx, { clientId: c.id, personId: p.id, role: "director", fromDate: "2026-10-01" });
    expect(await officersAsAt(ctx, c.id, "2026-09-29", "director")).toHaveLength(0);
    expect(await officersAsAt(ctx, c.id, "2026-10-01", "director")).toHaveLength(1);
  });

  it("an appointment cannot cease before it started", async () => {
    const c = await company();
    const p = await createPerson(ctx, { nameEn: "LEE Siu Ling" });
    const a = await appoint(ctx, { clientId: c.id, personId: p.id, role: "director", fromDate: "2024-05-01" });
    await expect(ceaseAppointment(ctx, a.id, "2024-04-30")).rejects.toThrow(/before/);
  });
});

describe("Members register and share capital (derived from dated movements)", () => {
  it("a transfer moves shares between members and the members register as at the transfer date reflects it", async () => {
    const c = await company();
    const a = await createPerson(ctx, { nameEn: "CHAN Tai Man" });
    const b = await createPerson(ctx, { nameEn: "LEE Siu Ling" });
    const cls = await createShareClass(ctx, { clientId: c.id, name: "Ordinary" });
    await allot(ctx, { clientId: c.id, shareClassId: cls.id, date: "2020-01-02", toPersonId: a.id, quantity: 10000, amountPaidCents: 1000000 });
    await transfer(ctx, { clientId: c.id, shareClassId: cls.id, date: "2025-06-30", fromPersonId: a.id, toPersonId: b.id, quantity: 3000, considerationCents: 300000 });

    const before = await membersAsAt(ctx, c.id, "2025-06-29");
    expect(before).toEqual([expect.objectContaining({ personId: a.id, quantity: 10000 })]);
    const after = await membersAsAt(ctx, c.id, "2025-06-30");
    expect(after.map((m) => [m.personId, m.quantity, m.percent])).toEqual([[a.id, 7000, 70], [b.id, 3000, 30]]);
    expect(await issuedAsAt(ctx, c.id, "2025-06-30")).toEqual([expect.objectContaining({ shareClassId: cls.id, issued: 10000, paidUpCents: 1000000 })]);
  });

  it("holdings never go negative: a transfer of more shares than the transferor holds on that date is rejected", async () => {
    const c = await company();
    const a = await createPerson(ctx, { nameEn: "A" });
    const b = await createPerson(ctx, { nameEn: "B" });
    const cls = await createShareClass(ctx, { clientId: c.id, name: "Ordinary" });
    await allot(ctx, { clientId: c.id, shareClassId: cls.id, date: "2020-01-02", toPersonId: a.id, quantity: 100 });
    await expect(transfer(ctx, { clientId: c.id, shareClassId: cls.id, date: "2021-01-01", fromPersonId: a.id, toPersonId: b.id, quantity: 101 }))
      .rejects.toBeInstanceOf(RegisterError);
  });

  it("a back-dated transfer that would make a later transfer overdraw is rejected", async () => {
    const c = await company();
    const a = await createPerson(ctx, { nameEn: "A" });
    const b = await createPerson(ctx, { nameEn: "B" });
    const cls = await createShareClass(ctx, { clientId: c.id, name: "Ordinary" });
    await allot(ctx, { clientId: c.id, shareClassId: cls.id, date: "2020-01-02", toPersonId: a.id, quantity: 100 });
    await transfer(ctx, { clientId: c.id, shareClassId: cls.id, date: "2023-01-01", fromPersonId: a.id, toPersonId: b.id, quantity: 80 });
    await expect(transfer(ctx, { clientId: c.id, shareClassId: cls.id, date: "2022-01-01", fromPersonId: a.id, toPersonId: b.id, quantity: 30 }))
      .rejects.toBeInstanceOf(RegisterError);
  });
});

describe("Protected information and credentials", () => {
  it("ID numbers and residential addresses are stored encrypted and the public view masks them", async () => {
    const p = await createPerson(ctx, { nameEn: "WONG Ka Man", idNumber: "K9876543", residentialAddress: "Flat 12B, 88 Robinson Road" });
    const row = await ctx.db.query.person.findFirst({ where: (t, { eq }) => eq(t.id, p.id) });
    expect(row!.idNumberEnc).not.toContain("K9876543");
    expect(row!.residentialAddressEnc).not.toContain("Robinson");
    const pub = publicPerson(row!, ctx.crypto);
    expect(JSON.stringify(pub)).not.toContain("K9876543");
    expect(pub.idNumberMasked).toMatch(/6543$/);
    expect((await getPersonProtected(ctx, p.id)).idNumber).toBe("K9876543");
  });

  it("secrets are stored encrypted, every read is audit-logged, and listing returns names only", async () => {
    await setSecret(ctx, "cr_eaccount_password:client_1", "hunter2-password");
    const raw = await ctx.db.query.secret.findFirst();
    expect(raw!.ciphertext).not.toContain("hunter2");
    expect(await getSecret(ctx, "cr_eaccount_password:client_1", "test")).toBe("hunter2-password");
    const names = await listSecretNames(ctx);
    expect(names).toEqual([expect.objectContaining({ name: "cr_eaccount_password:client_1" })]);
    expect(JSON.stringify(names)).not.toContain("hunter2");
    const log = await ctx.db.query.auditLog.findMany({ where: (t, { eq }) => eq(t.action, "secret.read") });
    expect(log).toHaveLength(1);
  });
});
