// Area 4 original reporter. Imported/prepared fictional work is positioned immediately
// before register preview; every mutation under test uses the real human approval API.
import { beforeEach, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { PDFDocument } from "pdf-lib";
import { goodDraft } from "./agent-fixtures";
import { startManualRequest } from "@/domain/manual";
import { getRequest } from "@/domain/engine";
import { portalUpload } from "@/domain/portal";
import { openSigning, requestOtp, signDocuments, verifyOtp } from "@/domain/signing";
import { Crypto } from "@/lib/crypto";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { advance, getTask, startTask } from "@/domain/engine";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { appoint, ceaseAppointment, createClient, createPerson, officersAsAt } from "@/domain/records";
import { renderRegisters } from "@/documents/register-export";
import { loadDocContext } from "@/documents/context";
import { allot, createShareClass, membersAsAt } from "@/domain/shares";
import { appointment, document, filing, firm, person, significantController, signEnvelope, task, taskEvent } from "@/db/schema";
import { loadPlaybookLibrary } from "@/domain/playbooks";
import type { Ctx } from "@/lib/ctx";
import "@/domain/inbound";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx({ now: "2026-10-02T02:00:00Z" }); await seedDemo(ctx); });
async function preview(t: Awaited<ReturnType<typeof startTask>>, c: Ctx = ctx) {
  const full = await getTask(c, t.id); const idx = full._steps.findIndex(s => s.kind === "register");
  expect(idx).toBeGreaterThan(0);
  // Bounded register-only fixture: prior preparation/signing/fictional off-platform
  // filing have been completed by staff. No provider or legal filing is simulated here.
  await c.db.update(task).set({ checklist: full.checklist.map(e => ({ ...e, status: "received", value: e.value ?? "Staff-confirmed imported fixture" })), stepIndex: idx - 1,
    stepState: Object.fromEntries(full._steps.slice(0, idx).map((_, i) => [String(i), { sent: true, cleared: true, generated: true, signed: true, filed: true, done: true }])) }).where(eq(task.id, t.id));
  await advance(c, t.id);
  const p = (await pendingProposals(c, { taskId: t.id, kind: "register_change" }))[0];
  expect(p, `Expected real human preview for ${t.playbookId}`).toBeDefined(); return p;
}
async function officerTask(personId: string, date: string, playbookId = "hk.appointDirector", clientId = "cli_c1", c: Ctx = ctx) {
  return startTask(c, { clientId, personId, playbookId, extracted: { effDate: { value: date }, lastDay: { value: date } } });
}
async function controllerTask(items: unknown[]) {
  return startTask(ctx, { clientId: "cli_c1", playbookId: "hk.updateControllers", extracted: { effDate: { value: "2026-10-01" }, controllerDetails: { value: "Explicit confirmed dated board control instructions" } }, params: { controllerPlan: { items } } });
}
async function rows(personId: string) { return ctx.db.select().from(appointment).where(and(eq(appointment.clientId, "cli_c1"), eq(appointment.personId, personId))); }

// Both independent human actions reach the existing company lock before either can
// apply. A 1s fallback also permits a future repair to serialize earlier, without a
// test deadlock; business assertions never depend on both reaching this hook.
function approvalRaceContext() {
  const dialect = new PgDialect(); let reached = 0; let release!: () => void;
  const gate = new Promise<void>(r => { release = r; }); const timer = setTimeout(release, 1000);
  const wrap = (db: Ctx["db"]): Ctx["db"] => new Proxy(db, { get(target, prop) {
    if (prop === "transaction") return (fn: (tx: Ctx["db"]) => Promise<unknown>, ...rest: unknown[]) => target.transaction(tx => fn(wrap(tx as unknown as Ctx["db"])), ...rest as []);
    if (prop === "execute") return async (query: Parameters<typeof db.execute>[0]) => {
      const q = dialect.sqlToQuery(query as Parameters<typeof dialect.sqlToQuery>[0]);
      if (q.sql.includes("pg_advisory_xact_lock") && q.params.some(p => typeof p === "string" && p.startsWith("shares:")) && reached < 2) {
        reached++; if (reached === 2) release(); await gate;
      }
      return target.execute(query);
    };
    const value = Reflect.get(target, prop); return typeof value === "function" ? value.bind(target) : value;
  } });
  return { c: { ...ctx, db: wrap(ctx.db) }, done: () => { clearTimeout(timer); release(); }, count: () => reached };
}

