// Area 6: real PostgreSQL, fictional clients, public human-approved requests and fake providers.
// BUILD_SPEC §7: partial/overpayment requires review; matching must conserve received money.
import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { startManualRequest } from "@/domain/manual";
import { approveProposal, createProposal, pendingProposals } from "@/domain/proposals";
import { invoiceForRequest } from "@/domain/outbound";
import { invoiceWithLines } from "@/domain/invoices";
import { matchDeposit, recordPayment } from "@/domain/payments";
import { currentStep, getTask } from "@/domain/engine";
import { deliveryPayload } from "@/domain/mail-delivery";
import { Crypto } from "@/lib/crypto";
import type { Ctx } from "@/lib/ctx";
import { bankTransaction, invoice, payment, mailDelivery, job, firm } from "@/db/schema";
import { runJobs } from "@/domain/jobs";
import { batchStart } from "@/domain/batch";
import "@/domain/accounting-sync";

let ctx: TestCtx, n: number;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx(); n = 0;
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
});
async function issue(two = false) {
  const r = await startManualRequest(ctx, { clientId: "cli_c2", items: [{ playbookId: "hk.changeOffice" }, ...(two ? [{ playbookId: "hk.changeName" }] : [])], confirm: true });
  const mailCount = ctx.mail.sent().length;
  await approveProposal(ctx, r.proposalId!);
  const initialInvoice = (await invoiceForRequest(ctx, r.requestId))!;
  const inv = await invoiceWithLines(ctx, initialInvoice.id);
  expect(ctx.mail.sent()).toHaveLength(mailCount + 1);
  expect(ctx.mail.sent().at(-1)!.attachmentNames).toContain(`${inv.number}.pdf`);
  const p = await ctx.db.query.proposal.findFirst({ where: (p, { eq }) => eq(p.id, r.proposalId!) });
  const journal = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.sourceKey, `message:${p!.payload.messageId}`) }))!;
  const pdf = deliveryPayload(ctx, journal).attachments![0].content;
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  return { ...r, inv, journalId: journal.id, pdfHash: Crypto.sha256(pdf) };
}
async function deposit(inv: { number: string; totalCents: number }, amountCents = inv.totalCents, reference = inv.number, currency = "HKD") {
  const providerTxId = `area6-${++n}`;
  const result = await matchDeposit(ctx, { providerTxId, amountCents, currency, reference, payerName: "HO WING YAN", receivedAt: ctx.clock.now() });
  const b = (await ctx.db.query.bankTransaction.findFirst({ where: eq(bankTransaction.providerTxId, providerTxId) }))!;
  const p = (await pendingProposals(ctx, { kind: "match_payment" })).find(p => p.payload.bankTransactionId === b.id);
  return { result, b, p };
}
async function financials() {
  return { invoices: await ctx.db.select().from(invoice), payments: await ctx.db.select().from(payment), jobs: await ctx.db.select().from(job), sequence: (await ctx.db.query.firm.findFirst({where:eq(firm.id,ctx.firmId)}))!.invoiceSeq };
}
async function immutable(issued: Awaited<ReturnType<typeof issue>>) {
  const inv = await invoiceWithLines(ctx, issued.inv.id);
  expect({ number:inv.number,totalCents:inv.totalCents,lines:inv.lines,issuedOn:inv.issuedOn,dueOn:inv.dueOn }).toEqual({number:issued.inv.number,totalCents:issued.inv.totalCents,lines:issued.inv.lines,issuedOn:issued.inv.issuedOn,dueOn:issued.inv.dueOn});
  const j = (await ctx.db.query.mailDelivery.findFirst({ where:eq(mailDelivery.id,issued.journalId) }))!;
  expect(Crypto.sha256(deliveryPayload(ctx,j).attachments![0].content)).toBe(issued.pdfHash);
}
// Intercept real empty receipt reads inside transactions, including nested savepoints.
// The 400 ms release prevents correct bank-row serialization from deadlocking the harness.
function competingReceiptReads(db: Ctx["db"]) {
  let arrivals = 0, release!: () => void, timer: ReturnType<typeof setTimeout> | undefined;
  const gate = new Promise<void>(r => { release = r; });
  function wrap(target: Ctx["db"]): Ctx["db"] {
    return new Proxy(target, { get(t, key) {
      if (key === "transaction") return (callback: (db: Ctx["db"]) => Promise<unknown>, config?: Parameters<Ctx["db"]["transaction"]>[1]) => t.transaction(async tx => callback(wrap(tx as unknown as Ctx["db"])), config);
      if (key === "query") return { ...t.query, payment: { ...t.query.payment, findFirst: async (...args: Parameters<typeof t.query.payment.findFirst>) => {
        const result = await t.query.payment.findFirst(...args);
        if (!result) { arrivals++; timer ??= setTimeout(release,400); if (arrivals >= 2) release(); await gate; }
        return result;
      } } };
      const value = Reflect.get(t,key); return typeof value === "function" ? value.bind(t) : value;
    } });
  }
  return { db:wrap(db), finish:()=>{if(timer)clearTimeout(timer);release();}, arrivals:()=>arrivals };
}

