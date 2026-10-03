import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { mkdirSync, writeFileSync } from "node:fs";
import { resetAuditFixtures } from "./audit-fixtures";
let db: Pool;
let shots: string;
let storage: string;
test.beforeAll(async ({}, info)=>{
 const env=resetAuditFixtures(info);
 db=new Pool({connectionString:env.DATABASE_URL});
 storage=env.STORAGE_DIR!; shots=`${storage}/shots`;
 mkdirSync(shots,{recursive:true});
});
test.afterAll(async({},info)=>{ await db?.end(); resetAuditFixtures(info); });
test("billing operations, invoice PDF filenames and Chinese screens work at the four required widths",async({page})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 const samples=["發票-'雪人☃\"", "简体中文-账单-2026"];
 for(let i=0;i<samples.length;i++){
  await db.query("INSERT INTO invoice(id,firm_id,client_id,number,status,total_cents) VALUES($1,'firm_crcs','cli_c1',$2,'draft',1000)",["inv_audit_pdf_"+i,samples[i]]);
  await db.query("INSERT INTO invoice_line(id,firm_id,invoice_id,description,amount_cents,kind) VALUES($1,'firm_crcs',$2,'審閱費用 / Review',1000,'fee')",["inl_audit_pdf_"+i,"inv_audit_pdf_"+i]);
  const response=await page.request.get(`/api/invoices/inv_audit_pdf_${i}/pdf`);expect.soft(response.status(),samples[i]).toBe(200);expect.soft(response.headers()["content-disposition"]).toContain("filename*=UTF-8''");
 }
 for(const width of [375,768,1280,1440]){
  await page.setViewportSize({width,height:900});
  for(const path of ["/invoices?s=all","/invoices/inv_seed_2025_0063","/payments","/batch","/playbooks","/reports","/settings","/clients/cli_c1?tab=billing"]){
   const response=await page.goto(path);expect.soft(response?.status(),path).toBe(200);expect.soft(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),`${path} at ${width}`).toBeLessThanOrEqual(1);await page.screenshot({path:`${shots}/${width}-${path.replace(/\W/g,"_")}.png`,fullPage:true,caret:"initial"});
  }
 }
 await page.setViewportSize({width:1440,height:900});expect(errors).toEqual([]);
});
test("invoice detail cannot display another firm's submitted invoice ID",async({page})=>{
 await db.query("INSERT INTO firm(id,legal_name,invoice_prefix) VALUES('firm_audit_other','Other Audit','OT-') ON CONFLICT DO NOTHING");
 await db.query("INSERT INTO client(id,firm_id,name_en) VALUES('cli_audit_other','firm_audit_other','PRIVATE OTHER FIRM') ON CONFLICT DO NOTHING");
 await db.query("INSERT INTO invoice(id,firm_id,client_id,number,status,total_cents) VALUES('inv_audit_other','firm_audit_other','cli_audit_other','PRIVATE-OTHER-001','draft',1000) ON CONFLICT DO NOTHING");
 await db.query("INSERT INTO conversation(id,firm_id,client_id,channel,subject,counterparty_email) VALUES('cnv_audit_other','firm_audit_other','cli_audit_other','email','PRIVATE OTHER CONVERSATION','private@other.example') ON CONFLICT DO NOTHING");
 await db.query("INSERT INTO task(id,firm_id,client_id,title,playbook_id,playbook_version) VALUES('tsk_audit_other','firm_audit_other','cli_audit_other','PRIVATE OTHER TASK','hk.changeOffice',2) ON CONFLICT DO NOTHING");
 await db.query("INSERT INTO proposal(id,firm_id,kind,title,client_id) VALUES('prp_audit_other','firm_audit_other','triage','PRIVATE OTHER PROPOSAL','cli_audit_other') ON CONFLICT DO NOTHING");
 mkdirSync(storage,{recursive:true});writeFileSync(`${storage}/other-firm.txt`,'PRIVATE OTHER DOCUMENT');
 await db.query("INSERT INTO document(id,firm_id,client_id,kind,title,storage_key,mime,source) VALUES('doc_audit_other','firm_audit_other','cli_audit_other','letter','PRIVATE OTHER DOCUMENT','other-firm.txt','text/plain','seed') ON CONFLICT DO NOTHING");
 for(const path of ['/clients/cli_audit_other','/tasks/tsk_audit_other','/review/prp_audit_other','/invoices/inv_audit_other','/inbox/cnv_audit_other']){
  // Independent HTTP boundary checks remain exact even if a previous streamed
  // Next 404 aborts its document navigation while React changes the route.
  const response=await page.request.get(path);expect.soft(response.status(),path).toBe(404);expect.soft(await response.text(),path).not.toContain('PRIVATE OTHER FIRM');
  await page.goto(path,{waitUntil:'domcontentloaded'}).catch(async error=>{if(!String(error).includes('ERR_ABORTED'))throw error;await page.waitForLoadState('domcontentloaded');});
  await expect(page.getByText('This page could not be found.')).toBeVisible();expect.soft(await page.getByText('PRIVATE OTHER FIRM').count(),path).toBe(0);
 }
 const doc=await page.request.get('/api/docs/doc_audit_other');expect.soft(doc.status(),'foreign staff document').toBe(404);
});
test("playbook editor handles invalid JSON, bilingual save and stale tabs",async({page,context})=>{
 await page.goto('/playbooks');const row=page.locator('li.item').filter({has:page.locator('[id="definition-hk.changeOffice"]')});await row.locator('details.pb-row > summary').click();const editor=row.locator('details.pb-edit');await editor.locator('summary').click();const input=editor.locator('textarea');const pb=JSON.parse(await input.inputValue());await input.fill('{broken');await editor.getByRole('button',{name:'Save new version'}).click();await expect(editor.getByRole('alert')).toContainText('Invalid JSON');
 const stale=await context.newPage();await stale.goto('/playbooks');const second=stale.locator('li.item').filter({has:stale.locator('[id="definition-hk.changeOffice"]')});await second.locator('details.pb-row > summary').click();await second.locator('details.pb-edit > summary').click();
 pb.name.tc='更改註冊地址（已審閱）';pb.name.sc='更改注册地址（已审阅）';await input.fill(JSON.stringify(pb,null,2));await editor.getByRole('button',{name:'Save new version'}).click();await expect(editor.getByRole('status')).toContainText(`Saved version ${pb.version+1}`);
 await second.getByRole('button',{name:'Save new version'}).click();await expect(second.getByRole('alert')).toContainText('changed');await stale.close();
 for(const width of [375,768,1280,1440]){await page.setViewportSize({width,height:900});await editor.scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(editor.locator('label')).toContainText('更改註冊地址');await page.screenshot({path:`${shots}/editor-${width}.png`,caret:'initial'});}await page.setViewportSize({width:1440,height:900});
});