it("A4R01 parallel approvals for the same director cannot create duplicate office periods, including a freshly reviewed retry", async () => {
  const p = await createPerson(ctx, { nameEn: "Concurrent Fictional Appointee" });
  const a = await officerTask(p.id, "2026-10-01"); const b = await officerTask(p.id, "2026-10-01");
  const pa = await preview(a); const pb = await preview(b);
  expect(await rows(p.id)).toHaveLength(0);
  const race = approvalRaceContext(); let results: PromiseSettledResult<unknown>[];
  try { results = await Promise.allSettled([approveProposal(race.c, pa.id), approveProposal(race.c, pb.id)]); } finally { race.done(); }
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(await rows(p.id)).toHaveLength(1);
  const failed = results[0].status === "rejected" ? a : b;
  const retry = await preview(await getTask(ctx, failed.id));
  const before = await rows(p.id);
  await expect.soft(approveProposal(ctx, retry.id)).rejects.toThrow(/already|overlap|duplicate|current|appointment/i);
  expect(await rows(p.id)).toEqual(before);
}, 120000);

it("A4R02 concurrent resignations of the two individual directors retain one director and reject the obsolete competing approval", async () => {
  const second = await createPerson(ctx, { nameEn: "Second Fictional Director" });
  await appoint(ctx, { clientId: "cli_c1", personId: second.id, role: "director", fromDate: "2020-01-01" });
  const a = await officerTask("per_p1", "2026-10-01", "hk.resignDirector"); const b = await officerTask(second.id, "2026-10-01", "hk.resignDirector");
  const pa = await preview(a); const pb = await preview(b);
  const race = approvalRaceContext(); let results: PromiseSettledResult<unknown>[];
  try { results = await Promise.allSettled([approveProposal(race.c, pa.id), approveProposal(race.c, pb.id)]); } finally { race.done(); }
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(await officersAsAt(ctx, "cli_c1", "2026-09-30", "director")).toHaveLength(2);
  expect(await officersAsAt(ctx, "cli_c1", "2026-10-01", "director")).toHaveLength(1);
  const failed = results[0].status === "rejected" ? a : b; const fresh = await preview(await getTask(ctx, failed.id));
  await expect(approveProposal(ctx, fresh.id)).rejects.toThrow(/replacement|remain|director/i);
  expect(await officersAsAt(ctx, "cli_c1", "2026-10-02", "director")).toHaveLength(1);
}, 120000);

it("A4R03 backdated reappointments cannot overlap a ceased historical appointment (fixed four-date boundary corpus)", async () => {
  for (const date of ["2024-01-01", "2024-06-15", "2024-12-31", "2025-01-01"]) {
    const p = await createPerson(ctx, { nameEn: `Historical Officer ${date}` });
    const old = await appoint(ctx, { clientId: "cli_c1", personId: p.id, role: "director", fromDate: "2024-01-01" }); await ceaseAppointment(ctx, old.id, "2025-01-01");
    const t = await officerTask(p.id, date); const approval = await preview(t); const before = await rows(p.id);
    if (date < "2025-01-01") {
      await expect.soft(approveProposal(ctx, approval.id)).rejects.toThrow(/overlap|already|appointment|period/i);
      expect.soft(await rows(p.id)).toEqual(before);
    } else {
      await approveProposal(ctx, approval.id);
      expect((await officersAsAt(ctx, "cli_c1", "2024-12-31", "director")).filter(o => o.personId === p.id)).toHaveLength(1);
      expect((await officersAsAt(ctx, "cli_c1", date, "director")).filter(o => o.personId === p.id)).toHaveLength(1);
    }
  }
}, 120000);

