// Public signing authentication: real PostgreSQL, real OTP methods, fictional pack.
// OTPs/tokens are kept inside fixtures; no test titles or reports contain them.
import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { seedDemo } from "@/db/seed-demo";
import { signer, signEnvelope } from "@/db/schema";
import { createRequest, startTask } from "@/domain/engine";
import { openSigning, requestOtp, verifyOtp } from "@/domain/signing";
import { Crypto } from "@/lib/crypto";
import { makeCtx, resetDb, type TestCtx } from "./helpers";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
});

function barrier() {
  let enter!: () => void, release!: () => void;
  const entered = new Promise<void>(r => { enter = r; });
  const released = new Promise<void>(r => { release = r; });
  return { entered, release, pause: async () => { enter(); await released; } };
}
async function bounded<T>(promise: Promise<T>): Promise<T> {
  let timer!: ReturnType<typeof setTimeout>;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("OTP barrier deadline exceeded")), 10_000); })]); }
  finally { clearTimeout(timer); }
}

// Pause a real completed signer read, without replacing its database answer.
function afterSignerRead(db: Ctx["db"], gate: ReturnType<typeof barrier>): Ctx["db"] {
  let paused = false;
  return new Proxy(db, { get(target, key) {
    if (key === "transaction") return (fn: (tx: Ctx["db"]) => Promise<unknown>) => target.transaction(tx => fn(afterSignerRead(tx as unknown as Ctx["db"], gate)));
    if (key === "query") return { ...target.query, signer: new Proxy(target.query.signer, { get(query, method) {
      if (method === "findFirst") return async (...args: Parameters<typeof query.findFirst>) => {
        const row = await query.findFirst(...args);
        if (row && !paused) { paused = true; await gate.pause(); }
        return row;
      };
      const value = Reflect.get(query, method); return typeof value === "function" ? value.bind(query) : value;
    } }) };
    const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
  } });
}

async function pack() {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const task = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.changeOffice" });
  const [env] = await ctx.db.insert(signEnvelope).values({ id: ctx.ids.next("env"), firmId: ctx.firmId, taskId: task.id, status: "sent", documentIds: [] }).returning();
  const token = ctx.ids.token();
  const [row] = await ctx.db.insert(signer).values({ id: ctx.ids.next("sgn"), firmId: ctx.firmId, envelopeId: env.id, name: "CHAN Tai Man 陳大文", email: "director@kbtrading.example", tokenHash: Crypto.sha256(token) }).returning();
  return { token, row, env };
}
function codeFromMail() {
  const mail = ctx.mail.sent().filter(m => m.subject === "Your signing code").at(-1);
  const code = mail?.text.match(/\b\d{6}\b/)?.[0];
  if (!code) throw new Error("The fake mailbox has no OTP delivery");
  return code;
}
const read = (id: string) => ctx.db.query.signer.findFirst({ where: eq(signer.id, id) });
const wrongFor = (code: string) => code === "000000" ? "111111" : "000000";

it("five concurrent incorrect OTP guesses persist five attempts and lock the link", async () => {
  const { token, row } = await pack();
  await requestOtp(ctx, token);
  const wrong = wrongFor(codeFromMail());
  const gates = Array.from({ length: 5 }, barrier);
  const guesses = gates.map(gate => verifyOtp({ ...ctx, db: afterSignerRead(ctx.db, gate) }, token, wrong).then(() => true, () => false));
  try { await bounded(Promise.all(gates.map(g => g.entered))); }
  finally { gates.forEach(g => g.release()); }
  expect(await bounded(Promise.all(guesses))).toEqual([false, false, false, false, false]);
  const after = (await read(row.id))!;
  expect(after.otpAttempts).toBe(5);
  expect(after.otpVerifiedAt).toBeNull();
  expect((await openSigning(ctx, token)).signer.locked).toBe(true);
  await expect(verifyOtp(ctx, token, codeFromMail())).rejects.toThrow(/locked/i);
  expect(ctx.mail.sent()).toHaveLength(1);
});

