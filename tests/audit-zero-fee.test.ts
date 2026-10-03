import { beforeEach, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, goodDraft, intake } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { invoiceWithLines, setInvoiceNumber, setLineAmount } from "@/domain/invoices";
import { markPaidManually } from "@/domain/payments";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { getTask, tasksForRequest } from "@/domain/engine";
import { completeManualStep } from "@/domain/step-hooks";
import { client, invoice, payment } from "@/db/schema";
// Only Next request/cache boundaries are faked. The actual server action,
// actual draft agent with a deterministic responder, and PostgreSQL all run.
const runtime=vi.hoisted(()=>({ctx:null as unknown as TestCtx}));
vi.mock("@/server/ctx",()=>({getCtx:()=>runtime.ctx}));
vi.mock("next/cache",()=>({refresh:vi.fn(),revalidatePath:vi.fn()}));
vi.mock("next/headers",()=>({headers:async()=>new Headers()}));
import { redraftAction } from "@/server/actions";

let ctx:TestCtx;
beforeEach(async()=>{await resetDb();ctx=makeCtx();await seedDemo(ctx,{demoEmail:"director@kbtrading.example"});ctx.llm.on("draft",goodDraft);runtime.ctx=ctx;});
async function approveZeroInvoice(termsDays:number, send=true){
 await ctx.db.update(client).set({paymentTermsDays:termsDays}).where(eq(client.id,"cli_c2"));
 ctx.llm.set("intake",intake({client:{kind:"existing",clientId:"cli_c2",companyName:null,companyNumber:null,senderName:"HO Wing Yan",reason:"linked instructing contact"},actions:[action({type:"start_request",playbookId:"hk.changeOffice",fields:[{key:"newAddr",value:"20/F, 1 Queen's Road Central",quote:null}]})]}));
 const m=await ingestMessage(ctx,{channel:"email",provider:"fake",providerMessageId:"zero-fee-request",from:{email:"wingyan@silverstrand.example",name:"HO Wing Yan"},to:[],cc:[],subject:"Address change",text:"Please change the registered office.",receivedAt:ctx.clock.now(),attachments:[]});
 const r=await processInbound(ctx,m.id);const inv=(await ctx.db.query.invoice.findFirst({where:and(eq(invoice.requestId,r.requestId!),eq(invoice.firmId,ctx.firmId))}))!;
 const lines=(await invoiceWithLines(ctx,inv.id)).lines;expect(lines.length).toBeGreaterThan(0);for(const line of lines)await setLineAmount(ctx,line.id,0);
 expect((await invoiceWithLines(ctx,inv.id)).totalCents).toBe(0);const p=(await pendingProposals(ctx,{kind:"send_message"})).find(p=>p.requestId===r.requestId)!;if(!send)return {inv,task:(await tasksForRequest(ctx,r.requestId!))[0],proposal:p};await approveProposal(ctx,p.id);
 expect(ctx.mail.sent()).toHaveLength(1);expect(await invoiceWithLines(ctx,inv.id)).toMatchObject({totalCents:0,paidCents:0});expect(["sent","paid"]).toContain((await invoiceWithLines(ctx,inv.id)).status);return {inv,task:(await tasksForRequest(ctx,r.requestId!))[0]};
}
it("B-26 an approved zero-fee upfront request skips payment without inventing a zero-value receipt",async()=>{
 const {inv,task}=await approveZeroInvoice(0);await markPaidManually(ctx,inv.id,"Nothing is owed").catch(()=>undefined);
 expect(await ctx.db.select().from(payment).where(eq(payment.invoiceId,inv.id))).toHaveLength(0);
 await expect(completeManualStep(ctx,task.id,"No fee is due")).rejects.toThrow(/manual step/);const t=await getTask(ctx,task.id);expect(t._steps[t.stepIndex]?.kind).toBe("collect");
});
it("the same approved zero-fee request on credit terms continues to collect without a receipt",async()=>{
 const {inv,task}=await approveZeroInvoice(30);expect(await ctx.db.select().from(payment).where(eq(payment.invoiceId,inv.id))).toHaveLength(0);const t=await getTask(ctx,task.id);expect(t._steps[t.stepIndex]?.kind).toBe("collect");
});

it("B-27 redrafting after staff edit invoice number and fee uses current invoice facts and sends nothing",async()=>{
 const {inv,proposal}=await approveZeroInvoice(0,false);expect(proposal).toBeDefined();const [line]=(await invoiceWithLines(ctx,inv.id)).lines;await setLineAmount(ctx,line.id,12300);await setInvoiceNumber(ctx,inv.id,"SPECIAL-AUDIT-27");
 const result=await redraftAction(proposal!.id,"tc");expect(result).toMatchObject({ok:true});
 const m=await ctx.db.query.message.findFirst({where:(m,{eq})=>eq(m.id,proposal!.payload.messageId as string)});expect(ctx.mail.sent()).toHaveLength(0);expect(m?.status).toBe("draft");expect(m?.text).toContain("SPECIAL-AUDIT-27");expect(m?.text).toContain("HK$123");
});