it("A6-P01 one bank deposit cannot fund two different invoices through concurrent receipt calls", async () => {
  const a=await issue(), b=await issue();
  const d=await deposit(a.inv,a.inv.totalCents,"Unallocated received transfer");
  expect(d.result).toBe("unmatched"); // both invoices have the same due amount
  const barrier=competingReceiptReads(ctx.db);
  const raced={...ctx,db:barrier.db};
  const results=await Promise.allSettled([a,b].map(x=>recordPayment(raced,{invoiceId:x.inv.id,bankTransactionId:d.b.id,amountCents:x.inv.totalCents,receivedOn:ctx.clock.today(),method:"bank_approved"}))).finally(barrier.finish);
  const receipts=await ctx.db.select().from(payment).where(eq(payment.bankTransactionId,d.b.id));
  expect.soft(receipts.reduce((sum,p)=>sum+p.amountCents,0)).toBeLessThanOrEqual(d.b.amountCents);
  expect.soft(receipts).toHaveLength(1);
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  await immutable(a); await immutable(b);
});

it("A6-P02 approved overpayment retains an explicit actionable excess instead of labelling all money matched", async () => {
  const issued=await issue(); const excess=12345;
  const d=await deposit(issued.inv,issued.inv.totalCents+excess);
  expect(d.result).toBe("proposed"); expect(await ctx.db.select().from(payment).where(eq(payment.bankTransactionId,d.b.id))).toHaveLength(0);
  await approveProposal(ctx,d.p!.id);
  const b=(await ctx.db.query.bankTransaction.findFirst({where:eq(bankTransaction.id,d.b.id)}))!;
  const receipts=await ctx.db.select().from(payment).where(eq(payment.bankTransactionId,b.id));
  const remainder=b.amountCents-receipts.reduce((s,p)=>s+p.amountCents,0);
  expect(remainder).toBe(excess);
  // Safe split may be deferred, but the current Payments row must expose the remaining money.
  expect(b.status!=="matched" || /unallocated|residual|overpay|excess|remaining/i.test(b.matchNote??""),JSON.stringify({bank:b,allocated:receipts,remainder})).toBe(true);
  await immutable(issued);
});

it("A6-P03 partial then exact remaining money opens every request task gate without rewriting its issued PDF", async () => {
  const issued=await issue(true); const first=await deposit(issued.inv,Math.floor(issued.inv.totalCents/3));
  expect(first.result).toBe("proposed");
  for(const id of issued.taskIds) expect(currentStep(await getTask(ctx,id))?.kind).toBe("pay");
  await approveProposal(ctx,first.p!.id);
  for(const id of issued.taskIds) expect(currentStep(await getTask(ctx,id))?.kind).toBe("pay");
  const remaining=issued.inv.totalCents-first.b.amountCents;
  const last=await deposit(issued.inv,remaining);
  expect(last.result).toBe("matched");
  for(const id of issued.taskIds) expect(currentStep(await getTask(ctx,id))?.kind).toBe("collect");
  const inv=await invoiceWithLines(ctx,issued.inv.id);
  expect(inv).toMatchObject({status:"paid",paidCents:issued.inv.totalCents});
  const receipts=await ctx.db.select().from(payment).where(eq(payment.invoiceId,inv.id));
  expect(receipts.map(p=>p.amountCents).sort((a,b)=>a-b)).toEqual([first.b.amountCents,remaining].sort((a,b)=>a-b));
  await immutable(issued);
});

