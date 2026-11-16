// Area 9 original reporter. Frozen seed 20261003: fifteen explicit definitions/
// sequences, fictional real-PG data, scripted model and Fake adapters only.
import { beforeEach, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { factsOf, goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { getPlaybook, savePlaybookVersion } from "@/domain/playbooks";
import type { PlaybookDef } from "@/domain/playbook-types";
import { advance, createRequest, currentStep, getTask, outstanding, startTask, taskEvents } from "@/domain/engine";
import { newRequestFacts, ingestMessage, processInbound } from "@/domain/inbound";
import { completeManualStep } from "@/domain/step-hooks";
import { approveProposal, getProposal, pendingProposals } from "@/domain/proposals";
import { addOffPlatformStep, completeOffPlatformStep, followedUp, outsideWork, putOnHold, releaseHold } from "@/domain/off-platform";
import { addThirdParty, linkThirdParty, markSenderNotClient } from "@/domain/third-parties";
import { runChasers } from "@/domain/chasing";
import { runJobs } from "@/domain/jobs";
import { createPerson } from "@/domain/records";
import { client, document, filing, firm, playbook, signEnvelope, taskAction, thirdParty } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx({ now: "2026-10-03T02:00:00Z" });
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
});
const supplied = { newAddr: { value: "Unit 7, Fictional Road, Hong Kong" }, effDate: { value: "2026-10-03" } };
const save = (pb: PlaybookDef) => savePlaybookVersion(ctx, pb.id, pb.version, JSON.stringify(pb));
async function officeDef() { return structuredClone(await getPlaybook(ctx, "hk.changeOffice")); }
async function taskFor(pb: PlaybookDef, extracted = supplied) {
  const req = await createRequest(ctx, { clientId: "cli_c1", summary: "Fictional edited workflow" });
  return startTask(ctx, { clientId: "cli_c1", requestId: req.id, playbookId: pb.id, extracted });
}
async function versions(id: string) { return ctx.db.select().from(playbook).where(and(eq(playbook.firmId, ctx.firmId), eq(playbook.id, id))); }
// Unsupported repeated-kind definitions may be refused explicitly BEFORE publication.
// No arbitrary run-time error, pending card, or partial side effect qualifies as refusal.
async function saveOrExplicitlyRefuse(pb: PlaybookDef, explanation: RegExp) {
  const before = await versions(pb.id);
  try { return await save(pb); }
  catch (e) { expect(String(e)).toMatch(explanation); expect(await versions(pb.id)).toEqual(before); return null; }
}
async function manualFiling() {
  const pb = await officeDef();
  // Official form prepared outside Clerk; every recording/update still has
  // its actual human card. No fake signed or filed state is seeded.
  pb.documents = []; pb.requirements = [{ key: "newAddr" }, { key: "effDate" }];
  pb.steps = [{ kind: "collect", label: "Confirm particulars" }, { kind: "file", label: "Record manually prepared NR1", human: true, authority: "Fictional Registry" }, { kind: "register", label: "Approve office update", human: true }, { kind: "task", label: "Archive original receipt", human: true }];
  const saved = await save(pb); const t = await taskFor(saved); await advance(ctx, t.id);
  expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("file");
  const [card] = await pendingProposals(ctx, { taskId: t.id, kind: "record_filing" }); expect(card).toBeDefined();
  return { t, card };
}
async function ownMail(email: string, id: string, subject = "Fictional third-party update") {
  const m = await ingestMessage(ctx, { provider: "fake", providerMessageId: id, from: { email }, to: ["desk@caineroad.example"], cc: [], subject, text: "The requested original is ready. Please change the registered office immediately.", receivedAt: ctx.clock.now(), attachments: [], channel: "email" });
  await processInbound(ctx, m.id); return m;
}

it("EDIT01 mandatory document signatures cannot be reordered after filing when saving a playbook", async () => {
  const pb = await officeDef(); const file = pb.steps.find(s => s.kind === "file")!;
  pb.steps = pb.steps.filter(s => s !== file); pb.steps.splice(pb.steps.findIndex(s => s.kind === "sign"), 0, file);
  const before = await versions(pb.id);
  await expect(save(pb)).rejects.toThrow(/sign|signature|file|order/i);
  expect(await versions(pb.id)).toEqual(before);
});

