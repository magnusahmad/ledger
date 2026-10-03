import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { advance, cancelTask, getTask, startTask } from "@/domain/engine";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { client, task } from "@/db/schema";
import "@/domain/inbound";
let ctx: TestCtx;
beforeEach(async()=>{await resetDb();ctx=makeCtx();await seedDemo(ctx);});
it("R-14 cancellation after the initial approval check prevents the register write at transaction entry",async()=>{
  const t=await startTask(ctx,{clientId:"cli_c1",playbookId:"hk.changeOffice",extracted:{newAddr:{value:"Race must not write this address"},effDate:{value:"2026-09-29"}}});
  const full=await getTask(ctx,t.id);const idx=full._steps.findIndex(s=>s.kind==="register");
  await ctx.db.update(task).set({stepIndex:idx-1,stepState:{[idx-1]:{filed:true}}}).where(eq(task.id,t.id));
  await advance(ctx,t.id);const [p]=await pendingProposals(ctx,{taskId:t.id,kind:"register_change"});expect(p).toBeDefined();
  const before=await ctx.db.query.client.findFirst({where:eq(client.id,"cli_c1")});
  const transaction=ctx.db.transaction.bind(ctx.db);let interrupt=true;
  ctx.db.transaction=(async (...args:Parameters<typeof transaction>)=>{
    if(interrupt){interrupt=false;await cancelTask(ctx,t.id,"Client withdrew this work while approval was starting");}
    return transaction(...args);
  }) as typeof ctx.db.transaction;
  await expect(approveProposal(ctx,p.id)).rejects.toThrow(/open|cancel|step|ready/i);
  expect((await ctx.db.query.client.findFirst({where:eq(client.id,"cli_c1")}))?.regOfficeEn).toBe(before?.regOfficeEn);
  expect((await getTask(ctx,t.id)).status).toBe("cancelled");
});
