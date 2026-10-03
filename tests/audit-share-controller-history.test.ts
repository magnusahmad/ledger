import { beforeEach, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { significantController } from "@/db/schema";
import { createRequest, startTask } from "@/domain/engine";
import { getPlaybook, savePlaybookVersion } from "@/domain/playbooks";
import { completeSending } from "@/domain/sending";
import { completeManualStep } from "@/domain/step-hooks";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { movementHistory } from "@/domain/shares";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });

it("a backdated human-approved allotment does not insert a controller period overlapping already recorded ceased history", async () => {
  const pb = await getPlaybook(ctx, "hk.allotShares");
  await savePlaybookVersion(ctx, pb.id, pb.version, JSON.stringify({ ...pb, feeCents: 0, statutoryFees: [], forms: "", documents: [], deadline: {kind:"none"}, requirements:[{key:"allotmentDetails"},{key:"effDate"}],
    steps:[{kind:"send",label:"Staff deliver instruction",human:true},{kind:"collect",label:"Collect instruction"},{kind:"task",label:"Verify supporting facts",human:true},{kind:"register",label:"Review register changes",human:true},{kind:"confirm",label:"Confirm completion",human:true}] }));
  const prior = { id:"scr_closed_share_audit", firmId:ctx.firmId,clientId:"cli_c1",personId:"per_p3",nature:"Previously confirmed significant shareholding",registrableFrom:"2024-01-01",ceasedOn:"2025-01-01" };
  await ctx.db.insert(significantController).values(prior);
  const req = await createRequest(ctx,{clientId:"cli_c1",summary:"Fictional historic allotment"});
  const t = await startTask(ctx,{clientId:"cli_c1",requestId:req.id,playbookId:pb.id,extracted:{effDate:{value:"2024-06-15"},allotmentDetails:{value:"Verified historic allotment"}},params:{structured:{items:[{kind:"allotment",fromPersonId:null,fromName:null,toPersonId:"per_p3",toName:"ZHANG Wei",toNameZh:null,className:"Ordinary",currency:"HKD",quantity:30000,pricePerShareCents:100,considerationCents:3000000}]}}});
  await completeSending(ctx,[t.id],req.id,"Staff checked and delivered supporting instructions");
  await completeManualStep(ctx,t.id,"Fictional historical documents checked");
  const card=(await pendingProposals(ctx,{taskId:t.id,kind:"register_change"}))[0]; expect(card).toBeDefined();
  const before=await movementHistory(ctx,"cli_c1");
  const result=await Promise.allSettled([approveProposal(ctx,card.id)]);
  if(result[0].status==="rejected") expect(await movementHistory(ctx,"cli_c1")).toEqual(before);
  const rows=await ctx.db.select().from(significantController).where(and(eq(significantController.firmId,ctx.firmId),eq(significantController.clientId,"cli_c1"),eq(significantController.personId,"per_p3")));
  expect(rows).toEqual([expect.objectContaining(prior)]);
  expect(ctx.mail.sent()).toHaveLength(0);
});
