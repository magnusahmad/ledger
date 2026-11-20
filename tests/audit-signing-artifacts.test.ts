// Area 5: original reporter, real PostgreSQL + approved generated PDFs and valid PNGs.
// Barriers model bounded overlapping requests, without changing application source.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { PDFDocument, PDFDict, PDFName } from "pdf-lib";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft, review } from "./agent-fixtures";
import type { Ctx } from "@/lib/ctx";
import { seedDemo } from "@/db/seed-demo";
import { Crypto } from "@/lib/crypto";
import { createPerson } from "@/domain/records";
import { startManualRequest } from "@/domain/manual";
import { advance, getRequest, getTask, taskEvents } from "@/domain/engine";
import { applyReview } from "@/agent/review";
import { approveProposal, createProposal, getProposal, pendingProposals, resumeApprovedProposal } from "@/domain/proposals";
import { portalUpload } from "@/domain/portal";
import { openSigning, requestOtp, signDocuments, verifyOtp } from "@/domain/signing";
import { document, signEnvelope, signer, task as taskT } from "@/db/schema";
import "@/domain/inbound";

let ctx: TestCtx;
let routeCtx: Ctx;
vi.mock("@/server/ctx", () => ({ getCtx: () => routeCtx }));
import { GET as download } from "@/app/api/sign/[token]/doc/[docId]/route";
import { GET as staffDownload } from "@/app/api/docs/[id]/route";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const signature = { kind: "drawn" as const, data: png, ip: "203.0.113.55", userAgent: "fictional-artifact-audit" };
beforeEach(async () => {
  await resetDb(); ctx = makeCtx({ now: "2026-10-02T02:00:00Z" }); routeCtx = ctx;
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.set("draft", goodDraft); ctx.llm.set("extract", { fields: [], documents: [], conflicts: [] });
});

