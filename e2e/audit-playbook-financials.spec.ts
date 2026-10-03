import { test,expect,type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { auditEnvironment,resetAuditFixtures } from "./audit-fixtures";
async function hydratedForm(page:Page,button:string) {
  await page.waitForFunction(button=>{
    const form=[...document.querySelectorAll("form")].find(f=>[...f.querySelectorAll("button")].some(b=>b.textContent===button));
    return !!form&&Object.keys(form).some(key=>key.startsWith("__reactProps$")&&typeof(form as unknown as Record<string,{action?:unknown}>)[key]?.action==="function");
  },button);
}
async function submit(page:Page,button:string) {
  await hydratedForm(page,button);
  const response=page.waitForResponse(r=>r.request().method()==="POST"&&!!r.request().headers()["next-action"],{timeout:120_000});
  await page.getByRole("button",{name:button,exact:true}).click();
  const finished=await response;expect(finished.ok()).toBe(true);await finished.finished();
}
let fixtures:{pricedTaskId:string;cases:{language:string;taskId:string}[]};
test.beforeEach(({},info)=>{const env=resetAuditFixtures(info);execFileSync("node_modules/.bin/tsx",["e2e/scripts/seed-playbook-financials.ts"],{env,stdio:"pipe",timeout:120_000});fixtures=JSON.parse(readFileSync(path.join(env.STORAGE_DIR!,"playbook-financial-cases.json"),"utf8"));});
test.afterAll(({},info)=>{resetAuditFixtures(info);});
for(const width of [375,768,1280,1440]) test(`A9-F02 staff can add a reviewed later cost to genuine no-invoice free tasks in EN TC SC at ${width}px`,async({page},info)=>{
  const env=auditEnvironment(info),errors:string[]=[];const db=new Pool({connectionString:env.DATABASE_URL});page.on("pageerror",e=>errors.push(e.message));await page.setViewportSize({width,height:900});
  try {
  await page.goto(`/tasks/${fixtures.pricedTaskId}`,{waitUntil:"domcontentloaded"});
  await expect(page.getByText("Add a cost",{exact:true})).toBeVisible(); // existing billed-task positive selector control
  for(const c of fixtures.cases) {
    // Each width starts from genuinely fresh free requests with no primary or additional invoices.
    expect((await db.query("select count(i.id)::int as n from task t left join invoice i on i.request_id=t.request_id where t.id=$1",[c.taskId])).rows[0].n).toBe(0);
    expect((await db.query("select r.invoice_id from task t join request r on r.id=t.request_id where t.id=$1",[c.taskId])).rows[0].invoice_id).toBeNull();
    await page.goto(`/tasks/${c.taskId}`,{waitUntil:"domcontentloaded"});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:path.join(env.STORAGE_DIR!,`shots/free-cost-entry-${c.language}-${width}.png`),fullPage:true});
    await expect(page.getByText("Add a cost",{exact:true})).toBeVisible();
    await hydratedForm(page,"Add cost");
    await page.getByText("Add a cost",{exact:true}).click();
    await expect(page.getByText("This goes on a separate invoice for you to review and approve.",{exact:true})).toBeVisible();
    await page.screenshot({path:path.join(env.STORAGE_DIR!,`shots/free-cost-form-${c.language}-${width}.png`),fullPage:true});
    const oldTask=(await db.query("select step_index,step_state from task where id=$1",[c.taskId])).rows[0];
    const sentBefore=(await db.query("select count(*)::int as n from mail_delivery where status='sent'")).rows[0].n;
    await page.getByLabel("What for",{exact:true}).fill(`Fictional late charge / 額外費用 / 额外费用 ${width}-${c.language}`);
    await page.getByLabel("Amount (HK$)",{exact:true}).fill("0.01");
    await submit(page,"Add cost");
    await expect(page).toHaveURL(/\/review\/prp_/);
    await expect(page.getByRole("button",{name:"Approve and send with invoice",exact:true})).toBeVisible();
    await expect(page.getByLabel("Message",{exact:true})).toHaveAttribute("lang",c.language==="en"?"en":c.language==="sc"?"zh-Hans":"zh-Hant");
    await page.screenshot({path:path.join(env.STORAGE_DIR!,`shots/free-cost-review-${c.language}-${width}.png`),fullPage:true});
    const pdfHref=await page.locator('a[href^="/api/invoices/"][href$="/pdf"]').first().getAttribute("href");
    expect(pdfHref).toBeTruthy();const pdf=await page.request.get(pdfHref!);expect(pdf.status()).toBe(200);expect((await pdf.body()).subarray(0,4).toString()).toBe("%PDF");
    const invoiceId=pdfHref!.split("/")[3],proposalId=new URL(page.url()).pathname.split("/")[2];
    expect((await db.query("select status,total_cents,paid_cents,number from invoice where id=$1",[invoiceId])).rows[0]).toMatchObject({status:"draft",total_cents:"1",paid_cents:"0"});
    expect((await db.query("select status from proposal where id=$1",[proposalId])).rows[0].status).toBe("pending");
    expect((await db.query("select count(*)::int as n from mail_delivery where status='sent'")).rows[0].n).toBe(sentBefore);
    await submit(page,"Approve and send with invoice");
    await expect.poll(async()=>(await db.query("select status from proposal where id=$1",[proposalId])).rows[0].status).toBe("approved");
    expect((await db.query("select status,total_cents,paid_cents from invoice where id=$1",[invoiceId])).rows[0]).toMatchObject({status:"sent",total_cents:"1",paid_cents:"0"});
    expect((await db.query("select count(*)::int as n from mail_delivery where status='sent'")).rows[0].n).toBe(sentBefore+1);
    expect((await db.query("select r.invoice_id,t.step_index,t.step_state from task t join request r on r.id=t.request_id where t.id=$1",[c.taskId])).rows[0]).toEqual({invoice_id:null,...oldTask});
    if(new URL(page.url()).pathname.startsWith("/review/")) {
      const back=page.getByRole("link",{name:"Back to Today",exact:true});
      if(await back.count()){await back.click();await expect(page).toHaveURL(/\/$/);}else{await expect(page).toHaveURL(/\/$/,{timeout:30_000});}
    }
    await page.goto(`/tasks/${c.taskId}`,{waitUntil:"domcontentloaded"});
    await expect(page.getByText("Add a cost",{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:path.join(env.STORAGE_DIR!,`shots/free-cost-issued-${c.language}-${width}.png`),fullPage:true});
    await page.goto(`/invoices/${invoiceId}`,{waitUntil:"domcontentloaded"});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:path.join(env.STORAGE_DIR!,`shots/free-cost-invoice-${c.language}-${width}.png`),fullPage:true});
  }
  expect(errors).toEqual([]);
  } finally { await db.end();await page.setViewportSize({width:1440,height:900}); }
});