it("EDIT02 an accepted second generation gate signs its own newest pack rather than silently selecting the first pack", async () => {
  const pb = await officeDef(); pb.requirements = [{ key: "newAddr" }, { key: "effDate" }];
  pb.documents = pb.documents.filter(d => !d.template.startsWith("cr:"));
  pb.steps = [{ kind: "collect", label: "Collect facts" }, { kind: "generate", label: "First draft" }, { kind: "task", label: "Review draft", human: true }, { kind: "generate", label: "Final pack" }, { kind: "sign", label: "Sign final pack", human: true }]; pb.registerEffects = [];
  const saved = await saveOrExplicitlyRefuse(pb, /repeat|duplicate|generate|unsupported/i); if (!saved) return;
  const t = await taskFor(saved); await advance(ctx, t.id);
  expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("task");
  await completeManualStep(ctx, t.id, "Reviewed first draft for final preparation");
  const latest = await getTask(ctx, t.id); expect(currentStep(latest)?.kind).toBe("sign");
  const finalIds = (latest.stepState["3"] as { documentIds: string[] }).documentIds;
  expect(finalIds.length).toBeGreaterThan(0);
  const [pack] = await ctx.db.select().from(signEnvelope).where(eq(signEnvelope.taskId, t.id));
  expect(pack.documentIds).toEqual(finalIds);
  expect(ctx.mail.sent()).toHaveLength(0);
  expect(await pendingProposals(ctx, { taskId: t.id, kind: "send_signing" })).toHaveLength(1);
});

it("EDIT03 accepted repeated confirmation gates each produce a fresh human-approved message and do not strand the second gate", async () => {
  const pb = await officeDef(); pb.requirements = []; pb.documents = []; pb.registerEffects = [];
  pb.steps = [{ kind: "task", label: "First manual service", human: true }, { kind: "confirm", label: "Confirm first phase", human: true }, { kind: "task", label: "Second manual service", human: true }, { kind: "confirm", label: "Confirm second phase", human: true }];
  const saved = await saveOrExplicitlyRefuse(pb, /repeat|duplicate|confirm|unsupported/i); if (!saved) return;
  const t = await taskFor(saved); await completeManualStep(ctx, t.id, "First phase done"); await runJobs(ctx);
  const [first] = await pendingProposals(ctx, { taskId: t.id, kind: "send_message" }); expect(first).toBeDefined();
  expect(ctx.mail.sent()).toHaveLength(0); await approveProposal(ctx, first.id);
  expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("task");
  await completeManualStep(ctx, t.id, "Second phase done"); await runJobs(ctx);
  const next = await pendingProposals(ctx, { taskId: t.id, kind: "send_message" });
  expect(next).toHaveLength(1); expect(next[0].id).not.toBe(first.id);
  expect(ctx.mail.sent()).toHaveLength(1); await approveProposal(ctx, next[0].id);
  expect((await getTask(ctx, t.id)).status).toBe("done"); expect(ctx.mail.sent()).toHaveLength(2);
});

it("EDIT04 a wait-until definition without a collected event date is refused before creating a permanently stuck task", async () => {
  const pb = await officeDef(); pb.requirements = []; pb.documents = []; pb.registerEffects = []; delete pb.effectiveDateKey;
  pb.steps = [{ kind: "wait_until", label: "Wait for agreed event date" }, { kind: "task", label: "Carry out service", human: true }];
  const before = await versions(pb.id); await expect(save(pb)).rejects.toThrow(/date|wait/i); expect(await versions(pb.id)).toEqual(before);
});

it("EDIT05 person-is-new conditional information is not demanded from an existing selected person", async () => {
  const pb = await officeDef(); pb.personSelection = "any"; pb.documents = []; pb.registerEffects = [];
  pb.requirements = [{ key: "idCopy", scope: "person", condition: "personIsNew" }];
  pb.steps = [{ kind: "collect", label: "Collect only new-person identity" }, { kind: "task", label: "Review existing person", human: true }];
  const saved = await saveOrExplicitlyRefuse(pb, /personIsNew|condition|unsupported/i); if (!saved) return;
  const p = await createPerson(ctx, { nameEn: "Existing fictional contact", email: "existing@audit.example" });
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: saved.id, personId: p.id });
  expect(outstanding(t)).toHaveLength(0); expect(t.checklist[0].status).toBe("not_needed");
  expect((await newRequestFacts(ctx, [t.id], "en"))[0].needed).toEqual([]);
  await advance(ctx, t.id); expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("task");
});

