// Fictional local E2E fixture: real human proposal/signing/file domain actions,
// configured fake adapters only. Never loads .env or hardcodes a test database.
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { makeRuntimeCtx, STORAGE_ROOT } from "../../src/lib/runtime";
import { closePools } from "../../src/db/client";
import { startManualRequest } from "../../src/domain/manual";
import { getRequest, getTask } from "../../src/domain/engine";
import { approveProposal, pendingProposals } from "../../src/domain/proposals";
import { portalUpload } from "../../src/domain/portal";
import { openSigning, requestOtp, signDocuments, verifyOtp } from "../../src/domain/signing";
import { client, document, filing, signEnvelope } from "../../src/db/schema";
import { Crypto } from "../../src/lib/crypto";
import { FakeMail } from "../../src/integrations/mail/fake";
import "../../src/domain/inbound";
const db = new URL(process.env.DATABASE_URL ?? "invalid:"); const relative = path.relative(process.cwd(), STORAGE_ROOT);
if (!["localhost", "127.0.0.1", "[::1]"].includes(db.hostname) || !db.pathname.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e" || process.env.SCREENING_PROVIDER !== "fake" || !relative || relative.startsWith("..") || path.isAbsolute(relative) || !path.basename(STORAGE_ROOT).includes("e2e")) throw new Error("Officer history fixture requires configured local E2E DB/fake providers/storage");
const ctx = makeRuntimeCtx({ bankProvider: "fake", accountingProvider: "fake" });
const fixturePath = path.join(STORAGE_ROOT, "officer-history.json");
type Fixture = { taskId: string; firstProposalId: string; staleProposalId: string; language: "en" | "tc" | "sc"; address: string };
const mode = process.argv[2];
try {
  if (mode === "seed") {
    const language = process.argv[3] as Fixture["language"]; if (!["en", "tc", "sc"].includes(language)) throw new Error("Expected EN/TC/SC fixture language");
    await ctx.db.update(client).set({ messageLang: language, docLang: language }).where(eq(client.id, "cli_c1"));
    const address = language === "en" ? "Second fictional filed office, Hong Kong" : language === "tc" ? "香港測試第二已呈交辦事處" : "香港测试第二已提交办事处";
    const r = await startManualRequest(ctx, { clientId: "cli_c1", confirm: true, items: [
      { playbookId: "hk.changeOffice", fields: { effDate: ctx.clock.today(), newAddr: "First fictional approved office, Hong Kong" } },
      { playbookId: "hk.changeOffice", fields: { effDate: ctx.clock.today(), newAddr: address } },
    ] });
    await approveProposal(ctx, r.proposalId!); const token = (await getRequest(ctx, r.requestId)).uploadToken;
    const pdf = await PDFDocument.create(); pdf.addPage().drawText("Fictional premises evidence, Area4 browser");
    for (const id of r.taskIds) {
      await portalUpload(ctx, token, { taskId: id, key: "premises", filename: "fictional-premises.pdf", mime: "application/pdf", content: Buffer.from(await pdf.save()) });
      const pack = (await pendingProposals(ctx, { taskId: id, kind: "send_signing" }))[0]; if (!pack) throw new Error("Missing signing preview"); await approveProposal(ctx, pack.id);
      const title = (await getTask(ctx, id)).title; const outbox = () => (ctx.mail as FakeMail).sent();
      const invitation = outbox().filter(m => m.subject === `Documents to sign: ${title}`).at(-1)!;
      const signToken = invitation.text.match(/\/sign\/([A-Za-z0-9]+)/)![1]; const view = await openSigning(ctx, signToken); await requestOtp(ctx, signToken);
      const otp = outbox().filter(m => m.to.includes(view.signer.email)).at(-1)!.text.match(/\b(\d{6})\b/)![1]; await verifyOtp(ctx, signToken, otp);
      await signDocuments(ctx, signToken, { kind: "typed", data: view.signer.name, ip: "203.0.113.45", userAgent: "fictional-area4-browser" });
      const p = (await pendingProposals(ctx, { taskId: id, kind: "record_filing" }))[0]; if (!p) throw new Error("Missing filing preview");
      await approveProposal(ctx, p.id, { edits: { reference: `A4-BROWSER-FICTIONAL-${id}`, filedOn: ctx.clock.today() } });
    }
    const f: Fixture = { taskId: r.taskIds[1], firstProposalId: (await pendingProposals(ctx, { taskId: r.taskIds[0], kind: "register_change" }))[0].id, staleProposalId: (await pendingProposals(ctx, { taskId: r.taskIds[1], kind: "register_change" }))[0].id, language, address };
    writeFileSync(fixturePath, JSON.stringify(f)); console.log(JSON.stringify(f));
  } else {
    const f = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
    if (mode === "approve_first") { await approveProposal(ctx, f.firstProposalId); console.log(JSON.stringify({ ok: true })); }
    else if (mode === "snapshot") {
      const t = await getTask(ctx, f.taskId); const docs = await ctx.db.select().from(document).where(eq(document.taskId, t.id));
      console.log(JSON.stringify({ source: { effectiveDate: t.effectiveDate, checklist: t.checklist, stepIndex: t.stepIndex, stepState: t.stepState, docs,
        envelopes: await ctx.db.select().from(signEnvelope).where(eq(signEnvelope.taskId, t.id)), filings: await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, t.id)),
        bytes: await Promise.all(docs.filter(d => d.storageKey).map(async d => [d.id, Crypto.sha256(await ctx.storage.get(d.storageKey!))])) }, step: t._steps[t.stepIndex]?.kind, proposals: await pendingProposals(ctx, { taskId: t.id }), companyAddress: (await ctx.db.query.client.findFirst({ where: eq(client.id, t.clientId) }))!.regOfficeEn }));
    } else throw new Error("Expected seed, approve_first or snapshot");
  }
} finally { await closePools(); }