it("A4R04 same-day resignation and reappointment preserve adjacent dated periods and exactly one officer at each boundary", async () => {
  const p = await createPerson(ctx, { nameEn: "Same Day Fictional Director" });
  const original = await appoint(ctx, { clientId: "cli_c1", personId: p.id, role: "director", fromDate: "2024-01-01" });
  const end = await officerTask(p.id, "2026-10-01", "hk.resignDirector"); await approveProposal(ctx, (await preview(end)).id);
  const next = await officerTask(p.id, "2026-10-01"); const approval = await preview(next);
  expect((await officersAsAt(ctx, "cli_c1", "2026-10-01", "director")).some(o => o.personId === p.id)).toBe(false);
  await approveProposal(ctx, approval.id);
  expect(await rows(p.id)).toEqual(expect.arrayContaining([expect.objectContaining({ id: original.id, fromDate: "2024-01-01", toDate: "2026-10-01" }), expect.objectContaining({ sourceTaskId: next.id, fromDate: "2026-10-01", toDate: null })]));
  for (const date of ["2024-01-01", "2026-09-30", "2026-10-01", "2026-10-02"]) expect((await officersAsAt(ctx, "cli_c1", date, "director")).filter(o => o.personId === p.id)).toHaveLength(1);
}, 120000);

it("A4R05 approving the firm's already-current secretary cannot duplicate or restart the original dated appointment", async () => {
  const before = await rows("per_firm"); expect(before).toHaveLength(1);
  const t = await officerTask("per_firm", "2026-10-01", "hk.changeSecretary");
  const approval = await preview(t);
  // An explicit already-current rejection or reviewed no-op is acceptable; either
  // preserves the original appointment dates and the one current secretary.
  await approveProposal(ctx, approval.id).catch(e => { expect(String(e)).toMatch(/already|current|secretary|appointment/i); });
  expect(await rows("per_firm")).toEqual(before);
  expect(await officersAsAt(ctx, "cli_c1", "2026-10-01", "secretary")).toHaveLength(1);
}, 120000);

it("A4R06 controller add approvals cannot overlap ceased history, while an adjacent control period retains the earlier nature", async () => {
  const p = await createPerson(ctx, { nameEn: "Historical Fictional Controller" });
  await ctx.db.insert(significantController).values({ id: "scr_a4_historical", firmId: ctx.firmId, clientId: "cli_c1", personId: p.id, nature: "Original confirmed board appointment control", registrableFrom: "2024-01-01", ceasedOn: "2025-01-01" });
  for (const date of ["2024-01-01", "2024-06-15", "2024-12-31"]) {
    const t = await controllerTask([{ kind: "add", personId: p.id, nature: "Changed confirmed significant influence", registrableFrom: date }]); const approval = await preview(t);
    const before = await ctx.db.select().from(significantController);
    await expect.soft(approveProposal(ctx, approval.id)).rejects.toThrow(/overlap|already|controller|period/i);
    expect.soft(await ctx.db.select().from(significantController)).toEqual(before);
    // Independent corpus samples: remove only incorrectly added rows so all three
    // historical overlap samples are exercised rather than blocked by the first bug.
    await ctx.db.delete(significantController).where(eq(significantController.sourceTaskId, t.id));
  }
  const good = await controllerTask([{ kind: "add", personId: p.id, nature: "Changed confirmed significant influence", registrableFrom: "2025-01-01" }]); await approveProposal(ctx, (await preview(good)).id);
  const prior = await renderRegisters(ctx, "cli_c1", "2024-12-31", "en"); const current = await renderRegisters(ctx, "cli_c1", "2025-01-01", "en");
  expect(prior.text).toContain("Original confirmed board appointment control"); expect(prior.text).not.toContain("Changed confirmed significant influence");
  expect(current.text).not.toContain("Original confirmed board appointment control"); expect(current.text).toContain("Changed confirmed significant influence");
}, 120000);

