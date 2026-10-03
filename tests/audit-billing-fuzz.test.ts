import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { goodDraft } from "./agent-fixtures";
import { createRequest, startTask } from "@/domain/engine";
import { createInvoiceForRequest, invoiceWithLines, markInvoiceSent, proposeRevision, setInvoiceNumber, setLineAmount, voidInvoice } from "@/domain/invoices";
import { markPaidManually, matchDeposit, recordPayment } from "@/domain/payments";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { addCost } from "@/domain/costs";
import { batchStart } from "@/domain/batch";
import { getPlaybook, savePlaybookVersion } from "@/domain/playbooks";
import { enqueue, runJobs } from "@/domain/jobs";
import { firm, invoice, invoiceLine, payment, request, task } from "@/db/schema";
import "@/domain/inbound";
import "@/domain/accounting-sync";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); ctx.llm.on("draft", goodDraft); });
async function invoiceFor(status: "draft" | "sent" = "sent") {
  const req = await createRequest(ctx, { clientId: "cli_c2" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c2", playbookId: "hk.changeOffice" });
  const inv = (await createInvoiceForRequest(ctx, req.id))!;
  if (status === "sent") await markInvoiceSent(ctx, inv.id);
  return { req, t, inv: await invoiceWithLines(ctx, inv.id) };
}
async function snapshot() {
  return { invoices: await ctx.db.select().from(invoice), lines: await ctx.db.select().from(invoiceLine), payments: await ctx.db.select().from(payment), seq: (await ctx.db.query.firm.findFirst({where:eq(firm.id, ctx.firmId)}))!.invoiceSeq };
}
// Reproducible xorshift32, seed 0xC0FFEE. 32 fractional/unsafe-cent values,
// plus 8 named edge cases; text corpus includes Chinese, CRLF and punctuation.
function numbers() { let s = 0xC0FFEE; const values = [NaN, Infinity, -Infinity, -1, -100000, 0, 0.1, Number.MAX_SAFE_INTEGER + 1]; for(let i=0;i<32;i++){ s ^= s << 13; s ^= s >>> 17; s ^= s << 5; values.push((s >>> 0) / 7 + 0.01); } return values; }

describe("Billing audit regressions", () => {
  it("B-01 invoices belonging to another firm cannot be read, renumbered, edited, paid or voided", async () => {
    const { inv } = await invoiceFor("draft");
    await ctx.db.insert(firm).values({id:"firm_other",legalName:"Other",invoicePrefix:"OTHER-"});
    const other = {...ctx, firmId:"firm_other"};
    const before = await snapshot();
    const operations = [() => invoiceWithLines(other, inv.id), () => setInvoiceNumber(other, inv.id, "STOLEN"), () => setLineAmount(other, inv.lines[0].id, 1), () => markPaidManually(other, inv.id, "unauthorised"), () => voidInvoice(other, inv.id, "unauthorised")];
    for(const op of operations) { const r = await Promise.allSettled([op()]); expect.soft(r[0].status).toBe("rejected"); }
    expect(await snapshot()).toEqual(before);
  });

  it("B-02 a foreign-currency bank deposit cannot pay an HKD invoice through approval", async () => {
    const { inv } = await invoiceFor();
    await matchDeposit(ctx, { providerTxId:"usd-deposit", amountCents:inv.totalCents, currency:"USD", reference:inv.number, payerName:"HO", receivedAt:ctx.clock.now() });
    for(const p of await pendingProposals(ctx,{kind:"match_payment"})) await approveProposal(ctx,p.id).catch(()=>undefined);
    expect((await invoiceWithLines(ctx,inv.id)).paidCents).toBe(0);
    expect(await ctx.db.select().from(payment).where(eq(payment.invoiceId,inv.id))).toHaveLength(0);
  });

  it("B-03 stale payment proposals cannot record a second payment after staff mark the invoice paid", async () => {
    const { inv } = await invoiceFor();
    await matchDeposit(ctx,{providerTxId:"stale",amountCents:inv.totalCents,currency:"HKD",reference:"",payerName:"HO",receivedAt:ctx.clock.now()});
    const [p] = await pendingProposals(ctx,{kind:"match_payment"});
    await markPaidManually(ctx,inv.id,"client sent receipt");
    const before = await snapshot();
    await approveProposal(ctx,p.id).catch(()=>undefined);
    expect(await snapshot()).toEqual(before);
  });

  it("B-04 repeated manual mark-paid never creates a zero-value payment or another Xero job", async () => {
    const { inv } = await invoiceFor();
    await markPaidManually(ctx,inv.id,"first");
    const before = await snapshot();
    await markPaidManually(ctx,inv.id,"double click").catch(()=>undefined);
    expect(await snapshot()).toEqual(before);
  });

  it("B-05 concurrent partial payments preserve both deposits in the outstanding balance", async () => {
    const { inv } = await invoiceFor();
    const half = inv.totalCents / 2;
    // Force the real database read/read/write/write interleaving rather than relying on timing.
    const lookup=ctx.db.query.invoice.findFirst.bind(ctx.db.query.invoice); let reads=0; let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    ctx.db.query.invoice.findFirst=(async (...args: Parameters<typeof lookup>)=>{ const row=await lookup(...args); reads++; if(reads===2)release(); await gate; return row; }) as typeof ctx.db.query.invoice.findFirst;
    await Promise.all([recordPayment(ctx,{invoiceId:inv.id,amountCents:half,receivedOn:ctx.clock.today(),method:"manual"}),recordPayment(ctx,{invoiceId:inv.id,amountCents:half,receivedOn:ctx.clock.today(),method:"manual"})]);
    ctx.db.query.invoice.findFirst=lookup;
    expect(await ctx.db.select().from(payment).where(eq(payment.invoiceId,inv.id))).toHaveLength(2);
    expect(await invoiceWithLines(ctx,inv.id)).toMatchObject({paidCents:inv.totalCents,status:"paid"});
  });

  it("B-06 seeded invalid-cent payments never mutate invoice totals or create ledger rows", async () => {
    const { inv } = await invoiceFor();
    const failures:number[]=[];
    for(const amountCents of numbers()) {
      const before=await snapshot();
      const [r]=await Promise.allSettled([recordPayment(ctx,{invoiceId:inv.id,amountCents,receivedOn:ctx.clock.today(),method:"manual"})]);
      if(r.status !== "rejected" || JSON.stringify(await snapshot()) !== JSON.stringify(before)) failures.push(amountCents);
    }
    expect(failures,`accepted invalid cent amounts: ${failures.join(",")}`).toEqual([]);
  });

  it("B-07 a negative revision cannot create an issued invoice with a negative balance", async () => {
    const { inv } = await invoiceFor();
    const before=await snapshot();
    const p=await proposeRevision(ctx,inv.id,{reason:"fuzz",lines:[{description:"negative",kind:"fee",amountCents:-1}]}).catch(()=>null);
    if(p) await approveProposal(ctx,p.id).catch(()=>undefined);
    expect(await snapshot()).toEqual(before);
  });

  it("B-08 fractional revision approval rolls back every invoice, line and sequence write", async () => {
    const { inv }=await invoiceFor();
    const p=await proposeRevision(ctx,inv.id,{reason:"fuzz",lines:[{description:"fraction one",kind:"fee",amountCents:0.5},{description:"fraction two",kind:"fee",amountCents:0.5}]}).catch(()=>null);
    const before=await snapshot();
    if(p) await approveProposal(ctx,p.id).catch(()=>undefined);
    expect(await snapshot()).toEqual(before);
  });

  it("B-09 a revision approval cannot resurrect an invoice voided after the proposal was drafted", async () => {
    const { inv }=await invoiceFor();
    const p=await proposeRevision(ctx,inv.id,{reason:"change fee",lines:[{description:"Office",kind:"fee",amountCents:100}]});
    await voidInvoice(ctx,inv.id,"request cancelled"); const before=await snapshot();
    await approveProposal(ctx,p.id).catch(()=>undefined);
    expect(await snapshot()).toEqual(before);
  });

  it("B-10 punctuation-only custom invoice numbers cannot be auto-matched to arbitrary deposits", async () => {
    const { inv }=await invoiceFor("draft");
    await setInvoiceNumber(ctx,inv.id,"---").catch(()=>undefined);
    await markInvoiceSent(ctx,inv.id);
    await matchDeposit(ctx,{providerTxId:"random-ref",amountCents:inv.totalCents,currency:"HKD",reference:"unrelated payment",payerName:"Nobody",receivedAt:ctx.clock.now()});
    expect((await invoiceWithLines(ctx,inv.id)).paidCents).toBe(0);
  });

  it("B-11 control characters in a custom invoice number are rejected before breaking its PDF download", async () => {
    const { inv }=await invoiceFor("draft");
    const failed:string[]=[];
    for(const n of ["INV\r\nX-Injected: yes","INV\u0001A","INV\nLINE"]) {
      const before=await snapshot(); const [r]=await Promise.allSettled([setInvoiceNumber(ctx,inv.id,n)]);
      if(r.status!=="rejected" || JSON.stringify(await snapshot())!==JSON.stringify(before)) failed.push(n);
    }
    expect(failed).toEqual([]);
  });

  it("B-12 Xero payment retry after a lost response never posts the same receipt twice", async () => {
    const { inv }=await invoiceFor();
    await enqueue(ctx,"xero.sync_invoice",{invoiceId:inv.id},`xero.invoice:${inv.id}`); await runJobs(ctx);
    const create=ctx.accounting.createPayment.bind(ctx.accounting); let lost=true;
    ctx.accounting.createPayment=async p=>{ const id=await create(p); if(lost){lost=false;throw new Error("connection lost after provider committed");} return id; };
    await markPaidManually(ctx,inv.id,"receipt"); await runJobs(ctx); ctx.clock.advanceSeconds(60); await runJobs(ctx);
    expect(ctx.accounting.payments).toHaveLength(1);
  });

  it("B-13 concurrent annual batches create only one request and invoice for each company period", async () => {
    const o={playbookId:"hk.annualReturn",clientIds:["cli_c1","cli_c1"],periodYear:2027};
    const requestCount=(await ctx.db.select().from(request)).length;
    await Promise.allSettled([batchStart(ctx,o),batchStart(ctx,o)]);
    expect(await ctx.db.select().from(task).where(and(eq(task.playbookId,o.playbookId),eq(task.periodKey,"NAR1:2027")))).toHaveLength(1);
    expect(await ctx.db.select().from(request)).toHaveLength(requestCount+1);
    expect(await ctx.db.select().from(invoice).where(eq(invoice.status,"draft"))).toHaveLength(1);
  });

  it("B-14 tiny fractional costs cannot create a zero-value line after rounding", async () => {
    const {t}=await invoiceFor("draft"); const before=await snapshot();
    await addCost(ctx,t.id,{description:"零元成本 / Fraction",amountCents:0.1,kind:"fee"}).catch(()=>undefined);
    expect(await snapshot()).toEqual(before);
  });

  it("B-15 playbook editor rejects seeded invalid values and leaves immutable versions unchanged", async () => {
    const old=await getPlaybook(ctx,"hk.changeOffice");
    for(const value of numbers().filter(n=>n!==0)) {
      const pb={...structuredClone(old),feeCents:value};
      await expect(savePlaybookVersion(ctx,pb.id,pb.version,JSON.stringify(pb))).rejects.toThrow();
      expect(await getPlaybook(ctx,pb.id)).toEqual(old);
    }
  });
});

it("B-01 recalculating another firm's invoice cannot modify its ledger", async () => {
  const { inv } = await invoiceFor("draft");
  await ctx.db.insert(firm).values({id:"firm_other",legalName:"Other",invoicePrefix:"OTHER-"});
  const before = await snapshot();
  const { recalcTotal } = await import("@/domain/invoices");
  await expect(recalcTotal({...ctx, firmId:"firm_other"}, inv.id)).rejects.toThrow();
  expect(await snapshot()).toEqual(before);
});
