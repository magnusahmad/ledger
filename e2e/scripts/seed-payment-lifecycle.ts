// Fictional, isolated fake-provider acceptance fixtures; no product source changes.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import assert from "node:assert/strict";
import { makeRuntimeCtx } from "../../src/lib/runtime";
import { closePools } from "../../src/db/client";
import { startManualRequest } from "../../src/domain/manual";
import { approveProposal, pendingProposals } from "../../src/domain/proposals";
import { invoiceForRequest } from "../../src/domain/outbound";
import { matchDeposit, pollBank } from "../../src/domain/payments";
import { bankTransaction, client, contact, invoice, payment, mailDelivery } from "../../src/db/schema";
import { deliveryPayload } from "../../src/domain/mail-delivery";
import { Crypto } from "../../src/lib/crypto";
if (!process.env.DATABASE_URL?.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e") throw new Error("Payment fixtures require isolated E2E DB and fake providers");
const ctx=makeRuntimeCtx(), file=path.join(process.env.STORAGE_DIR!,"payment-lifecycle-cases.json");
const names={en:"Fictional payment sender",tc:"虛構付款人陳先生",sc:"虚构付款人陈先生"};
const refs={en:"additional received money",tc:"額外收到款項，待職員核對",sc:"额外收到款项，待职员核对"};
if(process.argv[2]==="verify") {
  const cases=JSON.parse(readFileSync(file,"utf8"));
  const c=cases.find((c:{proposalId:string})=>c.proposalId===process.argv[3]);
  assert.ok(c,"Known isolated fixture");
  const bank=await ctx.db.query.bankTransaction.findFirst({where:eq(bankTransaction.id,c.bankId)});
  assert.match(bank!.matchNote!,/HK\$123\.45 overpayment remains unallocated\. Staff review required\./);
  const note=bank!.matchNote;
  await pollBank(ctx); await pollBank(ctx);
  assert.equal((await ctx.db.query.bankTransaction.findFirst({where:eq(bankTransaction.id,c.bankId)}))!.matchNote,note);
  assert.equal(await matchDeposit(ctx,{providerTxId:bank!.providerTxId,amountCents:bank!.amountCents,currency:bank!.currency,reference:bank!.reference,payerName:bank!.payerName,receivedAt:bank!.receivedAt}),"matched");
  assert.equal((await ctx.db.select().from(payment).where(eq(payment.bankTransactionId,c.bankId))).length,1);
  assert.equal((await ctx.db.query.invoice.findFirst({where:eq(invoice.id,c.invoiceId)}))!.paidCents,60000);
  await assert.rejects(()=>approveProposal(ctx,c.proposalId),/already/);
  const journal=(await ctx.db.query.mailDelivery.findFirst({where:eq(mailDelivery.id,c.journalId)}))!;
  assert.equal(Crypto.sha256(deliveryPayload(ctx,journal).attachments![0].content),c.pdfHash);
} else {
  const cases=[];
  for(const width of [375,768,1280,1440]) for(const language of ["en","tc","sc"] as const) {
    await ctx.db.update(client).set({messageLang:language}).where(eq(client.id,"cli_c2"));
    await ctx.db.update(contact).set({language}).where(and(eq(contact.clientId,"cli_c2"),eq(contact.isInstructing,true)));
    const r=await startManualRequest(ctx,{clientId:"cli_c2",items:[{playbookId:"hk.changeOffice"}],confirm:true});
    await approveProposal(ctx,r.proposalId!);
    const inv=(await invoiceForRequest(ctx,r.requestId))!;
    assert.equal(inv.totalCents,60000);
    const sendCard=(await ctx.db.query.proposal.findFirst({where:(p,{eq})=>eq(p.id,r.proposalId!)}))!;
    const journal=(await ctx.db.query.mailDelivery.findFirst({where:eq(mailDelivery.sourceKey,`message:${sendCard.payload.messageId}`)}))!;
    assert.equal(deliveryPayload(ctx,journal).attachments![0].content.subarray(0,4).toString(),"%PDF");
    const reference=`${inv.number} ${refs[language]}`;
    const deposit=await ctx.bank.simulateDeposit!({amountCents:72345,currency:"HKD",reference,payerName:names[language]});
    assert.equal(await matchDeposit(ctx,deposit!),"proposed");
    const bank=(await ctx.db.query.bankTransaction.findFirst({where:eq(bankTransaction.providerTxId,deposit!.providerTxId)}))!;
    const p=(await pendingProposals(ctx,{kind:"match_payment"})).find(p=>p.payload.bankTransactionId===bank.id)!;
    cases.push({width,language,proposalId:p.id,invoiceId:inv.id,number:inv.number,bankId:bank.id,payer:names[language],reference,journalId:journal.id,pdfHash:Crypto.sha256(deliveryPayload(ctx,journal).attachments![0].content)});
  }
  writeFileSync(file,JSON.stringify(cases));
}
await closePools();