it("A4R07 company A's approved dated officer particulars preserve earlier extracts and company B's unapproved officer/controller facts", async () => {
  const shared = await createPerson(ctx, { nameEn: "Original Fictional Shared Officer", nameZh: "原測試董事", correspondenceAddress: "Original fictional register address" });
  const other = await createClient(ctx, { nameEn: "Fictional Other Company Limited", jurisdiction: "HK", incorporatedOn: "2020-01-01" });
  for (const clientId of ["cli_c1", other.id]) {
    await appoint(ctx, { clientId, personId: shared.id, role: "director", fromDate: "2024-01-01" });
    await ctx.db.insert(significantController).values({ id: ctx.ids.next("scr"), firmId: ctx.firmId, clientId, personId: shared.id, nature: "Confirmed board appointment rights", registrableFrom: "2024-01-01" });
  }
  const dates = ["2024-01-01", "2026-09-30", "2026-10-01", "2026-10-02"];
  const beforeA = await renderRegisters(ctx, "cli_c1", dates[1], "en");
  const beforeB = await Promise.all(dates.map(d => renderRegisters(ctx, other.id, d, "en")));
  ctx.llm.set("structure_particulars", { changes: [{ field: "nameEn", value: "Approved A Fictional Officer" }, { field: "corrAddr", value: "Approved A fictional register address" }] });
  const t = await startTask(ctx, { clientId: "cli_c1", personId: shared.id, playbookId: "hk.changeParticulars", extracted: { effDate: { value: "2026-10-01" }, changeDetail: { value: "Company A confirms changed officer name and correspondence address effective 1 October 2026" } } });
  const approval = await preview(t);
  expect((await officersAsAt(ctx, "cli_c1", "2026-10-01", "director")).find(o => o.personId === shared.id)!.person.nameEn).toBe(shared.nameEn);
  await approveProposal(ctx, approval.id);
  for (const d of dates) {
    const a = (await officersAsAt(ctx, "cli_c1", d, "director")).find(o => o.personId === shared.id)!;
    expect.soft(a.person.nameEn).toBe(d < "2026-10-01" ? shared.nameEn : "Approved A Fictional Officer");
    expect.soft(a.person.correspondenceAddress).toBe(d < "2026-10-01" ? shared.correspondenceAddress : "Approved A fictional register address");
    const b = (await officersAsAt(ctx, other.id, d, "director")).find(o => o.personId === shared.id)!;
    expect.soft(b.person.nameEn).toBe(shared.nameEn); expect.soft(b.person.correspondenceAddress).toBe(shared.correspondenceAddress);
  }
  expect.soft((await renderRegisters(ctx, "cli_c1", dates[1], "en")).text).toBe(beforeA.text);
  for (let i = 0; i < dates.length; i++) expect.soft((await renderRegisters(ctx, other.id, dates[i], "en")).text).toBe(beforeB[i].text);
  expect(await ctx.db.select().from(taskEvent).where(and(eq(taskEvent.taskId, t.id), eq(taskEvent.kind, "register.updated")))).toHaveLength(1);
}, 120000);

