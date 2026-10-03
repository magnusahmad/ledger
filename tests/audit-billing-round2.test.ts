import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { goodDraft } from "./agent-fixtures";
import { createRequest, startTask } from "@/domain/engine";
import { createInvoiceForRequest, invoiceWithLines, markInvoiceSent, proposeRevision, setInvoiceNumber, setLineAmount } from "@/domain/invoices";
import { markPaidManually, matchDeposit } from "@/domain/payments";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { runReminders } from "@/domain/reminders";
import { addCost } from "@/domain/costs";
import { bankTransaction, contact, firm, invoice, invoiceLine, payment } from "@/db/schema";
import "@/domain/inbound";

let ctx:TestCtx;
beforeEach(async()=>{ await resetDb(); ctx=makeCtx(); await seedDemo(ctx,{demoEmail:"director@kbtrading.example"});ctx.llm.on("draft",goodDraft); });
async function draft(){const req=await createRequest(ctx,{clientId:"cli_c2"});const t=await startTask(ctx,{requestId:req.id,clientId:"cli_c2",playbookId:"hk.changeOffice"});const inv=(await createInvoiceForRequest(ctx,req.id))!;return {req,t,inv:await invoiceWithLines(ctx,inv.id)};}
async function financial(){return {invoices:(await ctx.db.select().from(invoice)).sort((a,b)=>a.id.localeCompare(b.id)),lines:(await ctx.db.select().from(invoiceLine)).sort((a,b)=>a.id.localeCompare(b.id)),payments:await ctx.db.select().from(payment),seq:(await ctx.db.query.firm.findFirst({where:eq(firm.id,ctx.firmId)}))!.invoiceSeq};}
// Seeded two-line totals: seed 0xB11; eight valid safe-integer individual amounts
// whose sum crosses MAX_SAFE_INTEGER. No client data and no live integrations.
describe("Billing independent retest extensions",()=>{
 it("B-16 invoice line edits reject totals above safe integer cents without partial writes",async()=>{
  const {inv}=await draft();await ctx.db.insert(invoiceLine).values({id:"extra-safe",firmId:ctx.firmId,invoiceId:inv.id,description:"second line",amountCents:10000,kind:"fee",sort:1});
  for(let i=0;i<8;i++){const before=await financial();await setLineAmount(ctx,inv.lines[0].id,Number.MAX_SAFE_INTEGER-(0xB11+i)).catch(()=>undefined);expect.soft(await financial()).toEqual(before);}
 });
 it("B-17 editing a draft price cannot change an invoice that was sent while the edit was in flight",async()=>{
  const {inv}=await draft();const read=ctx.db.query.invoice.findFirst.bind(ctx.db.query.invoice);let interleaved=false;
  ctx.db.query.invoice.findFirst=(async (...args:Parameters<typeof read>)=>{const row=await read(...args);if(!interleaved&&row?.id===inv.id){interleaved=true;await markInvoiceSent({...ctx,db: new Proxy(ctx.db,{get(target,key){if(key==="query")return {...target.query,invoice:{...target.query.invoice,findFirst:read}};return Reflect.get(target,key);}})},inv.id);}return row;}) as typeof ctx.db.query.invoice.findFirst;
  await setLineAmount(ctx,inv.lines[0].id,100).catch(()=>undefined);ctx.db.query.invoice.findFirst=read;
  // A transactional fix reads through its transaction handle, so the unsafe
  // context read hook is not reached: complete sending after that edit commits.
  if(!interleaved){await markInvoiceSent(ctx,inv.id);expect(await invoiceWithLines(ctx,inv.id)).toMatchObject({status:"sent",totalCents:100});return;}
  expect(await invoiceWithLines(ctx,inv.id)).toMatchObject({status:"sent",totalCents:inv.totalCents});
 });
 it("B-18 bank references that normalise to two different invoices never auto-pay either invoice",async()=>{
  const a=await draft();await setInvoiceNumber(ctx,a.inv.id,"AUDIT-ABC");await markInvoiceSent(ctx,a.inv.id);
  const b=await draft();const [alias]=await Promise.allSettled([setInvoiceNumber(ctx,b.inv.id,"AUDITABC")]);if(alias.status==="rejected")return;await markInvoiceSent(ctx,b.inv.id);
  await matchDeposit(ctx,{providerTxId:"ambiguous",amountCents:a.inv.totalCents,currency:"HKD",reference:"AUDITABC",payerName:"HO",receivedAt:ctx.clock.now()});
  expect((await invoiceWithLines(ctx,a.inv.id)).paidCents+(await invoiceWithLines(ctx,b.inv.id)).paidCents).toBe(0);
 });
 it("B-19 a draft later cost rejects an unsafe combined total and leaves every invoice line unchanged",async()=>{
  const {t,inv}=await draft();await setLineAmount(ctx,inv.lines[0].id,Number.MAX_SAFE_INTEGER);const before=await financial();await addCost(ctx,t.id,{description:"additional cents",amountCents:100,kind:"fee"}).catch(()=>undefined);expect(await financial()).toEqual(before);
 });
 it("B-20 paid invoices withdraw or reject previously drafted payment reminders",async()=>{
  const {inv}=await draft();await markInvoiceSent(ctx,inv.id);ctx.clock.advanceDays(8);await runReminders(ctx);
  const p=(await pendingProposals(ctx,{kind:"send_message"})).find(p=>p.payload.purpose==="reminder"&&p.payload.invoiceId===inv.id)!;expect(p).toBeDefined();
  await markPaidManually(ctx,inv.id,"payment arrived after reminder drafted");await approveProposal(ctx,p.id).catch(()=>undefined);expect(ctx.mail.sent()).toHaveLength(0);
 });
 it("B-21 currency changed after a proposed match is rechecked before approval and leaves receipt unchanged",async()=>{
  const {inv}=await draft();await markInvoiceSent(ctx,inv.id);await matchDeposit(ctx,{providerTxId:"currency-change",amountCents:inv.totalCents,currency:"HKD",reference:"",payerName:"HO",receivedAt:ctx.clock.now()});const [p]=await pendingProposals(ctx,{kind:"match_payment"});await ctx.db.update(bankTransaction).set({currency:"USD"}).where(eq(bankTransaction.providerTxId,"currency-change"));const before=await financial();await approveProposal(ctx,p.id).catch(()=>undefined);expect(await financial()).toEqual(before);
 });
 it("B-22 repeated sent-revision approval rejects a superseded original without another invoice",async()=>{
  const {inv}=await draft();await markInvoiceSent(ctx,inv.id);const lines=[{description:"revised",amountCents:100,kind:"fee" as const}];const first=await proposeRevision(ctx,inv.id,{reason:"first",lines});const second=await proposeRevision(ctx,inv.id,{reason:"stale",lines});await approveProposal(ctx,first.id);const before=await financial();await approveProposal(ctx,second.id).catch(()=>undefined);expect(await financial()).toEqual(before);
 });
 for(const language of ["en","tc","sc"] as const) it(`B-23 reminder reaches billing contact in ${language}, never the instructing director`,async()=>{
  const {inv}=await draft();await ctx.db.update(contact).set({language,email:"audit-billing@fictional.example"}).where(eq(contact.id,inv.billingContactId!));await markInvoiceSent(ctx,inv.id);ctx.clock.advanceDays(8);await runReminders(ctx);const p=(await pendingProposals(ctx,{kind:"send_message"})).find(p=>p.payload.invoiceId===inv.id)!;const m=await ctx.db.query.message.findFirst({where:(m,{eq})=>eq(m.id,p.payload.messageId as string)});expect(m?.language).toBe(language);expect(m?.toAddrs).toEqual(["audit-billing@fictional.example"]);expect(m?.text).toContain(inv.number);expect(ctx.mail.sent()).toHaveLength(0);
 });
});
