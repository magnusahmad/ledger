import path from "node:path";
import { writeFileSync, readFileSync } from "node:fs";
import { eq, and, like } from "drizzle-orm";
import { makeRuntimeCtx, STORAGE_ROOT } from "../../src/lib/runtime";
import { closePools } from "../../src/db/client";
import { FixedClock } from "../../src/lib/clock";
import { seedLoad } from "../../tests/load-fixtures";
import { getPlaybook, savePlaybookVersion } from "../../src/domain/playbooks";
import { startManualRequest } from "../../src/domain/manual";
import { matchDeposit } from "../../src/domain/payments";
import { pendingProposals, approveProposal } from "../../src/domain/proposals";
import { bankTransaction, task, invoice, client } from "../../src/db/schema";
import { FakeMail } from "../../src/integrations/mail/fake";
import "../../src/domain/inbound";

const db = new URL(process.env.DATABASE_URL ?? "invalid:"); const relative = path.relative(process.cwd(), STORAGE_ROOT);
if (!["localhost", "127.0.0.1", "[::1]"].includes(db.hostname) || !db.pathname.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e" || process.env.SCREENING_PROVIDER !== "fake" || !relative || relative.startsWith("..") || path.isAbsolute(relative) || !path.basename(STORAGE_ROOT).includes("e2e")) throw new Error("Load fixture requires isolated local E2E DB and Fake providers/storage");
const ctx = makeRuntimeCtx({ bankProvider: "fake", accountingProvider: "fake" }); ctx.clock = new FixedClock(new Date("2026-10-03T02:00:00Z"));
const file = path.join(STORAGE_ROOT, "load-corpus.json");
try {
  if (process.argv[2] === "seed") {
    const corpus = await seedLoad(ctx, { seeded: true });
    const pb = await getPlaybook(ctx, "hk.changeOffice");
    await savePlaybookVersion(ctx, pb.id, pb.version, JSON.stringify({ ...pb, steps: [{ kind: "send", label: "Agreed by staff in person", human: true }, ...pb.steps] }));
    const order = await startManualRequest(ctx, { clientId: "cli_c2", items: [{ playbookId: pb.id }], confirm: false, notes: "Fictional agreed invoice handed over by staff" });
    const inv = (await ctx.db.select().from(invoice).where(eq(invoice.requestId, order.requestId)))[0];
    await matchDeposit(ctx, { providerTxId: "load-original-overpaid", amountCents: inv.totalCents + 12345, currency: inv.currency, reference: inv.number, payerName: "LOAD original overpayment / 原始多付款项", receivedAt: ctx.clock.now() });
    const [match] = await pendingProposals(ctx, { kind: "match_payment" }); await approveProposal(ctx, match.id);
    const [sign] = await pendingProposals(ctx, { kind: "send_signing", taskId: corpus.signing }); await approveProposal(ctx, sign.id);
    const invitation = (ctx.mail as FakeMail).sent().find(m => m.text.includes("/sign/"))!; const token = invitation.text.match(/\/sign\/([A-Za-z0-9]+)/)![1];
    // Public capability stays in ignored private fixture storage, never report/log.
    writeFileSync(path.join(STORAGE_ROOT, "load-sign-capability.json"), JSON.stringify({ token }));
    writeFileSync(file, JSON.stringify({ ...corpus, overpaymentRef: inv.number, overpaymentAmount: 12345 }));
    console.log(JSON.stringify({ ...corpus, overpaymentRef: inv.number, overpaymentAmount: 12345 }));
  } else if (process.argv[2] === "sign-path") {
    console.log(JSON.stringify({ path: `/sign/${JSON.parse(readFileSync(path.join(STORAGE_ROOT, "load-sign-capability.json"), "utf8")).token}` }));
  } else if (process.argv[2] === "display") {
    const lang = process.argv[3] as "en" | "tc" | "sc";
    const names = { en: "Fictional loaded company", tc: "虛構大量工作公司", sc: "虚构大量工作公司" };
    if (!names[lang]) throw new Error("Choose EN/TC/SC fictional display");
    await ctx.db.update(client).set({ nameEn: names[lang], messageLang: lang }).where(eq(client.id, "cli_c1")); console.log(JSON.stringify({ name: names[lang] }));
  } else if (process.argv[2] === "client-history") {
    // Same 400 genuine-completion template rows, now newer than the open work:
    // a newest-only sample must not turn the overview into false emptiness.
    await ctx.db.update(task).set({ createdAt: new Date(ctx.clock.now().getTime() + 3_600_000) }).where(and(eq(task.firmId, ctx.firmId), like(task.id, "load-done-%")));
    const rows = await ctx.db.select().from(task).where(and(eq(task.firmId, ctx.firmId), eq(task.clientId, "cli_c1")));
    console.log(JSON.stringify({ open: rows.filter(t => t.status === "open").length, done: rows.filter(t => t.status === "done").length, all: rows.length, collecting: rows.filter(t => t.status === "open" && t.checklist.some(e => e.status === "needed")).length }));
  } else if (process.argv[2] === "snapshot") {
    console.log(JSON.stringify({ corpus: JSON.parse(readFileSync(file, "utf8")), tasks: (await ctx.db.select().from(task)).length, originalResidue: (await ctx.db.select().from(bankTransaction).where(eq(bankTransaction.providerTxId, "load-original-overpaid")))[0] }));
  } else throw new Error("Expected seed/snapshot/sign-path");
} finally { await closePools(); }
