import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { createRequest, startTask, advance, markStepState, getTask } from "@/domain/engine";
import { createPerson } from "@/domain/records";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { openSigning, requestOtp, verifyOtp, signDocuments, SigningError } from "@/domain/signing";
import { document, signEnvelope, signer as signerT } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import "@/domain/inbound";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
});

/** Appointment on the showcase client, advanced to the sign step. */
async function atSignStep() {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const p = await createPerson(ctx, { nameEn: "WONG Ka Man", idNumber: "K987654(3)", residentialAddress: "Flat 12B, 88 Robinson Road", correspondenceAddress: "Unit 1502, Kowloon Bay Centre", email: "kaman@example.com", phone: "+852 9123 4567" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p.id, extracted: { effDate: { value: "2026-10-15" } } });
  const { tickItem } = await import("@/domain/step-hooks");
  await markStepState(ctx, t.id, "send", { sent: true });
  for (const k of ["idCopy", "addrProof", "selfie"]) await tickItem(ctx, t.id, k, null);
  await markStepState(ctx, t.id, "screen", { cleared: true });
  await advance(ctx, t.id);
  return { t, person: p };
}

function tokenFromMail(to: string) {
  const m = ctx.mail.sent().filter((x) => x.to.includes(to)).at(-1)!;
  return m.text.match(/\/sign\/([A-Za-z0-9]+)/)![1];
}
function otpFromMail(to: string) {
  const m = ctx.mail.sent().filter((x) => x.to.includes(to)).at(-1)!;
  return m.text.match(/\b(\d{6})\b/)![1];
}

describe("E-signature", () => {
  it("signing links go out only after staff approve the signing pack, one per signer", async () => {
    const { t } = await atSignStep();
    expect(ctx.mail.sent()).toHaveLength(0);
    const [p] = await pendingProposals(ctx, { taskId: t.id, kind: "send_signing" });
    expect(p.payload.signers).toEqual(expect.arrayContaining([expect.objectContaining({ email: "director@kbtrading.example" }), expect.objectContaining({ email: "kaman@example.com" })]));
    await approveProposal(ctx, p.id);
    expect(ctx.mail.sent().map((m) => m.to[0]).sort()).toEqual(["director@kbtrading.example", "kaman@example.com"]);
  });

  it("a wrong OTP doesn't unlock the documents, and five wrong attempts lock the link", async () => {
    const { t } = await atSignStep();
    await approveProposal(ctx, (await pendingProposals(ctx, { taskId: t.id, kind: "send_signing" }))[0].id);
    const token = tokenFromMail("kaman@example.com");
    await requestOtp(ctx, token);
    const real = otpFromMail("kaman@example.com");
    const wrong = real === "000000" ? "111111" : "000000";
    await expect(verifyOtp(ctx, token, wrong)).rejects.toBeInstanceOf(SigningError);
    await expect(signDocuments(ctx, token, { kind: "typed", data: "Wong Ka Man", ip: "1.2.3.4", userAgent: "test" })).rejects.toThrow(/verify/i);
    for (let i = 0; i < 4; i++) await expect(verifyOtp(ctx, token, wrong)).rejects.toBeInstanceOf(SigningError);
    await expect(verifyOtp(ctx, token, real)).rejects.toThrow(/locked/i);
  });

  it("an expired OTP is rejected", async () => {
    const { t } = await atSignStep();
    await approveProposal(ctx, (await pendingProposals(ctx, { taskId: t.id, kind: "send_signing" }))[0].id);
    const token = tokenFromMail("kaman@example.com");
    await requestOtp(ctx, token);
    ctx.clock.advanceSeconds(11 * 60);
    await expect(verifyOtp(ctx, token, otpFromMail("kaman@example.com"))).rejects.toThrow(/expired/i);
  });

  it("the sign step advances only when every signer has signed; a used link can't sign again", async () => {
    const { t } = await atSignStep();
    await approveProposal(ctx, (await pendingProposals(ctx, { taskId: t.id, kind: "send_signing" }))[0].id);
    for (const email of ["kaman@example.com", "director@kbtrading.example"]) {
      const token = tokenFromMail(email);
      const view = await openSigning(ctx, token);
      expect(view.documents.length).toBeGreaterThan(0);
      await requestOtp(ctx, token);
      await verifyOtp(ctx, token, otpFromMail(email));
      await signDocuments(ctx, token, { kind: "typed", data: view.signer.name, ip: "203.0.113.5", userAgent: "Mozilla/5.0" });
      const cur = await getTask(ctx, t.id);
      if (email === "kaman@example.com") expect(cur._steps[cur.stepIndex].kind).toBe("sign");
      await expect(signDocuments(ctx, token, { kind: "typed", data: "x", ip: "", userAgent: "" })).rejects.toThrow(/already signed/i);
    }
    const cur = await getTask(ctx, t.id);
    expect(cur._steps[cur.stepIndex].kind).toBe("file");
  });

  it("signed copies carry an audit certificate page recording each signer, their email, IP, OTP time, and the unsigned document's hash", async () => {
    const { t } = await atSignStep();
    await approveProposal(ctx, (await pendingProposals(ctx, { taskId: t.id, kind: "send_signing" }))[0].id);
    for (const email of ["kaman@example.com", "director@kbtrading.example"]) {
      const token = tokenFromMail(email);
      await requestOtp(ctx, token); await verifyOtp(ctx, token, otpFromMail(email));
      await signDocuments(ctx, token, { kind: "drawn", data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", ip: "203.0.113.5", userAgent: "Mozilla/5.0" });
    }
    const [env] = await ctx.db.select().from(signEnvelope).where(eq(signEnvelope.taskId, t.id));
    expect(env.status).toBe("completed");
    const signed = await ctx.db.select().from(document).where(eq(document.source, "signed"));
    expect(signed).toHaveLength(env.documentIds.length);
    const orig = (await ctx.db.query.document.findFirst({ where: eq(document.id, env.documentIds[0]) }))!;
    const s0 = signed.find((s) => s.title.startsWith(orig.title))!;
    expect(s0.extractedText).toContain(orig.sha256!);
    expect(s0.extractedText).toContain("kaman@example.com");
    expect(s0.extractedText).toContain("203.0.113.5");
    const origPages = (await PDFDocument.load(await ctx.storage.get(orig.storageKey!))).getPageCount();
    const signedPages = (await PDFDocument.load(await ctx.storage.get(s0.storageKey!))).getPageCount();
    expect(signedPages).toBe(origPages + 1);
    expect(s0.sha256).toBe(Crypto.sha256(await ctx.storage.get(s0.storageKey!)));
    const signers = await ctx.db.select().from(signerT).where(eq(signerT.envelopeId, env.id));
    expect(signers.every((s) => s.tokenHash.length === 64 && !s.signatureData?.includes("iVBOR") === false)).toBe(true);
  });
});