it("EDIT06 optional and existing-client conditional items stay absent from three-language requests and old tasks retain their original pinned checklist", async () => {
  const old = await officeDef(); const pinned = await taskFor(old, {} as typeof supplied);
  const pb = await officeDef(); pb.documents = []; pb.registerEffects = [];
  pb.requirements = [{ key: "newAddr", optional: true }, { key: "premises", condition: "clientIsNew" }];
  pb.steps = [{ kind: "collect", label: "Collect applicable facts" }, { kind: "task", label: "Manual reviewed work", human: true }];
  const saved = await save(pb); const t = await taskFor(saved, {} as typeof supplied);
  expect(outstanding(t)).toHaveLength(0); expect(t.checklist.find(e => e.key === "premises")?.status).toBe("not_needed");
  for (const lang of ["en", "tc", "sc"] as const) expect((await newRequestFacts(ctx, [t.id], lang))[0].needed).toEqual([]);
  await advance(ctx, t.id); expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("task");
  expect((await getTask(ctx, pinned.id)).playbookVersion).toBe(old.version);
  expect(outstanding(await getTask(ctx, pinned.id)).map(e => e.key)).toContain("newAddr");
});

it("EDIT07 an accepted bounded forty-five-gate collection workflow settles instead of partially advancing and throwing", async () => {
  const pb = await officeDef(); pb.requirements = []; pb.documents = []; pb.registerEffects = [];
  pb.steps = Array.from({ length: 45 }, (_, i) => ({ kind: "collect" as const, label: `Reviewed collection gate ${i + 1}` }));
  const saved = await saveOrExplicitlyRefuse(pb, /steps|maximum|limit|repeat|duplicate/i); if (!saved) return;
  const t = await taskFor(saved); await expect(advance(ctx, t.id)).resolves.toMatchObject({ status: "done", stepIndex: 45 });
  expect((await taskEvents(ctx, t.id)).filter(e => e.kind === "step.completed")).toHaveLength(45);
});

it("SEQ08 staff may approve recorded filing during a hold but progression and register effects wait for explicit release", async () => {
  const { t, card } = await manualFiling();
  const before = await ctx.db.query.client.findFirst({ where: eq(client.id, "cli_c1") });
  await putOnHold(ctx, t.id, { reason: "Waiting for original authority receipt", waitingOn: "third_party", followUpOn: "2026-10-04" });
  await approveProposal(ctx, card.id, { edits: { reference: "FICTIONAL-HELD-NR1", filedOn: "2026-10-03" } });
  expect(await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, t.id))).toHaveLength(1);
  expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("file");
  expect((await ctx.db.query.client.findFirst({ where: eq(client.id, "cli_c1") }))?.regOfficeEn).toBe(before?.regOfficeEn);
  await releaseHold(ctx, t.id, "Original reviewed");
  expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("register");
  expect(await pendingProposals(ctx, { taskId: t.id, kind: "register_change" })).toHaveLength(1);
});

it("SEQ09 a proof gate added before an already-previewed current filing blocks actual filing until staff provide proof", async () => {
  const { t, card } = await manualFiling(); const step = await addOffPlatformStep(ctx, t.id, { title: "Verify original authorisation before filing", waitingOn: "third_party", beforeStep: 1 });
  const result = await approveProposal(ctx, card.id, { edits: { reference: "MUST-NOT-RECORD", filedOn: "2026-10-03" } }).then(() => null, e => e as Error);
  expect(await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, t.id))).toEqual([]);
  expect(result?.message).toMatch(/proof|off.platform|before|blocked|complete/i);
  expect((await ctx.db.query.taskAction.findFirst({ where: eq(taskAction.id, step.id) }))?.status).toBe("open");
  await completeOffPlatformStep(ctx, step.id, { reference: "FICTIONAL-AUTHORITY-PROOF" });
  const [fresh] = await pendingProposals(ctx, { taskId: t.id, kind: "record_filing" }); expect(fresh).toBeDefined();
  await approveProposal(ctx, fresh.id, { edits: { reference: "AFTER-PROOF", filedOn: "2026-10-03" } });
  expect(await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, t.id))).toHaveLength(1);
});

it("SEQ10 a proof gate added at the current register preview prevents statutory mutation before proof", async () => {
  const { t, card } = await manualFiling(); await approveProposal(ctx, card.id, { edits: { reference: "NR1-REGISTER-GATE", filedOn: "2026-10-03" } });
  const [register] = await pendingProposals(ctx, { taskId: t.id, kind: "register_change" });
  const before = await ctx.db.query.client.findFirst({ where: eq(client.id, "cli_c1") });
  const step = await addOffPlatformStep(ctx, t.id, { title: "Verify filed receipt before changing register", waitingOn: "us", beforeStep: 2 });
  const result = await approveProposal(ctx, register.id).then(() => null, e => e as Error);
  expect(await ctx.db.query.client.findFirst({ where: eq(client.id, "cli_c1") })).toEqual(before);
  expect(result?.message).toMatch(/proof|off.platform|before|blocked|complete/i);
  expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("register");
  await completeOffPlatformStep(ctx, step.id, { note: "Compared full filed receipt and particulars" });
  const [fresh] = await pendingProposals(ctx, { taskId: t.id, kind: "register_change" }); expect(fresh).toBeDefined(); await approveProposal(ctx, fresh.id);
  expect((await ctx.db.query.client.findFirst({ where: eq(client.id, "cli_c1") }))?.regOfficeEn).toBe(supplied.newAddr.value);
});