function barrier() {
  let arrive!: () => void; let release!: () => void;
  const reached = new Promise<void>(r => { arrive = r; });
  const blocked = new Promise<void>(r => { release = r; });
  return { reached, release, pause: async () => { arrive(); await blocked; } };
}
async function reached(p: Promise<void>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await Promise.race([p, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Audit barrier not reached")), 12_000); })]); }
  finally { clearTimeout(timer); }
}
async function evidencePdf(text: string) {
  const pdf = await PDFDocument.create(); pdf.addPage().drawText(text);
  return Buffer.from(await pdf.save());
}
async function pack(approve = true) {
  const person = await createPerson(ctx, { nameEn: "Artifact Audit Appointee", nameZh: "測試簽署董事", email: "artifact.appointee@audit.example", phone: "+852 9123 0055", idNumber: "K987654(3)", residentialAddress: "Fictional audit home", correspondenceAddress: "Fictional audit office" });
  const req = await startManualRequest(ctx, { clientId: "cli_c1", confirm: true, items: [{ playbookId: "hk.appointDirector", person: { personId: person.id }, fields: { effDate: "2026-10-02" } }] });
  expect(ctx.mail.sent()).toHaveLength(0); await approveProposal(ctx, req.proposalId!);
  const taskId = req.taskIds[0]; const request = await getRequest(ctx, req.requestId);
  const pdf = await evidencePdf("Fictional signing artifact identity evidence");
  for (const key of ["idCopy", "addrProof"]) await portalUpload(ctx, request.uploadToken, { taskId, key, filename: `${key}.pdf`, mime: "application/pdf", content: pdf });
  await portalUpload(ctx, request.uploadToken, { taskId, key: "selfie", filename: "selfie.png", mime: "image/png", content: Buffer.from(png.split(",")[1], "base64") });
  const task = await getTask(ctx, taskId); expect(task._steps[task.stepIndex].kind).toBe("sign");
  const card = (await pendingProposals(ctx, { taskId, kind: "send_signing" }))[0]; expect(card).toBeDefined();
  const envId = card.payload.envelopeId as string;
  const originals = await ctx.db.select().from(document).where(and(eq(document.taskId, taskId), eq(document.source, "generated")));
  if (approve) await approveProposal(ctx, card.id);
  return { taskId, requestId: req.requestId, card, envId, originals, title: task.title };
}
function tokens(title: string) {
  return ctx.mail.sent().filter(m => m.subject === `Documents to sign: ${title}`).map(m => m.text.match(/\/sign\/([A-Za-z0-9]+)/)![1]);
}
async function verify(token: string) {
  const view = await openSigning(ctx, token); await requestOtp(ctx, token);
  const code = ctx.mail.sent().filter(m => m.to.includes(view.signer.email)).at(-1)!.text.match(/\b(\d{6})\b/)![1];
  await verifyOtp(ctx, token, code);
}
async function readyTokens(p: Awaited<ReturnType<typeof pack>>) {
  const links = tokens(p.title); expect(links).toHaveLength(2);
  for (const link of links) await verify(link);
  return links;
}
async function assertCompleted(p: Awaited<ReturnType<typeof pack>>) {
  const env = (await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, p.envId) }))!;
  expect(env.status).toBe("completed"); expect(env.signedDocumentIds).toHaveLength(env.documentIds.length);
  const rows = await ctx.db.select().from(document).where(and(eq(document.taskId, p.taskId), eq(document.source, "signed")));
  expect(rows).toHaveLength(env.documentIds.length); expect(new Set(rows.map(d => d.id)).size).toBe(rows.length);
  const people = await ctx.db.select().from(signer).where(eq(signer.envelopeId, env.id));
  expect(people).toHaveLength(2); expect(people.every(s => s.signedAt && s.otpVerifiedAt)).toBe(true);
  for (const id of env.signedDocumentIds) {
    const row = rows.find(d => d.id === id)!; expect(row).toBeDefined();
    const orig = p.originals.find(d => `${d.title} (signed)` === row.title)!;
    expect(orig).toBeDefined(); expect(row.extractedText).toContain(orig.sha256!);
    for (const s of people) expect(row.extractedText).toContain(s.email);
    const bytes = await ctx.storage.get(row.storageKey!); expect(row.sha256).toBe(Crypto.sha256(bytes));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe((await PDFDocument.load(await ctx.storage.get(orig.storageKey!))).getPageCount() + 1);
  }
  const events = await taskEvents(ctx, p.taskId);
  expect(events.filter(e => e.kind === "signing.completed")).toHaveLength(1);
  expect(events.filter(e => e.kind === "signing.signed")).toHaveLength(2);
  const task = await getTask(ctx, p.taskId); expect(task._steps[task.stepIndex].kind).toBe("file");
  expect(await pendingProposals(ctx, { taskId: p.taskId, kind: "record_filing" })).toHaveLength(1);
  return { env, rows };
}
async function signedRows(taskId: string) { return ctx.db.select().from(document).where(and(eq(document.taskId, taskId), eq(document.source, "signed"))); }