it("A6-P04 a net-of-fee deposit does not silently write off the shortfall or open an upfront payment gate", async () => {
  const issued=await issue(); const fee=257;
  const d=await deposit(issued.inv,issued.inv.totalCents-fee);
  expect(d.result).toBe("proposed"); await approveProposal(ctx,d.p!.id);
  expect(await invoiceWithLines(ctx,issued.inv.id)).toMatchObject({status:"part_paid",paidCents:issued.inv.totalCents-fee});
  expect(currentStep(await getTask(ctx,issued.taskIds[0]))?.kind).toBe("pay");
  expect((await deposit(issued.inv,fee)).result).toBe("matched");
  expect(currentStep(await getTask(ctx,issued.taskIds[0]))?.kind).toBe("collect");
  await immutable(issued);
});

it("A6-P05 one transfer quoting two invoice numbers stays safely unmatched without inferred split allocations", async () => {
  const a=await issue(),b=await issue(); const before=await financials();
  const d=await deposit(a.inv,a.inv.totalCents+b.inv.totalCents,`For ${a.inv.number} / ${b.inv.number}`);
  expect(d.result).toBe("unmatched"); expect(d.b.status).toBe("unmatched"); expect(d.p).toBeUndefined();
  expect(await financials()).toEqual(before);
  await immutable(a); await immutable(b);
});

it("A6-P06 two actual human match approvals cannot consume one bank row against different invoices", async () => {
  const a=await issue(), b=await issue(); const d=await deposit(a.inv,a.inv.totalCents,"Shared transfer awaiting staff allocation");
  const cards=await Promise.all([a,b].map(x=>createProposal(ctx,{kind:"match_payment",title:`Staff allocation to ${x.inv.number}`,clientId:"cli_c2",requestId:x.requestId,payload:{invoiceId:x.inv.id,bankTransactionId:d.b.id,amountCents:x.inv.totalCents}})));
  const barrier=competingReceiptReads(ctx.db);
  const results=await Promise.allSettled(cards.map(p=>approveProposal({...ctx,db:barrier.db},p.id))).finally(barrier.finish);
  const receipts=await ctx.db.select().from(payment).where(eq(payment.bankTransactionId,d.b.id));
  expect.soft(receipts.reduce((s,p)=>s+p.amountCents,0)).toBeLessThanOrEqual(d.b.amountCents);
  expect.soft(receipts).toHaveLength(1);
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  await immutable(a); await immutable(b);
});

it("A6-P07 competing deposits cannot overpay one invoice and the losing deposit remains unresolved", async () => {
  const issued=await issue();
  const a=await deposit(issued.inv,issued.inv.totalCents,""), b=await deposit(issued.inv,issued.inv.totalCents,"");
  expect(a.result).toBe("proposed"); expect(b.result).toBe("proposed");
  const results=await Promise.allSettled([a,b].map(d=>approveProposal(ctx,d.p!.id)));
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  const receipts=await ctx.db.select().from(payment).where(eq(payment.invoiceId,issued.inv.id));
  expect(receipts).toHaveLength(1); expect(receipts[0].amountCents).toBe(issued.inv.totalCents);
  const loser=[a,b].find(d=>d.b.id!==receipts[0].bankTransactionId)!;
  expect((await ctx.db.query.bankTransaction.findFirst({where:eq(bankTransaction.id,loser.b.id)}))!.status).not.toBe("matched");
  await immutable(issued);
});

