// In-house e-signature (DECISIONS.md #30): single-use emailed link, 6-digit email OTP,
// typed or drawn signature, stamped PDF with an audit certificate page. Behind
// SignatureProvider-style functions so a vendor can replace it later.
import { randomInt, randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { PDFDocument, rgb } from "pdf-lib";
import type { Ctx } from "@/lib/ctx";
import { Crypto } from "@/lib/crypto";
import { operationalNow } from "@/lib/clock";
import { document, signEnvelope, signer as signerT } from "@/db/schema";
import { withDbSessionLock } from "@/db/client";
import { onEnterStep, getTask, markStepState, advance, logEvent, stepData, assertTaskReady, type Task } from "./engine";
import { createProposal, onApprove, pendingProposals } from "./proposals";
import { officersAsAt } from "./records";
import { membersAsAt } from "./shares";
import { getFirm } from "./firm";
import { embedFonts } from "@/documents/fonts";
import { audit } from "./audit";
import { prepareDelivery, deliverPrepared, deliveryConfirmedUnsent } from "./mail-delivery";
import { approvalState, assertApprovalState } from "./approval-state";
import { approvedSigningPack, approvedSignerDocuments, signingOriginalBytes, completedSigningProof, type SignatureField } from "./signing-pack";
import { readApprovedInput } from "./approval-execution";

export class SigningError extends Error {}
const OTP_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

type SigField = SignatureField;
type GenDoc = { id: string; signers?: string; fields: SigField[] };

async function instructingSigner(ctx: Ctx, clientId: string, role: string) {
  const c = await ctx.db.query.contact.findFirst({ where: (x, { and, eq }) => and(eq(x.clientId, clientId), eq(x.isInstructing, true)) });
  if (!c?.personId) return [];
  const p = await ctx.db.query.person.findFirst({ where: (x, { eq }) => eq(x.id, c.personId!) });
  return p ? [{ personId: p.id, name: p.nameEn, email: p.email ?? c.email, role }] : [];
}

async function signersFor(ctx: Ctx, clientId: string, personId: string | null, kind: string | undefined, task?: Task) {
  if (task?.playbookId === "hk.incorporation" && (kind === "directors" || kind === "members")) {
    const { incorporationFor } = await import("./incorporation");
    const values = Object.fromEntries(task.checklist.filter(e => e.value).map(e => [e.key, e.value!]));
    const plan = await incorporationFor(ctx, task, values);
    return [{ personId: plan.directorPersonId, name: plan.director.nameEn, email: plan.director.email, role: kind === "directors" ? "First director" : "Founder member" }];
  }
  const today = ctx.clock.today();
  if (kind === "directors") {
    const ds = (await officersAsAt(ctx, clientId, today, "director")).map((o) => ({ personId: o.personId, name: o.person.nameEn, email: o.person.email, role: "Director" }));
    // A new client's directors aren't on file yet: the instructing director signs.
    return ds.length ? ds : instructingSigner(ctx, clientId, "Director (as instructed)");
  }
  if (kind === "person" && personId) { const p = await ctx.db.query.person.findFirst({ where: (x, { eq }) => eq(x.id, personId) }); return p ? [{ personId: p.id, name: p.nameEn, email: p.email, role: "Appointee" }] : []; }
  if (kind === "members") {
    const ms = await membersAsAt(ctx, clientId, today);
    if (!ms.length) return instructingSigner(ctx, clientId, "Member (as instructed)");
    const people = await Promise.all([...new Set(ms.map((m) => m.personId))].map((id) => ctx.db.query.person.findFirst({ where: (x, { eq }) => eq(x.id, id) })));
    return people.filter(Boolean).map((p) => ({ personId: p!.id, name: p!.nameEn, email: p!.email, role: "Member" }));
  }
  return [];
}

/** On entering the sign step: build the signing pack and ask staff to approve sending it. */
onEnterStep("sign", async (ctx, task) => {
  if ((await pendingProposals(ctx, { taskId: task.id, kind: "send_signing" })).length) return;
  const t = await getTask(ctx, task.id);
  const genIdx = t._steps.findIndex((s) => s.kind === "generate");
  const gen = (stepData(t, genIdx).signatureFields as GenDoc[] | undefined) ?? [];
  const docSigners: { docId: string; signers: Awaited<ReturnType<typeof signersFor>> }[] = [];
  for (const g of gen) {
    if (!g.signers || g.signers === "none") continue;
    const s = await signersFor(ctx, t.clientId, t.personId, g.signers, t);
    if (s.length) docSigners.push({ docId: g.id, signers: s });
  }
  if (docSigners.length === 0) {
    await markStepState(ctx, t.id, "sign", { skipped: "No documents need signatures" });
    return;
  }
  const bySigner = new Map<string, { personId: string; name: string; email: string | null; role: string; docIds: string[] }>();
  for (const d of docSigners) for (const s of d.signers) {
    const cur = bySigner.get(s.personId) ?? { ...s, docIds: [] };
    cur.docIds.push(d.docId);
    bySigner.set(s.personId, cur);
  }
  const missing = [...bySigner.values()].filter((s) => !s.email);
  const [env] = await ctx.db.insert(signEnvelope).values({ id: ctx.ids.next("env"), firmId: ctx.firmId, taskId: t.id, documentIds: docSigners.map((d) => d.docId), createdAt: ctx.clock.now() }).returning();
  const titles = await ctx.db.select({ id: document.id, title: document.title }).from(document).where(inArray(document.id, env.documentIds));
  await createProposal(ctx, {
    kind: "send_signing", title: `Send for signature: ${t.title}`, clientId: t.clientId, taskId: t.id, requestId: t.requestId,
    summary: `${titles.map((x) => x.title).join(", ")}. Signers: ${[...bySigner.values()].map((s) => `${s.name} <${s.email ?? "no email"}>`).join(", ")}.${missing.length ? ` Add an email for ${missing.map((m) => m.name).join(", ")} before sending.` : ""}`,
    payload: { envelopeId: env.id, approvalState: await approvalState(ctx, t.id), signers: [...bySigner.values()] },
  });
});

onApprove("send_signing", async (ctx, p, opts) => {
  const { envelopeId, signers } = p.payload as { envelopeId: string; signers: { personId: string; name: string; email: string | null; role: string; docIds: string[] }[] };
  const overrides = (opts.edits as { emails?: Record<string, string> } | undefined)?.emails ?? {};
  const env = await ctx.db.query.signEnvelope.findFirst({ where: and(eq(signEnvelope.id, envelopeId), eq(signEnvelope.firmId, ctx.firmId)) });
  if (!env) throw new SigningError("This signing request isn't valid");
  if (env.status === "completed") {
    await ctx.db.transaction(async db => {
      const txCtx = { ...ctx, db: db as unknown as Ctx["db"] };
      await ctx.assertExecution?.(txCtx);
      const saved = readApprovedInput(txCtx, p);
      if (!saved || !await completedSigningProof(txCtx, p, saved)) throw new SigningError("This signing request changed; a fresh review is required");
      await logEvent(txCtx, env.taskId, "signing.sent", `Signing links sent to ${signers.map(s => s.name).join(", ")}`, { envelopeId }, ctx.userId);
      await ctx.completeExecution?.(txCtx);
    });
    return;
  }
  const t = await assertTaskReady(ctx, env.taskId, "sign");
  if (env.status !== "draft") throw new SigningError("This signing request is no longer current");
  await assertApprovalState(ctx, t.id, p.payload.approvalState, p.id);
  for (const s of signers) if (!(overrides[s.personId] ?? s.email)) throw new SigningError(`${s.name} has no email address`);
  const firm = await getFirm(ctx);
  // Every expected signer and stable invitation exists before the first link leaves.
  const invitations = await ctx.db.transaction(async db => {
    const txCtx = { ...ctx, db: db as unknown as Ctx["db"] };
    await ctx.assertExecution?.(txCtx);
    await db.execute(sql`select id from sign_envelope where id = ${envelopeId} and firm_id = ${ctx.firmId} for update`);
    const ids: string[] = [];
    for (const s of signers) {
      const sourceKey = `signer:${envelopeId}:${s.personId}`;
      const existing = await db.query.mailDelivery.findFirst({ where: (d, { and, eq }) => and(eq(d.firmId, ctx.firmId), eq(d.sourceKey, sourceKey)) });
      if (existing) { ids.push(existing.id); continue; }
      const email = overrides[s.personId] ?? s.email!;
      const token = ctx.ids.token();
      await db.insert(signerT).values({ id: ctx.ids.next("sgn"), firmId: ctx.firmId, envelopeId, personId: s.personId, name: s.name, email, role: s.role, tokenHash: Crypto.sha256(token) });
      const url = `${ctx.config.APP_URL}/sign/${token}`;
      const delivery = await prepareDelivery(txCtx, sourceKey, {
        to: [email], subject: `Documents to sign: ${t.title}`,
        text: `Dear ${s.name},\n\nPlease review and sign the documents for "${t.title}" here:\n${url}\n\nYou'll receive a 6-digit code by email to confirm it's you. The link is personal to you and can be used once.\n\n文件已準備好，請按上面連結審閱及簽署。\n\n${firm.signOff?.en ?? firm.legalName}`,
      });
      ids.push(delivery.id);
    }
    return ids;
  });
  for (const id of invitations) await deliverPrepared(ctx, id);
  await ctx.db.transaction(async db => {
    const txCtx = { ...ctx, db: db as unknown as Ctx["db"] };
    await ctx.assertExecution?.(txCtx);
    await db.update(signEnvelope).set({ status: "sent" }).where(and(eq(signEnvelope.id, envelopeId), eq(signEnvelope.status, "draft")));
    await logEvent(txCtx, t.id, "signing.sent", `Signing links sent to ${signers.map(s => s.name).join(", ")}`, { envelopeId }, ctx.userId);
    await ctx.completeExecution?.(txCtx);
  });
});

async function signerByToken(ctx: Ctx, token: string) {
  const s = await ctx.db.query.signer.findFirst({ where: and(eq(signerT.tokenHash, Crypto.sha256(token)), eq(signerT.firmId, ctx.firmId)) });
  if (!s) throw new SigningError("This signing link isn't valid");
  const env = await ctx.db.query.signEnvelope.findFirst({ where: and(eq(signEnvelope.id, s.envelopeId), eq(signEnvelope.firmId, ctx.firmId)) });
  if (!env) throw new SigningError("This signing link isn't valid");
  if (env.status === "voided") throw new SigningError("This signing request was withdrawn");
  const t = await getTask(ctx, env.taskId);
  if (t.status === "cancelled") throw new SigningError("This signing request was withdrawn");
  return { s, env };
}

const signingLockKey = (ctx: Ctx, envelopeId: string) => `signing:${ctx.firmId}:${envelopeId}`;

async function withSigningLock<T>(ctx: Ctx, token: string, fn: (txCtx: Ctx, current: Awaited<ReturnType<typeof signerByToken>>) => Promise<T>) {
  // Resolve identifiers only. Authorization uses fresh rows after the locks;
  // a paused or stale read cannot authorize an obsolete challenge.
  const initial = await signerByToken(ctx, token);
  return ctx.db.transaction(async db => {
    await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${signingLockKey(ctx, initial.env.id)}, 0))`);
    await db.execute(sql`select id from task where id = ${initial.env.taskId} and firm_id = ${ctx.firmId} for update`);
    await db.execute(sql`select id from sign_envelope where id = ${initial.env.id} and firm_id = ${ctx.firmId} for update`);
    await db.execute(sql`select id from signer where id = ${initial.s.id} and firm_id = ${ctx.firmId} for update`);
    const txCtx = { ...ctx, db: db as unknown as Ctx["db"] };
    return fn(txCtx, await signerByToken(txCtx, token));
  });
}

export async function openSigning(ctx: Ctx, token: string) {
  return withSigningLock(ctx, token, async (txCtx, { s, env }) => {
    const t = await getTask(txCtx, env.taskId);
    const docs = env.documentIds.length ? approvedSignerDocuments(await approvedSigningPack(txCtx, env), s) : [];
    const client = await txCtx.db.query.client.findFirst({ where: (c, { and, eq }) => and(eq(c.id, t.clientId), eq(c.firmId, ctx.firmId)) });
    if (!client) throw new SigningError("This signing request isn't valid");
    return {
    signer: { name: s.name, email: s.email, role: s.role, signedAt: s.signedAt, otpVerified: !!s.otpVerifiedAt, locked: s.otpAttempts >= MAX_ATTEMPTS },
    documents: docs.map((d) => ({ id: d.id, title: d.title })),
    companyName: client?.nameEn ?? "", taskTitle: t.title,
    };
  });
}

/** Authorize a descriptor under the signing locks, then read its immutable
 * original bytes. Withdrawal may overlap storage I/O; no newer pack is read. */
export async function downloadSigningDocument(ctx: Ctx, token: string, docId: string) {
  const approved = await withSigningLock(ctx, token, async (txCtx, { s, env }) => {
    const docs = approvedSignerDocuments(await approvedSigningPack(txCtx, env), s);
    const doc = docs.find(d => d.id === docId);
    if (!doc) throw new SigningError("This document isn't in your approved signing pack");
    return doc;
  });
  return (await signingOriginalBytes(ctx, [approved]))[0].bytes;
}

export async function requestOtp(ctx: Ctx, token: string) {
  const initial = await signerByToken(ctx, token);
  return withDbSessionLock(ctx.db, signingLockKey(ctx, initial.env.id), async db => {
    const sessionCtx = { ...ctx, db };
    // Commit the challenge and encrypted delivery snapshot before crossing the
    // network. A lost acknowledgement must not discard an actually usable code.
    const prepared = await withSigningLock(sessionCtx, token, async (txCtx, { s }) => {
      if (s.signedAt) throw new SigningError("You've already signed");
      if (s.otpVerifiedAt) throw new SigningError("Your email is already verified; continue signing");
      if (s.otpAttempts >= MAX_ATTEMPTS) throw new SigningError("This link is locked after too many wrong codes; ask us for a new one");
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const hash = Crypto.sha256(`${s.id}:${code}`);
      const delivery = await prepareDelivery(txCtx, `otp:${s.id}:${randomUUID()}`, { to: [s.email], subject: "Your signing code", text: `Your code to sign documents is ${code}. It expires in 10 minutes.\n\n您的簽署驗證碼為 ${code}，10分鐘內有效。` });
      await txCtx.db.update(signerT).set({ otpHash: hash, otpExpiresAt: new Date(operationalNow(ctx.clock).getTime() + OTP_TTL_MS) }).where(and(eq(signerT.id, s.id), eq(signerT.firmId, ctx.firmId)));
      return { previous: s, hash, delivery };
    });
    try {
      await deliverPrepared({ ...sessionCtx, assertExecution: async txCtx => {
        await txCtx.db.execute(sql`select id from task where id = ${initial.env.taskId} and firm_id = ${ctx.firmId} for update`);
        await txCtx.db.execute(sql`select id from sign_envelope where id = ${initial.env.id} and firm_id = ${ctx.firmId} for update`);
        await txCtx.db.execute(sql`select id from signer where id = ${initial.s.id} and firm_id = ${ctx.firmId} for update`);
        const { s } = await signerByToken(txCtx, token);
        if (s.signedAt || s.otpVerifiedAt || s.otpAttempts >= MAX_ATTEMPTS || s.otpHash !== prepared.hash) throw new SigningError("This signing challenge is no longer current");
      } }, prepared.delivery.id);
    } catch (error) {
      const delivery = (await db.query.mailDelivery.findFirst({ where: (d, { and, eq }) => and(eq(d.id, prepared.delivery.id), eq(d.firmId, ctx.firmId)) }))!;
      // Restore only authoritative non-delivery, never an ambiguous exception.
      if (await deliveryConfirmedUnsent(sessionCtx, delivery)) await withSigningLock(sessionCtx, token, async (txCtx, { s }) => {
        if (s.otpHash === prepared.hash && !s.signedAt && !s.otpVerifiedAt) await txCtx.db.update(signerT).set({ otpHash: prepared.previous.otpHash, otpExpiresAt: prepared.previous.otpExpiresAt }).where(and(eq(signerT.id, s.id), eq(signerT.firmId, ctx.firmId)));
      });
      throw error;
    }
  });
}

export async function verifyOtp(ctx: Ctx, token: string, code: string) {
  const error = await withSigningLock(ctx, token, async (txCtx, { s }) => {
    if (s.signedAt) return "You've already signed these documents";
    if (s.otpAttempts >= MAX_ATTEMPTS) return "This link is locked after too many wrong codes; ask us for a new one";
    if (!s.otpHash || !s.otpExpiresAt) return "Request a code first";
    const now = operationalNow(ctx.clock);
    if (s.otpExpiresAt <= now) return "The code has expired; request a new one";
    if (!Crypto.safeEqualHex(Crypto.sha256(`${s.id}:${code.trim()}`), s.otpHash)) {
      await txCtx.db.update(signerT).set({ otpAttempts: s.otpAttempts + 1 }).where(and(eq(signerT.id, s.id), eq(signerT.firmId, ctx.firmId)));
      return s.otpAttempts + 1 >= MAX_ATTEMPTS ? "Too many wrong codes; this link is now locked" : "That code isn't right";
    }
    await txCtx.db.update(signerT).set({ otpVerifiedAt: now, otpHash: null }).where(and(eq(signerT.id, s.id), eq(signerT.firmId, ctx.firmId)));
    return null;
  });
  // Wrong-attempt increments must commit before the public error is returned.
  if (error) throw new SigningError(error);
}

export async function signDocuments(ctx: Ctx, token: string, sig: { kind: "typed" | "drawn"; data: string; ip: string; userAgent: string }) {
  return withSigningLock(ctx, token, txCtx => signDocumentsAtomic(txCtx, token, sig));
}

async function signDocumentsAtomic(ctx: Ctx, token: string, sig: Parameters<typeof signDocuments>[2]) {
  const { s, env } = await signerByToken(ctx, token);
  if (s.signedAt) throw new SigningError("You've already signed these documents");
  if (!s.otpVerifiedAt) throw new SigningError("Verify the code sent to your email first");
  if (!sig.data.trim()) throw new SigningError("Add your signature");
  if (sig.kind === "drawn" && !/^data:image\/png;base64,/.test(sig.data)) throw new SigningError("Drawn signature must be a PNG");
  if (sig.data.length > 200_000) throw new SigningError("Signature is too large");
  if (sig.kind === "drawn") {
    const probe = await PDFDocument.create();
    await probe.embedPng(Buffer.from(sig.data.split(",")[1], "base64"));
  }
  const pack = await approvedSigningPack(ctx, env);
  approvedSignerDocuments(pack, s);
  // Validate every original before committing a signature or publishing artifacts.
  const originals = await signingOriginalBytes(ctx, pack.documents);
  if (sig.kind === "typed") {
    const fonts = await embedFonts(await PDFDocument.create(), "tc");
    for (const { document: original } of originals) for (const field of original.fields.filter(f => f.field === `sign:${s.personId}`)) typedSignatureSize(fonts.pick(sig.data), sig.data, field);
  }
  await ctx.db.update(signerT).set({ signedAt: ctx.clock.now(), signatureKind: sig.kind, signatureData: sig.data.slice(0, 200_000), ip: sig.ip.slice(0, 64), userAgent: sig.userAgent }).where(eq(signerT.id, s.id));
  await audit(ctx, "signing.signed", "signer", s.id, { envelopeId: env.id, ip: sig.ip }, `signer:${s.email}`);
  await logEvent(ctx, env.taskId, "signing.signed", `${s.name} signed`, { signerId: s.id }, "client");
  const all = await ctx.db.select().from(signerT).where(and(eq(signerT.envelopeId, env.id), eq(signerT.firmId, ctx.firmId)));
  for (const recipient of all) approvedSignerDocuments(pack, recipient);
  if (all.length !== (pack.input.payload.signers as unknown[]).length) throw new SigningError("The approved signer list changed");
  if (all.every((x) => x.signedAt || x.id === s.id)) await completeEnvelope(ctx, env.id, originals);
}

async function completeEnvelope(ctx: Ctx, envelopeId: string, originals: Awaited<ReturnType<typeof signingOriginalBytes>>) {
  const env = (await ctx.db.query.signEnvelope.findFirst({ where: and(eq(signEnvelope.id, envelopeId), eq(signEnvelope.firmId, ctx.firmId)) }))!;
  const signers = await ctx.db.select().from(signerT).where(and(eq(signerT.envelopeId, envelopeId), eq(signerT.firmId, ctx.firmId)));
  const signedIds: string[] = [];
  for (const { document: orig, bytes } of originals) {
    const { pdf, certificate } = await stampPdf(bytes, orig, signers, orig.fields, ctx.clock.now());
    const id = ctx.ids.next("doc");
    const key = `documents/${orig.clientId}/${id}-signed.pdf`;
    await ctx.storage.put(key, pdf);
    await ctx.db.insert(document).values({ id, firmId: ctx.firmId, clientId: orig.clientId, taskId: orig.taskId, personId: orig.personId, kind: orig.kind, title: `${orig.title} (signed)`, storageKey: key, mime: "application/pdf", sha256: Crypto.sha256(pdf), language: orig.language, source: "signed", extractedText: certificate, createdAt: ctx.clock.now() });
    signedIds.push(id);
  }
  await ctx.db.update(signEnvelope).set({ status: "completed", completedAt: ctx.clock.now(), signedDocumentIds: signedIds }).where(eq(signEnvelope.id, envelopeId));
  await markStepState(ctx, env.taskId, "sign", { signed: true, envelopeId, signedDocumentIds: signedIds });
  await logEvent(ctx, env.taskId, "signing.completed", "All signatures received; signed copies filed", { envelopeId });
  await advance(ctx, env.taskId);
}

async function stampPdf(buf: Buffer, orig: typeof document.$inferSelect, signers: (typeof signerT.$inferSelect)[], fields: SigField[], now: Date) {
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  // Noto's localized Latin numeric substitutions are absent from pdf-lib's
  // intact-font CID width table. Keep mapped glyphs so measured certificate
  // lines and the actual rendered evidence have identical widths.
  const fonts = await embedFonts(doc, "tc", { features: { locl: false } });
  const pages = doc.getPages();
  for (const s of signers) {
    for (const f of fields.filter((x) => x.field === `sign:${s.personId}`)) {
      const page = pages[f.page];
      if (!page) continue;
      if (s.signatureKind === "drawn" && s.signatureData?.startsWith("data:image/png;base64,")) {
        const img = await doc.embedPng(Buffer.from(s.signatureData.split(",")[1], "base64"));
        const scale = Math.min(f.w / img.width, f.h / img.height);
        page.drawImage(img, { x: f.x, y: f.y, width: img.width * scale, height: img.height * scale });
      } else if (s.signatureData) {
        const font = fonts.pick(s.signatureData);
        page.drawText(s.signatureData, { x: f.x + 4, y: f.y + 6, size: typedSignatureSize(font, s.signatureData, f), font, color: rgb(0.1, 0.16, 0.45) });
      }
      page.drawText(`Signed electronically ${now.toISOString().slice(0, 16).replace("T", " ")} UTC`, { x: f.x, y: f.y - 44, size: 6.5, font: fonts.regular, color: rgb(0.42, 0.45, 0.5) });
    }
  }
  // Audit certificate page.
  const documentSigners = signers.filter(s => fields.some(f => f.field === `sign:${s.personId}`));
  const otherParticipants = signers.filter(s => !documentSigners.includes(s));
  const evidence = (participants: typeof signers) => participants.flatMap((s) => [
    `${s.name} (${s.role ?? "signer"}) <${s.email}>`,
    `  Code sent to email and verified: ${s.otpVerifiedAt?.toISOString() ?? "—"}`,
    `  Signed: ${(s.signedAt ?? now).toISOString()}  ·  ${s.signatureKind ?? "typed"} signature`,
    `  IP address: ${s.ip ?? "—"}  ·  Device: ${s.userAgent ?? "—"}`,
    "",
  ]);
  const lines = [
    "Certificate of electronic signature / 電子簽署證明",
    `Document: ${orig.title}`,
    `Unsigned document SHA-256: ${orig.sha256}`,
    `Completed: ${now.toISOString()}`,
    "",
    "Document signers",
    ...evidence(documentSigners),
    ...(otherParticipants.length ? ["Other envelope participants — signed other documents in this envelope", ...evidence(otherParticipants)] : []),
    "Signed under the Electronic Transactions Ordinance (Cap. 553). Each signer opened a personal single-use link",
    "and confirmed a one-time code sent to their email before signing.",
  ];
  let page = doc.addPage([595, 842]);
  let y = 780;
  for (const [index, text] of lines.entries()) {
    const size = index === 0 ? 13 : 9, leading = index === 0 ? 18 : 14;
    const font = fonts.pick(text, index === 0);
    const wrapped: string[] = [];
    let line = "";
    // Preserve every evidence character. Wrap ordinary words and CJK, and split
    // an over-wide unbroken hash, email or browser token at character boundaries.
    for (const token of text.match(/\s+|[\p{Script=Han}\uFF00-\uFFEF]|[^\s\p{Script=Han}\uFF00-\uFFEF]+/gu) ?? [""]) {
      if (font.widthOfTextAtSize(line + token, size) <= 483) { line += token; continue; }
      if (line) { wrapped.push(line.trimEnd()); line = ""; }
      for (const character of token.trimStart()) {
        if (line && font.widthOfTextAtSize(line + character, size) > 483) { wrapped.push(line); line = ""; }
        line += character;
      }
    }
    wrapped.push(line.trimEnd());
    for (const value of wrapped) {
      if (y < 56) { page = doc.addPage([595, 842]); y = 780; }
      if (value) page.drawText(value, { x: 56, y, size, font, color: rgb(0.09, 0.09, 0.11) });
      y -= leading;
    }
    if (index === 0) y -= 6;
  }
  return { pdf: Buffer.from(await doc.save()), certificate: lines.join("\n") };
}

function typedSignatureSize(font: import("pdf-lib").PDFFont, text: string, field: SigField) {
  const size = Math.min(16, field.h - 8, (field.w - 8) / font.widthOfTextAtSize(text, 1));
  if (!Number.isFinite(size) || size < 8) throw new SigningError("This typed signature is too long to fit legibly. Use a shorter signature or draw it.");
  return size;
}

export async function envelopeStatus(ctx: Ctx, taskId: string) {
  const envs = await ctx.db.select().from(signEnvelope).where(and(eq(signEnvelope.taskId, taskId)));
  const out = [];
  for (const e of envs) out.push({ ...e, signers: (await ctx.db.select().from(signerT).where(eq(signerT.envelopeId, e.id))).map((s) => ({ name: s.name, email: s.email, signedAt: s.signedAt, otpVerifiedAt: s.otpVerifiedAt })) });
  return out;
}