it("A4R08 a second firm's secretary approval selects its own corporate person and cannot attach another firm's literal per_firm record", async () => {
  await ctx.db.insert(firm).values({ id: "firm_a4_other", legalName: "Fictional Second TCSP Limited", invoicePrefix: "A4" });
  const otherCtx = { ...ctx, firmId: "firm_a4_other" };
  await loadPlaybookLibrary(otherCtx);
  const own = await createPerson(otherCtx, { kind: "corporate", nameEn: "Fictional Second TCSP Limited", correspondenceAddress: "Second fictional HK office" });
  const cl = await createClient(otherCtx, { nameEn: "Second Firm Fictional Client Limited", jurisdiction: "HK", incorporatedOn: "2020-01-01" });
  const before = await ctx.db.select().from(appointment).where(eq(appointment.firmId, ctx.firmId));
  const t = await officerTask(own.id, "2026-10-01", "hk.changeSecretary", cl.id, otherCtx);
  const approval = await preview(t, otherCtx); await approveProposal(otherCtx, approval.id);
  const officers = await officersAsAt(otherCtx, cl.id, "2026-10-01", "secretary");
  expect(officers).toHaveLength(1);
  expect(officers[0].person.firmId).toBe(otherCtx.firmId);
  expect(officers[0].person.nameEn).toBe("Fictional Second TCSP Limited");
  expect(await ctx.db.select().from(appointment).where(eq(appointment.firmId, ctx.firmId))).toEqual(before);
  expect((await ctx.db.select().from(person).where(eq(person.id, "per_firm")))[0].firmId).toBe(ctx.firmId);
}, 120000);


it("A4R09 rejecting an obsolete register approval preserves its signed and filed source and offers a usable fresh register-only approval", async () => {
  ctx.llm.set("draft", goodDraft); ctx.llm.set("extract", { fields: [], documents: [], conflicts: [] });
  const req = await startManualRequest(ctx, { clientId: "cli_c1", confirm: true, items: [
    { playbookId: "hk.changeOffice", fields: { effDate: "2026-10-01", newAddr: "First fictional approved office" } },
    { playbookId: "hk.changeOffice", fields: { effDate: "2026-10-01", newAddr: "Second fictional filed office" } },
  ] });
  await approveProposal(ctx, req.proposalId!);
  const link = (await getRequest(ctx, req.requestId)).uploadToken;
  const pdf = await PDFDocument.create(); pdf.addPage().drawText("Fictional premises evidence");
  for (const id of req.taskIds) {
    await portalUpload(ctx, link, { taskId: id, key: "premises", filename: "fictional-premises.pdf", mime: "application/pdf", content: Buffer.from(await pdf.save()) });
    const pack = (await pendingProposals(ctx, { taskId: id, kind: "send_signing" }))[0]; expect(pack).toBeDefined();
    await approveProposal(ctx, pack.id);
    const title = (await getTask(ctx, id)).title;
    const invite = ctx.mail.sent().filter(m => m.subject === `Documents to sign: ${title}`).at(-1)!;
    const token = invite.text.match(/\/sign\/([A-Za-z0-9]+)/)![1];
    const view = await openSigning(ctx, token); await requestOtp(ctx, token);
    const otp = ctx.mail.sent().filter(m => m.to.includes(view.signer.email)).at(-1)!.text.match(/\b(\d{6})\b/)![1];
    await verifyOtp(ctx, token, otp); await signDocuments(ctx, token, { kind: "typed", data: view.signer.name, ip: "203.0.113.45", userAgent: "fictional-area4" });
    const file = (await pendingProposals(ctx, { taskId: id, kind: "record_filing" }))[0]; expect(file).toBeDefined();
    await approveProposal(ctx, file.id, { edits: { reference: `A4-FICTIONAL-${id}`, filedOn: "2026-10-01" } });
  }
  const [first, second] = req.taskIds;
  const primary = (await pendingProposals(ctx, { taskId: first, kind: "register_change" }))[0];
  const obsolete = (await pendingProposals(ctx, { taskId: second, kind: "register_change" }))[0];
  const source = await getTask(ctx, second);
  const envs = await ctx.db.select().from(signEnvelope).where(eq(signEnvelope.taskId, second)); expect(envs.filter(e => e.status === "completed")).toHaveLength(1);
  const docs = await ctx.db.select().from(document).where(eq(document.taskId, second));
  const bytes = await Promise.all(docs.filter(d => d.storageKey).map(async d => [d.id, Crypto.sha256(await ctx.storage.get(d.storageKey!))]));
  const filings = await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, second)); expect(filings).toHaveLength(1);
  await approveProposal(ctx, primary.id);
  await expect(approveProposal(ctx, obsolete.id)).rejects.toThrow(/changed|preview|correct|fresh/i);
  const after = await getTask(ctx, second);
  expect.soft(after._steps[after.stepIndex].kind).toBe("register");
  expect.soft(after.stepState).toEqual(source.stepState);
  expect.soft(after.effectiveDate).toBe(source.effectiveDate); expect.soft(after.checklist).toEqual(source.checklist);
  expect.soft(await ctx.db.select().from(signEnvelope).where(eq(signEnvelope.taskId, second))).toEqual(envs);
  expect.soft(await ctx.db.select().from(document).where(eq(document.taskId, second))).toEqual(docs);
  expect(await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, second))).toEqual(filings);
  expect(await Promise.all(docs.filter(d => d.storageKey).map(async d => [d.id, Crypto.sha256(await ctx.storage.get(d.storageKey!))]))).toEqual(bytes);
  const fresh = (await pendingProposals(ctx, { taskId: second, kind: "register_change" })).filter(p => p.id !== obsolete.id);
  expect(fresh).toHaveLength(1);
  await approveProposal(ctx, fresh[0].id);
  expect((await getTask(ctx, second))._steps[(await getTask(ctx, second)).stepIndex].kind).toBe("confirm");
  expect(await ctx.db.select().from(signEnvelope).where(eq(signEnvelope.taskId, second))).toEqual(envs);
  expect(await ctx.db.select().from(document).where(eq(document.taskId, second))).toEqual(docs);
  expect(await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, second))).toEqual(filings);
}, 120000);

