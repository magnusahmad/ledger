import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { makeCtx, resetDb, TEST_DB, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { action, intake, goodDraft } from "./agent-fixtures";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { approveProposal, getProposal, pendingProposals, recoverApprovals, resumeApprovedProposal } from "@/domain/proposals";
import { enqueue, runJobs } from "@/domain/jobs";
import { pollBank } from "@/domain/payments";
import { pollMail } from "@/channels/mail-poller";
import { kvGet, kvSet, withLease } from "@/domain/kv";
import { createRequest, startTask, markStepState, getTask } from "@/domain/engine";
import { createPerson } from "@/domain/records";
import { portalUpload } from "@/domain/portal";
import { openSigning } from "@/domain/signing";
import { FakeMail, type StoredOutbound } from "@/integrations/mail/fake";
import { FileList } from "@/integrations/json-store";
import { attachment, document, invoice, job, message, payment, bankTransaction, signer, signEnvelope, request, auditLog, taskEvent } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); });

async function killAtCheckpoint(mode: string, payload = "") {
  const child = spawn(process.execPath, ["--import", "tsx", "tests/fixtures/recovery-crash-worker.ts", mode, payload], {
    cwd: process.cwd(), env: { ...process.env, DATABASE_URL: TEST_DB, LLM_MODE: "fixture", MAIL_PROVIDER: "fake" }, stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Crash fixture timed out: ${output}`)), 15_000);
      child.stdout.on("data", chunk => { output += String(chunk); if (output.includes("RECOVERY_CHECKPOINT")) { clearTimeout(timeout); resolve(); } });
      child.stderr.on("data", chunk => { output += String(chunk); });
      child.once("exit", code => { clearTimeout(timeout); reject(new Error(`Crash fixture exited ${code}: ${output}`)); });
      child.once("error", reject);
    });
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exit = once(child, "exit"); child.kill("SIGKILL"); await exit;
    }
  }
}

function scriptedRequest() {
  ctx.llm.set("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeOffice", fields: [{ key: "newAddr", value: "Audit office", quote: null }] })] }));
  ctx.llm.set("draft", goodDraft);
}
function incoming() { return { provider: "fake", providerMessageId: "recovery-inbound-1", from: { email: "director@kbtrading.example", name: "CHAN Tai Man" }, to: [ctx.mail.address], cc: [], subject: "Move office", text: "Please change the office to Audit office", receivedAt: ctx.clock.now(), attachments: [] }; }
async function draft() {
  scriptedRequest(); const m = await ingestMessage(ctx, { ...incoming(), channel: "email" }); await processInbound(ctx, m.id);
  return (await pendingProposals(ctx, { kind: "send_message" }))[0];
}

it("REC01 a killed approval claim can finish its approved message with the human's original edits", async () => {
  const p = await draft(); await killAtCheckpoint("approval", p.id);
  expect(ctx.mail.sent()).toHaveLength(0);
  ctx.clock.advanceDays(1);
  await recoverApprovals(ctx);
  expect((await getProposal(ctx, p.id)).status).toBe("recovery");
  await resumeApprovedProposal(ctx, p.id);
  expect(ctx.mail.sent()).toHaveLength(1);
  expect(ctx.mail.sent()[0].text).toBe("Human approved recovery wording");
  expect((await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) }))?.status).toBe("sent");
  expect((await getProposal(ctx, p.id)).status).toBe("approved");
}, 120_000);

it("REC02 a worker killed while running invoice sync is reclaimed and really syncs exactly one invoice", async () => {
  const [inv] = await ctx.db.insert(invoice).values({ id: "recovery-invoice", firmId: ctx.firmId, clientId: "cli_c1", number: "RECOVERY-1", status: "sent", totalCents: 10000 }).returning();
  await enqueue(ctx, "xero.sync_invoice", { invoiceId: inv.id }, `xero.invoice:${inv.id}`);
  await killAtCheckpoint("job");
  expect((await ctx.db.select().from(job).for("update"))[0].status).toBe("running");
  ctx.clock.advanceDays(1); await runJobs(ctx); await runJobs(ctx);
  const stored = await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) });
  expect(stored?.xeroInvoiceId).toBeTruthy(); expect(stored?.xeroStatus).toBe("synced");
  expect(ctx.accounting.invoices.size).toBe(1); expect((await ctx.db.select().from(job))[0].status).toBe("done");
});

it("REC03 a lost mail response after provider acceptance cannot duplicate a client's approved message on retry", async () => {
  const p = await draft(); const send = ctx.mail.send.bind(ctx.mail); let loseResponse = true; let sendCalls = 0;
  ctx.mail.send = async mail => { sendCalls++; const result = await send(mail); if (loseResponse) { loseResponse = false; throw new Error("Provider accepted mail; socket closed before response"); } return result; };
  await approveProposal(ctx, p.id).catch(() => undefined);
  expect(sendCalls).toBe(1);
  expect(ctx.mail.sent()).toHaveLength(1);
  await approveProposal(ctx, p.id).catch(() => undefined);
  expect(sendCalls).toBe(1);
  expect(ctx.mail.sent()).toHaveLength(1);
  const stored = await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) });
  expect(stored?.status === "sent" || /uncertain|unknown|reconcil|review/i.test(stored?.error ?? "")).toBe(true);
}, 120_000);

it("REC04 retrying a partial signing send preserves the delivered link and sends only the missing invitation", async () => {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const person = await createPerson(ctx, { nameEn: "Recovery Appointee", email: "appointee@audit.example", idNumber: "K987654(3)", residentialAddress: "Audit home", correspondenceAddress: "Audit office" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: person.id, extracted: { effDate: { value: "2026-09-29" } } });
  await markStepState(ctx, t.id, "send", { sent: true }); ctx.llm.on("extract", { fields: [], documents: [], conflicts: [] });
  const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = Buffer.from(await pdf.save());
  for (const key of ["idCopy", "addrProof"]) await portalUpload(ctx, req.uploadToken, { taskId: t.id, key, filename: `${key}.pdf`, mime: "application/pdf", content: bytes });
  await portalUpload(ctx, req.uploadToken, { taskId: t.id, key: "selfie", filename: "selfie.png", mime: "image/png", content: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64") });
  const p = (await pendingProposals(ctx, { kind: "send_signing", taskId: t.id }))[0]; expect(p).toBeDefined();
  const send = ctx.mail.send.bind(ctx.mail); let attempts = 0;
  ctx.mail.send = async mail => { if (++attempts === 2) throw new Error("Second invite rejected before acceptance"); return send(mail); };
  await approveProposal(ctx, p.id).catch(() => undefined); expect(ctx.mail.sent()).toHaveLength(1);
  const token = ctx.mail.sent()[0].text.match(/\/sign\/([A-Za-z0-9]+)/)![1];
  await approveProposal(ctx, p.id);
  expect(attempts).toBe(3); // First accepted, second rejected, only the missing invite retried.
  expect(ctx.mail.sent()).toHaveLength(2);
  expect(new Set(ctx.mail.sent().map(m => m.to[0])).size).toBe(2);
  expect(await ctx.db.select().from(signer)).toHaveLength(2);
  expect((await openSigning(ctx, token)).signer.email).toBe(ctx.mail.sent()[0].to[0]);
  expect((await ctx.db.query.signEnvelope.findFirst({ where: eq(signEnvelope.id, p.payload.envelopeId as string) }))?.status).toBe("sent");
}, 120_000);

it("REC05 a deposit persisted before a crash is matched on the next poll exactly once and unblocks paid work", async () => {
  const req = await createRequest(ctx, { clientId: "cli_c2" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c2", playbookId: "hk.changeOffice" });
  await markStepState(ctx, t.id, "send", { sent: true });
  const [inv] = await ctx.db.insert(invoice).values({ id: "recovery-invoice", firmId: ctx.firmId, clientId: "cli_c2", requestId: req.id, number: "RECOVERY-1", status: "sent", totalCents: 10000 }).returning();
  await ctx.db.update(request).set({ invoiceId: inv.id }).where(eq(request.id, req.id));
  const deposit = await ctx.bank.simulateDeposit!({ amountCents: inv.totalCents, currency: "HKD", reference: inv.number, payerName: "Audit payer" }); expect(deposit).toBeTruthy();
  await killAtCheckpoint("bank", JSON.stringify(deposit));
  expect((await ctx.db.select().from(bankTransaction))[0].status).toBe("unmatched");
  await pollBank(ctx); await pollBank(ctx);
  expect((await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv.id) }))?.paidCents).toBe(inv.totalCents);
  const allocations = await ctx.db.select().from(payment).where(eq(payment.invoiceId, inv.id));
  expect(allocations).toHaveLength(1);
  expect(allocations[0]).toMatchObject({ amountCents: inv.totalCents, bankTransactionId: (await ctx.db.select().from(bankTransaction))[0].id, method: "bank_auto" });
  expect((await ctx.db.select().from(job)).filter(j => j.kind === "xero.sync_payment" && j.payload.paymentId === allocations[0].id)).toHaveLength(1);
  expect((await ctx.db.select().from(bankTransaction))[0].status).toBe("matched");
  const current = await getTask(ctx, t.id); expect(current._steps[current.stepIndex]?.kind).toBe("collect");
}, 120_000);

it("REC06 replaying a mailbox item stored before a crash processes one request and preserves the human send gate", async () => {
  scriptedRequest(); const mail = incoming(); ctx.mail.deliver(mail);
  await killAtCheckpoint("inbound", JSON.stringify(mail));
  expect((await ctx.db.select().from(message))[0].processedAt).toBeNull();
  await pollMail(ctx); await pollMail(ctx);
  expect(await ctx.db.select().from(request)).toHaveLength(1);
  expect(await pendingProposals(ctx, { kind: "send_message" })).toHaveLength(1);
  expect((await ctx.db.select().from(message)).find(m => m.direction === "in")?.processedAt).toBeTruthy();
  expect(ctx.mail.sent()).toHaveLength(0);
}, 120_000);

it("REC07 an expired poll owner finishing late cannot release its replacement's active lease", async () => {
  let releaseA!: () => void; let releaseB!: () => void; let enteredA!: () => void; let enteredB!: () => void;
  const aEntered = new Promise<void>(r => { enteredA = r; }); const bEntered = new Promise<void>(r => { enteredB = r; });
  const a = withLease(ctx, "recovery", 300, async () => { enteredA(); await new Promise<void>(r => { releaseA = r; }); });
  await aEntered;
  const old = await kvGet<Record<string, unknown>>(ctx, "lease.recovery");
  // Deterministic expiry; retain all identity fields so only the expiry changes.
  await kvSet(ctx, "lease.recovery", { ...old, until: "1970-01-01T00:00:00.000Z" });
  const b = withLease(ctx, "recovery", 300, async () => { enteredB(); await new Promise<void>(r => { releaseB = r; }); });
  await bEntered;
  try {
    releaseA(); await a; let enteredC = false;
    await withLease(ctx, "recovery", 300, async () => { enteredC = true; });
    expect(enteredC).toBe(false);
  } finally { releaseB(); await b; }
});

it("REC08 provider acceptance followed by a failed local sent write is recovered without another client delivery", async () => {
  const p = await draft(); const originalDb = ctx.db; let failedSentWrite = false; let sendCalls = 0;
  const send = ctx.mail.send.bind(ctx.mail);
  ctx.mail.send = async mail => { sendCalls++; return send(mail); };
  ctx.db = new Proxy(originalDb, { get(db, key) {
    if (key !== "update") return Reflect.get(db, key);
    return (table: Parameters<typeof db.update>[0]) => {
      const builder = db.update(table);
      return new Proxy(builder, { get(update, method) {
        if (method !== "set") return Reflect.get(update, method);
        return (patch: Record<string, unknown>) => {
          if (table === message && patch.status === "sent" && !failedSentWrite) {
            failedSentWrite = true;
            return { where: async () => { throw new Error("Database disconnected after provider returned acceptance IDs"); } };
          }
          return update.set(patch);
        };
      } });
    };
  } });
  await approveProposal(ctx, p.id).catch(() => undefined);
  ctx.db = originalDb;
  expect(failedSentWrite).toBe(true); expect(ctx.mail.sent()).toHaveLength(1);
  expect(ctx.mail.sent()[0].providerMessageId).toBeTruthy();
  await approveProposal(ctx, p.id).catch(() => undefined);
  expect(sendCalls).toBe(1);
  expect(ctx.mail.sent()).toHaveLength(1);
  const stored = await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) });
  expect(stored?.status).toBe("sent");
  expect(stored?.providerMessageId).toBe(ctx.mail.sent()[0].providerMessageId);
}, 120_000);

it("REC09 recovery cannot send a changed recipient or body under an earlier ambiguous approval", async () => {
  const p = await draft(); const send = ctx.mail.send.bind(ctx.mail); let loseResponse = true; let sendCalls = 0;
  ctx.mail.send = async mail => { sendCalls++; const accepted = await send(mail); if (loseResponse) { loseResponse = false; throw new Error("Response lost after original approved payload accepted"); } return accepted; };
  const approvedText = "Human approved original recovery message";
  const approvedTo = "original@audit.example";
  await approveProposal(ctx, p.id, { edits: { text: approvedText, to: approvedTo } }).catch(() => undefined);
  expect(ctx.mail.sent()).toHaveLength(1);
  expect(ctx.mail.sent()[0]).toMatchObject({ text: approvedText, to: [approvedTo] });
  await ctx.db.update(message).set({ text: "Changed payload needing a fresh preview", toAddrs: ["changed@audit.example"] }).where(eq(message.id, p.payload.messageId as string));
  await approveProposal(ctx, p.id).catch(() => undefined);
  expect(sendCalls).toBe(1);
  expect(ctx.mail.sent().every(m => m.text === approvedText && m.to.join(",") === approvedTo)).toBe(true);
  expect(ctx.mail.sent()).toHaveLength(1);
  const stored = await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) });
  const card = await getProposal(ctx, p.id);
  expect(stored).toMatchObject({ status: "sent", text: approvedText, toAddrs: [approvedTo], providerMessageId: ctx.mail.sent()[0].providerMessageId });
  expect(card.status).toBe("approved");
}, 120_000);

it("REC10 interrupted inbound attachment storage recovers both PDF files exactly once before intake", async () => {
  scriptedRequest(); ctx.llm.on("extract", { fields: [], documents: [], conflicts: [] });
  const first = await PDFDocument.create(); first.addPage(); first.setTitle("Recovery first attachment");
  const second = await PDFDocument.create(); second.addPage(); second.setTitle("Recovery second attachment");
  const files = [
    { filename: "first.pdf", mime: "application/pdf", content: Buffer.from(await first.save()) },
    { filename: "second.pdf", mime: "application/pdf", content: Buffer.from(await second.save()) },
  ];
  const mail = { ...incoming(), attachments: files };
  const put = ctx.storage.put.bind(ctx.storage); let puts = 0;
  ctx.storage.put = async (key, bytes) => { if (++puts === 2) throw new Error("Storage disconnected while saving second inbound attachment"); await put(key, bytes); };
  await expect(ingestMessage(ctx, { ...mail, channel: "email" })).rejects.toThrow(/second inbound attachment/);
  ctx.storage.put = put;
  await ingestMessage(ctx, { ...mail, channel: "email" });
  const received = await ctx.db.query.message.findFirst({ where: eq(message.providerMessageId, mail.providerMessageId) });
  expect(received).toBeDefined();
  const attached = await ctx.db.select().from(attachment).where(eq(attachment.messageId, received!.id));
  expect(attached).toHaveLength(2);
  expect(attached.map(a => a.filename).sort()).toEqual(["first.pdf", "second.pdf"]);
  for (const file of files) {
    const metadata = attached.find(a => a.filename === file.filename)!;
    const doc = await ctx.db.query.document.findFirst({ where: eq(document.id, metadata.documentId!) });
    expect(doc).toMatchObject({ title: file.filename, mime: file.mime });
    expect(await ctx.storage.get(doc!.storageKey!)).toEqual(file.content);
  }
  ctx.mail.deliver(mail); await pollMail(ctx); await pollMail(ctx);
  expect(await ctx.db.select().from(attachment).where(eq(attachment.messageId, received!.id))).toHaveLength(2);
  expect(await ctx.db.select().from(request)).toHaveLength(1);
  expect(await pendingProposals(ctx, { kind: "send_message" })).toHaveLength(1);
  expect(ctx.mail.sent()).toHaveLength(0);
}, 120_000);

it("REC11 death after an accepted reply and invoice enqueue recovers local finalization without resending", async () => {
  const directory = await mkdtemp(join(tmpdir(), "harbourline-recovery-outbox-"));
  const outbox = join(directory, "outbox.json");
  ctx.mail = new FakeMail(undefined, undefined, new FileList<StoredOutbound>(outbox));
  try {
    const p = await draft();
    const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.requestId, p.requestId!) }); expect(inv).toBeDefined();
    const taskIds = p.payload.taskIds as string[]; expect(taskIds).toHaveLength(1);
    await killAtCheckpoint("finalization", JSON.stringify({ proposalId: p.id, outbox }));
    expect(ctx.mail.sent()).toHaveLength(1);
    ctx.clock.advanceDays(1);
    const send = ctx.mail.send.bind(ctx.mail); let retryCalls = 0;
    ctx.mail.send = async mail => { retryCalls++; return send(mail); };
    await approveProposal(ctx, p.id);
    expect(retryCalls).toBe(0); expect(ctx.mail.sent()).toHaveLength(1);
    expect((await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, inv!.id) }))?.status).toBe("sent");
    expect((await ctx.db.select().from(job)).filter(j => j.kind === "xero.sync_invoice" && j.payload.invoiceId === inv!.id)).toHaveLength(1);
    const current = await getTask(ctx, taskIds[0]); expect(current._steps[current.stepIndex]?.kind).toBe("collect");
    expect((await ctx.db.select().from(taskEvent).where(eq(taskEvent.taskId, current.id))).filter(e => e.kind === "message.sent")).toHaveLength(1);
    expect((await ctx.db.select().from(auditLog)).filter(a => a.action === "proposal.approve.send_message" && a.entityId === p.id)).toHaveLength(1);
    expect((await getProposal(ctx, p.id)).status).toBe("approved");
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 120_000);