it("A6-P08 approval concurrent with deposit replay has one exact receipt and completes without a lock-order deadlock", async () => {
  const issued=await issue(); const d=await deposit(issued.inv,issued.inv.totalCents,"");
  const replay={providerTxId:d.b.providerTxId,amountCents:d.b.amountCents,currency:d.b.currency,reference:d.b.reference,payerName:d.b.payerName,receivedAt:d.b.receivedAt};
  const results=await Promise.allSettled([approveProposal(ctx,d.p!.id),matchDeposit(ctx,replay)]);
  expect(results[0].status).toBe("fulfilled"); expect(results[1].status).toBe("fulfilled");
  expect(await ctx.db.select().from(payment).where(eq(payment.bankTransactionId,d.b.id))).toHaveLength(1);
  expect((await ctx.db.query.bankTransaction.findFirst({where:eq(bankTransaction.id,d.b.id)}))!.status).toBe("matched");
  await expect(approveProposal(ctx,d.p!.id)).rejects.toThrow(/already/);
  expect(await matchDeposit(ctx,replay)).toBe("matched");
  expect(await ctx.db.select().from(payment).where(eq(payment.bankTransactionId,d.b.id))).toHaveLength(1);
  await immutable(issued);
});

it("A6-P09 Xero lost-response retries preserve exactly the two partial bank receipts against the published invoice", async () => {
  const issued=await issue(); await runJobs(ctx);
  const create=ctx.accounting.createPayment.bind(ctx.accounting); let loseAck=true;
  ctx.accounting.createPayment=async p=>{const id=await create(p);if(loseAck){loseAck=false;throw new Error("payment committed at fake accounting; acknowledgement lost");}return id;};
  const first=await deposit(issued.inv,22001); await approveProposal(ctx,first.p!.id); await runJobs(ctx);
  expect(ctx.accounting.payments).toHaveLength(1);
  const bankReceipts=await ctx.db.select().from(payment).where(eq(payment.invoiceId,issued.inv.id));
  expect(bankReceipts[0].xeroStatus).toBe("error");
  const last=await deposit(issued.inv,issued.inv.totalCents-22001); expect(last.result).toBe("matched");
  ctx.clock.advanceSeconds(60); await runJobs(ctx); ctx.clock.advanceSeconds(600); await runJobs(ctx);
  expect(ctx.accounting.payments).toHaveLength(2);
  const inv=await invoiceWithLines(ctx,issued.inv.id);
  expect(ctx.accounting.payments.every(p=>p.invoiceId===inv.xeroInvoiceId&&p.reference===inv.number)).toBe(true);
  expect(ctx.accounting.payments.reduce((s,p)=>s+p.amountCents,0)).toBe(inv.totalCents);
  const receipts=await ctx.db.select().from(payment).where(eq(payment.invoiceId,inv.id));
  expect(receipts.every(p=>p.xeroStatus==="synced")).toBe(true);
  const jobs=await ctx.db.select().from(job);
  for(const p of receipts) expect(jobs.filter(j=>j.dedupeKey===`xero.payment:${p.id}`)).toHaveLength(1);
  await immutable(issued);
});

it("A6-P10 actual batch approval preserves credit versus upfront gates and each company's own bank receipt", async () => {
  const result=await batchStart(ctx,{playbookId:"hk.annualReturn",clientIds:["cli_c1","cli_c2"],periodYear:2028});
  expect(result.created).toBe(2);
  const cards=(await pendingProposals(ctx,{kind:"send_message"})).filter(p=>p.payload.batch);
  expect(cards).toHaveLength(2);
  for(const p of cards) await approveProposal(ctx,p.id);
  const invoices=await Promise.all(cards.map(p=>invoiceForRequest(ctx,p.requestId!)));
  const gates=new Map<string,string|undefined>();
  for(const p of cards) gates.set(p.clientId!,currentStep(await getTask(ctx,(p.payload.taskIds as string[])[0]))?.kind);
  expect(gates.get("cli_c1")).toBe("collect"); expect(gates.get("cli_c2")).toBe("pay");
  for(const inv of invoices) expect((await deposit(inv!)).result).toBe("matched");
  for(const inv of invoices) {
    const receipts=await ctx.db.select().from(payment).where(eq(payment.invoiceId,inv!.id));
    expect(receipts).toHaveLength(1); expect(receipts[0].amountCents).toBe(inv!.totalCents);
  }
  expect(ctx.mail.sent()).toHaveLength(2);
});

