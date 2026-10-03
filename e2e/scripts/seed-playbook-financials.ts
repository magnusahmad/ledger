// Public saved-playbook and human send fixtures; fictional local fake-provider E2E only.
import { writeFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { makeRuntimeCtx } from "../../src/lib/runtime";
import { closePools } from "../../src/db/client";
import { getPlaybook, savePlaybookVersion } from "../../src/domain/playbooks";
import { startManualRequest } from "../../src/domain/manual";
import { approveProposal } from "../../src/domain/proposals";
import { client, contact } from "../../src/db/schema";
if(!process.env.DATABASE_URL?.endsWith("_e2e")||process.env.MAIL_PROVIDER!=="fake"||process.env.LLM_MODE!=="e2e") throw new Error("Financial fixtures require isolated E2E and fake providers");
const ctx=makeRuntimeCtx();
const priced=await startManualRequest(ctx,{clientId:"cli_c2",items:[{playbookId:"hk.changeOffice"}],confirm:true});
await approveProposal(ctx,priced.proposalId!);
const pb=await getPlaybook(ctx,"hk.changeOffice");
await savePlaybookVersion(ctx,pb.id,pb.version,JSON.stringify({...pb,feeCents:0,statutoryFees:[]}));
const cases=[];
for(const [language,clientId] of [["en","cli_c1"],["tc","cli_c2"],["sc","cli_c3"]] as const) {
  await ctx.db.update(client).set({messageLang:language}).where(eq(client.id,clientId));
  await ctx.db.update(contact).set({language,email:`${language}-fictional@audit.example`}).where(eq(contact.clientId,clientId));
  const r=await startManualRequest(ctx,{clientId,items:[{playbookId:pb.id}],confirm:true});
  await approveProposal(ctx,r.proposalId!);
  const request=await ctx.db.query.request.findFirst({where:(t,{eq})=>eq(t.id,r.requestId)});
  assert.equal(request!.invoiceId,null);
  cases.push({language,taskId:r.taskIds[0]});
}
writeFileSync(path.join(process.env.STORAGE_DIR!,"playbook-financial-cases.json"),JSON.stringify({pricedTaskId:priced.taskIds[0],cases}));
await closePools();