it("a correct OTP read before the fifth incorrect guess cannot unlock a link that has since locked", async () => {
  const { token, row } = await pack();
  await requestOtp(ctx, token);
  const code = codeFromMail();
  for (let i = 0; i < 4; i++) await expect(verifyOtp(ctx, token, wrongFor(code))).rejects.toThrow();
  const gate = barrier();
  const correct = verifyOtp({ ...ctx, db: afterSignerRead(ctx.db, gate) }, token, code).then(() => true, () => false);
  try {
    await bounded(Promise.race([gate.entered, correct.then(() => { throw new Error("The correct-guess read barrier was not reached"); })]));
    await expect(verifyOtp(ctx, token, wrongFor(code))).rejects.toThrow(/locked/i);
    expect((await read(row.id))!.otpAttempts).toBe(5);
  } finally { gate.release(); }
  expect(await bounded(correct)).toBe(false);
  expect((await read(row.id))!.otpVerifiedAt).toBeNull();
});

it("concurrent correct submissions consume the same OTP at most once", async () => {
  const { token, row } = await pack();
  await requestOtp(ctx, token);
  const code = codeFromMail();
  const gates = [barrier(), barrier()];
  const submits = gates.map(gate => verifyOtp({ ...ctx, db: afterSignerRead(ctx.db, gate) }, token, code).then(() => true, () => false));
  try { await bounded(Promise.all(gates.map(g => g.entered))); }
  finally { gates.forEach(g => g.release()); }
  expect((await bounded(Promise.all(submits))).filter(Boolean)).toHaveLength(1);
  const saved = (await read(row.id))!;
  expect(saved.otpHash).toBeNull();
  expect(saved.otpVerifiedAt).not.toBeNull();
  expect(saved.otpAttempts).toBe(0);
  expect(ctx.mail.sent()).toHaveLength(1);
});

it("OTP expiry is exclusive at exactly ten minutes", async () => {
  const { token, row } = await pack();
  await requestOtp(ctx, token);
  const before = (await read(row.id))!;
  ctx.clock.advanceSeconds(600);
  await expect(verifyOtp(ctx, token, codeFromMail())).rejects.toThrow(/expired/i);
  expect(await read(row.id)).toEqual(before);
});

it("returning the demo clock to today cannot extend an OTP beyond ten operational minutes", async () => {
  const { token, row } = await pack();
  ctx.clock.setOffsetDays(30);
  await requestOtp(ctx, token);
  ctx.clock.setOffsetDays(0);
  ctx.clock.advanceSeconds(601);
  const before = (await read(row.id))!;
  await expect(verifyOtp(ctx, token, codeFromMail())).rejects.toThrow(/expired/i);
  expect(await read(row.id)).toEqual(before);
});

it("a correct code remains usable just before expiry and an invalid public token changes nothing", async () => {
  const { token, row } = await pack();
  await requestOtp(ctx, token);
  const before = (await read(row.id))!;
  const sentCount = ctx.mail.sent().length;
  await expect(requestOtp(ctx, "invalid-link-fixture")).rejects.toThrow(/valid/i);
  await expect(verifyOtp(ctx, "invalid-link-fixture", wrongFor(codeFromMail()))).rejects.toThrow(/valid/i);
  expect(await read(row.id)).toEqual(before);
  expect(ctx.mail.sent()).toHaveLength(sentCount);
  ctx.clock.advanceSeconds(599.999);
  await verifyOtp(ctx, token, codeFromMail());
  expect((await read(row.id))!.otpVerifiedAt).not.toBeNull();
  expect((await read(row.id))!.otpHash).toBeNull();
});

it("a stale correct verification cannot consume or verify a newer replacement challenge", async () => {
  const { token, row } = await pack();
  await requestOtp(ctx, token);
  const oldCode = codeFromMail();
  const oldHash = (await read(row.id))!.otpHash;
  const gate = barrier();
  const stale = verifyOtp({ ...ctx, db: afterSignerRead(ctx.db, gate) }, token, oldCode).then(() => true, () => false);
  let replacementHash: string | null = null;
  try {
    await bounded(Promise.race([gate.entered, stale.then(() => { throw new Error("The stale verification barrier was not reached"); })]));
    // Avoid an accidental equal random value; never display the generated code.
    for (let i = 0; i < 3; i++) {
      await requestOtp(ctx, token);
      replacementHash = (await read(row.id))!.otpHash;
      if (replacementHash !== oldHash) break;
    }
    expect(replacementHash === oldHash).toBe(false);
  } finally { gate.release(); }
  expect(await bounded(stale)).toBe(false);
  expect((await read(row.id))!.otpVerifiedAt).toBeNull();
  expect((await read(row.id))!.otpHash).toBe(replacementHash);
  await verifyOtp(ctx, token, codeFromMail());
  expect((await openSigning(ctx, token)).signer.otpVerified).toBe(true);
});