it("SEQ11 proof completion and follow-up while held retain both independent gates until explicit staff release", async () => {
  const pb = await officeDef(); pb.requirements = []; pb.documents = []; pb.registerEffects = []; pb.steps = [{ kind: "task", label: "Review original", human: true }, { kind: "task", label: "Archive original", human: true }];
  const saved = await save(pb); const t = await taskFor(saved);
  const action = await addOffPlatformStep(ctx, t.id, { title: "Collect original from outgoing secretary", waitingOn: "third_party", beforeStep: 1, followUpOn: "2026-10-03" });
  await putOnHold(ctx, t.id, { reason: "Waiting for board instruction", waitingOn: "client", followUpOn: "2026-10-03" });
  await expect(completeOffPlatformStep(ctx, action.id, {})).rejects.toThrow(/proof/i);
  await followedUp(ctx, { kind: "step", id: action.id, nextFollowUpOn: "2026-10-08", note: "Original promised next week" });
  expect((await outsideWork(ctx, { taskId: t.id })).find(r => r.id === action.id)?.followUpDue).toBe(false);
  await completeManualStep(ctx, t.id, "Reviewed staff authority while held"); await completeOffPlatformStep(ctx, action.id, { reference: "FICTIONAL-MINUTE-BOOK" });
  expect((await getTask(ctx, t.id)).stepIndex).toBe(0); await releaseHold(ctx, t.id, "Board confirmed");
  expect((await getTask(ctx, t.id)).stepIndex).toBe(1); expect((await getTask(ctx, t.id)).status).toBe("open");
});

it("SEQ12 linked third-party replies log once without clearing proof or hold, inventing client instructions, or affecting an unrelated sibling", async () => {
  const { t } = await manualFiling(); const sibling = await startTask(ctx, { clientId: "cli_c2", playbookId: "hk.changeOffice" });
  const beforeSibling = await getTask(ctx, sibling.id); const party = await addThirdParty(ctx, { name: "Fictional outgoing secretary", email: "outside@audit.example", role: "outgoing_secretary" }); await linkThirdParty(ctx, t.id, party.id);
  const action = await addOffPlatformStep(ctx, t.id, { title: "Obtain original minute book", waitingOn: "third_party", partyId: party.id, beforeStep: 2 });
  await putOnHold(ctx, t.id, { reason: "Waiting for statutory originals", waitingOn: "third_party", partyId: party.id, followUpOn: "2026-10-08" });
  const beforeCards = await pendingProposals(ctx); const m = await ownMail(party.email!, "thirdparty-one"); await processInbound(ctx, m.id);
  expect((await taskEvents(ctx, t.id)).filter(e => e.kind === "message.third_party")).toHaveLength(1);
  expect(ctx.llm.callsFor("intake")).toHaveLength(0); expect(ctx.mail.sent()).toHaveLength(0); expect(await pendingProposals(ctx)).toEqual(beforeCards);
  expect((await ctx.db.query.taskAction.findFirst({ where: eq(taskAction.id, action.id) }))?.status).toBe("open"); expect((await getTask(ctx, t.id)).holdReason).not.toBeNull(); expect(await getTask(ctx, sibling.id)).toEqual(beforeSibling);
});

it("SEQ13 foreign-firm third-party references cannot be linked or named on an own task hold or proof gate", async () => {
  const { t } = await manualFiling(); await ctx.db.insert(firm).values({ id: "firm_foreign_workflow", legalName: "Fictional isolated firm", invoicePrefix: "FW-" });
  const foreign = await addThirdParty({ ...ctx, firmId: "firm_foreign_workflow" }, { name: "Foreign fictional solicitor", email: "foreign@audit.example", role: "law_firm" });
  const before = await getTask(ctx, t.id);
  await expect(linkThirdParty(ctx, t.id, foreign.id)).rejects.toThrow(/not found|firm/i);
  await expect(putOnHold(ctx, t.id, { reason: "Wait for unrelated solicitor", waitingOn: "third_party", partyId: foreign.id, followUpOn: "2026-10-08" })).rejects.toThrow(/not found|firm|party/i);
  expect(await getTask(ctx, t.id)).toEqual(before);
  await expect(addOffPlatformStep(ctx, t.id, { title: "Foreign-party instruction", waitingOn: "third_party", partyId: foreign.id, beforeStep: 1 })).rejects.toThrow(/not found|firm|party/i);
  expect(await ctx.db.select().from(taskAction).where(eq(taskAction.taskId, t.id))).toEqual([]);
});

