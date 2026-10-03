// Area 3 cross-lifecycle original reporter: fictional two-task engagements, actual
// human-approved FakeMail delivery, public uploads/OTP signing, immutable statutory history.
import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft, review } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { applyReview } from "@/agent/review";
import { startManualRequest } from "@/domain/manual";
import { advance, getRequest, getTask, taskEvents } from "@/domain/engine";
import { approveProposal, createProposal, getProposal, pendingProposals } from "@/domain/proposals";
import { createPerson, officersAsAt } from "@/domain/records";
import { portalSubmitField, portalUpload, portalView } from "@/domain/portal";
import { openSigning, requestOtp, signDocuments, verifyOtp } from "@/domain/signing";
import { runJobs } from "@/domain/jobs";
import { appointment, client, document, filing, proposal, signEnvelope, signer } from "@/db/schema";
import { readFormValues } from "@/documents/cr-forms";
import { Crypto } from "@/lib/crypto";
import "@/domain/inbound";

let ctx: TestCtx;
let pdf: Buffer;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
beforeEach(async () => {
  await resetDb(); ctx = makeCtx({ now: "2026-10-02T02:00:00Z" });
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.set("draft", goodDraft); ctx.llm.set("extract", { fields: [], documents: [], conflicts: [] });
  const doc = await PDFDocument.create(); const page = doc.addPage(); page.drawText("Fictional OLD appointee identity document"); pdf = Buffer.from(await doc.save());
});

function invite(taskTitle: string, email: string) {
  const sent = ctx.mail.sent().filter(m => m.subject === `Documents to sign: ${taskTitle}` && m.to.includes(email)).at(-1);
  expect(sent, `Expected actual invitation to ${email} for ${taskTitle}`).toBeDefined();
  return sent!.text.match(/\/sign\/([A-Za-z0-9]+)/)![1];
}
async function sign(token: string) {
  const view = await openSigning(ctx, token);
  await requestOtp(ctx, token);
  const otp = ctx.mail.sent().filter(m => m.to.includes(view.signer.email)).at(-1)!.text.match(/\b(\d{6})\b/)![1];
  await verifyOtp(ctx, token, otp);
  await signDocuments(ctx, token, { kind: "typed", data: view.signer.name, ip: "203.0.113.45", userAgent: "fictional-lifecycle-audit" });
}
async function snapshotTask(id: string) {
  const docs = await ctx.db.select().from(document).where(eq(document.taskId, id));
  const envelopes = await ctx.db.select().from(signEnvelope).where(eq(signEnvelope.taskId, id));
  const signerRows = await ctx.db.select().from(signer);
  return {
    task: await getTask(ctx, id), docs,
    bytes: await Promise.all(docs.filter(d => d.storageKey).map(async d => [d.id, Crypto.sha256(await ctx.storage.get(d.storageKey!))])),
    envelopes, signers: signerRows.filter(s => envelopes.some(e => e.id === s.envelopeId)),
    proposals: await ctx.db.select().from(proposal).where(eq(proposal.taskId, id)),
    filings: await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, id)),
    appointments: await ctx.db.select().from(appointment).where(eq(appointment.sourceTaskId, id)),
    events: await taskEvents(ctx, id),
  };
}
async function signingPair() {
  const person = await createPerson(ctx, { nameEn: "Lifecycle Old Appointee", nameZh: "測試原董事", idNumber: "K987654(3)", residentialAddress: "Fictional old home", correspondenceAddress: "Fictional old office", email: "lifecycle.old@audit.example", phone: "+852 9000 0001" });
  const result = await startManualRequest(ctx, { clientId: "cli_c1", confirm: true, notes: "Fictional appointment and office move, agreed in person", items: [
    { playbookId: "hk.appointDirector", person: { personId: person.id }, fields: { effDate: "2026-10-02" } },
    { playbookId: "hk.changeOffice", fields: { effDate: "2026-10-02", newAddr: "Lifecycle sibling office, Hong Kong" } },
  ] });
  const [primaryId, siblingId] = result.taskIds;
  expect(ctx.mail.sent()).toHaveLength(0);
  await approveProposal(ctx, result.proposalId!);
  expect(ctx.mail.sent()).toHaveLength(1);
  expect(ctx.mail.sent()[0].attachmentNames).toHaveLength(1);
  const request = await getRequest(ctx, result.requestId);
  expect(ctx.mail.sent()[0].text).toContain(`/u/${request.uploadToken}`);
  for (const key of ["idCopy", "addrProof"]) await portalUpload(ctx, request.uploadToken, { taskId: primaryId, key, filename: `${key}-old.pdf`, mime: "application/pdf", content: pdf });
  await portalUpload(ctx, request.uploadToken, { taskId: primaryId, key: "selfie", filename: "selfie-old.png", mime: "image/png", content: png });
  await portalUpload(ctx, request.uploadToken, { taskId: siblingId, key: "premises", filename: "sibling-premises.pdf", mime: "application/pdf", content: pdf });
  const primary = await getTask(ctx, primaryId); const sibling = await getTask(ctx, siblingId);
  expect(primary._steps[primary.stepIndex].kind).toBe("sign"); expect(sibling._steps[sibling.stepIndex].kind).toBe("sign");
  const primaryPack = (await pendingProposals(ctx, { taskId: primaryId, kind: "send_signing" }))[0];
  const siblingPack = (await pendingProposals(ctx, { taskId: siblingId, kind: "send_signing" }))[0];
  await approveProposal(ctx, primaryPack.id); await approveProposal(ctx, siblingPack.id);
  expect(ctx.mail.sent()).toHaveLength(4);
  const appointeeToken = invite(primary.title, person.email!); const directorToken = invite(primary.title, "director@kbtrading.example");
  const siblingToken = invite(sibling.title, "director@kbtrading.example");
  return { request, primary, sibling, person, primaryPack, siblingPack, appointeeToken, directorToken, siblingToken };
}
async function atFile(pair: Awaited<ReturnType<typeof signingPair>>) {
  await sign(pair.appointeeToken); await sign(pair.directorToken);
  const t = await getTask(ctx, pair.primary.id); expect(t._steps[t.stepIndex].kind).toBe("file");
  const p = (await pendingProposals(ctx, { taskId: t.id, kind: "record_filing" }))[0]; expect(p).toBeDefined(); return p;
}
async function atRegister(pair: Awaited<ReturnType<typeof signingPair>>) {
  const p = await atFile(pair);
  await approveProposal(ctx, p.id, { edits: { reference: "LIFECYCLE-ND2A-ORIGINAL", filedOn: "2026-10-02" } });
  const t = await getTask(ctx, pair.primary.id); expect(t._steps[t.stepIndex].kind).toBe("register");
  return (await pendingProposals(ctx, { taskId: t.id, kind: "register_change" }))[0];
}

