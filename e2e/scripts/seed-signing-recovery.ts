// Real signing approval with deterministic, isolated partial provider acknowledgement.
import "../../src/domain/inbound";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { makeRuntimeCtx } from "../../src/lib/runtime";
import { createRequest, startTask, markStepState } from "../../src/domain/engine";
import { createPerson } from "../../src/domain/records";
import { portalUpload } from "../../src/domain/portal";
import { approveProposal, pendingProposals } from "../../src/domain/proposals";
import { document, proposal } from "../../src/db/schema";
import { ScriptedLlm } from "../../src/integrations/llm/scripted";

if (!process.env.DATABASE_URL?.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e") throw new Error("Signing recovery fixtures require isolated E2E database and fake providers");
const base = makeRuntimeCtx();
const ctx = { ...base, llm: new ScriptedLlm().on("extract", { fields: [], documents: [], conflicts: [] }) };
const request = await createRequest(ctx, { clientId: "cli_c1" });
const appointee = await createPerson(ctx, { nameEn: "Recovery Appointee 繁體 简体", email: "unapproved-original@fictional.example", idNumber: "K987654(3)", residentialAddress: "Fictional home", correspondenceAddress: "Fictional office" });
const task = await startTask(ctx, { requestId: request.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: appointee.id, extracted: { effDate: { value: "2026-09-29" } } });
await markStepState(ctx, task.id, "send", { sent: true });
const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = Buffer.from(await pdf.save());
for (const key of ["idCopy", "addrProof"]) await portalUpload(ctx, request.uploadToken, { taskId: task.id, key, filename: `${key}.pdf`, mime: "application/pdf", content: bytes });
await portalUpload(ctx, request.uploadToken, { taskId: task.id, key: "selfie", filename: "selfie.png", mime: "image/png", content: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64") });
const card = (await pendingProposals(ctx, { kind: "send_signing", taskId: task.id }))[0];
if (!card) throw new Error("Real fixture did not reach a signing approval");
const signers = card.payload.signers as { personId: string; name: string; email: string; docIds: string[] }[];
if (signers.length !== 2) throw new Error("Signing recovery fixture requires exactly two real signers");
const docIds = [...new Set(signers.flatMap(s => s.docIds))];
const documentTitles: string[] = [];
for (const [i, id] of docIds.entries()) {
  const title = `Original approved 董事任命文件：確認资料 ${i + 1}.pdf`;
  documentTitles.push(title);
  await ctx.db.update(document).set({ title }).where(eq(document.id, id));
}
const recipients = signers.map((s, i) => ({ name: s.name, email: `approved.original.${i === 0 ? "director" : "appointee"}.with.long.fixture.address@fictional.example`, status: i === 0 ? "Invitation confirmed" : "Delivery needs review" }));
const emails = Object.fromEntries(signers.map((s, i) => [s.personId, recipients[i].email]));
let attempts = 0;
const mail = { name: "fixture_unknown", address: base.mail.address, fetchNew: base.mail.fetchNew.bind(base.mail), send: async () => {
  attempts++;
  if (attempts === 1) return { providerMessageId: "signing-approved-confirmed-fixture", providerThreadId: "signing-fixture-thread", rfcMessageId: "<signing-confirmed@fictional.example>" };
  throw new Error("Fixture second invitation accepted but its response was lost");
} };
await approveProposal({ ...ctx, mail }, card.id, { edits: { emails } }).catch(error => { if (attempts !== 2) throw error; });
await ctx.db.update(proposal).set({ title: "Partial signing recovery 繁體 简体" }).where(eq(proposal.id, card.id));
for (const id of docIds) await ctx.db.update(document).set({ title: "UNAPPROVED SIGNING DOCUMENT EDIT" }).where(eq(document.id, id));
writeFileSync(path.join(process.env.STORAGE_DIR!, "signing-recovery-case.json"), JSON.stringify({ proposalId: card.id, envelopeId: card.payload.envelopeId, recipients, documentTitles, attempts }));
process.exit(0);