it("requesting a replacement code cannot retain a verified session alongside an unverified new challenge", async () => {
  const { token, row } = await pack();
  await requestOtp(ctx, token);
  await verifyOtp(ctx, token, codeFromMail());
  const before = (await read(row.id))!;
  const count = ctx.mail.sent().length;
  const delivered = await requestOtp(ctx, token).then(() => true, () => false);
  if (!delivered) {
    expect(await read(row.id)).toEqual(before);
    expect(ctx.mail.sent()).toHaveLength(count);
  } else {
    expect((await openSigning(ctx, token)).signer.otpVerified).toBe(false);
    expect((await read(row.id))!.otpHash).not.toBeNull();
    expect(ctx.mail.sent()).toHaveLength(count + 1);
    await verifyOtp(ctx, token, codeFromMail());
    expect((await openSigning(ctx, token)).signer.otpVerified).toBe(true);
  }
});

it("a code request rejected before FakeMail acceptance leaves the previously delivered challenge usable", async () => {
  const { token, row } = await pack();
  await requestOtp(ctx, token);
  const previousCode = codeFromMail();
  const before = (await read(row.id))!;
  const rejecting = { name: ctx.mail.name, address: ctx.mail.address, reconciliationScope: ctx.mail.reconciliationScope,
    fetchNew: ctx.mail.fetchNew.bind(ctx.mail), reconcileDelivery: ctx.mail.reconcileDelivery.bind(ctx.mail),
    send: async () => { throw new Error("Fixture provider rejected before accepting any transport"); },
  };
  await expect(requestOtp({ ...ctx, mail: rejecting }, token)).rejects.toThrow();
  expect(ctx.mail.sent()).toHaveLength(1);
  expect(await read(row.id)).toEqual(before);
  await verifyOtp(ctx, token, previousCode);
  expect((await openSigning(ctx, token)).signer.otpVerified).toBe(true);
});

it("concurrent resend requests leave the last accepted fake-mail code as the current unverified challenge", async () => {
  const { token, row } = await pack();
  const gates = Array.from({ length: 6 }, barrier);
  const requests = gates.map(gate => requestOtp({ ...ctx, db: afterSignerRead(ctx.db, gate) }, token).then(() => true, () => false));
  try { await bounded(Promise.all(gates.map(g => g.entered))); }
  finally { gates.forEach(g => g.release()); }
  expect(await bounded(Promise.all(requests))).toEqual([true, true, true, true, true, true]);
  expect(ctx.mail.sent()).toHaveLength(6);
  const saved = (await read(row.id))!;
  expect(saved.otpVerifiedAt).toBeNull();
  expect(saved.otpAttempts).toBe(0);
  // Assert digests only; failure output must not expose an OTP.
  expect(saved.otpHash).toBe(Crypto.sha256(`${row.id}:${codeFromMail()}`));
  await verifyOtp(ctx, token, codeFromMail());
  expect((await openSigning(ctx, token)).signer.otpVerified).toBe(true);
});

it("more concurrent resends than pool connections finish without a connection-starvation deadlock", async () => {
  const { token, row } = await pack();
  const requests = Array.from({ length: 14 }, () => requestOtp(ctx, token));
  await bounded(Promise.all(requests));
  expect(ctx.mail.sent()).toHaveLength(14);
  expect((await read(row.id))!.otpHash).toBe(Crypto.sha256(`${row.id}:${codeFromMail()}`));
  await verifyOtp(ctx, token, codeFromMail());
  expect((await read(row.id))!.otpVerifiedAt).not.toBeNull();
});

it("an accepted OTP whose provider response is lost remains usable without an automatic second transport", async () => {
  const { token, row } = await pack();
  const lost = { name: ctx.mail.name, address: ctx.mail.address, reconciliationScope: ctx.mail.reconciliationScope,
    fetchNew: ctx.mail.fetchNew.bind(ctx.mail), reconcileDelivery: ctx.mail.reconcileDelivery.bind(ctx.mail),
    send: async (...args: Parameters<typeof ctx.mail.send>) => { await ctx.mail.send(...args); throw new Error("Fixture acceptance response lost"); },
  };
  // Positive reconciliation may turn the lost response into success; otherwise
  // the reported uncertainty must still preserve the actually accepted code.
  await requestOtp({ ...ctx, mail: lost }, token).catch(() => undefined);
  expect(ctx.mail.sent()).toHaveLength(1);
  expect((await read(row.id))!.otpHash).toBe(Crypto.sha256(`${row.id}:${codeFromMail()}`));
  await verifyOtp(ctx, token, codeFromMail());
  expect((await openSigning(ctx, token)).signer.otpVerified).toBe(true);
  expect(ctx.mail.sent()).toHaveLength(1);
});

