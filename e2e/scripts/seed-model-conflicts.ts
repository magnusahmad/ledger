// Fictional real intake pipeline fixture. No proposal is manufactured and no
// client-facing approval is invoked: the browser must resolve the real conflict.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { makeRuntimeCtx } from "../../src/lib/runtime";
import { ScriptedLlm } from "../../src/integrations/llm/scripted";
import { FakeMail } from "../../src/integrations/mail/fake";
import { startManualRequest } from "../../src/domain/manual";
import { ingestMessage, processInbound } from "../../src/domain/inbound";
import { getTask } from "../../src/domain/engine";
import { pendingProposals } from "../../src/domain/proposals";
import { client } from "../../src/db/schema";
import { action, goodDraft, intake, review } from "../../tests/agent-fixtures";

if (!process.env.DATABASE_URL?.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e" || !process.env.STORAGE_DIR) throw new Error("Model conflict fixture requires isolated local E2E/Fake configuration");
const base = makeRuntimeCtx();
if (!(base.mail instanceof FakeMail)) throw new Error("Model conflict fixture must use FakeMail");
const fakeMail = base.mail;
const ctx = { ...base, llm: new ScriptedLlm().on("draft", goodDraft).on("review", review({ items: [] })) };
const cases = [];
for (const language of ["en", "tc", "sc"] as const) {
  const oldValue = language === "en" ? "Original office: Suite 101, Fictional Harbour Building, Kowloon, Hong Kong" : language === "tc" ? "原有地址：香港九龍虛構海港大廈一〇一室，請保留待人手確認" : "原有地址：香港九龙虚构海港大厦一〇一室，请保留待人工确认";
  const incomingValue = language === "en" ? "Incoming office: Suite 1202, Another Fictional Harbour Building, Causeway Bay, Hong Kong" : language === "tc" ? "新文件地址：香港銅鑼灣另一虛構海港大廈一二〇二室，地址與早前資料不同" : "新文件地址：香港铜锣湾另一虚构海港大厦一二〇二室，地址与此前资料不同";
  await ctx.db.update(client).set({ messageLang: language }).where(eq(client.id, "cli_c1"));
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice", fields: { newAddr: oldValue } }], confirm: false });
  const taskId = r.taskIds[0];
  ctx.llm.set("intake", intake({ language, summary: "Conflicting office address requires staff review", actions: [action({ type: "provide_information", taskId, fields: [{ key: "newAddr", value: incomingValue, quote: incomingValue }], evidence: incomingValue })] }));
  const m = await ingestMessage(ctx, { channel: "email", clientId: "cli_c1", provider: "fake", providerMessageId: ctx.ids.next("fixture-mail"), from: { email: "director@fictional.example", name: "Fictional director 繁體 简体" }, to: [ctx.mail.address], cc: [], subject: "Address discrepancy 地址差異 地址差异", text: `${incomingValue}\nThis differs from ${oldValue}. Please review the discrepancy before replacing our instructions.`, receivedAt: ctx.clock.now(), attachments: [] });
  await processInbound(ctx, m.id);
  const conflict = (await pendingProposals(ctx, { kind: "conflict", taskId })).find(p => p.payload.key === "newAddr");
  if (!conflict) throw new Error("Actual incoming pipeline failed to create the required staff address conflict");
  const t = await getTask(ctx, taskId);
  if (t.checklist.find(e => e.key === "newAddr")?.value !== oldValue || (t.extracted.newAddr as { value?: unknown } | undefined)?.value !== oldValue) throw new Error("Actual incoming pipeline changed the address before staff approval");
  cases.push({ language, taskId, proposalId: conflict.id, oldValue, incomingValue });
}
if (fakeMail.sent().length !== 0) throw new Error("Model conflict fixture sent unapproved mail");
writeFileSync(path.join(process.env.STORAGE_DIR!, "model-conflict-cases.json"), JSON.stringify(cases));
process.exit(0);