it("A6-P11 seeded invalid money and date values leave a partly paid invoice, receipts, jobs and sequence unchanged", async () => {
  const issued=await issue();const d=await deposit(issued.inv,11111);await approveProposal(ctx,d.p!.id);
  // xorshift32 seed 0xA6C0FFEE: 24 fractional values + eight explicit money edges + six dates.
  let seed=0xA6C0FFEE;const amounts=[NaN,Infinity,-Infinity,-1,0,0.5,Number.MAX_SAFE_INTEGER+1,issued.inv.totalCents];
  for(let i=0;i<24;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;amounts.push((seed>>>0)/13+0.001);}
  const dates=["","2026-02-30","2026-13-01","2026-9-29"," 2026-09-29 ","2026-09-29T00:00:00Z"];
  const samples=[...amounts.map(amountCents=>({amountCents,receivedOn:ctx.clock.today()})),...dates.map(receivedOn=>({amountCents:1,receivedOn}))];
  for(const p of samples){const before=await financials();await expect(recordPayment(ctx,{invoiceId:issued.inv.id,...p,method:"manual"}),JSON.stringify(p)).rejects.toThrow();expect(await financials()).toEqual(before);}
  await immutable(issued);
});

it("A6-P12 foreign firm pointers and a currency changed after proposing never create a receipt or consume a deposit", async () => {
  const issued=await issue();const d=await deposit(issued.inv,issued.inv.totalCents,"");
  await ctx.db.update(bankTransaction).set({currency:"USD"}).where(eq(bankTransaction.id,d.b.id));
  let before=await financials();await expect(approveProposal(ctx,d.p!.id)).rejects.toThrow();expect(await financials()).toEqual(before);
  await ctx.db.insert(firm).values({id:"firm_a6_other",legalName:"Fictional separate firm",invoicePrefix:"A6OTHER-"});
  for(const invoiceId of [issued.inv.id,"missing-invoice"]) {
    before=await financials();await expect(recordPayment({...ctx,firmId:"firm_a6_other"},{invoiceId,bankTransactionId:d.b.id,amountCents:1,receivedOn:ctx.clock.today(),method:"bank_approved"})).rejects.toThrow();expect(await financials()).toEqual(before);
  }
  before=await financials();await expect(approveProposal({...ctx,firmId:"firm_a6_other"},d.p!.id)).rejects.toThrow();expect(await financials()).toEqual(before);
  expect((await ctx.db.query.bankTransaction.findFirst({where:eq(bankTransaction.id,d.b.id)}))!.status).toBe("proposed");
  await immutable(issued);
});

it("A6-P13 seeded unknown payer and noisy reference text never opens payment gates without a staff match approval", async () => {
  const issued=await issue(); const before=await financials();
  const edges=[{payer:"",reference:""},{payer:"   ",reference:"銀行付款 / 银行付款"},{payer:"Unrelated fictional sender",reference:"quote\"; DROP TABLE payment; --"},{payer:"陌生付款人",reference:"\r\n\u0001　"}];
  // xorshift32 seed 0xA6B0A7: eight Unicode/punctuation/no-reference variants plus four edges.
  let seed=0xA6B0A7;
  const samples=[...edges];
  for(let i=0;i<8;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;samples.push({payer:`未知-${seed>>>0}`,reference:`沒有單號 / 没有单号 ${String(seed>>>0).split("").join(" ")}`});}
  for(const sample of samples){
    const providerTxId=`payer-corpus-${++n}`;
    const result=await matchDeposit(ctx,{providerTxId,amountCents:issued.inv.totalCents,currency:issued.inv.currency,reference:sample.reference,payerName:sample.payer,receivedAt:ctx.clock.now()});
    expect(result).not.toBe("matched");
    const row=(await ctx.db.query.bankTransaction.findFirst({where:eq(bankTransaction.providerTxId,providerTxId)}))!;
    expect(row.status).not.toBe("matched");
    expect(await ctx.db.select().from(payment).where(eq(payment.bankTransactionId,row.id))).toHaveLength(0);
    expect(currentStep(await getTask(ctx,issued.taskIds[0]))?.kind).toBe("pay");
    expect(await financials()).toEqual(before);
  }
  // Existing amount-only suggestions are human-reviewable; no new payer heuristic is required.
  await immutable(issued);
});