it.each(["view", "request", "verify"] as const)("a signer token cannot %s through an envelope owned by another firm", async operation => {
  const { token, row, env } = await pack();
  await requestOtp(ctx, token);
  const code = codeFromMail();
  await ctx.db.update(signEnvelope).set({ firmId: "firm_other" }).where(eq(signEnvelope.id, env.id));
  const before = (await read(row.id))!;
  const count = ctx.mail.sent().length;
  const result = operation === "view" ? openSigning(ctx, token) : operation === "request" ? requestOtp(ctx, token) : verifyOtp(ctx, token, code);
  await expect(result).rejects.toThrow();
  expect(await read(row.id)).toEqual(before);
  expect(ctx.mail.sent()).toHaveLength(count);
});

it.each(["signed/request", "signed/verify", "withdrawn/request", "withdrawn/verify"] as const)("a consumed or withdrawn signing pack rejects the %s OTP operation atomically", async scenario => {
  const { token, row, env } = await pack();
  await requestOtp(ctx, token);
  const code = codeFromMail();
  // Model the concurrent terminal decision with an outstanding challenge snapshot.
  if (scenario.startsWith("signed")) await ctx.db.update(signer).set({ signedAt: ctx.clock.now() }).where(eq(signer.id, row.id));
  else await ctx.db.update(signEnvelope).set({ status: "voided" }).where(eq(signEnvelope.id, env.id));
  const before = (await read(row.id))!;
  const count = ctx.mail.sent().length;
  await expect(scenario.endsWith("request") ? requestOtp(ctx, token) : verifyOtp(ctx, token, code)).rejects.toThrow();
  expect(await read(row.id)).toEqual(before);
  expect(ctx.mail.sent()).toHaveLength(count);
});

it("seed 0x5a17c0de malformed code corpus never verifies and cannot bypass the five-attempt lock", async () => {
  const base = await pack();
  let seed = 0x5a17c0de;
  const next = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
  const corpus = ["", " ", "\t\n", "\0", "１２３４５６", "١٢٣٤٥٦", "一二三四五六", "1e6", "-12345", "1.2345", "1234567", "\u202e123456", "a".repeat(8192), "🔥", "繁體简体", "<script>" ];
  const symbols = ["\0", "\t", "\u202e", "\u200b", "簽", "验", "🔥", " ", "a", "-", ".", "<", ">"];
  while (corpus.length < 96) corpus.push(Array.from({ length: 1 + next() % 64 }, () => symbols[next() % symbols.length]).join(""));
  let last = base;
  for (let i = 0; i < corpus.length; i++) {
    // Each sample reaches a fresh live challenge, rather than testing 91 inputs
    // only against an already locked signer.
    const token = i ? ctx.ids.token() : base.token;
    const row = i ? (await ctx.db.insert(signer).values({ ...base.row, id: ctx.ids.next("sgn"), tokenHash: Crypto.sha256(token) }).returning())[0] : base.row;
    await requestOtp(ctx, token);
    const originalHash = (await read(row.id))!.otpHash;
    await expect(verifyOtp(ctx, token, corpus[i])).rejects.toThrow();
    const saved = (await read(row.id))!;
    expect(saved.otpVerifiedAt).toBeNull();
    expect(saved.otpHash).toBe(originalHash);
    expect(saved.otpAttempts).toBe(1);
    last = { ...base, token, row };
  }
  expect(ctx.mail.sent()).toHaveLength(96);
  const bad = wrongFor(codeFromMail());
  for (let i = 0; i < 4; i++) await expect(verifyOtp(ctx, last.token, bad)).rejects.toThrow();
  expect((await read(last.row.id))!.otpAttempts).toBe(5);
  const locked = (await read(last.row.id))!;
  await expect(requestOtp(ctx, last.token)).rejects.toThrow(/locked/i);
  expect(await read(last.row.id)).toEqual(locked);
  expect(ctx.mail.sent()).toHaveLength(96);
});
