// Fictional configured E2E data only. Approval/OTP/signing use real domain actions.
import path from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { makeRuntimeCtx, STORAGE_ROOT } from "../../src/lib/runtime";
import { closePools } from "../../src/db/client";
import { createPerson } from "../../src/domain/records";
import { startManualRequest } from "../../src/domain/manual";
import { getRequest, getTask } from "../../src/domain/engine";
import { approveProposal, pendingProposals } from "../../src/domain/proposals";
import { portalUpload } from "../../src/domain/portal";
import { openSigning, requestOtp, signDocuments, verifyOtp } from "../../src/domain/signing";
import { client, document, signEnvelope, signer } from "../../src/db/schema";
import { Crypto } from "../../src/lib/crypto";
import { FakeMail } from "../../src/integrations/mail/fake";
import "../../src/domain/inbound";

const database = new URL(process.env.DATABASE_URL ?? "invalid:"); const relative = path.relative(process.cwd(), STORAGE_ROOT);
if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) || !database.pathname.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e" || process.env.SCREENING_PROVIDER !== "fake" || !relative || relative.startsWith("..") || path.isAbsolute(relative) || !path.basename(STORAGE_ROOT).includes("e2e")) throw new Error("Signing artifact fixture requires configured local E2E database and fake providers/storage");
const ctx = makeRuntimeCtx({ bankProvider: "fake", accountingProvider: "fake" });
const fixturePath = path.join(STORAGE_ROOT, "signing-artifact.json");
type Fixture = { taskId: string; envelopeId: string; token: string; name: string; email: string; language: "en" | "tc" | "sc"; originalId: string; originalKey: string; originalHash: string; originalBase64: string };
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
async function verify(token: string) {
  const view = await openSigning(ctx, token); await requestOtp(ctx, token);
  const code = (ctx.mail as FakeMail).sent().filter(m => m.to.includes(view.signer.email)).at(-1)!.text.match(/\b(\d{6})\b/)![1];
  await verifyOtp(ctx, token, code); return view;
}
try {
  const mode = process.argv[2];
  if (mode === "seed") {
    const language = process.argv[3] as Fixture["language"]; if (!["en", "tc", "sc"].includes(language)) throw new Error("Expected EN/TC/SC fixture language");
    await ctx.db.update(client).set({ messageLang: language, docLang: language }).where(eq(client.id, "cli_c1"));
    const name = language === "en" ? "Artifact Browser Appointee" : language === "tc" ? "測試簽署董事" : "测试签署董事";
    const person = await createPerson(ctx, { nameEn: name, nameZh: name, email: "artifact.browser@audit.example", idNumber: "K987654(3)", residentialAddress: "Fictional signing home", correspondenceAddress: "Fictional signing office" });
    const r = await startManualRequest(ctx, { clientId: "cli_c1", confirm: true, items: [{ playbookId: "hk.appointDirector", person: { personId: person.id }, fields: { effDate: ctx.clock.today() } }] });
    await approveProposal(ctx, r.proposalId!); const taskId = r.taskIds[0]; const request = await getRequest(ctx, r.requestId);
    const pdf = await PDFDocument.create(); pdf.addPage().drawText("Fictional browser signing identity evidence");
    for (const key of ["idCopy", "addrProof"]) await portalUpload(ctx, request.uploadToken, { taskId, key, filename: `${key}.pdf`, mime: "application/pdf", content: Buffer.from(await pdf.save()) });
    await portalUpload(ctx, request.uploadToken, { taskId, key: "selfie", filename: "selfie.png", mime: "image/png", content: Buffer.from(png.split(",")[1], "base64") });
    const p = (await pendingProposals(ctx, { taskId, kind: "send_signing" }))[0]; if (!p) throw new Error("Fixture did not reach human signing gate"); await approveProposal(ctx, p.id);
    const t = await getTask(ctx, taskId); const invitations = (ctx.mail as FakeMail).sent().filter(m => m.subject === `Documents to sign: ${t.title}`);
    if (invitations.length !== 2) throw new Error("Expected two actual signing recipients");
    const links = invitations.map(m => m.text.match(/\/sign\/([A-Za-z0-9]+)/)![1]);
    await verify(links[0]); await signDocuments(ctx, links[0], { kind: "drawn", data: png, ip: "203.0.113.55", userAgent: "fictional-browser-first-recipient" });
    const view = await openSigning(ctx, links[1]); const original = await ctx.db.query.document.findFirst({ where: eq(document.id, view.documents[0].id) });
    if (!original?.storageKey || !original.sha256) throw new Error("Expected generated approved PDF");
    const f: Fixture = { taskId, envelopeId: p.payload.envelopeId as string, token: links[1], name: view.signer.name, email: view.signer.email, language, originalId: original.id, originalKey: original.storageKey, originalHash: original.sha256, originalBase64: (await ctx.storage.get(original.storageKey)).toString("base64") };
    writeFileSync(fixturePath, JSON.stringify(f));
    // Private fixture file contains the personal link. stdout carries no token/code.
    console.log(JSON.stringify({ ok: true }));
  } else {
    const f = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
    if (mode === "corrupt") {
      const replacement = await PDFDocument.create(); replacement.addPage().drawText("UNAPPROVED changed browser PDF bytes");
      await ctx.storage.put(f.originalKey, Buffer.from(await replacement.save())); console.log(JSON.stringify({ ok: true }));
    } else if (mode === "restore") {
      await ctx.storage.put(f.originalKey, Buffer.from(f.originalBase64, "base64")); console.log(JSON.stringify({ ok: true }));
    } else if (mode === "snapshot") {
      const t = await getTask(ctx, f.taskId); const env = await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, f.envelopeId) });
      const signed = await ctx.db.select().from(document).where(and(eq(document.taskId, f.taskId), eq(document.source, "signed")));
      const people = await ctx.db.select({ id: signer.id, signedAt: signer.signedAt }).from(signer).where(eq(signer.envelopeId, f.envelopeId));
      console.log(JSON.stringify({ status: env?.status, signedIds: env?.signedDocumentIds, people, signed: signed.map(d => ({ id: d.id, title: d.title, sha256: d.sha256, certificate: d.extractedText, language: d.language })), hashes: await Promise.all(signed.map(async d => [d.id, Crypto.sha256(await ctx.storage.get(d.storageKey!))])), step: t._steps[t.stepIndex].kind, filingCount: (await pendingProposals(ctx, { taskId: t.id, kind: "record_filing" })).length }));
    } else if (mode === "export") {
      const shots = path.join(STORAGE_ROOT, "shots"); mkdirSync(shots, { recursive: true });
      const docs = await ctx.db.select().from(document).where(and(eq(document.taskId, f.taskId), eq(document.source, "signed")));
      for (const [index, doc] of docs.entries()) writeFileSync(path.join(shots, `signing-artifact-${f.language}-${index + 1}.pdf`), await ctx.storage.get(doc.storageKey!));
      const originals = await ctx.db.select().from(document).where(and(eq(document.taskId, f.taskId), eq(document.source, "generated")));
      for (const [index, doc] of originals.entries()) writeFileSync(path.join(shots, `signing-artifact-${f.language}-unsigned-${index + 1}.pdf`), await ctx.storage.get(doc.storageKey!));
      writeFileSync(path.join(shots, `signing-artifact-${f.language}-hashes.json`), JSON.stringify([...originals, ...docs].map(d => ({ id: d.id, title: d.title, source: d.source, sha256: d.sha256 })), null, 2));
      writeFileSync(path.join(shots, `signing-artifact-${f.language}-original.pdf`), Buffer.from(f.originalBase64, "base64")); console.log(JSON.stringify({ count: docs.length }));
    } else throw new Error("Expected seed, corrupt, restore, snapshot or export");
  }
} finally { await closePools(); }
