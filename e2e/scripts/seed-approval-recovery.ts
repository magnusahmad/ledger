// Test-only process-loss fixture: run the actual approval until its fake transport is
// entered, then stop the helper process before any provider acknowledgement returns.
// This invokes no live provider and never changes an implementation file.
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { eq } from "drizzle-orm";
import { makeRuntimeCtx } from "../../src/lib/runtime";
import { FixedClock } from "../../src/lib/clock";
import { startManualRequest } from "../../src/domain/manual";
import { approveProposal, createProposal } from "../../src/domain/proposals";
import { conversation, firm, message, proposal } from "../../src/db/schema";
import type { OutboundMail } from "../../src/integrations/types";

if (!process.env.DATABASE_URL?.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e") throw new Error("Recovery fixtures require isolated E2E database and fake providers");
const base = makeRuntimeCtx();
const ctx = { ...base, clock: new FixedClock(new Date(Date.now() - 3_600_000)) };
const cases: { kind: string; language: string; proposalId: string; title: string; approvedBody: string; approvedAttachmentNames: string[]; messageId: string }[] = [];
const simulatedAcceptances: { to: string[]; subject: string; text: string; correlationId?: string; attachments: { filename: string; sha256: string }[] }[] = [];
for (const kind of ["interrupted", "uncertain", "uncertain_control", "resumable"] as const) for (const language of ["en", "tc", "sc"] as const) {
  if ((kind === "uncertain_control" || kind === "resumable") && language !== "en") continue;
  const interrupted = kind === "interrupted" || kind === "resumable";
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }], confirm: true });
  const p = await ctx.db.query.proposal.findFirst({ where: (p, { eq }) => eq(p.id, r.proposalId!) });
  const messageId = p!.payload.messageId as string;
  const body = language === "en" ? "Approved original instructions: please confirm the office change." : language === "tc" ? "已批准的原始指示：請確認註冊辦事處地址變更。" : "已批准的原始指示：请确认注册地址变更。";
  const title = `${kind === "interrupted" ? "Interrupted" : kind === "uncertain" ? "Uncertain" : kind === "resumable" ? "Resumable" : "Uncertain control"} approval ${language}`;
  await ctx.db.update(message).set({ text: body, language }).where(eq(message.id, messageId));
  await ctx.db.update(proposal).set({ title }).where(eq(proposal.id, p!.id));
  let entered!: () => void;
  let hasEntered = false;
  let approvedAttachmentNames: string[] = [];
  const transportEntered = new Promise<void>(resolve => { entered = resolve; });
  const blockedMail = { name: interrupted ? "fake" : "fixture_unknown", reconciliationScope: interrupted ? base.mail.reconciliationScope : undefined, address: base.mail.address, fetchNew: base.mail.fetchNew.bind(base.mail), send: async (outbound: OutboundMail) => {
    hasEntered = true;
    approvedAttachmentNames = (outbound.attachments ?? []).map(a => a.filename);
    entered();
    if (interrupted) return new Promise<never>(() => {});
    // Simulated provider acceptance, followed by a lost response. Its provider name
    // differs from the runtime Fake: Fake's empty outbox cannot prove non-delivery.
    simulatedAcceptances.push({ to: outbound.to, subject: outbound.subject, text: outbound.text, correlationId: outbound.correlationId,
      attachments: (outbound.attachments ?? []).map(a => ({ filename: a.filename, sha256: createHash("sha256").update(a.content).digest("hex") })) });
    throw new Error("Fixture provider accepted mail but the response was lost");
  } };
  const attempt = approveProposal({ ...ctx, mail: blockedMail }, p!.id, { edits: { text: body, subject: `Approved ${language}`, to: "original-recipient@fictional.example" } }).catch(error => { if (!hasEntered) throw error; });
  await Promise.race([transportEntered, attempt]);
  if (!interrupted) await attempt;
  if (kind === "interrupted" || kind === "uncertain") await ctx.db.update(message).set({ text: "UNAPPROVED LATER EDIT", toAddrs: ["changed-recipient@fictional.example"] }).where(eq(message.id, messageId));
  cases.push({ kind, language, proposalId: p!.id, title, approvedBody: body, approvedAttachmentNames, messageId });
}
const foreignCtx = { ...ctx, firmId: "firm_recovery_foreign" };
await ctx.db.insert(firm).values({ id: foreignCtx.firmId, legalName: "Fictional isolated recovery firm", invoicePrefix: "FIX" });
await ctx.db.insert(conversation).values({ id: "conv_recovery_foreign", firmId: foreignCtx.firmId, channel: "email" });
await ctx.db.insert(message).values({ id: "msg_recovery_foreign", firmId: foreignCtx.firmId, conversationId: "conv_recovery_foreign", direction: "out", status: "draft", subject: "Foreign confidential fixture", text: "FOREIGN RECOVERY SECRET", toAddrs: ["foreign@fictional.example"] });
const foreign = await createProposal(foreignCtx, { kind: "send_message", title: "FOREIGN RECOVERY SECRET", payload: { messageId: "msg_recovery_foreign" } });
let foreignEntered!: () => void;
const foreignTransport = new Promise<void>(resolve => { foreignEntered = resolve; });
void approveProposal({ ...foreignCtx, mail: { name: "fake", reconciliationScope: base.mail.reconciliationScope, address: base.mail.address, fetchNew: base.mail.fetchNew.bind(base.mail), send: async () => { foreignEntered(); return new Promise<never>(() => {}); } } }, foreign.id).catch(() => {});
await foreignTransport;
writeFileSync(path.join(process.env.STORAGE_DIR!, "foreign-recovery.json"), JSON.stringify({ proposalId: foreign.id }));
writeFileSync(path.join(process.env.STORAGE_DIR!, "recovery-cases.json"), JSON.stringify(cases));
writeFileSync(path.join(process.env.STORAGE_DIR!, "simulated-acceptances.json"), JSON.stringify(simulatedAcceptances));
process.exit(0);
