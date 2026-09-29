// npm run demo:rehearse — runs the whole investor demo end to end against a scratch
// database with the live product LLM and the demo mailbox/bank/ledger, and reports each
// stage with timings. Use it before a meeting; it doesn't touch the demo database.
import { Client } from "pg";
import { eq } from "drizzle-orm";
import "@/domain/inbound";
import { runMigrations } from "@/db/migrate";
import { closePools } from "@/db/client";
import { makeRuntimeCtx } from "@/lib/runtime";
import { MemoryStorage } from "@/integrations/storage";
import { FakeMail } from "@/integrations/mail/fake";
import { FakeBank } from "@/integrations/bank/fake";
import { FakeAccounting } from "@/integrations/accounting/fake";
import { seedDemo } from "@/db/seed-demo";
import { pollMail } from "@/channels/mail-poller";
import { pollBank } from "@/domain/payments";
import { runJobs } from "@/domain/jobs";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { getTask, tasksForRequest } from "@/domain/engine";
import { portalUpload, portalView } from "@/domain/portal";
import { requestOtp, verifyOtp, signDocuments } from "@/domain/signing";
import { invoice, request as requestT } from "@/db/schema";
import { simplePdf } from "@/documents/simple-pdf";

const URL = "postgres://localhost/harbourline_eval";
const t0 = Date.now();
const log = (s: string) => console.log(`${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s  ${s}`);
const c = new Client({ connectionString: URL }); await c.connect();
await c.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;"); await c.end();
await runMigrations(URL);
const mail = new FakeMail("desk@caineroad.example");
const ctx = { ...makeRuntimeCtx({ DATABASE_URL: URL }), storage: new MemoryStorage(), mail, bank: new FakeBank(), accounting: new FakeAccounting() };
await seedDemo(ctx);
log(`seeded; LLM ${ctx.config.llmMode} ${ctx.config.LLM_MODEL} (${ctx.config.LLM_REASONING})`);

async function approveAll(kind: string, edits: (p: Awaited<ReturnType<typeof pendingProposals>>[number]) => Record<string, unknown> = () => ({})) {
  const ps = await pendingProposals(ctx, { kind: kind as never });
  for (const p of ps) { await approveProposal(ctx, p.id, { edits: edits(p), shownAt: new Date(Date.now() - 20_000) }); log(`approved ${kind}: ${p.title}`); }
  await runJobs(ctx);
  return ps.length;
}
const investor = { email: "sam.lee@venture.example", name: "Sam Lee" };

// 1. The investor emails.
mail.deliver({ from: investor, subject: "Company secretary for our HK company", text: "Hi,\n\nI'm a director of Blue Harbour Trading Limited (company number 3345678). Our current secretary is retiring, so we'd like your firm to take over as company secretary and use your address as our registered office. We also want to appoint my co-founder Jane Doe as a director from 1 November.\n\nWhat do you need from us, and what will it cost?\n\nThanks,\nSam" });
await pollMail(ctx); log("email read");
const pend = await pendingProposals(ctx);
log(`intray: ${pend.map((p) => `${p.kind} "${p.title}"`).join("; ")}`);
const reqId = pend.find((p) => p.kind === "send_message")!.requestId!;
const tasks = await tasksForRequest(ctx, reqId);
log(`tasks: ${tasks.map((t) => t.playbookId).join(", ")}`);
await approveAll("send_message");
const inv = (await ctx.db.query.invoice.findFirst({ where: eq(invoice.requestId, reqId) }))!;
log(`invoice ${inv.number} ${inv.totalCents / 100} ${inv.status}; sent: ${mail.sent().length} email(s), attachments ${mail.sent()[0]?.attachmentNames}`);

// 2. The investor pays.
await ctx.bank.simulateDeposit!({ amountCents: inv.totalCents, currency: "HKD", reference: `Blue Harbour ${inv.number}`, payerName: "BLUE HARBOUR TRADING LTD" });
log(`bank: ${JSON.stringify(await pollBank(ctx))}`); await runJobs(ctx);
for (const t of tasks) { const x = await getTask(ctx, t.id); log(`  ${x.title}: ${x._steps[x.stepIndex]?.label}`); }

// 3. The investor replies with details.
mail.deliver({ from: investor, subject: "Re: Company secretary for our HK company", inReplyTo: mail.sent()[0].rfcMessageId, text: "Thanks, paid. Jane's details: HKID K987654(3), Hong Kong. Home: Flat 12B, 88 Robinson Road, Mid-Levels, Hong Kong. Correspondence: your office is fine. jane.doe@example.com, +852 9123 4567. I'm the only shareholder (100%) and my funds come from my salary and savings." });
await pollMail(ctx); log("reply read");
for (const t of tasks) { const x = await getTask(ctx, t.id); log(`  ${x.title}: waiting for ${x.checklist.filter((e) => e.status === "needed" && !e.optional).map((e) => e.key).join(", ") || "nothing"}`); }
for (const p of await pendingProposals(ctx)) log(`  intray: ${p.kind} "${p.title}" ${p.summary?.slice(0, 100) ?? ""}`);
await approveAll("conflict");
await approveAll("send_message");

