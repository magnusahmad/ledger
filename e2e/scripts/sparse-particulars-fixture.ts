// Bounded fictional dated-register UI/PDF acceptance fixture; only configured
// local E2E database, fake integrations and scripted particulars are allowed.
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { makeRuntimeCtx, STORAGE_ROOT } from "../../src/lib/runtime";
import { closePools } from "../../src/db/client";
import { FixedClock } from "../../src/lib/clock";
import { ScriptedLlm } from "../../src/integrations/llm/scripted";
import { appoint, createClient, createPerson } from "../../src/domain/records";
import { allot, createShareClass } from "../../src/domain/shares";
import { advance, getTask, startTask } from "../../src/domain/engine";
import { approveProposal, pendingProposals } from "../../src/domain/proposals";
import { renderRegisters } from "../../src/documents/register-export";
import { significantController, task } from "../../src/db/schema";
import "../../src/domain/inbound";
const db = new URL(process.env.DATABASE_URL ?? "invalid:"); const relative = path.relative(process.cwd(), STORAGE_ROOT);
if (!["localhost", "127.0.0.1", "[::1]"].includes(db.hostname) || !db.pathname.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e" || process.env.SCREENING_PROVIDER !== "fake" || !relative || relative.startsWith("..") || path.isAbsolute(relative) || !path.basename(STORAGE_ROOT).includes("e2e")) throw new Error("Sparse particulars fixture requires local E2E DB/fakes/storage");
const language = process.argv[2] as "en" | "tc" | "sc"; if (!["en", "tc", "sc"].includes(language)) throw new Error("Expected en/tc/sc");
const llm = new ScriptedLlm(); const ctx = { ...makeRuntimeCtx({ bankProvider: "fake", accountingProvider: "fake" }), clock: new FixedClock(new Date("2026-10-04T02:00:00Z")), llm };
try {
  const shared = await createPerson(ctx, { nameEn: "Sparse Browser Original Officer", nameZh: "原測試董事", correspondenceAddress: "Original fictional register address 香港原測試通訊地址", idNumber: "A4-BROWSER-ID-1842", residentialAddress: "Original fictional protected home 1842", email: "sparse.browser@audit.example" });
  const a = await createClient(ctx, { nameEn: "Sparse Approved Company A Limited", nameTc: "已審批測試甲有限公司", nameSc: "已审批测试甲有限公司", jurisdiction: "HK", incorporatedOn: "2020-01-01", docLang: language, messageLang: language });
  const b = await createClient(ctx, { nameEn: "Sparse Unapproved Company B Limited", nameTc: "未審批測試乙有限公司", nameSc: "未审批测试乙有限公司", jurisdiction: "HK", incorporatedOn: "2020-01-01", docLang: language, messageLang: language });
  for (const clientId of [a.id, b.id]) {
    await appoint(ctx, { clientId, personId: shared.id, role: "director", fromDate: "2024-01-01" });
    await ctx.db.insert(significantController).values({ id: ctx.ids.next("scr"), firmId: ctx.firmId, clientId, personId: shared.id, nature: "Explicit majority-board appointment rights 明確委任多數董事權利", registrableFrom: "2024-01-01" });
    const cls = await createShareClass(ctx, { clientId, name: "Ordinary" }); await allot(ctx, { clientId, shareClassId: cls.id, date: "2024-01-01", toPersonId: shared.id, quantity: 10 });
  }
  for (const patch of [
    { date: "2026-10-01", changes: [{ field: "nameEn", value: "Sparse Explicit October Officer" }, { field: "nameZh", value: "十月已審批董事" }] },
    { date: "2026-10-03", changes: [{ field: "corrAddr", value: "October approved fictional address 香港十月已審批通訊地址" }, { field: "email", value: "sparse.october@audit.example" }] },
    { date: "2026-09-30", changes: [{ field: "nameEn", value: "Sparse Backdated September Officer" }, { field: "nameZh", value: "九月追溯董事" }] },
  ]) {
    llm.set("structure_particulars", { changes: patch.changes });
    const t = await startTask(ctx, { clientId: a.id, personId: shared.id, playbookId: "hk.changeParticulars", extracted: { effDate: { value: patch.date }, changeDetail: { value: `Explicit fictional sparse A changes effective ${patch.date}` } } });
    const full = await getTask(ctx, t.id); const idx = full._steps.findIndex(s => s.kind === "register");
    await ctx.db.update(task).set({ checklist: full.checklist.map(e => ({ ...e, status: "received", value: e.value ?? "Staff confirmed imported preparation" })), stepIndex: idx - 1,
      stepState: Object.fromEntries(full._steps.slice(0, idx).map((_, i) => [String(i), { sent: true, cleared: true, generated: true, signed: true, filed: true, done: true }])) }).where(eq(task.id, t.id));
    await advance(ctx, t.id); const p = (await pendingProposals(ctx, { taskId: t.id, kind: "register_change" }))[0]; if (!p) throw new Error("Missing particulars preview"); await approveProposal(ctx, p.id);
  }
  const artifacts = path.join(STORAGE_ROOT, "shots", "officer-pdfs"); mkdirSync(artifacts, { recursive: true });
  const pdfs: { clientId: string; date: string; file: string; text: string }[] = [];
  for (const [clientId, date, suffix] of [[a.id, "2026-09-30", "a-sep30"], [a.id, "2026-10-03", "a-oct03"], [b.id, "2026-10-03", "b-oct03"]]) {
    const result = await renderRegisters(ctx, clientId, date, language); const file = path.join(artifacts, `register-${language}-${suffix}.pdf`); writeFileSync(file, result.pdf);
    pdfs.push({ clientId, date, file, text: result.text });
  }
  console.log(JSON.stringify({ aId: a.id, bId: b.id, personId: shared.id, pdfs }));
} finally { await closePools(); }
