// Fictional isolated E2E lifecycle fixtures through public domain APIs; no task-state edits.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { makeRuntimeCtx } from "../../src/lib/runtime";
import { closePools } from "../../src/db/client";
import { ScriptedLlm } from "../../src/integrations/llm/scripted";
import { goodDraft, review } from "../../tests/agent-fixtures";
import { startManualRequest } from "../../src/domain/manual";
import { approveProposal, pendingProposals } from "../../src/domain/proposals";
import { applyReview } from "../../src/agent/review";
import { invoiceForRequest } from "../../src/domain/outbound";
import { matchDeposit } from "../../src/domain/payments";
import { client, contact, message, task } from "../../src/db/schema";
if (!process.env.DATABASE_URL?.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e") throw new Error("Lifecycle fixtures require isolated E2E DB and fake providers");
const ctx = { ...makeRuntimeCtx(), llm: new ScriptedLlm() };
const cases = [];
for (const language of ["en", "tc", "sc"] as const) {
  await ctx.db.update(client).set({ messageLang: language, paymentTermsDays: 0 }).where(eq(client.id,"cli_c1"));
  await ctx.db.update(contact).set({ language }).where(eq(contact.clientId,"cli_c1"));
  ctx.llm.set("draft",goodDraft);
  const r = await startManualRequest(ctx,{clientId:"cli_c1",items:[{playbookId:"hk.changeOffice"},{playbookId:"hk.changeParticulars",person:{personId:"per_p1"}}],confirm:true});
  await approveProposal(ctx,r.proposalId!);
  const original = (await invoiceForRequest(ctx,r.requestId))!;
  await matchDeposit(ctx,{providerTxId:`lifecycle-visual-${language}`,amountCents:original.totalCents,currency:"HKD",reference:original.number,payerName:"Fictional client",receivedAt:ctx.clock.now()});
  ctx.llm.set("draft",{subject:"Invalid short fixture",body:"Missing invoice and upload link"});
  const outcome = await applyReview(ctx,r.taskIds[0],review({items:[],playbookFit:"swap",suggestedPlaybookId:"hk.annualReturn",summary:"Approved replacement service"}),{clientId:"cli_c1"});
  const change = (await pendingProposals(ctx)).find(p=>outcome.proposals.includes(p.id)&&p.kind==="change_request")!;
  await approveProposal(ctx,change.id);
  const added = (await ctx.db.select().from(task)).find(t=>t.params.sourceTaskId===r.taskIds[0])!;
  const quote = (await pendingProposals(ctx,{kind:"send_message"})).find(p=>(p.payload.taskIds as string[]|undefined)?.includes(added.id))!;
  const draft = (await ctx.db.query.message.findFirst({where:eq(message.id,quote.payload.messageId as string)}))!;
  const inv = (await invoiceForRequest(ctx,added.requestId!))!;
  cases.push({language,proposalId:quote.id,invoiceId:inv.id,invoiceNumber:inv.number,taskId:added.id,originalInvoiceId:original.id,body:draft.text});
}
writeFileSync(path.join(process.env.STORAGE_DIR!,"lifecycle-billing-cases.json"),JSON.stringify(cases));
await closePools();