describe("Area 5: one approved signing pack remains the source of its completed artifacts", () => {
  it("SART01 simultaneous final signatures from two verified recipients create one consistent signed pack and one filing gate", async () => {
    const p = await pack(); const links = await readyTokens(p);
    const results = await Promise.allSettled(links.map(token => signDocuments(ctx, token, signature)));
    expect(results.map(r => r.status)).toEqual(["fulfilled", "fulfilled"]); await assertCompleted(p);
  });

  it("SART02 repeated concurrent final submissions record the recipient once and never duplicate artifacts or completion", async () => {
    const p = await pack(); const links = await readyTokens(p); await signDocuments(ctx, links[0], signature);
    const results = await Promise.allSettled(Array.from({ length: 3 }, () => signDocuments(ctx, links[1], signature)));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    for (const result of results) if (result.status === "rejected") expect(String(result.reason)).toMatch(/already signed|used/i);
    await assertCompleted(p);
  });

  it("SART03 a second signed-PDF storage failure rolls back the final signature and retries into exactly one consistent complete pack", async () => {
    const p = await pack(); const links = await readyTokens(p); await signDocuments(ctx, links[0], signature);
    const put = ctx.storage.put.bind(ctx.storage); let signedWrites = 0;
    const broken: Ctx = { ...ctx, storage: { get: ctx.storage.get.bind(ctx.storage), put: async (key, bytes) => {
      if (key.endsWith("-signed.pdf") && ++signedWrites === 2) {
        // Object one is already stored but its metadata is still uncommitted.
        expect(await signedRows(p.taskId)).toHaveLength(0);
        expect((await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, p.envId) }))?.status).toBe("sent");
        const id = key.match(/\/(doc_[^/]+)-signed\.pdf$/)![1];
        expect((await staffDownload(new Request("http://fictional.invalid"), { params: Promise.resolve({ id }) })).status).toBe(404);
        throw new Error("Fictional storage unavailable");
      }
      await put(key, bytes);
    } } };
    await expect(signDocuments(broken, links[1], signature)).rejects.toThrow(/storage unavailable/);
    expect(await signedRows(p.taskId)).toHaveLength(0);
    expect((await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, p.envId) }))?.status).toBe("sent");
    const rows = await ctx.db.select().from(signer).where(eq(signer.envelopeId, p.envId)); expect(rows.filter(s => s.signedAt)).toHaveLength(1);
    const task = await getTask(ctx, p.taskId); expect(task._steps[task.stepIndex].kind).toBe("sign");
    await signDocuments(ctx, links[1], signature); const complete = await assertCompleted(p);
    for (const row of complete.rows) {
      const response = await staffDownload(new Request("http://fictional.invalid"), { params: Promise.resolve({ id: row.id }) });
      expect(response.status).toBe(200); expect(Crypto.sha256(Buffer.from(await response.arrayBuffer()))).toBe(row.sha256);
    }
  });

  it("SART04 an old-token reader overlapping re-preparation rejects withdrawal instead of exposing the newly prepared pack", async () => {
    const p = await pack(); const links = await readyTokens(p); const gate = barrier();
    const db = new Proxy(ctx.db, { get(target, key) {
      if (key === "query") return { ...target.query, signEnvelope: { ...target.query.signEnvelope, findFirst: async (...args: Parameters<typeof target.query.signEnvelope.findFirst>) => { const row = await target.query.signEnvelope.findFirst(...args); await gate.pause(); return row; } } };
      const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
    } });
    const reading = openSigning({ ...ctx, db }, links[0]);
    try {
      await reached(gate.reached);
      await applyReview(ctx, p.taskId, review({ items: [], effectiveDate: "2026-10-05", summary: "Human confirmed revised appointment date" }), { clientId: "cli_c1", actor: ctx.userId });
      await advance(ctx, p.taskId);
    } finally { gate.release(); }
    const result = await Promise.allSettled([reading]);
    expect(result[0].status, "Withdrawn old link must not list the new generated document IDs").toBe("rejected");
    if (result[0].status === "rejected") expect(String(result[0].reason)).toMatch(/withdraw|changed|current|invalid/i);
    expect(await signedRows(p.taskId)).toHaveLength(0);
    expect((await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, p.envId) }))?.status).toBe("voided");
  });

  it.each(["storage_only", "storage_and_live_row_hash"])("SART05 %s: changed unsigned bytes cannot override the immutable human-approved document hash", async mode => {
    const p = await pack(); const links = await readyTokens(p); await signDocuments(ctx, links[0], signature);
    const env = (await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, p.envId) }))!;
    const original = p.originals.find(d => d.id === env.documentIds[0])!;
    const approvedBytes = Buffer.from(await ctx.storage.get(original.storageKey!));
    const replacement = await evidencePdf("Fictional changed unapproved resolution bytes"); expect(Crypto.sha256(replacement)).not.toBe(original.sha256);
    await ctx.storage.put(original.storageKey!, replacement);
    if (mode === "storage_and_live_row_hash") await ctx.db.update(document).set({ sha256: Crypto.sha256(replacement) }).where(eq(document.id, original.id));
    await expect(signDocuments(ctx, links[1], signature)).rejects.toThrow(/changed|hash|integrity|approved|document/i);
    expect(await signedRows(p.taskId)).toHaveLength(0);
    expect((await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, p.envId) }))?.status).toBe("sent");
    await ctx.storage.put(original.storageKey!, approvedBytes);
    await ctx.db.update(document).set({ sha256: original.sha256 }).where(eq(document.id, original.id));
    await signDocuments(ctx, links[1], signature); await assertCompleted(p);
  });

  it("SART07 a personal signing download rejects a document pointer belonging to another firm and task", async () => {
    const p = await pack(); const link = tokens(p.title)[0];
    const foreignBytes = await evidencePdf("Fictional OTHER FIRM confidential resolution");
    await ctx.storage.put("audit/foreign-resolution.pdf", foreignBytes);
    const foreign = { id: "doc_artifact_foreign", firmId: "firm_other_fictional", clientId: "cli_other", taskId: "task_other", kind: "resolution", title: "Other firm's confidential resolution", storageKey: "audit/foreign-resolution.pdf", mime: "application/pdf", sha256: Crypto.sha256(foreignBytes), source: "generated" as const, createdAt: ctx.clock.now() };
    await ctx.db.insert(document).values(foreign);
    await ctx.db.update(signEnvelope).set({ documentIds: [foreign.id] }).where(eq(signEnvelope.id, p.envId));
    // A broken live pointer must not turn possession of this recipient link into foreign access.
    const response = await download(new Request("http://fictional.invalid"), { params: Promise.resolve({ token: link, docId: foreign.id }) });
    expect(response.status).toBe(404);
    // A stale/corrupt task-generation pointer must still not widen an approved
    // recipient's scope. This is a controlled persisted-indirection fault.
    const t = await getTask(ctx, p.taskId); const index = t._steps.findIndex(s => s.kind === "generate");
    const generation = t.stepState[String(index)] as { signatureFields: { id: string; fields: unknown[]; signers?: string }[] };
    await ctx.db.update(taskT).set({ stepState: { ...t.stepState, [String(index)]: { ...generation, signatureFields: generation.signatureFields.map(g => ({ ...g, id: foreign.id })) } } }).where(eq(taskT.id, t.id));
    const misdirected = await download(new Request("http://fictional.invalid"), { params: Promise.resolve({ token: link, docId: foreign.id }) });
    expect(misdirected.status, "Both envelope and generated-task pointers must not authorize another firm's document").toBe(404);
    expect(await ctx.db.query.document.findFirst({ where: eq(document.id, foreign.id) })).toMatchObject(foreign);
  });

  it("SART06 signing overlapping a human cancellation terminates safely and a retry cannot resurrect withdrawn artifacts", async () => {
    const p = await pack(); const links = await readyTokens(p); await signDocuments(ctx, links[0], signature);
    const storageGate = barrier(); const taskGate = barrier();
    const c: Ctx = { ...ctx, storage: { get: ctx.storage.get.bind(ctx.storage), put: async (key, bytes) => { if (key.endsWith("-signed.pdf")) await storageGate.pause(); await ctx.storage.put(key, bytes); } } };
    const signing = signDocuments(c, links[1], signature);
    void signing.catch(() => undefined);
    const cancel = await createProposal(ctx, { kind: "cancel_task", title: "Cancel fictional signing work", clientId: "cli_c1", taskId: p.taskId, requestId: p.requestId, payload: { taskId: p.taskId, reason: "Client withdrew before filing", voidInvoice: false } });
    // The approval fence acquires task rows through Drizzle's select().for(),
    // not raw execute(). Observe completion of the actual lock-bearing query.
    function observe<T extends object>(target: T): T {
      return new Proxy(target, { get(object, key) {
        const value = Reflect.get(object, key);
        if (key === "then" && typeof value === "function") {
          const sqlText = (object as unknown as { toSQL?: () => { sql: string } }).toSQL?.().sql ?? "";
          if (/from "task" .*for update/i.test(sqlText)) return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve(value.call(object, (v: unknown) => v)).then(async v => { await taskGate.pause(); return v; }).then(resolve, reject);
        }
        if (typeof value !== "function") return value;
        return (...args: unknown[]) => { const next = value.apply(object, args); return next && typeof next === "object" && !(next instanceof Promise) ? observe(next) : next; };
      } });
    }
    const wrapped = new Proxy(ctx.db, { get(target, key) {
      if (key === "transaction") return async (fn: (db: unknown) => Promise<unknown>) => target.transaction(db => fn(observe(db)));
      const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
    } });
    let cancelling: Promise<unknown> | undefined;
    try { await reached(storageGate.reached); cancelling = approveProposal({ ...ctx, db: wrapped } as Ctx, cancel.id); void cancelling.catch(() => undefined); await Promise.race([taskGate.reached, new Promise<void>(resolve => setTimeout(resolve, 600))]); }
    finally { storageGate.release(); taskGate.release(); await Promise.allSettled([signing, ...(cancelling ? [cancelling] : [])]); }
    const results = await Promise.allSettled([signing, cancelling!]);
    for (const result of results) if (result.status === "rejected") { expect.soft(String(result.reason)).toMatch(/retry|withdraw|changed|cancel|already|current/i); expect.soft(String(result.reason)).not.toMatch(/Failed query|params:|40P01|deadlock/i); }
    if ((await getTask(ctx, p.taskId)).status !== "cancelled") await approveProposal(ctx, cancel.id);
    expect((await getTask(ctx, p.taskId)).status).toBe("cancelled");
    expect((await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, p.envId) }))?.status).toBe("voided");
    const before = await signedRows(p.taskId); await expect(signDocuments(ctx, links[1], signature)).rejects.toThrow(/withdraw/i); expect(await signedRows(p.taskId)).toEqual(before);
    expect(await pendingProposals(ctx, { taskId: p.taskId, kind: "record_filing" })).toHaveLength(0);
  }, 90_000);

  it("SART08 recipients completing after committed last invitation acceptance but before handler acknowledgement leave one completed pack and no stranded sending approval", async () => {
    const p = await pack(false); const gate = barrier(); let invitations = 0;
    const mail = new Proxy(ctx.mail, { get(target, key) {
      if (key === "send") return async (...args: Parameters<typeof target.send>) => { if (args[0].subject === `Documents to sign: ${p.title}`) invitations++; return target.send(...args); };
      const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
    } });
    let accepted = 0;
    const db = new Proxy(ctx.db, { get(target, key) {
      if (key === "transaction") return async (...args: Parameters<typeof target.transaction>) => {
        const result = await target.transaction(...args);
        if (result && typeof result === "object" && "providerMessageId" in result && ++accepted === 2) await gate.pause();
        return result;
      };
      const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
    } });
    const sending = approveProposal({ ...ctx, mail, db }, p.card.id);
    void sending.catch(() => undefined);
    try {
      await reached(gate.reached); const links = await readyTokens(p);
      await Promise.all(links.map(token => signDocuments(ctx, token, signature)));
      await assertCompleted(p);
    } finally { gate.release(); await Promise.allSettled([sending]); }
    const result = await Promise.allSettled([sending]);
    if (result[0].status === "rejected") await resumeApprovedProposal(ctx, p.card.id).catch(() => undefined);
    expect.soft((await getProposal(ctx, p.card.id)).status).toBe("approved");
    expect.soft(invitations).toBe(2);
    expect.soft(ctx.mail.sent().filter(m => m.subject === `Documents to sign: ${p.title}`)).toHaveLength(2);
    await assertCompleted(p);
  }, 90_000);

  it("SART09 a download authorized before withdrawal returns only original approved bytes and a subsequent read rejects the old token", async () => {
    const p = await pack(); const link = tokens(p.title)[0];
    const view = await openSigning(ctx, link); const original = p.originals.find(d => d.id === view.documents[0].id)!;
    const gate = barrier();
    routeCtx = { ...ctx, storage: { put: ctx.storage.put.bind(ctx.storage), get: async key => { if (key === original.storageKey) await gate.pause(); return ctx.storage.get(key); } } };
    const reading = download(new Request("http://fictional.invalid"), { params: Promise.resolve({ token: link, docId: original.id }) });
    void reading.catch(() => undefined);
    try {
      await reached(gate.reached);
      await applyReview(ctx, p.taskId, review({ items: [], effectiveDate: "2026-10-05", summary: "Human confirmed revised signing facts" }), { clientId: "cli_c1", actor: ctx.userId });
      await advance(ctx, p.taskId);
    } finally { gate.release(); await Promise.allSettled([reading]); routeCtx = ctx; }
    const response = await reading;
    // Authorization linearizes before withdrawal. An already authorized read may
    // return that immutable original, or conservatively refuse the withdrawn link.
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) expect(Crypto.sha256(Buffer.from(await response.arrayBuffer()))).toBe(original.sha256);
    expect((await download(new Request("http://fictional.invalid"), { params: Promise.resolve({ token: link, docId: original.id }) })).status).toBe(404);
    const current = (await pendingProposals(ctx, { taskId: p.taskId, kind: "send_signing" }))[0];
    expect(current).toBeDefined(); expect(current.payload.envelopeId).not.toBe(p.envId);
    expect((await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, p.envId) }))?.status).toBe("voided");
  }, 90_000);

  it("SART10 live signature-field changes cannot silently omit the human-approved signature marks from a certified signed PDF", async () => {
    const p = await pack(); const links = await readyTokens(p); await signDocuments(ctx, links[0], signature);
    const t = await getTask(ctx, p.taskId); const index = t._steps.findIndex(s => s.kind === "generate");
    const generation = t.stepState[String(index)] as { signatureFields: { id: string; fields: unknown[]; signers?: string }[] };
    await ctx.db.update(taskT).set({ stepState: { ...t.stepState, [String(index)]: { ...generation, signatureFields: generation.signatureFields.map(g => ({ ...g, fields: [] })) } } }).where(eq(taskT.id, t.id));
    const result = await Promise.allSettled([signDocuments(ctx, links[1], signature)]);
    if (result[0].status === "rejected") {
      expect(String(result[0].reason)).toMatch(/changed|field|integrity|approved|document/i);
      expect(await signedRows(p.taskId)).toHaveLength(0);
      expect((await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, p.envId) }))?.status).toBe("sent");
      await ctx.db.update(taskT).set({ stepState: t.stepState }).where(eq(taskT.id, t.id));
      await signDocuments(ctx, links[1], signature);
    }
    const complete = await assertCompleted(p);
    function images(pdf: PDFDocument) {
      return pdf.getPages().reduce((count, page) => {
        const objects = page.node.Resources()?.lookup(PDFName.of("XObject"));
        return count + (objects instanceof PDFDict ? objects.keys().filter(key => {
          const object = objects.lookup(key) as { dict?: PDFDict };
          return object?.dict?.get(PDFName.of("Subtype"))?.toString() === "/Image";
        }).length : 0);
      }, 0);
    }
    for (const signed of complete.rows) {
      const original = p.originals.find(d => `${d.title} (signed)` === signed.title)!;
      const before = await PDFDocument.load(await ctx.storage.get(original.storageKey!));
      const after = await PDFDocument.load(await ctx.storage.get(signed.storageKey!));
      expect(images(after), "The original approved field must contain the real PNG mark, not only a certificate assertion").toBeGreaterThan(images(before));
    }
  }, 90_000);
});
