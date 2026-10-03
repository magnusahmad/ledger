import { beforeEach, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { createRequest, startTask } from "@/domain/engine";
import { createInvoiceForRequest, invoiceWithLines } from "@/domain/invoices";
import { invoiceLine } from "@/db/schema";
let ctx: TestCtx;
vi.mock("@/server/ctx",()=>({getCtx:()=>ctx}));
vi.mock("next/cache",()=>({refresh:vi.fn(),revalidatePath:vi.fn()}));
beforeEach(async()=>{await resetDb();ctx=makeCtx();await seedDemo(ctx);});
it("B-25 malformed and negative staff price strings never change an invoice",async()=>{
 const req=await createRequest(ctx,{clientId:"cli_c1"});await startTask(ctx,{requestId:req.id,clientId:"cli_c1",playbookId:"hk.changeOffice"});const inv=(await createInvoiceForRequest(ctx,req.id))!;
 const line=(await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId,inv.id)))[0];const before=await invoiceWithLines(ctx,inv.id);
 const {lineAmountAction}=await import("@/server/actions");
 for(const amount of ["-12","-0.01","1e3","NaN","Infinity",""," ","HK$ -12","12garbage","1.005","1,23","90071992547409.92"]){const form=new FormData();form.set("amount",amount);expect.soft((await lineAmountAction(line.id,null,form)).ok,amount).toBe(false);expect.soft(await invoiceWithLines(ctx,inv.id),amount).toEqual(before);}
 const valid=new FormData();valid.set("amount","1,234.56");expect((await lineAmountAction(line.id,null,valid)).ok).toBe(true);expect((await invoiceWithLines(ctx,inv.id)).totalCents).toBe(123456);
});