it("A4R10 independent concurrent secretary and controller previews reject the stale second action without silently applying it", async () => {
  const old = await createPerson(ctx, { kind: "corporate", nameEn: "Fictional Outgoing Secretary" });
  await ctx.db.delete(appointment).where(and(eq(appointment.clientId, "cli_c1"), eq(appointment.role, "secretary")));
  await appoint(ctx, { clientId: "cli_c1", personId: old.id, role: "secretary", fromDate: "2020-01-01" });
  const holder = await createPerson(ctx, { nameEn: "Concurrent Fictional Controller" });
  const pairs = [
    [await officerTask("per_firm", "2026-10-01", "hk.changeSecretary"), await officerTask("per_firm", "2026-10-01", "hk.changeSecretary")],
    [await controllerTask([{ kind: "add", personId: holder.id, nature: "Explicit board appointment rights", registrableFrom: "2026-10-01" }]), await controllerTask([{ kind: "add", personId: holder.id, nature: "Explicit different significant influence", registrableFrom: "2026-10-01" }])],
  ];
  for (const [a, b] of pairs) {
    const pa = await preview(a); const pb = await preview(b); const race = approvalRaceContext(); let results: PromiseSettledResult<unknown>[];
    try { results = await Promise.allSettled([approveProposal(race.c, pa.id), approveProposal(race.c, pb.id)]); } finally { race.done(); }
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await ctx.db.select().from(taskEvent).where(and(eq(taskEvent.kind, "register.updated"), eq(taskEvent.taskId, a.id)))).toHaveLength(results[0].status === "fulfilled" ? 1 : 0);
    expect(await ctx.db.select().from(taskEvent).where(and(eq(taskEvent.kind, "register.updated"), eq(taskEvent.taskId, b.id)))).toHaveLength(results[1].status === "fulfilled" ? 1 : 0);
    if (a.playbookId === "hk.changeSecretary") {
      expect(await officersAsAt(ctx, "cli_c1", "2026-10-01", "secretary")).toHaveLength(1);
      expect((await officersAsAt(ctx, "cli_c1", "2026-09-30", "secretary"))[0].personId).toBe(old.id);
    } else {
      expect(await ctx.db.select().from(significantController).where(eq(significantController.personId, holder.id))).toHaveLength(1);
    }
  }
}, 120000);


