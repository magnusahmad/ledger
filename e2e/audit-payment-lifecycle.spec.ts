import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { auditEnvironment, resetAuditFixtures } from "./audit-fixtures";
let cases:{width:number;language:string;proposalId:string;invoiceId:string;number:string;bankId:string;payer:string;reference:string}[];
test.beforeAll(({},info)=>{
  const env=resetAuditFixtures(info);
  execFileSync("node_modules/.bin/tsx",["e2e/scripts/seed-payment-lifecycle.ts"],{env,stdio:"pipe",timeout:180_000});
  cases=JSON.parse(readFileSync(path.join(env.STORAGE_DIR!,"payment-lifecycle-cases.json"),"utf8"));
});
test.afterAll(({},info)=>{resetAuditFixtures(info);});
for(const width of [375,768,1280,1440]) test(`actual staff overpayment approval and residual remain usable in EN TC SC at ${width}px`,async({page},info)=>{
  const env=auditEnvironment(info), errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width,height:900});
  for(const c of cases.filter(c=>c.width===width)) {
    await page.goto(`/review/${c.proposalId}`,{waitUntil:"domcontentloaded"});
    await expect(page.getByRole("button",{name:"Record payment",exact:true})).toBeVisible();
    await expect(page.getByText(new RegExp(c.payer))).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:path.join(env.STORAGE_DIR!,`shots/payment-review-${c.language}-${width}.png`),fullPage:true});
    await page.getByRole("button",{name:"Record payment",exact:true}).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/payments",{waitUntil:"domcontentloaded"});
    const row=page.getByRole("row").filter({has:page.getByRole("cell",{name:c.reference,exact:true})});
    await expect(row).toContainText(c.payer);
    await expect(row).toContainText("HK$600 allocated");
    await expect(row).toContainText("HK$123.45 overpayment remains unallocated. Staff review required.");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:path.join(env.STORAGE_DIR!,`shots/payment-outcome-${c.language}-${width}.png`),fullPage:true});
    if(width<=768) {
      const scroll=page.locator(".card.scroll-x");
      await row.getByRole("cell").nth(4).scrollIntoViewIfNeeded();
      await scroll.evaluate(el=>{el.scrollLeft=el.scrollWidth-el.clientWidth;});
      await expect(row.getByRole("cell").nth(4)).toBeInViewport();
      await page.screenshot({path:path.join(env.STORAGE_DIR!,`shots/payment-outcome-scrolled-${c.language}-${width}.png`),fullPage:true});
    }
    execFileSync("node_modules/.bin/tsx",["e2e/scripts/seed-payment-lifecycle.ts","verify",c.proposalId],{env,stdio:"pipe",timeout:60_000});
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(row).toContainText("HK$123.45 overpayment remains unallocated. Staff review required.");
    await expect(row).toHaveCount(1);
    await page.goto(`/invoices/${c.invoiceId}`,{waitUntil:"domcontentloaded"});
    await expect(page.getByRole("row").filter({has:page.getByRole("cell",{name:"Balance due",exact:true})})).toContainText("HK$0");
    await expect(page.getByText("Matched from bank, confirmed by staff",{exact:false})).toHaveCount(1);
    await page.screenshot({path:path.join(env.STORAGE_DIR!,`shots/payment-invoice-${c.language}-${width}.png`),fullPage:true});
  }
  expect(errors).toEqual([]);
  await page.setViewportSize({width:1440,height:900});
});
