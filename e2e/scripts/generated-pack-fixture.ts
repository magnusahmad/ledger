// Bounded Area8 fixture: an initial task at generation, with previously agreed
// send/credit/collection facts. Browser performs generation and manual escalation.
import path from "node:path";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { makeRuntimeCtx, STORAGE_ROOT } from "../../src/lib/runtime";
import { closePools } from "../../src/db/client";
import { createRequest, startTask, getTask } from "../../src/domain/engine";
import { client, document, task, taskAction } from "../../src/db/schema";
import { Crypto } from "../../src/lib/crypto";
const db = new URL(process.env.DATABASE_URL ?? "invalid:");
const relative = path.relative(process.cwd(), STORAGE_ROOT);
if (!["localhost", "127.0.0.1", "[::1]"].includes(db.hostname) || !db.pathname.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e" || process.env.SCREENING_PROVIDER !== "fake" || !relative || relative.startsWith("..") || path.isAbsolute(relative) || !path.basename(STORAGE_ROOT).includes("e2e")) throw new Error("Pack fixture requires configured local E2E database and fake providers/storage");
const ctx = makeRuntimeCtx({ bankProvider: "fake", accountingProvider: "fake" });
const fpath = path.join(STORAGE_ROOT,"generated-pack.json");
try {
  if (process.argv[2] === "seed") {
    const lang=process.argv[3] as "en"|"tc"|"sc";
    if (!["en","tc","sc"].includes(lang)) throw new Error("Expected fictional display language");
    await ctx.db.update(client).set({docLang:lang}).where(eq(client.id,"cli_c1"));
    const req=await createRequest(ctx,{clientId:"cli_c1"});
    const title=lang==="en"?"Fictional long NR1 address":lang==="tc"?"虛構註冊地址完整表格":"虚构注册地址完整表格";
    const t=await startTask(ctx,{clientId:"cli_c1",requestId:req.id,playbookId:"hk.changeOffice",title,extracted:{effDate:{value:"2026-10-15",source:"Staff agreed facts"},newAddr:{value:`Unit 123, FictionalBuildingReference${"X".repeat(140)}, 888 Fictional Road, Hong Kong`,source:"Staff agreed facts"}}});
    const full=await getTask(ctx,t.id);const idx=full._steps.findIndex(s=>s.kind==="generate");
    await ctx.db.update(task).set({stepIndex:idx,stepState:Object.fromEntries(full._steps.slice(0,idx).map((s,i)=>[String(i),s.kind==="send"?{sent:true}:s.kind==="pay"?{skipped:"Existing credit terms"}:{}]))}).where(eq(task.id,t.id));
    const f={taskId:t.id,title};writeFileSync(fpath,JSON.stringify(f));console.log(JSON.stringify(f));
  } else if(process.argv[2]==="snapshot") {
    const f=JSON.parse(readFileSync(fpath,"utf8")) as {taskId:string};
    function files(dir:string,prefix=""): [string,string][] {return readdirSync(dir,{withFileTypes:true}).filter(e=>e.name!=="shots"&&e.name!=="generated-pack.json").flatMap(e=>e.isDirectory()?files(path.join(dir,e.name),`${prefix}${e.name}/`):[[`${prefix}${e.name}`,Crypto.sha256(readFileSync(path.join(dir,e.name)))] as [string,string]]).sort((a,b)=>a[0].localeCompare(b[0]));}
    const t=await getTask(ctx,f.taskId);
    console.log(JSON.stringify({task:t,docs:await ctx.db.select().from(document).where(and(eq(document.firmId,ctx.firmId),eq(document.taskId,t.id))),actions:await ctx.db.select().from(taskAction).where(eq(taskAction.taskId,t.id)),files:files(STORAGE_ROOT)}));
  } else throw new Error("Expected seed or snapshot");
} finally {await closePools();}