it("A4R11 sparse approved particulars patches replay by date without backdating later fields or changing an unapproved company's officer member controller and document history", async () => {
  ctx.clock.set("2026-10-04T02:00:00Z");
  const shared = await createPerson(ctx, { nameEn: "Sparse Original Fictional Officer", nameZh: "原稀疏測試董事", correspondenceAddress: "Sparse original fictional correspondence", email: "original.sparse@audit.example", idNumber: "A4-ORIGINAL-ID-7429", residentialAddress: "Sparse original protected home 7429" });
  const other = await createClient(ctx, { nameEn: "Sparse Unapproved Company B Limited", jurisdiction: "HK", incorporatedOn: "2020-01-01" });
  for (const clientId of ["cli_c1", other.id]) {
    await appoint(ctx, { clientId, personId: shared.id, role: "director", fromDate: "2024-01-01" });
    await ctx.db.insert(significantController).values({ id: ctx.ids.next("scr"), firmId: ctx.firmId, clientId, personId: shared.id, nature: "Explicit sparse fixture board appointment rights", registrableFrom: "2024-01-01" });
    const cls = await createShareClass(ctx, { clientId, name: "Sparse fixture ordinary" });
    await allot(ctx, { clientId, shareClassId: cls.id, date: "2024-01-01", toPersonId: shared.id, quantity: 10 });
  }
  const dates = ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-03", "2026-10-04"];
  const expectedNames = [shared.nameEn, "Sparse Backdated September Name", "Sparse Explicit October Name", "Sparse Explicit October Name", "Sparse Explicit October Name"];
  const contexts: Record<string, string[]> = {};
  for (const clientId of ["cli_c1", other.id]) {
    contexts[clientId] = [];
    for (const date of dates) contexts[clientId].push((await officerTask(shared.id, date, "hk.changeOffice", clientId)).id);
  }
  const beforeB = await Promise.all(dates.map(date => renderRegisters(ctx, other.id, date, "en")));
  const patches = [
    { date: "2026-10-01", changes: [{ field: "nameEn", value: "Sparse Explicit October Name" }] },
    { date: "2026-10-03", changes: [{ field: "corrAddr", value: "Sparse October new correspondence" }, { field: "email", value: "october.sparse@audit.example" }, { field: "idNo", value: "A4-NEW-PROTECTED-ID-9831" }, { field: "resAddr", value: "Sparse October protected home 9831" }] },
    { date: "2026-09-30", changes: [{ field: "nameEn", value: "Sparse Backdated September Name" }] },
  ];
  const approvals: string[] = [];
  for (const patch of patches) {
    ctx.llm.set("structure_particulars", { changes: patch.changes });
    const t = await startTask(ctx, { clientId: "cli_c1", personId: shared.id, playbookId: "hk.changeParticulars", extracted: { effDate: { value: patch.date }, changeDetail: { value: `Explicit sparse fictional company A changes effective ${patch.date}` } } });
    const p = await preview(t); await approveProposal(ctx, p.id); approvals.push(t.id);
  }
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]; const changedFields = date >= "2026-10-03";
    const expectedAddress = changedFields ? "Sparse October new correspondence" : shared.correspondenceAddress;
    const expectedEmail = changedFields ? "october.sparse@audit.example" : shared.email;
    const expectedId = changedFields ? "A4-NEW-PROTECTED-ID-9831" : "A4-ORIGINAL-ID-7429";
    const expectedHome = changedFields ? "Sparse October protected home 9831" : "Sparse original protected home 7429";
    const a = (await officersAsAt(ctx, "cli_c1", date, "director")).find(o => o.personId === shared.id)!;
    expect.soft(a.person).toMatchObject({ nameEn: expectedNames[i], correspondenceAddress: expectedAddress, email: expectedEmail });
    expect.soft((await membersAsAt(ctx, "cli_c1", date)).find(m => m.personId === shared.id)!.name).toBe(expectedNames[i]);
    const exportA = await renderRegisters(ctx, "cli_c1", date, "en");
    // Name must agree in officer/member/controller sections, not only once in a
    // heading or warning. Names are unique fictional strings in this fixture.
    for (const section of ["Directors", "Members", "Significant controllers"]) {
      const content = exportA.text.split(`${section} ·`)[1]?.split("\nKowloon Bay Trading Limited\n")[0] ?? "";
      expect.soft(content).toContain(expectedNames[i]);
    }
    const docA = await loadDocContext(ctx, contexts.cli_c1[i]);
    expect(docA.asAt).toBe(date);
    const directorA = docA.directors.find(o => o.personId === shared.id)!;
    expect.soft(directorA.protected).toMatchObject({ nameEn: expectedNames[i], correspondenceAddress: expectedAddress, email: expectedEmail, idNumber: expectedId, residentialAddress: expectedHome });
    expect.soft(docA.person).toMatchObject({ nameEn: expectedNames[i], idNumber: expectedId, residentialAddress: expectedHome });
    expect.soft(docA.members.find(m => m.personId === shared.id)).toMatchObject({ name: expectedNames[i], address: expectedAddress });
    const b = (await officersAsAt(ctx, other.id, date, "director")).find(o => o.personId === shared.id)!;
    expect.soft(b.person).toMatchObject({ nameEn: shared.nameEn, correspondenceAddress: shared.correspondenceAddress, email: shared.email });
    expect.soft((await membersAsAt(ctx, other.id, date)).find(m => m.personId === shared.id)!.name).toBe(shared.nameEn);
    expect.soft((await renderRegisters(ctx, other.id, date, "en")).text).toBe(beforeB[i].text);
    const docB = await loadDocContext(ctx, contexts[other.id][i]);
    expect.soft(docB.directors.find(o => o.personId === shared.id)!.protected).toMatchObject({ nameEn: shared.nameEn, correspondenceAddress: shared.correspondenceAddress, email: shared.email, idNumber: "A4-ORIGINAL-ID-7429", residentialAddress: "Sparse original protected home 7429" });
    expect.soft(docB.person).toMatchObject({ nameEn: shared.nameEn, idNumber: "A4-ORIGINAL-ID-7429", residentialAddress: "Sparse original protected home 7429" });
    expect.soft(docB.members.find(m => m.personId === shared.id)).toMatchObject({ name: shared.nameEn, address: shared.correspondenceAddress });
  }
  // Inspect controlled rows, including any future snapshot table carrying person_id,
  // without prescribing the repair schema. Domain doc reads above are the only
  // authorized decrypted-value assertions; stored rows must remain ciphertext.
  const tables = await ctx.db.execute<{ table_name: string }>(sql`select distinct table_name from information_schema.columns where table_schema = 'public' and column_name = 'person_id'`);
  const raw: unknown[] = [(await ctx.db.select().from(person).where(eq(person.id, shared.id)))[0]];
  for (const { table_name: tableName } of tables.rows) {
    expect(tableName).toMatch(/^[a-z_]+$/);
    const found = await ctx.db.execute(sql`select to_jsonb(r) as data from ${sql.raw('"' + tableName + '"')} r where person_id = ${shared.id}`); raw.push(...found.rows);
  }
  raw.push(...await ctx.db.select().from(task).where(eq(task.personId, shared.id)));
  const stored = JSON.stringify(raw);
  for (const secret of ["A4-ORIGINAL-ID-7429", "A4-NEW-PROTECTED-ID-9831", "Sparse original protected home 7429", "Sparse October protected home 9831"]) expect(stored).not.toContain(secret);
  expect(stored).toContain("v1.");
  for (const id of approvals) expect(await ctx.db.select().from(taskEvent).where(and(eq(taskEvent.taskId, id), eq(taskEvent.kind, "register.updated")))).toHaveLength(1);
}, 120000);
