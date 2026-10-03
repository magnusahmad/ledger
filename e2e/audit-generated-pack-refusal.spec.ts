import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { resetAuditFixtures } from "./audit-fixtures";
test.afterAll(({}, info)=>{resetAuditFixtures(info);});
for(const lang of ["en","tc","sc"] as const) test(`oversized NR1 refuses staff generation atomically and supports manual escalation with ${lang} content`,async({page},info)=>{
 const env=resetAuditFixtures(info);
 const call=(mode:string)=>JSON.parse(execFileSync("node_modules/.bin/tsx",["e2e/scripts/generated-pack-fixture.ts",mode,lang],{env,encoding:"utf8",stdio:["ignore","pipe","pipe"]}));
 const f=call("seed") as {taskId:string;title:string};const before=call("snapshot");
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 try {
  await page.goto("/batch",{waitUntil:"domcontentloaded"});
  const prepare=page.getByRole("button",{name:"Prepare selected documents",exact:true});await expect(prepare).toBeVisible();
  await page.waitForLoadState("networkidle");
  const action=page.waitForResponse(r=>r.request().method()==="POST");await prepare.click();await (await action).finished();
  const note=page.getByText(/NR1: field.*prepare the complete form manually before continuing/i);await expect(note).toBeVisible({timeout:30000});
  expect(call("snapshot")).toEqual(before);
  for(const width of [375,768,1280,1440]) {await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);await page.screenshot({path:path.join(env.STORAGE_DIR!,"shots",`nr1-refusal-${lang}-${width}.png`),fullPage:true});}
  await page.goto(`/tasks/${f.taskId}`,{waitUntil:"domcontentloaded"});await expect(page.getByRole("heading",{level:1,name:f.title})).toBeVisible();await page.waitForLoadState("networkidle");
  await page.getByText("Add an off-platform step",{exact:true}).click();await page.locator('#ops-title').fill("Prepare complete NR1 manually after reviewing the full address");
  const a=page.waitForResponse(r=>r.request().method()==="POST");await page.getByRole("button",{name:"Add step",exact:true}).click();await (await a).finished();await page.reload({waitUntil:"domcontentloaded"});
  await expect(page.getByRole("heading",{name:"Off-platform steps",exact:true}).locator("../..").getByText("Prepare complete NR1 manually after reviewing the full address",{exact:true})).toBeVisible();
  const after=call("snapshot");expect(after.docs).toEqual([]);expect(after.task.stepIndex).toBe(before.task.stepIndex);expect(after.task.stepState).toEqual(before.task.stepState);expect(after.actions).toHaveLength(1);
  for(const width of [375,768,1280,1440]) {await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);await page.screenshot({path:path.join(env.STORAGE_DIR!,"shots",`nr1-manual-${lang}-${width}.png`),fullPage:true});}
  expect(errors).toEqual([]);
 }finally {await page.setViewportSize({width:1280,height:900});}
});
