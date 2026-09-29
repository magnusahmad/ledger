// In-house e-signature (DECISIONS.md #30): single-use emailed link, 6-digit email OTP,
// typed or drawn signature, stamped PDF with an audit certificate page. Behind
// SignatureProvider-style functions so a vendor can replace it later.
import { randomInt } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { PDFDocument, rgb } from "pdf-lib";
import type { Ctx } from "@/lib/ctx";
import { Crypto } from "@/lib/crypto";
import { document, signEnvelope, signer as signerT } from "@/db/schema";
import { onEnterStep, getTask, markStepState, advance, logEvent, stepData, assertTaskReady, type Task } from "./engine";
import { createProposal, onApprove, pendingProposals } from "./proposals";
import { officersAsAt } from "./records";
import { membersAsAt } from "./shares";
import { getFirm } from "./firm";
import { embedFonts } from "@/documents/fonts";
import { audit } from "./audit";
import { approvalState, assertApprovalState } from "./approval-state";

export class SigningError extends Error {}
const OTP_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

type SigField = { field: string; page: number; x: number; y: number; w: number; h: number };
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
  const env = (await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, envelopeId) }))!;
  const t = await assertTaskReady(ctx, env.taskId, "sign");
  if (env.status !== "draft") throw new SigningError("This signing request is no longer current");
  await assertApprovalState(ctx, t.id, p.payload.approvalState, p.id);
  const firm = await getFirm(ctx);
  for (const s of signers) {
    const email = overrides[s.personId] ?? s.email;
    if (!email) throw new SigningError(`${s.name} has no email address`);
    const token = ctx.ids.token();
    await ctx.db.insert(signerT).values({ id: ctx.ids.next("sgn"), firmId: ctx.firmId, envelopeId, personId: s.personId, name: s.name, email, role: s.role, tokenHash: Crypto.sha256(token) });
    const url = `${ctx.config.APP_URL}/sign/${token}`;
    await ctx.mail.send({
      to: [email], subject: `Documents to sign: ${t.title}`,
      text: `Dear ${s.name},\n\nPlease review and sign the documents for "${t.title}" here:\n${url}\n\nYou'll receive a 6-digit code by email to confirm it's you. The link is personal to you and can be used once.\n\n文件已準備好，請按上面連結審閱及簽署。\n\n${firm.signOff?.en ?? firm.legalName}`,
    });
  }
  await ctx.db.update(signEnvelope).set({ status: "sent" }).where(eq(signEnvelope.id, envelopeId));
  await logEvent(ctx, t.id, "signing.sent", `Signing links sent to ${signers.map((s) => s.name).join(", ")}`, { envelopeId }, ctx.userId);
});

async function signerByToken(ctx: Ctx, token: string) {
  const s = await ctx.db.query.signer.findFirst({ where: eq(signerT.tokenHash, Crypto.sha256(token)) });
  if (!s) throw new SigningError("This signing link isn't valid");
  const env = (await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, s.envelopeId) }))!;
  if (env.status === "voided") throw new SigningError("This signing request was withdrawn");
  return { s, env };
}

export async function openSigning(ctx: Ctx, token: string) {
  const { s, env } = await signerByToken(ctx, token);
  const t = await getTask(ctx, env.taskId);
  const genIdx = t._steps.findIndex((x) => x.kind === "generate");
  const gen = (stepData(t, genIdx).signatureFields as GenDoc[] | undefined) ?? [];
  const mine = gen.filter((g) => g.fields.some((f) => f.field === `sign:${s.personId}`)).map((g) => g.id);
  const docs = await ctx.db.select().from(document).where(inArray(document.id, mine.length ? mine : env.documentIds));
  const client = await ctx.db.query.client.findFirst({ where: (c, { eq }) => eq(c.id, t.clientId) });
  return {
    signer: { name: s.name, email: s.email, role: s.role, signedAt: s.signedAt, otpVerified: !!s.otpVerifiedAt, locked: s.otpAttempts >= MAX_ATTEMPTS },
    documents: docs.map((d) => ({ id: d.id, title: d.title })),
    companyName: client?.nameEn ?? "", taskTitle: t.title,
  };
}

export async function requestOtp(ctx: Ctx, token: string) {
  const { s } = await signerByToken(ctx, token);
  if (s.signedAt) throw new SigningError("You've already signed");
  if (s.otpAttempts >= MAX_ATTEMPTS) throw new SigningError("This link is locked after too many wrong codes; ask us for a new one");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await ctx.db.update(signerT).set({ otpHash: Crypto.sha256(`${s.id}:${code}`), otpExpiresAt: new Date(ctx.clock.now().getTime() + OTP_TTL_MS) }).where(eq(signerT.id, s.id));
  await ctx.mail.send({ to: [s.email], subject: "Your signing code", text: `Your code to sign documents is ${code}. It expires in 10 minutes.\n\n您的簽署驗證碼為 ${code}，10分鐘內有效。` });
}