async function dateReview(taskId: string, date: string, withChecklist = true) {
  return applyReview(ctx, taskId, review({ effectiveDate: date, items: withChecklist ? [{ key: "effDate", personId: null, status: "received", value: date, reason: "Client amended the appointment date" }] : [], summary: "Appointment date changed" }), { clientId: "cli_c1", actor: ctx.userId });
}
async function currentFormDate(taskId: string) {
  const t = await getTask(ctx, taskId);
  const generated = t.stepState[String(t._steps.findIndex(s => s.kind === "generate"))] as { documentIds: string[] };
  const docs = await ctx.db.select().from(document).where(eq(document.taskId, taskId));
  const nd2a = docs.find(d => generated.documentIds.includes(d.id) && d.title.startsWith("Form ND2A"))!;
  return readFormValues(await ctx.storage.get(nd2a.storageKey!));
}

describe("Area 3: amended engagements preserve signatures, sibling work and statutory history", () => {
  it("LREC01 an effectiveDate-only amendment after one signer synchronizes checklist and fresh form dates, withdraws old links and preserves sibling work", async () => {
    const pair = await signingPair(); await sign(pair.appointeeToken);
    const sibling = await snapshotTask(pair.sibling.id); const company = await ctx.db.query.client.findFirst({ where: eq(client.id, "cli_c1") });
    await dateReview(pair.primary.id, "2026-10-05", false); await advance(ctx, pair.primary.id);
    const changed = await getTask(ctx, pair.primary.id);
    expect.soft(changed.effectiveDate).toBe("2026-10-05");
    expect.soft(changed.checklist.find(e => e.key === "effDate")?.value).toBe("2026-10-05");
    expect.soft((await currentFormDate(changed.id))["fill_21_P.2"]).toBe("05");
    await expect(openSigning(ctx, pair.directorToken)).rejects.toThrow(/withdraw|current|invalid/i);
    await expect(signDocuments(ctx, pair.directorToken, { kind: "typed", data: "CHAN Tai Man", ip: "", userAgent: "" })).rejects.toThrow();
    expect(await snapshotTask(pair.sibling.id)).toEqual(sibling);
    expect(await ctx.db.query.client.findFirst({ where: eq(client.id, "cli_c1") })).toEqual(company);
    expect(await ctx.db.select().from(appointment).where(eq(appointment.sourceTaskId, changed.id))).toHaveLength(0);
    const fresh = (await pendingProposals(ctx, { taskId: changed.id, kind: "send_signing" }))[0]; expect(fresh.id).not.toBe(pair.primaryPack.id);
    await approveProposal(ctx, fresh.id);
    const newToken = invite(changed.title, pair.person.email!); expect(newToken).not.toBe(pair.appointeeToken);
    expect((await openSigning(ctx, newToken)).documents.length).toBeGreaterThan(0);
  }, 120_000);

  it("LREC02 a delayed upload captured before an appointee switch cannot attach the old person's ID to the replacement person", async () => {
    const pair = await signingPair(); await sign(pair.appointeeToken);
    const oldView = await portalView(ctx, pair.request.uploadToken, "en");
    expect(oldView.tasks.find(t => t.taskId === pair.primary.id)!.items.find(i => i.key === "idCopy")!.personId).toBe(pair.person.id);
    const replacement = await createPerson(ctx, { nameEn: "Lifecycle Replacement", email: "replacement@audit.example", correspondenceAddress: "Fictional replacement office" });
    await applyReview(ctx, pair.primary.id, review({ switchPerson: { personId: replacement.id, nameEn: replacement.nameEn, nameZh: null }, items: [], summary: "Replace the named appointee" }), { clientId: "cli_c1", actor: ctx.userId });
    const current = await getTask(ctx, pair.primary.id); expect(current.personId).toBe(replacement.id);
    const before = await snapshotTask(current.id); const sibling = await snapshotTask(pair.sibling.id); const storedBytes = ctx.storage.files.size;
    const oldPersonId = oldView.tasks.find(t => t.taskId === current.id)!.items.find(i => i.key === "idCopy")!.personId;
    const delayed = { taskId: current.id, key: "idCopy", expectedPersonId: oldPersonId, filename: "OLD-person-delayed-ID.pdf", mime: "application/pdf", content: pdf };
    await expect.soft(portalUpload(ctx, pair.request.uploadToken, delayed)).rejects.toThrow(/changed|current|refresh|invalid|withdraw/i);
    expect.soft(await snapshotTask(current.id)).toEqual(before); expect.soft(ctx.storage.files.size).toBe(storedBytes);
    expect(await snapshotTask(pair.sibling.id)).toEqual(sibling);
    await expect(openSigning(ctx, pair.directorToken)).rejects.toThrow();
    // Reloading the shared request link remains supported: the freshly rendered
    // person fence lets the new appointee provide their own document.
    const freshView = await portalView(ctx, pair.request.uploadToken, "en");
    const freshPerson = freshView.tasks.find(t => t.taskId === current.id)!.items.find(i => i.key === "idCopy")!.personId;
    expect(freshPerson).toBe(replacement.id);
    const ownPdf = await PDFDocument.create(); ownPdf.addPage().drawText("Fictional REPLACEMENT appointee ID");
    const freshUpload = { taskId: current.id, key: "idCopy", expectedPersonId: freshPerson, filename: "replacement-current-ID.pdf", mime: "application/pdf", content: Buffer.from(await ownPdf.save()) };
    await portalUpload(ctx, pair.request.uploadToken, freshUpload);
    const received = (await getTask(ctx, current.id)).checklist.find(e => e.key === "idCopy")!;
    expect(received).toMatchObject({ personId: replacement.id, status: "received" });
    expect(await ctx.db.query.document.findFirst({ where: eq(document.id, received.documentId!) })).toMatchObject({ personId: replacement.id, title: "replacement-current-ID.pdf" });
    expect(await snapshotTask(pair.sibling.id)).toEqual(sibling);
  }, 120_000);

  it("LREC03 cancelling one partly signed task rejects late upload/signature replay while the sibling's approved pack can finish normally", async () => {
    const pair = await signingPair(); await sign(pair.appointeeToken); const sibling = await snapshotTask(pair.sibling.id);
    const cancel = await createProposal(ctx, { kind: "cancel_task", title: "Cancel only the appointment", taskId: pair.primary.id, clientId: "cli_c1", requestId: pair.request.id, payload: { taskId: pair.primary.id, reason: "Client cancelled only the appointment", voidInvoice: false } });
    await approveProposal(ctx, cancel.id);
    const cancelled = await snapshotTask(pair.primary.id); const bytes = ctx.storage.files.size;
    await expect(portalUpload(ctx, pair.request.uploadToken, { taskId: pair.primary.id, key: "selfie", filename: "late-selfie.png", mime: "image/png", content: png })).rejects.toThrow();
    await expect(portalSubmitField(ctx, pair.request.uploadToken, { taskId: pair.primary.id, key: "effDate", value: "2026-10-05" })).rejects.toThrow();
    await expect(signDocuments(ctx, pair.directorToken, { kind: "typed", data: "CHAN Tai Man", ip: "", userAgent: "" })).rejects.toThrow();
    expect(await snapshotTask(pair.primary.id)).toEqual(cancelled); expect(ctx.storage.files.size).toBe(bytes);
    expect(await snapshotTask(pair.sibling.id)).toEqual(sibling);
    expect((await portalView(ctx, pair.request.uploadToken)).tasks.map(t => t.taskId)).toEqual([pair.sibling.id]);
    await sign(pair.siblingToken);
    const fp = (await pendingProposals(ctx, { taskId: pair.sibling.id, kind: "record_filing" }))[0];
    await approveProposal(ctx, fp.id, { edits: { reference: "LIFECYCLE-SIBLING-NR1", filedOn: "2026-10-02" } });
    const rp = (await pendingProposals(ctx, { taskId: pair.sibling.id, kind: "register_change" }))[0];
    expect((await ctx.db.query.client.findFirst({ where: eq(client.id, "cli_c1") }))!.regOfficeEn).not.toBe("Lifecycle sibling office, Hong Kong");
    await approveProposal(ctx, rp.id);
    expect((await ctx.db.query.client.findFirst({ where: eq(client.id, "cli_c1") }))!.regOfficeEn).toBe("Lifecycle sibling office, Hong Kong");
    expect((await getTask(ctx, pair.primary.id)).status).toBe("cancelled");
  }, 120_000);

  it("LREC04 an amendment after recording the authority filing requires an explicit corrective path and cannot erase filing proof or regenerate the original task", async () => {
    const pair = await signingPair(); await atRegister(pair);
    const before = await snapshotTask(pair.primary.id); const sibling = await snapshotTask(pair.sibling.id); const bytes = ctx.storage.files.size;
    await expect.soft(dateReview(pair.primary.id, "2026-10-05")).rejects.toThrow(/filed|filing|correct|escalat/i);
    expect.soft(await snapshotTask(pair.primary.id)).toEqual(before); expect.soft(ctx.storage.files.size).toBe(bytes);
    expect(await snapshotTask(pair.sibling.id)).toEqual(sibling);
  }, 120_000);

  it("LREC05 a late portal date submission after approved register effects cannot rewrite the source task's historical facts", async () => {
    const pair = await signingPair(); const register = await atRegister(pair); await approveProposal(ctx, register.id);
    expect((await getTask(ctx, pair.primary.id))._steps[(await getTask(ctx, pair.primary.id)).stepIndex].kind).toBe("confirm");
    expect((await officersAsAt(ctx, "cli_c1", "2026-10-02", "director")).some(o => o.personId === pair.person.id)).toBe(true);
    const before = await snapshotTask(pair.primary.id); const sibling = await snapshotTask(pair.sibling.id);
    await expect.soft(portalSubmitField(ctx, pair.request.uploadToken, { taskId: pair.primary.id, key: "effDate", value: "2026-10-05" })).rejects.toThrow(/file|register|correct|complete|current|invalid/i);
    expect.soft(await snapshotTask(pair.primary.id)).toEqual(before); expect(await snapshotTask(pair.sibling.id)).toEqual(sibling);
    expect((await ctx.db.select().from(appointment).where(eq(appointment.sourceTaskId, pair.primary.id)))[0].fromDate).toBe("2026-10-02");
  }, 120_000);

  it("LREC06 completed registered work cannot be retargeted to a new person by a later requirement review", async () => {
    const pair = await signingPair(); const register = await atRegister(pair); await approveProposal(ctx, register.id);
    await runJobs(ctx);
    const confirmation = (await pendingProposals(ctx, { taskId: pair.primary.id, kind: "send_message" }))[0]; expect(confirmation).toBeDefined();
    await approveProposal(ctx, confirmation.id); expect((await getTask(ctx, pair.primary.id)).status).toBe("done");
    const replacement = await createPerson(ctx, { nameEn: "Late replacement after completion", email: "late@audit.example" });
    const before = await snapshotTask(pair.primary.id); const sibling = await snapshotTask(pair.sibling.id);
    await expect.soft(applyReview(ctx, pair.primary.id, review({ switchPerson: { personId: replacement.id, nameEn: replacement.nameEn, nameZh: null }, effectiveDate: "2026-10-05", items: [], summary: "Replace the person after completion" }), { clientId: "cli_c1", actor: ctx.userId })).rejects.toThrow(/complete|file|register|correct|closed/i);
    expect.soft(await snapshotTask(pair.primary.id)).toEqual(before); expect(await snapshotTask(pair.sibling.id)).toEqual(sibling);
  }, 120_000);

  it("LREC07 amendment before filing rejects the obsolete filing preview and only a freshly signed and approved pack can create the dated appointment", async () => {
    const pair = await signingPair(); const oldFile = await atFile(pair); const sibling = await snapshotTask(pair.sibling.id);
    await dateReview(pair.primary.id, "2026-10-05"); await advance(ctx, pair.primary.id);
    expect((await getProposal(ctx, oldFile.id)).status).toBe("superseded");
    const beforeStale = await snapshotTask(pair.primary.id);
    await expect(approveProposal(ctx, oldFile.id, { edits: { reference: "OBSOLETE-FILING-REF", filedOn: "2026-10-02" } })).rejects.toThrow();
    expect(await snapshotTask(pair.primary.id)).toEqual(beforeStale);
    expect(await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, pair.primary.id))).toHaveLength(0);
    expect(await ctx.db.select().from(appointment).where(eq(appointment.sourceTaskId, pair.primary.id))).toHaveLength(0);
    const fresh = (await pendingProposals(ctx, { taskId: pair.primary.id, kind: "send_signing" }))[0]; await approveProposal(ctx, fresh.id);
    expect((await currentFormDate(pair.primary.id))["fill_21_P.2"]).toBe("05");
    await sign(invite(pair.primary.title, pair.person.email!)); await sign(invite(pair.primary.title, "director@kbtrading.example"));
    const file = (await pendingProposals(ctx, { taskId: pair.primary.id, kind: "record_filing" }))[0];
    ctx.clock.advanceDays(3);
    await approveProposal(ctx, file.id, { edits: { reference: "LIFECYCLE-FRESH-ND2A", filedOn: "2026-10-05" } });
    const register = (await pendingProposals(ctx, { taskId: pair.primary.id, kind: "register_change" }))[0];
    expect(await ctx.db.select().from(appointment).where(eq(appointment.sourceTaskId, pair.primary.id))).toHaveLength(0);
    await approveProposal(ctx, register.id);
    expect(await ctx.db.select().from(appointment).where(and(eq(appointment.sourceTaskId, pair.primary.id), eq(appointment.personId, pair.person.id)))).toEqual([expect.objectContaining({ fromDate: "2026-10-05" })]);
    expect((await officersAsAt(ctx, "cli_c1", "2026-10-04", "director")).some(o => o.personId === pair.person.id)).toBe(false);
    expect(await snapshotTask(pair.sibling.id)).toEqual(sibling);
    expect((await openSigning(ctx, pair.siblingToken)).documents.length).toBeGreaterThan(0);
  }, 120_000);

  it("LREC08 a human cancellation after recorded filing requires separate corrective work and preserves the original signed and filed source history", async () => {
    const pair = await signingPair(); await atRegister(pair);
    const protectedHistory = async () => {
      const { task, docs, bytes, envelopes, signers, filings, appointments, proposals } = await snapshotTask(pair.primary.id);
      return { task, docs, bytes, envelopes, signers, filings, appointments, otherApprovals: proposals.filter(p => p.kind !== "cancel_task") };
    };
    const before = await protectedHistory(); const sibling = await snapshotTask(pair.sibling.id);
    const cancel = await createProposal(ctx, { kind: "cancel_task", title: "Cancel after authority filing", taskId: pair.primary.id, clientId: "cli_c1", requestId: pair.request.id, payload: { taskId: pair.primary.id, reason: "Client asks to cancel after the ND2A was filed", voidInvoice: false } });
    await expect.soft(approveProposal(ctx, cancel.id)).rejects.toThrow(/filed|filing|register|correct|escalat/i);
    expect.soft(await protectedHistory()).toEqual(before);
    expect(await snapshotTask(pair.sibling.id)).toEqual(sibling);
    expect((await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, pair.primary.id)))[0].reference).toBe("LIFECYCLE-ND2A-ORIGINAL");
  }, 120_000);

});
