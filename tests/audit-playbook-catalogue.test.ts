import { beforeEach, expect, it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { allPlaybookFiles, requirementLibrary } from "@/domain/playbooks";
import { createRequest, startTask, getTask, markStepState, advance, currentStep } from "@/domain/engine";
import { portalView } from "@/domain/portal";
import { generateForTask } from "@/documents/generate";
import { createClient, createPerson, appoint } from "@/domain/records";
import { membersAsAt, createShareClass, allot } from "@/domain/shares";
import { PDFDocument } from "pdf-lib";
import { eq } from "drizzle-orm";
import { MovementsZ } from "@/agent/structure";
import { appointment, shareClass, shareMovement, document, task as taskT } from "@/db/schema";
import "@/domain/inbound";
import { completeManualStep } from "@/domain/step-hooks";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { requestOtp, verifyOtp, signDocuments } from "@/domain/signing";
let ctx: TestCtx;
const rows: Record<string, unknown>[] = [];
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });
const ids = { HK: "cli_c1", CN: "cli_cn1", MO: "cli_mo1", TW: "cli_tw1" };
const values: Record<string, string> = { effDate: "2026-09-29", lastDay: "2026-09-29", newAddr: "Audit office, Hong Kong", cnNewAddress: "深圳市前海新地址", newName: "Audit Renamed Limited", brTerm: "1 year", newAuditor: "Audit Auditor", fullName: "CHAN Tai Man", idNo: "K987654(3)", resAddr: "Audit residential address", corrAddr: "Audit correspondence address", contactInfo: "audit@example.com +852 9000 0000", changeDetail: "New correspondence address: Audit office", newFye: "31 December, first period ends 2026-12-31", resignationNoticeBasis: "notice_given", resigningSignatory: "Karen Yip", meetingDate: "2026-09-29", meetingTime: "10:00", meetingPlace: "Audit office, Hong Kong", meetingChair: "CHAN Tai Man", meetingAttendees: "CHAN Tai Man and LEE Siu Ling", meetingDecisions: "The members approved the recorded annual accounts" };
const item = { kind: "allotment", fromPersonId: null, fromName: null, toPersonId: "per_p1", toName: "CHAN Tai Man", toNameZh: "陳大文", className: "Ordinary", quantity: 100, pricePerShareCents: 100, considerationCents: 10000, considerationType: "cash", currency: "HKD", unpaidCents: 0, existingUnpaidCents: 0, allotteeAddress: "Audit office", allotteeKind: "individual" };
for (const pb of allPlaybookFiles()) it(`${pb.id}: completes a declared fixture through human gates with a complete pack and trilingual portal`, async () => {
  ctx.llm.on("structure_particulars", { changes: [{ field: "corrAddr", value: "Audit office" }] });
  ctx.llm.set("structure_controllers", { items: [{ kind: "add", personId: "per_p3", nature: "Confirmed right to appoint and remove a majority of the board", registrableFrom: "2026-09-29" }] });
  ctx.llm.on("structure_fye", { month: 12, day: 31, firstPeriodEnd: "2026-12-31" });
  ctx.llm.on("structure_incorporation", { nameEn: "Audit New Harbour Limited", nameZh: "審查新港有限公司", natureDescription: "Trading", registeredOffice: "Audit incorporation office, Hong Kong", capital: { className: "Ordinary", currency: "HKD", number: 100, subscribedCents: 10000, paidUpCents: 10000 }, founder: { nameEn: "Audit Founder", nameZh: "審查創辦人", address: "Audit founder address" }, director: { nameEn: "Audit Founder", nameZh: "審查創辦人", correspondenceAddress: "Audit founder address", residentialAddress: "Audit founder home", idNumber: "K987654(3)", idCountry: "HK", email: "founder@audit.example", adult: true, consentToAct: true }, secretaryIsFirm: true });
  ctx.llm.on("structure", { items: [MovementsZ.parse({ items: [{ ...item, ...(pb.id.includes("ransfer") ? { kind: "transfer", fromPersonId: "per_p2", fromName: "LEE Siu Ling", quantity: 100 } : {}), ...(pb.id === "hk.buyback" ? { kind: "buyback", fromPersonId: "per_p2", fromName: "LEE Siu Ling", toPersonId: null, toName: null, buybackFunding: "profits", capitalPaymentCents: 0, postBuybackCapitalCents: 1000000, paymentDate: "2026-09-29" } : {}) }] }).items[0]] });
  let clientId = pb.id === "hk.incorporation" ? (await createClient(ctx, { nameEn: "Audit prospect", lifecycle: "prospect", operatingStatus: "not_incorporated", jurisdiction: "HK" })).id : ids[pb.jurisdiction as keyof typeof ids];
  if (pb.id === "mo.quotaTransfer" || pb.id === "cn.equityTransfer") {
    const member = (await membersAsAt(ctx, clientId, ctx.clock.today()))[0];
    // The selected CN/MO class is seeded in its own currency; the transfer
    // instruction must preserve that currency rather than inherit the HK item.
    const selectedClass = await ctx.db.query.shareClass.findFirst({ where: eq(shareClass.id, member.shareClassId) });
    expect(selectedClass?.clientId).toBe(clientId);
    ctx.llm.set("structure", { items: [{ ...item, kind: "transfer", currency: selectedClass!.currency, className: member.className, fromPersonId: member.personId, fromName: member.name, toPersonId: "per_p1", toName: "CHAN Tai Man", quantity: Math.min(100, member.quantity) }] });
  }
  let personId = pb.id === "hk.resignSecretary" ? "per_firm" : pb.id === "cn.changeLegalRep" ? "per_p2" : pb.id === "hk.updateControllers" ? "per_p3" : "per_p1";
  if (["hk.appointDirector", "hk.reserveDirector"].includes(pb.id)) {
    personId = (await createPerson(ctx, { nameEn: "Audit Adult Nominee", nameZh: "審查成年候選人", dateOfBirth: "1990-01-01", idNumber: "K987654(3)", residentialAddress: "Audit home", correspondenceAddress: "Audit office", email: "nominee@audit.example", phone: "+852 9000 0000" })).id;
  }
  if (pb.id === "hk.reserveDirector") {
    clientId = (await createClient(ctx, { nameEn: "Audit Sole Owner Limited", jurisdiction: "HK", companyType: "Private company limited by shares", incorporatedOn: "2020-01-01", paymentTermsDays: 30 })).id;
    await appoint(ctx, { clientId, personId: "per_p1", role: "director", fromDate: "2020-01-01" });
    const cls = await createShareClass(ctx, { clientId, name: "Ordinary" });
    await allot(ctx, { clientId, shareClassId: cls.id, toPersonId: "per_p1", date: "2020-01-01", quantity: 100, amountPaidCents: 10000 });
  }
  if (pb.id === "hk.resignDirector") await appoint(ctx, {clientId,personId:"per_p2",role:"director",fromDate:"2026-09-01"});
  const req = await createRequest(ctx, { clientId });
  const t = await startTask(ctx, { requestId: req.id, clientId: req.clientId, playbookId: pb.id, personId, extracted: Object.fromEntries(pb.requirements.map(r => [r.key, { value: values[r.key] ?? "Audit details / 核實資料 / 核实资料" }])) });
  // File fixtures are real database documents with bytes; public uploading is tested separately.
  const pdf = await PDFDocument.create(); pdf.addPage(); const pdfBytes = Buffer.from(await pdf.save());
  for (const entry of t.checklist.filter(e => requirementLibrary()[e.key]?.kind === "file")) {
    const id = ctx.ids.next("doc");
    const storageKey = `audit-files/${id}.pdf`;
    await ctx.storage.put(storageKey, pdfBytes);
    await ctx.db.insert(document).values({ id, firmId: ctx.firmId, clientId, taskId: t.id, title: entry.key, kind: "upload", source: "upload", requirementKey: entry.key, storageKey, mime: "application/pdf" });
    entry.documentId = id;
    entry.status = "received";
  }
  await ctx.db.update(taskT).set({ checklist: t.checklist }).where(eq(taskT.id, t.id));
  expect(t.checklist.map(e => e.key)).toEqual(pb.requirements.map(r => r.key));
  for (const lang of ["en", "tc", "sc"] as const) {
    const view = await portalView(ctx, req.uploadToken, lang);
    expect(view.tasks).toHaveLength(1);
    expect(view.tasks[0].title).toContain(pb.name[lang]);
    expect(view.tasks[0].items.map(e => e.key)).toEqual(t.checklist.map(e => e.key));
  }
  const beforeAppointments = await ctx.db.select().from(appointment);
  const beforeShares = await ctx.db.select().from(shareMovement);
  let documents = "complete";
  try { expect((await generateForTask(ctx, t.id)).map(d => d.template)).toEqual(pb.documents.map(d => d.template)); }
  catch (e) {
    documents = `blocked: ${(e as Error).message}`;
    expect((e as Error).message).toMatch(/missing|require|verify|unsupported|select|fully|supplied|signatory|Agent|scripted|schema/i);
    expect(await ctx.db.query.document.findMany({ where: (d, { eq }) => eq(d.taskId, t.id) })).toHaveLength(0);
  }
  expect(await ctx.db.select().from(appointment)).toEqual(beforeAppointments);
  expect(await ctx.db.select().from(shareMovement)).toEqual(beforeShares);
  let lifecycle = "not started";
  const exercised: string[] = [];
  try {
    if (pb.steps.some(s => s.kind === "send")) await markStepState(ctx, t.id, "send", { sent: true }); // Fixture boundary for initial delivery; intake audit exercises the actual send.
    for (let guard = 0; guard < 30; guard++) {
      const cur = await advance(ctx, t.id);
      if (cur.status === "done") { lifecycle = "done"; break; }
      const step = currentStep(cur)!;
      exercised.push(step.kind);
      lifecycle = `blocked at ${step.kind}`;
      if (step.kind === "pay") await markStepState(ctx, t.id, "pay", { waived: true });
      else if (step.kind === "task" || step.kind === "confirm") await completeManualStep(ctx, t.id, "Staff completed the audited external action");
      else if (step.kind === "sign") {
        const prop = (await pendingProposals(ctx, { taskId: t.id, kind: "send_signing" }))[0];
        if (!prop) { const triage = (await pendingProposals(ctx, { taskId: t.id, kind: "triage" }))[0]; lifecycle += `: ${triage?.summary ?? "No current approval"}`; break; }
        const before = ctx.mail.sent().length;
        await approveProposal(ctx, prop.id, { edits: { emails: Object.fromEntries((prop.payload.signers as { personId: string; email: string | null }[]).filter(s => !s.email).map(s => [s.personId, `${s.personId}@audit.example`])) } });
        for (const mail of ctx.mail.sent().slice(before)) {
          const token = mail.text.match(/\/sign\/([A-Za-z0-9]+)/)![1];
          await requestOtp(ctx, token);
          await verifyOtp(ctx, token, ctx.mail.sent().at(-1)!.text.match(/\b(\d{6})\b/)![1]);
          await signDocuments(ctx, token, { kind: "typed", data: "Audit verified signature", ip: "127.0.0.1", userAgent: "catalogue audit" });
        }
      } else if (step.kind === "file" || step.kind === "register") {
        const prop = (await pendingProposals(ctx, { taskId: t.id, kind: step.kind === "file" ? "record_filing" : "register_change" }))[0];
        if (!prop) { const triage = (await pendingProposals(ctx, { taskId: t.id, kind: "triage" }))[0]; lifecycle += `: ${triage?.summary ?? "No current approval"}`; break; }
        await approveProposal(ctx, prop.id, { edits: { reference: "AUDIT-REF", companyNumber: "90000001", incorporatedOn: "2026-09-29" } });
      } else break;
    }
  } catch (e) { lifecycle += `: ${(e as Error).message}`; }
  const final = await getTask(ctx, t.id);
  rows.push({ id: pb.id, exercised, catalogue: "passed", portal: "EN/TC/SC passed", documents, lifecycle, status: final.status });
  mkdirSync("storage/test", { recursive: true });
  writeFileSync("storage/test/audit-playbook-matrix.json", JSON.stringify(rows, null, 2));
  expect(documents).toBe("complete");
  expect(final.status, lifecycle).toBe("done");
  if (pb.id === "hk.updateControllers") {
    expect(await ctx.db.query.significantController.findFirst({ where: (c, { and, eq }) => and(eq(c.clientId, clientId), eq(c.personId, "per_p3"), eq(c.registrableFrom, "2026-09-29")) })).toMatchObject({ nature: "Confirmed right to appoint and remove a majority of the board" });
  }
}, 120_000); // A multilingual signed pack must finish before the next fixture resets its database.
