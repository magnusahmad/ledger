import { beforeEach, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { PDFDocument, degrees } from "pdf-lib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { pdfTextRuns } from "./pdf-text-runs";
import { seedDemo } from "@/db/seed-demo";
import { client, document, signEnvelope, signer } from "@/db/schema";
import { createPerson } from "@/domain/records";
import { startManualRequest } from "@/domain/manual";
import { getRequest, getTask, stepData } from "@/domain/engine";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { portalUpload } from "@/domain/portal";
import { openSigning, requestOtp, signDocuments, verifyOtp } from "@/domain/signing";
import { Crypto } from "@/lib/crypto";
import "@/domain/inbound";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx(); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.set("draft", goodDraft); ctx.llm.set("extract", { fields: [], documents: [], conflicts: [] });
  await ctx.db.update(client).set({ docLang: "tc" }).where(eq(client.id, "cli_c1"));
});
async function preparedPack(rotate = false) {
  const p = await createPerson(ctx, { nameEn: "Fictional Appointee", nameZh: "虛構獲委任董事", email: "fictional.appointee@audit.example", idNumber: "K987654(3)", residentialAddress: "Fictional home", correspondenceAddress: "Fictional office" });
  const req = await startManualRequest(ctx, { clientId: "cli_c1", confirm: true, items: [{ playbookId: "hk.appointDirector", person: { personId: p.id }, fields: { effDate: "2026-09-29" } }] });
  await approveProposal(ctx, req.proposalId!);
  const taskId = req.taskIds[0], request = await getRequest(ctx, req.requestId);
  const evidence = await PDFDocument.create(); evidence.addPage().drawText("Fictional identity evidence");
  const bytes = Buffer.from(await evidence.save());
  for (const key of ["idCopy", "addrProof"]) await portalUpload(ctx, request.uploadToken, { taskId, key, filename: `${key}.pdf`, mime: "application/pdf", content: bytes });
  await portalUpload(ctx, request.uploadToken, { taskId, key: "selfie", filename: "fictional-readable.png", mime: "image/png", content: await readFile("eval/fixtures/fictional-readable.png") });
  const task = await getTask(ctx, taskId); expect(task._steps[task.stepIndex].kind).toBe("sign");
  const card = (await pendingProposals(ctx, { taskId, kind: "send_signing" }))[0];
  const originals = await ctx.db.select().from(document).where(and(eq(document.taskId, taskId), eq(document.source, "generated")));
  if (rotate) for (const row of originals.filter(d => d.kind !== "form")) {
    // A controlled rotated original, captured before human approval. No post-approval edit.
    const pdf = await PDFDocument.load(await ctx.storage.get(row.storageKey!));
    pdf.getPages()[0].setRotation(degrees(90));
    const rotated = Buffer.from(await pdf.save()); await ctx.storage.put(row.storageKey!, rotated);
    await ctx.db.update(document).set({ sha256: Crypto.sha256(rotated) }).where(eq(document.id, row.id));
    row.sha256 = Crypto.sha256(rotated);
  }
  await approveProposal(ctx, card.id);
  const links = ctx.mail.sent().filter(m => m.subject === `Documents to sign: ${task.title}`).map(m => m.text.match(/\/sign\/([A-Za-z0-9]+)/)![1]);
  expect(links).toHaveLength(2);
  for (const token of links) {
    const view = await openSigning(ctx, token); await requestOtp(ctx, token);
    const code = ctx.mail.sent().filter(m => m.to.includes(view.signer.email)).at(-1)!.text.match(/\b(\d{6})\b/)![1];
    await verifyOtp(ctx, token, code);
  }
  return { task, card, originals, links, appointee: p };
}
const ordinary = { kind: "typed" as const, data: "Fictional Signer", ip: "203.0.113.8", userAgent: "fictional-output-audit" };
async function saved(name: string, bytes: Buffer) {
  if (process.env.AUDIT_OUTPUT_DIR) {
    if (!path.resolve(process.env.AUDIT_OUTPUT_DIR).startsWith("/private/tmp/harbourline-")) throw new Error("Use isolated temporary artifacts");
    await mkdir(process.env.AUDIT_OUTPUT_DIR, { recursive: true });
    await writeFile(path.join(process.env.AUDIT_OUTPUT_DIR, `${name}.pdf`), bytes);
  }
  return pdfTextRuns(bytes);
}