test("B-25 staff negative invoice price input is rejected rather than becoming a positive fee",async({page})=>{
 await page.goto('/batch');await page.getByLabel('Director',{exact:true}).selectOption('per_p1');await page.getByLabel('Effective date',{exact:true}).fill('2026-10-02');
 const form=page.locator('form').filter({has:page.getByRole('button',{name:'Prepare resignation requests'})});await form.locator('input[name="clientId"][value="cli_c1"]').check();await form.getByRole('button',{name:'Prepare resignation requests'}).click();await expect(form.getByText(/Prepared 1 resignation task/)).toBeVisible();
 const result=await db.query("SELECT p.id,i.id as invoice_id,i.total_cents FROM proposal p JOIN request r ON r.id=p.request_id JOIN invoice i ON i.id=r.invoice_id WHERE p.kind='send_message' AND p.payload->>'batch'='true' ORDER BY p.created_at DESC LIMIT 1");expect(result.rows).toHaveLength(1);const inv=result.rows[0];
 await page.goto(`/review/${inv.id}`);await page.getByRole('button',{name:'Edit Amount (HK$)',exact:true}).first().click();const amount=page.getByRole('textbox',{name:'Amount (HK$)',exact:true});await amount.fill('-12');await amount.locator('..').getByRole('button',{name:'Save',exact:true}).click();await page.waitForTimeout(500);
 const after=await db.query('SELECT total_cents FROM invoice WHERE id=$1',[inv.invoice_id]);expect.soft(after.rows[0].total_cents).toBe(inv.total_cents);
 // Keep the positive operational path independent of malformed-price assertion.
 await db.query("UPDATE invoice SET status='sent',issued_on='2026-10-02',due_on='2026-10-02' WHERE id=$1",[inv.invoice_id]);await page.goto(`/invoices/${inv.invoice_id}`);page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Record payment',exact:true}).click();await expect.poll(async()=> (await db.query('SELECT status FROM invoice WHERE id=$1',[inv.invoice_id])).rows[0].status).toBe('paid');
});