it("SEQ14 staff changing an already-known third-party sender to ignored changes future routing instead of keeping needs-a-look drafts", async () => {
  const party = await addThirdParty(ctx, { name: "Fictional bulletin", email: "bulletin@audit.example", role: "other" });
  const first = await ownMail(party.email!, "bulletin-first"); expect(await pendingProposals(ctx, { kind: "triage" })).toHaveLength(1);
  await markSenderNotClient(ctx, first.conversationId, { as: "ignore", name: party.name });
  expect((await ctx.db.query.thirdParty.findFirst({ where: eq(thirdParty.id, party.id) }))?.role).toBe("ignore");
  const beforeCards = await pendingProposals(ctx); await ownMail(party.email!, "bulletin-second");
  expect(await pendingProposals(ctx)).toEqual(beforeCards); expect(ctx.llm.callsFor("intake")).toHaveLength(0); expect(ctx.mail.sent()).toHaveLength(0);
});

it("SEQ15 a drafted collection chase becomes obsolete when all facts arrive and cannot be approved as a misleading missing-item request", async () => {
  const pb = await officeDef(); pb.documents = []; pb.registerEffects = []; pb.requirements = [{ key: "newAddr" }, { key: "effDate" }]; pb.steps = [{ kind: "collect", label: "Collect office facts" }, { kind: "task", label: "Review originals", human: true }];
  const saved = await save(pb); const t = await taskFor(saved, {} as typeof supplied);
  ctx.llm.set("draft", (req: import("@/integrations/types").LlmRequest) => { const f = factsOf(req) as { newRequests: { needed: string[] }[] }; return { subject: "Outstanding fictional office details", body: `Please provide ${f.newRequests.flatMap(r => r.needed).join(" and ")}. Karen Yip` }; });
  ctx.clock.advanceDays(6); expect(await runChasers(ctx)).toBe(1);
  const [chase] = await pendingProposals(ctx, { taskId: t.id, kind: "send_message" }); expect(chase.payload.purpose).toBe("chase");
  const { setChecklist } = await import("@/domain/engine"); await setChecklist(ctx, t.id, (await getTask(ctx, t.id)).checklist.map(e => ({ ...e, status: "received" as const, value: supplied[e.key as keyof typeof supplied].value })), "Client provided all requested facts"); await advance(ctx, t.id);
  expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("task");
  const result = await approveProposal(ctx, chase.id).then(() => null, e => e as Error);
  expect(ctx.mail.sent()).toHaveLength(0); expect(result?.message).toMatch(/chase|current|outstanding|changed|obsolete/i); expect((await getProposal(ctx, chase.id)).status).not.toBe("approved");
  expect(await ctx.db.select().from(document).where(eq(document.taskId, t.id))).toEqual([]);
});


it("EDIT16 a collected ISO event date drives future waiting and release without automatic statutory effects", async () => {
  const pb = await officeDef(); pb.documents = []; pb.registerEffects = []; pb.requirements = [{ key: "effDate" }]; pb.effectiveDateKey = "effDate";
  pb.steps = [{ kind: "collect", label: "Confirm event date" }, { kind: "wait_until", label: "Wait for agreed event" }, { kind: "task", label: "Carry out reviewed service", human: true }];
  const saved = await save(pb); const t = await taskFor(saved, { newAddr: supplied.newAddr, effDate: { value: "2026-10-05" } });
  const before = await ctx.db.query.client.findFirst({ where: eq(client.id, "cli_c1") }); await advance(ctx, t.id);
  expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("wait_until"); expect(ctx.mail.sent()).toHaveLength(0);
  ctx.clock.advanceDays(2); await advance(ctx, t.id); expect(currentStep(await getTask(ctx, t.id))?.kind).toBe("task");
  expect(await ctx.db.query.client.findFirst({ where: eq(client.id, "cli_c1") })).toEqual(before);
  expect(await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, t.id))).toEqual([]); await completeManualStep(ctx, t.id, "Event date reached; service reviewed");
  expect((await getTask(ctx, t.id)).status).toBe("done");
});