it("PACK11 an individual document certificate distinguishes its signers from other participants in the same envelope", async () => {
  const p = await preparedPack(); for (const token of p.links) await signDocuments(ctx, token, ordinary);
  const consent = p.originals.find(d => d.title.startsWith("Consent"))!;
  const signed = (await ctx.db.select().from(document).where(and(eq(document.taskId, p.task.id), eq(document.source, "signed")))).find(d => d.title === `${consent.title} (signed)`)!;
  const sourcePages = (await PDFDocument.load(await ctx.storage.get(consent.storageKey!))).getPageCount();
  const { runs } = await saved("pack11-consent-certificate", await ctx.storage.get(signed.storageKey!));
  const certificate = runs.filter(r => r.page >= sourcePages).map(r => r.text).join("\n");
  expect(certificate).toContain(consent.sha256!); expect(certificate).toContain(p.appointee.email!);
  const people = p.card.payload.signers as { email: string; docIds: string[] }[];
  const unrelated = people.filter(s => !s.docIds.includes(consent.id)); expect(unrelated).toHaveLength(1);
  for (const other of unrelated) if (certificate.includes(other.email)) {
    // Keeping envelope-wide evidence is allowed; it must not claim this person signed this document.
    const heading = /Other (?:envelope |pack )participants|Envelope participants/i;
    expect(certificate).toMatch(heading);
    expect(certificate.split(heading)[0]).not.toContain(other.email);
  }
});

it("PACK12 a long typed signature is rendered completely inside its approved field or rejected before signature state commits", async () => {
  const p = await preparedPack();
  const mark = "Fictional Very Long Typed Signature ".repeat(4).trim();
  const before = await ctx.db.select().from(signer).where(eq(signer.envelopeId, p.card.payload.envelopeId as string));
  let error: unknown;
  try { await signDocuments(ctx, p.links[0], { ...ordinary, data: mark }); } catch (e) { error = e; }
  if (error) {
    expect(String(error)).toMatch(/signature.*(?:long|fit|size)|(?:long|fit|size).*signature/i);
    expect(await ctx.db.select().from(signer).where(eq(signer.envelopeId, p.card.payload.envelopeId as string))).toEqual(before);
    expect(await ctx.db.select().from(document).where(and(eq(document.taskId, p.task.id), eq(document.source, "signed")))).toHaveLength(0);
    return;
  }
  const view = await openSigning(ctx, p.links[0]);
  await signDocuments(ctx, p.links[1], ordinary);
  const fields = stepData(p.task, p.task._steps.findIndex(s => s.kind === "generate")).signatureFields as { id: string; fields: { field: string; page: number; x: number; y: number; w: number; h: number }[] }[];
  const recipients = p.card.payload.signers as { personId: string; name: string; docIds: string[] }[];
  const actor = recipients.find(s => s.name === view.signer.name)!;
  const originals = p.originals.filter(d => actor.docIds.includes(d.id)); expect(originals.length).toBeGreaterThan(0);
  for (const orig of originals) {
    const row = (await ctx.db.select().from(document).where(and(eq(document.taskId, p.task.id), eq(document.source, "signed")))).find(d => d.title === `${orig.title} (signed)`)!;
    const { runs } = await saved(`pack12-long-mark-${orig.id}`, await ctx.storage.get(row.storageKey!));
    const sourcePages = (await PDFDocument.load(await ctx.storage.get(orig.storageKey!))).getPageCount();
    expect(runs.filter(r => r.page < sourcePages).map(r => r.text).join(" ").replace(/\s+/g," ")).toContain(mark);
    for (const f of fields.find(d => d.id === orig.id)!.fields.filter(f => f.field === `sign:${actor.personId}`)) {
      const marks = runs.filter(r => r.page === f.page && r.y >= f.y && r.y <= f.y + f.h && r.text.includes("Fictional"));
      expect(marks.length).toBeGreaterThan(0);
      for (const m of marks) { expect(m.x).toBeGreaterThanOrEqual(f.x); expect(m.x + m.width).toBeLessThanOrEqual(f.x + f.w + 0.01); }
    }
  }
});

it("PACK13 signing a pre-approved rotated original retains its rotation, unsigned hash and source-page signature positions", async () => {
  const p = await preparedPack(true); for (const token of p.links) await signDocuments(ctx, token, ordinary);
  const env = (await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, p.card.payload.envelopeId as string) }))!;
  expect(env.status).toBe("completed");
  const originals = p.originals.filter(d => d.kind !== "form"); expect(originals).toHaveLength(2);
  for (const [i, orig] of originals.entries()) {
    const row = (await ctx.db.select().from(document).where(and(eq(document.taskId, p.task.id), eq(document.source, "signed")))).find(d => d.title === `${orig.title} (signed)`)!;
    const bytes = await ctx.storage.get(row.storageKey!); expect(Crypto.sha256(bytes)).toBe(row.sha256);
    const { pdf, runs } = await saved(`pack13-rotated-${i}`, bytes);
    expect(pdf.getPages()[0].getRotation().angle).toBe(90);
    expect(runs.filter(r => r.page === 0).map(r => r.text)).toContain(ordinary.data);
    expect(row.extractedText).toContain(orig.sha256!);
  }
});
