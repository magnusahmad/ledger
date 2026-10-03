// Area 9 financial corpus: real PG, saved editable playbooks, fake providers only.
// Decisions37/39/48: holds do not rewrite billing; later costs need own reviewed invoice.
import { beforeEach, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { getPlaybook, savePlaybookVersion } from "@/domain/playbooks";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { invoiceForRequest } from "@/domain/outbound";
import { invoiceWithLines } from "@/domain/invoices";
import { addCost } from "@/domain/costs";
import { matchDeposit } from "@/domain/payments";
import { currentStep, getTask } from "@/domain/engine";
import { putOnHold, releaseHold, addOffPlatformStep, completeOffPlatformStep } from "@/domain/off-platform";
import { addThirdParty, linkThirdParty } from "@/domain/third-parties";
import { deliveryPayload } from "@/domain/mail-delivery";
import { Crypto } from "@/lib/crypto";
import { startManualRequest } from "@/domain/manual";
import { firm, invoice, invoiceLine, request, task, message, job, payment, mailDelivery, client } from "@/db/schema";
let ctx:TestCtx, seq:number;
beforeEach(async()=>{await resetDb();ctx=makeCtx();seq=0;await seedDemo(ctx,{demoEmail:"director@kbtrading.example"});ctx.llm.on("draft",goodDraft);});
async function publish(id="hk.changeOffice",feeCents=101,statutoryFees=[{description:"Fictional statutory charge / 虛構費用 / 虚构费用",amountCents:7}]) {
  const pb=await getPlaybook(ctx,id);
  return savePlaybookVersion(ctx,id,pb.version,JSON.stringify({...pb,feeCents,statutoryFees}));
}
async function snapshot() {
  return {invoices:await ctx.db.select().from(invoice),lines:await ctx.db.select().from(invoiceLine),requests:await ctx.db.select().from(request),tasks:await ctx.db.select().from(task),messages:await ctx.db.select().from(message),jobs:await ctx.db.select().from(job),payments:await ctx.db.select().from(payment),sequence:(await ctx.db.query.firm.findFirst({where:eq(firm.id,ctx.firmId)}))!.invoiceSeq,mail:ctx.mail.sent()};
}
it("A9-F01 individually valid saved fees cannot create an unsafe combined quote or consume its request and invoice number",async()=>{
  const a=await publish("hk.changeOffice",Number.MAX_SAFE_INTEGER-1000,[{description:"Fictional bounded fee",amountCents:201}]);
  const b=await publish("hk.changeName",1000,[{description:"Fictional bounded charge",amountCents:3}]);
  expect(Number.isSafeInteger(a.feeCents+201)).toBe(true);expect(Number.isSafeInteger(b.feeCents+3)).toBe(true);
  const before=await snapshot();
  const [result]=await Promise.allSettled([startManualRequest(ctx,{clientId:"cli_c2",items:[{playbookId:a.id},{playbookId:b.id}],confirm:true})]);
  const totals=await ctx.db.execute(sql`select i.number, i.total_cents::text as stored, sum(l.amount_cents)::text as exact from invoice i join invoice_line l on l.invoice_id=i.id where i.status='draft' group by i.id`);
  expect.soft(result.status,JSON.stringify(totals.rows)).toBe("rejected");
  expect(await snapshot()).toEqual(before);
});
async function edited(fee=101,stat=7,options:{optional?:boolean;reordered?:boolean}={}) {
  const pb=await getPlaybook(ctx,"hk.changeOffice");
  const steps=[{kind:"send",label:"Staff approve initial instructions",human:true},...(!options.reordered?[{kind:"pay",label:"Payment before work"}]:[]),{kind:"collect",label:"Collect client address"},...(options.reordered?[{kind:"pay",label:"Payment after collection"}]:[]),{kind:"task",label:"Verify fictional instructions",human:true},{kind:"confirm",label:"Staff approve confirmation",human:true}];
  return savePlaybookVersion(ctx,pb.id,pb.version,JSON.stringify({...pb,feeCents:fee,statutoryFees:stat<0?[]:[{description:"Fictional statutory charge / 虛構費用 / 虚构费用",amountCents:stat}],deadline:{kind:"none"},requirements:[{key:"newAddr",optional:options.optional??false}],documents:[],forms:"",registerEffects:[],steps}));
}
const open=()=>startManualRequest(ctx,{clientId:"cli_c2",items:[{playbookId:"hk.changeOffice"}],confirm:true});
async function approved(id:string) {
  const count=ctx.mail.sent().length;await approveProposal(ctx,id);expect(ctx.mail.sent()).toHaveLength(count+1);
  const p=(await ctx.db.query.proposal.findFirst({where:(p,{eq})=>eq(p.id,id)}))!;
  const j=(await ctx.db.query.mailDelivery.findFirst({where:eq(mailDelivery.sourceKey,`message:${p.payload.messageId}`)}))!;
  const payload=deliveryPayload(ctx,j);
  const invoiceId=(p.payload.invoiceId as string|undefined)??(await invoiceForRequest(ctx,p.requestId!))?.id;
  if(invoiceId){const inv=await invoiceWithLines(ctx,invoiceId);expect(ctx.mail.sent().at(-1)!.attachmentNames).toEqual([`${inv.number}.pdf`]);expect(payload.attachments![0].content.subarray(0,4).toString()).toBe("%PDF");return {inv,journalId:j.id,pdfHash:Crypto.sha256(payload.attachments![0].content)};}
  expect(payload.attachments??[]).toHaveLength(0);return null;
}
async function receipt(invoiceId:string,amount?:number) {
  const inv=await invoiceWithLines(ctx,invoiceId);const result=await matchDeposit(ctx,{providerTxId:`a9-deposit-${++seq}`,amountCents:amount??inv.totalCents-inv.paidCents,currency:inv.currency,reference:inv.number,payerName:"Fictional payer",receivedAt:ctx.clock.now()});
  if(result==="proposed"){const p=(await pendingProposals(ctx,{kind:"match_payment"})).at(-1)!;await approveProposal(ctx,p.id);}else expect(result).toBe("matched");
}
async function unchanged(proof:NonNullable<Awaited<ReturnType<typeof approved>>>) {
  const inv=await invoiceWithLines(ctx,proof.inv.id);
  expect({number:inv.number,lines:inv.lines,total:inv.totalCents,issued:inv.issuedOn,due:inv.dueOn}).toEqual({number:proof.inv.number,lines:proof.inv.lines,total:proof.inv.totalCents,issued:proof.inv.issuedOn,due:proof.inv.dueOn});
  const journal=(await ctx.db.query.mailDelivery.findFirst({where:eq(mailDelivery.id,proof.journalId)}))!;expect(Crypto.sha256(deliveryPayload(ctx,journal).attachments![0].content)).toBe(proof.pdfHash);
}
const cost=(amountCents:number,description="Fictional late cost / 額外費用 / 额外费用",kind:"fee"|"disbursement"="disbursement")=>({description,amountCents,kind});
const step=async(id:string)=>currentStep(await getTask(ctx,id))?.kind;

it("A9-F03 already-open task quotes retain pinned fees and statutory charges after a new saved version",async()=>{
  const a=await edited(101,7),old=await open();
  const b=await edited(207,19),fresh=await open();
  expect((await getTask(ctx,old.taskIds[0])).playbookVersion).toBe(a.version);expect((await getTask(ctx,fresh.taskIds[0])).playbookVersion).toBe(b.version);
  const oldProof=(await approved(old.proposalId!))!,newProof=(await approved(fresh.proposalId!))!;
  expect(oldProof.inv.totalCents).toBe(108);expect(oldProof.inv.lines.map(l=>l.amountCents)).toEqual([101,7]);expect(newProof.inv.totalCents).toBe(226);
  await receipt(oldProof.inv.id);expect(await step(old.taskIds[0])).toBe("collect");expect(await step(fresh.taskIds[0])).toBe("pay");await unchanged(oldProof);await unchanged(newProof);
});
it("A9-F04 a one-cent draft cost stays on the original quote and the actual approved PDF retains its exact total",async()=>{
  await edited();const r=await open(),original=(await invoiceForRequest(ctx,r.requestId))!;const beforeMail=ctx.mail.sent().length;
  const c=await addCost(ctx,r.taskIds[0],cost(1));expect(c).toMatchObject({invoiceId:original.id,additional:false,proposalId:null});expect(ctx.mail.sent()).toHaveLength(beforeMail);
  expect((await invoiceWithLines(ctx,original.id)).totalCents).toBe(109);const proof=(await approved(r.proposalId!))!;expect(proof.inv.totalCents).toBe(109);expect(proof.inv.lines.at(-1)!.amountCents).toBe(1);await receipt(proof.inv.id);await unchanged(proof);
});
it("A9-F05 paying an additional invoice never opens the unpaid primary gate or rewrites its partially paid PDF",async()=>{
  await edited(501,7);const r=await open(),proof=(await approved(r.proposalId!))!;await receipt(proof.inv.id,101);
  const c=await addCost(ctx,r.taskIds[0],cost(37));expect(c.additional).toBe(true);const extra=(await approved(c.proposalId!))!;await receipt(extra.inv.id);
  expect(await step(r.taskIds[0])).toBe("pay");expect((await invoiceWithLines(ctx,proof.inv.id)).paidCents).toBe(101);await receipt(proof.inv.id);expect(await step(r.taskIds[0])).toBe("collect");await unchanged(proof);await unchanged(extra);
});
it("A9-F06 sequential costs after original and additional payment retain each invoice's own number receipt and immutable PDF",async()=>{
  await edited();const r=await open(),base=(await approved(r.proposalId!))!;await receipt(base.inv.id);
  const first=await addCost(ctx,r.taskIds[0],cost(23)),p1=(await approved(first.proposalId!))!;await receipt(p1.inv.id,7);
  const second=await addCost(ctx,r.taskIds[0],cost(31,"Fictional service cost","fee")),p2=(await approved(second.proposalId!))!;await receipt(p2.inv.id);await receipt(p1.inv.id);
  const third=await addCost(ctx,r.taskIds[0],cost(41));expect(third.additional).toBe(true);expect((await invoiceWithLines(ctx,third.invoiceId)).status).toBe("draft");
  expect(new Set([base.inv.number,p1.inv.number,p2.inv.number,(await invoiceWithLines(ctx,third.invoiceId)).number]).size).toBe(4);expect(await step(r.taskIds[0])).toBe("collect");
  for(const p of [base,p1,p2]){await unchanged(p);expect((await ctx.db.select().from(payment).where(eq(payment.invoiceId,p.inv.id))).reduce((s,p)=>s+p.amountCents,0)).toBe(p.inv.totalCents);}
});
it("A9-F07 a genuine no-invoice free task can receive a separately reviewed later cost without a new task payment block",async()=>{
  await edited(0,-1);const r=await open();expect(await invoiceForRequest(ctx,r.requestId)).toBeNull();expect(await approved(r.proposalId!)).toBeNull();expect(await step(r.taskIds[0])).toBe("collect");
  const c=await addCost(ctx,r.taskIds[0],cost(19));expect(c.additional).toBe(true);expect(ctx.mail.sent()).toHaveLength(1);const p=(await approved(c.proposalId!))!;expect(p.inv.totalCents).toBe(19);expect(await invoiceForRequest(ctx,r.requestId)).toBeNull();expect(await step(r.taskIds[0])).toBe("collect");await receipt(p.inv.id);await unchanged(p);
});
it("A9-F08 credit terms still start work while original and separately approved cost invoices remain unpaid",async()=>{
  await edited();await ctx.db.update(client).set({paymentTermsDays:30}).where(eq(client.id,"cli_c2"));const r=await open(),p=(await approved(r.proposalId!))!;expect(await step(r.taskIds[0])).toBe("collect");
  const c=await addCost(ctx,r.taskIds[0],cost(29)),extra=(await approved(c.proposalId!))!;expect(extra.inv.termsDays).toBe(30);expect(await step(r.taskIds[0])).toBe("collect");expect((await invoiceWithLines(ctx,p.inv.id)).paidCents).toBe(0);await unchanged(p);
});
it("A9-F09 zero service fee with a positive statutory charge still requires upfront payment of the exact charge",async()=>{
  await edited(0,3);const r=await open(),p=(await approved(r.proposalId!))!;expect(p.inv.lines.map(l=>[l.kind,l.amountCents])).toEqual([["disbursement",3]]);expect(await step(r.taskIds[0])).toBe("pay");await receipt(p.inv.id);expect(await step(r.taskIds[0])).toBe("collect");await unchanged(p);
});
it("A9-F10 held tasks accept original and cost approvals/payments while movement stays held until explicit release",async()=>{
  await edited();const r=await open();await putOnHold(ctx,r.taskIds[0],{reason:"Waiting for fictional auditor",waitingOn:"third_party",followUpOn:"2026-10-02"});
  const p=(await approved(r.proposalId!))!;await receipt(p.inv.id);expect(await step(r.taskIds[0])).toBe("send");const c=await addCost(ctx,r.taskIds[0],cost(13)),extra=(await approved(c.proposalId!))!;await receipt(extra.inv.id);expect((await getTask(ctx,r.taskIds[0])).holdReason).toBeTruthy();
  await releaseHold(ctx,r.taskIds[0],"Fictional approval received");expect(await step(r.taskIds[0])).toBe("collect");await unchanged(p);await unchanged(extra);
});
it("A9-F11 paying original and later cost does not close a third-party off-platform blocker without its independent proof",async()=>{
  await edited();const r=await open();const party=await addThirdParty(ctx,{name:"Fictional auditor",email:"auditor@fictional.example",role:"auditor"});await linkThirdParty(ctx,r.taskIds[0],party.id);
  const blocker=await addOffPlatformStep(ctx,r.taskIds[0],{title:"Await fictional auditor receipt",waitingOn:"third_party",partyId:party.id,beforeStep:1,followUpOn:"2026-10-02"});
  const p=(await approved(r.proposalId!))!;await receipt(p.inv.id);const c=await addCost(ctx,r.taskIds[0],cost(17)),extra=(await approved(c.proposalId!))!;await receipt(extra.inv.id);
  expect((await ctx.db.query.taskAction.findFirst({where:(a,{eq})=>eq(a.id,blocker.id)}))!.status).toBe("open");expect(await step(r.taskIds[0])).toBe("send");await completeOffPlatformStep(ctx,blocker.id,{reference:"FICTIONAL-AUDIT-OK"});expect(await step(r.taskIds[0])).toBe("collect");await unchanged(p);await unchanged(extra);
});
it("A9-F12 an accepted optional collect-before-pay edited definition still waits for its priced invoice and ignores later-cost debt",async()=>{
  await edited(101,7,{optional:true,reordered:true});const r=await open(),p=(await approved(r.proposalId!))!;expect(await step(r.taskIds[0])).toBe("pay");await receipt(p.inv.id);expect(await step(r.taskIds[0])).toBe("task");
  const c=await addCost(ctx,r.taskIds[0],cost(11)),extra=(await approved(c.proposalId!))!;expect(await step(r.taskIds[0])).toBe("task");expect(extra.inv.paidCents).toBe(0);await unchanged(p);
});
it("A9-F13 later costs cannot overflow a safe draft aggregate or consume rows/numbering after rejection",async()=>{
  await edited(Number.MAX_SAFE_INTEGER-100,0);const r=await open(),before=await snapshot();await expect(addCost(ctx,r.taskIds[0],cost(200))).rejects.toThrow(/safe integer/);expect(await snapshot()).toEqual(before);
});
it("A9-F14 retained seeded mixed fee versions holds partial payments and later costs conserve every issued quote",async()=>{
  // Four bounded sequences, xorshift32 seed0xA9C05A; normal exact cent values, no legal fee assumptions.
  let seed=0xA9C05A;const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
  for(let i=0;i<4;i++) {
    const fee=100+(next()%900),stat=1+(next()%17),draftCost=1+(next()%31),lateCost=2+(next()%47),credit=i%2===1;
    await edited(fee,stat,{optional:i%2===0,reordered:i%2===1});await ctx.db.update(client).set({paymentTermsDays:credit?30:0}).where(eq(client.id,"cli_c2"));const r=await open();
    await addCost(ctx,r.taskIds[0],cost(draftCost));await putOnHold(ctx,r.taskIds[0],{reason:`Seeded fictional third-party wait ${i}`,waitingOn:"third_party",followUpOn:"2026-10-02"});
    const p=(await approved(r.proposalId!))!;expect(p.inv.totalCents).toBe(fee+stat+draftCost);await receipt(p.inv.id,1);const c=await addCost(ctx,r.taskIds[0],cost(lateCost)),extra=(await approved(c.proposalId!))!;
    await receipt(extra.inv.id);await receipt(p.inv.id);expect((await getTask(ctx,r.taskIds[0])).holdReason).toBeTruthy();await releaseHold(ctx,r.taskIds[0],"Fictional held work released");
    expect(await step(r.taskIds[0])).toBe(i%2===0?"task":"collect");await unchanged(p);await unchanged(extra);
    expect((await ctx.db.select().from(payment).where(eq(payment.invoiceId,p.inv.id))).reduce((s,p)=>s+p.amountCents,0)).toBe(p.inv.totalCents);expect((await invoiceWithLines(ctx,extra.inv.id)).paidCents).toBe(lateCost);
  }
},240_000);