export async function verifyOtp(ctx: Ctx, token: string, code: string) {
  const { s } = await signerByToken(ctx, token);
  if (s.otpAttempts >= MAX_ATTEMPTS) throw new SigningError("This link is locked after too many wrong codes; ask us for a new one");
  if (!s.otpHash || !s.otpExpiresAt) throw new SigningError("Request a code first");
  if (s.otpExpiresAt < ctx.clock.now()) throw new SigningError("The code has expired; request a new one");
  if (!Crypto.safeEqualHex(Crypto.sha256(`${s.id}:${code.trim()}`), s.otpHash)) {
    await ctx.db.update(signerT).set({ otpAttempts: s.otpAttempts + 1 }).where(eq(signerT.id, s.id));
    throw new SigningError(s.otpAttempts + 1 >= MAX_ATTEMPTS ? "Too many wrong codes; this link is now locked" : "That code isn't right");
  }
  await ctx.db.update(signerT).set({ otpVerifiedAt: ctx.clock.now(), otpHash: null }).where(eq(signerT.id, s.id));
}

export async function signDocuments(ctx: Ctx, token: string, sig: { kind: "typed" | "drawn"; data: string; ip: string; userAgent: string }) {
  const { s, env } = await signerByToken(ctx, token);
  if (s.signedAt) throw new SigningError("You've already signed these documents");
  if (!s.otpVerifiedAt) throw new SigningError("Verify the code sent to your email first");
  if (!sig.data.trim()) throw new SigningError("Add your signature");
  if (sig.kind === "drawn" && !/^data:image\/png;base64,/.test(sig.data)) throw new SigningError("Drawn signature must be a PNG");
  await ctx.db.update(signerT).set({ signedAt: ctx.clock.now(), signatureKind: sig.kind, signatureData: sig.data.slice(0, 200_000), ip: sig.ip.slice(0, 64), userAgent: sig.userAgent.slice(0, 300) }).where(eq(signerT.id, s.id));
  await audit(ctx, "signing.signed", "signer", s.id, { envelopeId: env.id, ip: sig.ip }, `signer:${s.email}`);
  await logEvent(ctx, env.taskId, "signing.signed", `${s.name} signed`, { signerId: s.id }, "client");
  const all = await ctx.db.select().from(signerT).where(eq(signerT.envelopeId, env.id));
  if (all.every((x) => x.signedAt || x.id === s.id)) await completeEnvelope(ctx, env.id);
}

async function completeEnvelope(ctx: Ctx, envelopeId: string) {
  const env = (await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, envelopeId) }))!;
  const signers = await ctx.db.select().from(signerT).where(eq(signerT.envelopeId, envelopeId));
  const t = await getTask(ctx, env.taskId);
  const genIdx = t._steps.findIndex((x) => x.kind === "generate");
  const gen = (stepData(t, genIdx).signatureFields as GenDoc[] | undefined) ?? [];
  const signedIds: string[] = [];
  for (const docId of env.documentIds) {
    const orig = (await ctx.db.query.document.findFirst({ where: eq(document.id, docId) }))!;
    const fields = gen.find((g) => g.id === docId)?.fields ?? [];
    const { pdf, certificate } = await stampPdf(await ctx.storage.get(orig.storageKey!), orig, signers, fields, ctx.clock.now());
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
  const fonts = await embedFonts(doc, "tc");
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
        page.drawText(s.signatureData.slice(0, 60), { x: f.x + 4, y: f.y + 6, size: 16, font: fonts.pick(s.signatureData), color: rgb(0.1, 0.16, 0.45) });
      }
      page.drawText(`Signed electronically ${now.toISOString().slice(0, 16).replace("T", " ")} UTC`, { x: f.x, y: f.y - 44, size: 6.5, font: fonts.regular, color: rgb(0.42, 0.45, 0.5) });
    }
  }
  // Audit certificate page.
  const lines = [
    "Certificate of electronic signature / 電子簽署證明",
    `Document: ${orig.title}`,
    `Unsigned document SHA-256: ${orig.sha256}`,
    `Completed: ${now.toISOString()}`,
    "",
    ...signers.flatMap((s) => [
      `${s.name} (${s.role ?? "signer"}) <${s.email}>`,
      `  Code sent to email and verified: ${s.otpVerifiedAt?.toISOString() ?? "—"}`,
      `  Signed: ${(s.signedAt ?? now).toISOString()}  ·  ${s.signatureKind ?? "typed"} signature`,
      `  IP address: ${s.ip ?? "—"}  ·  Device: ${(s.userAgent ?? "—").slice(0, 70)}`,
      "",
    ]),
    "Signed under the Electronic Transactions Ordinance (Cap. 553). Each signer opened a personal single-use link",
    "and confirmed a one-time code sent to their email before signing.",
  ];
  const page = doc.addPage([595, 842]);
  let y = 780;
  for (const l of lines) { page.drawText(l, { x: 56, y, size: l === lines[0] ? 13 : 9, font: l === lines[0] ? fonts.bold : fonts.pick(l), color: rgb(0.09, 0.09, 0.11) }); y -= l === lines[0] ? 24 : 14; }
  return { pdf: Buffer.from(await doc.save()), certificate: lines.join("\n") };
}

export async function envelopeStatus(ctx: Ctx, taskId: string) {
  const envs = await ctx.db.select().from(signEnvelope).where(and(eq(signEnvelope.taskId, taskId)));
  const out = [];
  for (const e of envs) out.push({ ...e, signers: (await ctx.db.select().from(signerT).where(eq(signerT.envelopeId, e.id))).map((s) => ({ name: s.name, email: s.email, signedAt: s.signedAt, otpVerifiedAt: s.otpVerifiedAt })) });
  return out;
}
