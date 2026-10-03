import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { auditEnvironment, resetAuditFixtures } from "./audit-fixtures";
let cases: { language: "en" | "tc" | "sc"; proposalId: string; invoiceId: string; invoiceNumber: string; taskId: string; originalInvoiceId: string; body: string }[];
const wording = { en: "additional or replacement work. Please review the separate quote", tc: "新增或替代事項，請查閱下列獨立報價", sc: "新增或替代事项，请查阅下列独立报价" };
test.beforeAll(({},info)=>{
 const env=resetAuditFixtures(info);
 execFileSync("node_modules/.bin/tsx",["e2e/scripts/seed-lifecycle-billing.ts"],{env,stdio:"pipe",timeout:120_000});
 cases=JSON.parse(readFileSync(path.join(env.STORAGE_DIR!,"lifecycle-billing-cases.json"),"utf8"));
});
test.afterAll(({},info)=>{resetAuditFixtures(info);});
for(const width of [375,768,1280,1440]) test(`replacement service quote and invoice preserve correct EN TC SC context at ${width}px`,async({page},info)=>{
 const env=auditEnvironment(info);const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await page.setViewportSize({width,height:900});
 for(const c of cases){
  await page.goto(`/review/${c.proposalId}`,{waitUntil:"domcontentloaded"});
  await expect(page.getByRole("textbox",{name:"Message",exact:true})).toContainText(c.body);
  const body=await page.getByRole("textbox",{name:"Message",exact:true}).inputValue();
  expect(body).toContain(wording[c.language]);expect(body).toContain(c.invoiceNumber);
  expect(body).not.toMatch(/meeting with us|抽空與我們會面|抽空与我们会面/);
  await expect(page.getByRole("button",{name:/Approve and send with invoice/})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({path:path.join(env.STORAGE_DIR!,`shots/lifecycle-review-${c.language}-${width}.png`),fullPage:true});
  await page.goto(`/invoices/${c.invoiceId}`,{waitUntil:"domcontentloaded"});
  await expect(page.getByText(c.invoiceNumber,{exact:true}).first()).toBeVisible();
  await expect(page.getByText("HK$705",{exact:true}).first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  const pdf=await page.request.get(`/api/invoices/${c.invoiceId}/pdf`);expect(pdf.status()).toBe(200);expect((await pdf.body()).subarray(0,4).toString()).toBe("%PDF");
  await page.screenshot({path:path.join(env.STORAGE_DIR!,`shots/lifecycle-invoice-${c.language}-${width}.png`),fullPage:true});
 }
 expect(errors).toEqual([]);await page.setViewportSize({width:1440,height:900});
});