// 4. Documents through the upload link (read by the model).
const req = (await ctx.db.query.request.findFirst({ where: eq(requestT.id, reqId) }))!;
const view = await portalView(ctx, req.uploadToken);
const idPdf = await simplePdf("HONG KONG IDENTITY CARD (SPECIMEN FOR DEMO)", ["Name: DOE, Jane", "Identity card number: K987654(3)", "Date of birth: 12-03-1988"]);
const billPdf = await simplePdf("CLP Power Hong Kong Limited - Electricity Bill (SPECIMEN)", ["Account holder: Jane DOE", "Supply address: Flat 12B, 88 Robinson Road, Mid-Levels, Hong Kong", "Bill date: 2026-09-10"]);
const smallPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
for (const task of view.tasks) for (const it of task.items.filter((i) => i.status === "needed")) {
  const file = it.key === "idCopy" ? { filename: "jane-hkid.pdf", mime: "application/pdf", content: idPdf } : it.key === "addrProof" ? { filename: "clp-bill.pdf", mime: "application/pdf", content: billPdf } : it.key === "selfie" ? { filename: "selfie.png", mime: "image/png", content: smallPng } : null;
  if (file) { await portalUpload(ctx, req.uploadToken, { taskId: task.taskId, key: it.key, ...file }); log(`  uploaded ${it.key} for ${task.title}`); }
  else if (it.kind === "file") { await portalUpload(ctx, req.uploadToken, { taskId: task.taskId, key: it.key, filename: `${it.key}.pdf`, mime: "application/pdf", content: await simplePdf(it.label, ["Provided for the demo"]) }); log(`  uploaded ${it.key}`); }
  else if (!it.optional) { const { portalSubmitField } = await import("@/domain/portal"); await portalSubmitField(ctx, req.uploadToken, { taskId: task.taskId, key: it.key, value: it.key === "scList" ? "Sam LEE, 100% of the shares" : it.key === "funds" ? "Salary and savings" : "Provided" }); log(`  entered ${it.key}`); }
}
for (const p of await pendingProposals(ctx)) log(`  intray: ${p.kind} "${p.title}"`);
await approveAll("conflict");
await approveAll("screening_review", () => ({ decision: "clear", note: "Rehearsal" }));
for (const t of tasks) { const x = await getTask(ctx, t.id); log(`  ${x.title}: ${x._steps[x.stepIndex]?.label ?? x.status}`); }

// 5. Signing (and again in later rounds for packs created after manual steps).
const signed = new Set<string>();
async function signAll() {
  await approveAll("send_signing");
  for (const m of mail.sent().filter((x) => /\/sign\//.test(x.text))) {
    const token = m.text.match(/\/sign\/([A-Za-z0-9]+)/)![1];
    if (signed.has(token)) continue;
    signed.add(token);
    await requestOtp(ctx, token);
    const code = mail.sent().filter((x) => x.to[0] === m.to[0] && /code/i.test(x.subject)).at(-1)!.text.match(/\b(\d{6})\b/)![1];
    await verifyOtp(ctx, token, code);
    await signDocuments(ctx, token, { kind: "typed", data: m.to[0], ip: "203.0.113.9", userAgent: "rehearsal" });
    log(`  signed by ${m.to[0]}`);
  }
}
await signAll();
const links: typeof mail.sent extends () => infer R ? R : never = [];
for (const m of links) {
  const token = m.text.match(/\/sign\/([A-Za-z0-9]+)/)![1];
  await requestOtp(ctx, token);
  const code = mail.sent().filter((x) => x.to[0] === m.to[0] && /code/i.test(x.subject)).at(-1)!.text.match(/\b(\d{6})\b/)![1];
  await verifyOtp(ctx, token, code);
  await signDocuments(ctx, token, { kind: "typed", data: m.to[0], ip: "203.0.113.9", userAgent: "rehearsal" });
  log(`  signed by ${m.to[0]}`);
}
for (const t of tasks) { const x = await getTask(ctx, t.id); log(`  ${x.title}: ${x._steps[x.stepIndex]?.label ?? x.status}`); }

// 6. Filing, registers, confirmation; any manual steps.
for (let round = 0; round < 6; round++) {
  const { completeManualStep } = await import("@/domain/step-hooks");
  for (const t of tasks) { const x = await getTask(ctx, t.id); if (x.status === "open" && x._steps[x.stepIndex]?.kind === "task") { await completeManualStep(ctx, t.id, "Rehearsal"); log(`  manual step done: ${x._steps[x.stepIndex].label}`); } }
  await signAll();
  await approveAll("record_filing", () => ({ reference: `REHEARSAL-${Math.floor(Math.random() * 1e6)}` }));
  await approveAll("register_change");
  await approveAll("send_message");
  await runJobs(ctx);
}
for (const t of tasks) { const x = await getTask(ctx, t.id); log(`FINAL ${x.title}: ${x.status}`); }
const left = await pendingProposals(ctx);
if (left.length) log(`still pending: ${left.map((p) => `${p.kind}: ${p.title}`).join("; ")}`);
const cl = await ctx.db.query.client.findFirst({ where: (x, { eq }) => eq(x.id, tasks[0].clientId) });
log(`client now: ${cl?.nameEn} (${cl?.lifecycle}), registered office ${cl?.regOfficeEn}`);
log(`emails sent: ${mail.sent().length}; Xero invoices ${ctx.accounting.invoices.size}, payments ${ctx.accounting.payments.length}`);
await closePools();
