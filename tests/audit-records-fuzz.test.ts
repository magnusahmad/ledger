import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { createRequest, startTask, advance, markStepState, getTask } from "@/domain/engine";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { portalSubmit, portalSubmitField, portalView, portalUpload } from "@/domain/portal";
import { openSigning, requestOtp, verifyOtp, signDocuments } from "@/domain/signing";
import { allot, issuedAsAt } from "@/domain/shares";
import { applyRegisterChanges } from "@/domain/register-effects";
import { task, signEnvelope, shareMovement, businessRegistration, significantController } from "@/db/schema";
import { createPerson, ceaseAppointment, officersAsAt } from "@/domain/records";
import "@/domain/inbound";

let ctx: TestCtx;
vi.mock("@/server/ctx", () => ({ getCtx: () => ctx }));
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); });

async function office() {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.changeOffice", extracted: { newAddr: { value: "New audit office" }, effDate: { value: "2026-09-29" } } });
  await markStepState(ctx, t.id, "send", { sent: true });
  await advance(ctx, t.id);
  await approveProposal(ctx, (await pendingProposals(ctx, { taskId: t.id, kind: "send_signing" }))[0].id);
  const token = ctx.mail.sent().at(-1)!.text.match(/\/sign\/([A-Za-z0-9]+)/)![1];
  await requestOtp(ctx, token);
  await verifyOtp(ctx, token, ctx.mail.sent().at(-1)!.text.match(/\b(\d{6})\b/)![1]);
  return { t, req, token };
}
async function appointment() {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const person = await createPerson(ctx, { nameEn: "Audit Person" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: person.id });
  await markStepState(ctx, t.id, "send", { sent: true });
  return { req, t };
}

describe("Public signing and portal corruption guards", () => {
  it("R-01 malformed PNG signatures leave the signer unsigned and able to retry", async () => {
    const { token } = await office();
    await expect(signDocuments(ctx, token, { kind: "drawn", data: "data:image/png;base64,bm90IGEgcG5n", ip: "127.0.0.1", userAgent: "audit" })).rejects.toThrow();
    expect((await ctx.db.query.signer.findFirst())?.signedAt).toBeNull();
    await signDocuments(ctx, token, { kind: "typed", data: "CHAN Tai Man", ip: "", userAgent: "audit" });
    expect((await ctx.db.query.signEnvelope.findFirst())?.status).toBe("completed");
  });
  it("R-02 a temporary signed PDF storage failure leaves signing retryable without a false success", async () => {
    const { token } = await office();
    const put = ctx.storage.put.bind(ctx.storage);
    ctx.storage.put = async () => { throw new Error("Simulated disk full"); };
    await expect(signDocuments(ctx, token, { kind: "typed", data: "CHAN Tai Man", ip: "", userAgent: "audit" })).rejects.toThrow(/disk full/);
    ctx.storage.put = put;
    expect((await ctx.db.query.signer.findFirst())?.signedAt).toBeNull();
    await signDocuments(ctx, token, { kind: "typed", data: "CHAN Tai Man", ip: "", userAgent: "audit" });
    expect((await ctx.db.query.signEnvelope.findFirst())?.status).toBe("completed");
  });
  it("R-03 withdrawing a signing envelope revokes its PDF download links", async () => {
    const { token } = await office();
    const view = await openSigning(ctx, token);
    await ctx.db.update(signEnvelope).set({ status: "voided" });
    await expect(openSigning(ctx, token)).rejects.toThrow(/withdrawn/);
    const { GET } = await import("@/app/api/sign/[token]/doc/[docId]/route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ token, docId: view.documents[0].id }) });
    expect(response.status).toBe(404);
  });
  it("R-04 text cannot satisfy an ID document requirement without an uploaded document", async () => {
    const { req, t } = await appointment();
    await expect(portalSubmitField(ctx, req.uploadToken, { taskId: t.id, key: "idCopy", value: "I have a passport" })).rejects.toThrow();
    expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "idCopy")?.status).toBe("needed");
  });
  it("R-05 an oversized multipart submission is rejected before saving earlier valid fields", async () => {
    const { req, t } = await appointment();
    const before = (await getTask(ctx, t.id)).checklist;
    await expect(portalSubmit(ctx, req.uploadToken, { fields: [{ taskId: t.id, key: "corrAddr", value: "Audit address" }], files: [{ taskId: t.id, key: "idCopy", filename: "large.pdf", mime: "application/pdf", content: Buffer.alloc(15 * 1024 * 1024 + 1) }] })).rejects.toThrow(/15 MB/);
    expect((await getTask(ctx, t.id)).checklist).toEqual(before);
  });
  it("unknown tokens and fields never mutate a task (fixed multilingual corpus v2026-10-02)", async () => {
    const { req, t } = await appointment();
    const before = (await getTask(ctx, t.id)).checklist;
    const tokens = ["", " ", "../", "\u0000", "繁體简体", "𝌆", "<script>", "x".repeat(4096), req.uploadToken + "x"];
    for (const token of tokens) await expect(portalView(ctx, token)).rejects.toThrow();
    for (const key of ["", "__proto__", "constructor", "idCopy.extra", "effDate\u0000", "姓名", "x".repeat(4096)]) await expect(portalSubmitField(ctx, req.uploadToken, { taskId: t.id, key, value: "fuzz" })).rejects.toThrow();
    for (const value of ["", " ", "\n\t", "\u3000"]) await expect(portalSubmitField(ctx, req.uploadToken, { taskId: t.id, key: "corrAddr", value })).rejects.toThrow();
    expect((await getTask(ctx, t.id)).checklist).toEqual(before);
  });
});

describe("Register writes and dated capital", () => {
  it("R-06 approval of a multi-transfer instruction is atomic when the second transfer exceeds the remaining holding", async () => {
    const item = { kind: "transfer", fromPersonId: "per_p2", fromName: "LEE Siu Ling", toPersonId: "per_p1", toName: "CHAN Tai Man", toNameZh: null, className: "Ordinary", quantity: 2000, pricePerShareCents: null, considerationCents: 200000 };
    const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.transferShares", extracted: { transferDetails: { value: "Two transfers of 2,000 shares from Lee to Chan" }, effDate: { value: "2026-09-29" }, shareValuation: { value: "Audit valuation" } }, params: { structured: { items: [item, item] } } });
    const full = await getTask(ctx, t.id);
    const idx = full._steps!.findIndex(s => s.kind === "register");
    await ctx.db.update(task).set({ checklist: full.checklist.map(e => ({ ...e, status: "received", value: e.value ?? "Verified" })), stepIndex: idx - 1, stepState: { [idx - 1]: { filed: true } } }).where(eq(task.id, t.id));
    await advance(ctx, t.id);
    const p = (await pendingProposals(ctx, { taskId: t.id, kind: "register_change" }))[0];
    expect(p).toBeDefined();
    const before = await ctx.db.select().from(shareMovement);
    await expect(approveProposal(ctx, p.id)).rejects.toThrow(/exceeds/);
    expect(await ctx.db.select().from(shareMovement)).toEqual(before);
  });
  it("R-07 BR renewal preserves the expiry anniversary across a leap year", async () => {
    await ctx.db.update(businessRegistration).set({ expiresOn: "2027-10-27" }).where(eq(businessRegistration.clientId, "cli_c1"));
    const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.brRenewal", extracted: { brTerm: { value: "1 year" } } });
    await applyRegisterChanges(ctx, t.id);
    expect((await ctx.db.query.businessRegistration.findFirst({ where: eq(businessRegistration.clientId, "cli_c1") }))?.expiresOn).toBe("2028-10-27");
  });
  it("R-08 an allotment cannot make paid-up share capital negative", async () => {
    const cls = await ctx.db.query.shareClass.findFirst({ where: (x, { eq }) => eq(x.clientId, "cli_c1") });
    const before = await issuedAsAt(ctx, "cli_c1", "2026-09-29");
    await expect(allot(ctx, { clientId: "cli_c1", shareClassId: cls!.id, toPersonId: "per_p1", date: "2026-09-29", quantity: 1, amountPaidCents: -2000000 })).rejects.toThrow();
    expect(await issuedAsAt(ctx, "cli_c1", "2026-09-29")).toEqual(before);
  });
  it("R-09 invalid numeric allotment quantities are rejected with no capital mutation (fixed boundary corpus)", async () => {
    const cls = await ctx.db.query.shareClass.findFirst({ where: (x, { eq }) => eq(x.clientId, "cli_c1") });
    const before = await ctx.db.select().from(shareMovement);
    for (const quantity of [0, -1, -2147483648, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) await expect(Promise.resolve().then(() => allot(ctx, { clientId: "cli_c1", shareClassId: cls!.id, toPersonId: "per_p1", date: "2026-09-29", quantity }))).rejects.toThrow();
    expect(await ctx.db.select().from(shareMovement)).toEqual(before);
  });
});

it("R-10 unstructured non-share controller instructions block rather than silently succeeding", async () => {
  const person = await createPerson(ctx, { nameEn: "Audit Control Holder", correspondenceAddress: "Audit address" });
  const t = await startTask(ctx, { clientId: "cli_c1", personId: person.id, playbookId: "hk.updateControllers", extracted: { effDate: { value: "2026-09-29" }, controllerDetails: { value: "Audit Control Holder became a controller with the right to appoint and remove a majority of the board on 29 September 2026. Particulars confirmed. No shares held." } } });
  const before = await ctx.db.select().from(significantController);
  await expect(applyRegisterChanges(ctx, t.id)).rejects.toThrow(/controller|structure|manual|confirm/i);
  expect(await ctx.db.select().from(significantController)).toEqual(before);
});

it("R-11 a missing email on the second signer rejects the pack before any link is sent", async () => {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const person = await createPerson(ctx, { nameEn: "Audit No Email", idNumber: "K987654(3)", residentialAddress: "Audit home", correspondenceAddress: "Audit office", phone: "+852 9000 0000" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", personId: person.id, playbookId: "hk.appointDirector", extracted: { effDate: { value: "2026-09-29" } } });
  await markStepState(ctx, t.id, "send", { sent: true });
  ctx.llm.on("extract", { fields: [], documents: [], conflicts: [] });
  const pdf = await PDFDocument.create(); pdf.addPage();
  const bytes = Buffer.from(await pdf.save());
  for (const key of ["idCopy", "addrProof"]) await portalUpload(ctx, req.uploadToken, { taskId: t.id, key, filename: `${key}.pdf`, mime: "application/pdf", content: bytes });
  await portalUpload(ctx, req.uploadToken, { taskId: t.id, key: "selfie", filename: "selfie.png", mime: "image/png", content: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64") });
  const p = (await pendingProposals(ctx, { taskId: t.id, kind: "send_signing" }))[0];
  expect(p).toBeDefined();
  const before = ctx.mail.sent();
  await expect(approveProposal(ctx, p.id)).rejects.toThrow(/email address/);
  expect(ctx.mail.sent()).toEqual(before);
  expect(await ctx.db.query.signer.findMany()).toHaveLength(0);
});

async function registerGate(t0: { id: string }) {
  const t = await getTask(ctx, t0.id);
  const idx = t._steps!.findIndex(s => s.kind === "register");
  await ctx.db.update(task).set({ checklist: t.checklist.map(e => ({ ...e, status: "received", value: e.value ?? "Verified by staff" })), stepIndex: idx - 1, stepState: { [idx - 1]: { filed: true, signed: true, generated: true } } }).where(eq(task.id, t.id));
  await advance(ctx, t.id);
  const p = (await pendingProposals(ctx, { taskId: t.id, kind: "register_change" }))[0];
  expect(p).toBeDefined();
  return p;
}
it("R-12 reserve-director nomination is blocked for a company with multiple members and directors", async () => {
  const person = await createPerson(ctx, { nameEn: "Adult Reserve Nominee", dateOfBirth: "1990-01-01" });
  const t = await startTask(ctx, { clientId: "cli_c1", personId: person.id, playbookId: "hk.reserveDirector", extracted: { effDate: { value: "2026-09-29" }, reserveNominee: { value: "Adult Reserve Nominee, adult individual" } } });
  const before = await officersAsAt(ctx, "cli_c1", "2026-09-29");
  const p = await registerGate(t);
  await expect(approveProposal(ctx, p.id)).rejects.toThrow(/sole|one member|reserve/i);
  expect(await officersAsAt(ctx, "cli_c1", "2026-09-29")).toEqual(before);
});
it("R-13 director resignation cannot remove the company's last individual director without a replacement", async () => {
  const officers = await officersAsAt(ctx, "cli_c1", "2026-09-29", "director");
  for (const a of officers.filter(a => a.personId !== "per_p1")) await ceaseAppointment(ctx, a.id, "2026-09-28");
  const t = await startTask(ctx, { clientId: "cli_c1", personId: "per_p1", playbookId: "hk.resignDirector", extracted: { lastDay: { value: "2026-09-29" }, resignLetter: { value: "Signed resignation" }, replacement: { value: "No replacement" } } });
  const p = await registerGate(t);
  await expect(approveProposal(ctx, p.id)).rejects.toThrow(/individual director|last director|replacement/i);
  expect((await officersAsAt(ctx, "cli_c1", "2026-09-29", "director")).map(a => a.personId)).toEqual(["per_p1"]);
});

it("R-12 a sole individual member who is the sole director may nominate a reserve director", async () => {
  const owners = await ctx.db.query.shareMovement.findMany({where:(x,{eq})=>eq(x.clientId,"cli_c1")});
  await ctx.db.delete(shareMovement).where(eq(shareMovement.clientId,"cli_c1"));
  await allot(ctx,{clientId:"cli_c1",shareClassId:owners[0].shareClassId,toPersonId:"per_p1",quantity:10000,date:"2026-09-01",amountPaidCents:1000000});
  for(const a of (await officersAsAt(ctx,"cli_c1","2026-09-29","director")).filter(a=>a.personId!=="per_p1")) await ceaseAppointment(ctx,a.id,"2026-09-28");
  const person=await createPerson(ctx,{nameEn:"Eligible Reserve Nominee",dateOfBirth:"1990-01-01"});
  const t=await startTask(ctx,{clientId:"cli_c1",personId:person.id,playbookId:"hk.reserveDirector",extracted:{effDate:{value:"2026-09-29"},reserveNominee:{value:"Confirmed eligible nominee"}}});
  await approveProposal(ctx,(await registerGate(t)).id);
  expect((await officersAsAt(ctx,"cli_c1","2026-09-29","reserve_director")).map(a=>a.personId)).toContain(person.id);
});

it("R-13 a resignation may proceed when an individual director remains", async () => {
  const { appoint } = await import("@/domain/records");
  await appoint(ctx, {clientId:"cli_c1",personId:"per_p2",role:"director",fromDate:"2026-09-01"});
  const t=await startTask(ctx,{clientId:"cli_c1",personId:"per_p1",playbookId:"hk.resignDirector",extracted:{lastDay:{value:"2026-09-29"},resignLetter:{value:"Signed resignation"}}});
  await approveProposal(ctx,(await registerGate(t)).id);
  expect((await officersAsAt(ctx,"cli_c1","2026-09-29","director")).map(a=>a.personId)).toEqual(["per_p2"]);
});

it("R-10 an explicit non-share controller plan is previewed and writes only after staff approval", async () => {
  const p=await createPerson(ctx,{nameEn:"Explicit Non-share Controller",correspondenceAddress:"Confirmed address"});
  ctx.llm.on("structure_controllers",{items:[{kind:"add",personId:p.id,nature:"Right to appoint and remove a majority of the board",registrableFrom:"2026-09-29"}]});
  const t=await startTask(ctx,{clientId:"cli_c1",personId:p.id,playbookId:"hk.updateControllers",extracted:{effDate:{value:"2026-09-29"},controllerDetails:{value:"Explicit Non-share Controller has the confirmed right to appoint and remove a majority of the board from 29 September 2026"}}});
  const proposal=await registerGate(t);
  expect(await ctx.db.select().from(significantController).where(eq(significantController.personId,p.id))).toHaveLength(0);
  expect(proposal.payload.preview).toEqual([expect.stringContaining("Right to appoint and remove a majority of the board")]);
  await approveProposal(ctx,proposal.id);
  expect(await ctx.db.select().from(significantController).where(eq(significantController.personId,p.id))).toEqual([expect.objectContaining({nature:"Right to appoint and remove a majority of the board",registrableFrom:"2026-09-29",sourceTaskId:t.id})]);
});

it("public signing and upload tokens reject foreign firms, other requests and documents from another envelope", async () => {
  const a = await office();
  const b = await office();
  const foreign = { ...ctx, firmId: "firm_fictional_other" };
  await expect(portalView(foreign, a.req.uploadToken)).rejects.toThrow(/valid/i);
  await expect(openSigning(foreign, a.token)).rejects.toThrow(/valid/i);
  const before = (await getTask(ctx, b.t.id)).checklist;
  await expect(portalSubmitField(ctx, a.req.uploadToken, { taskId: b.t.id, key: "newAddr", value: "Must not cross request scope" })).rejects.toThrow(/part of this request/i);
  expect((await getTask(ctx, b.t.id)).checklist).toEqual(before);
  const docsA = (await openSigning(ctx, a.token)).documents;
  const docsB = (await openSigning(ctx, b.token)).documents;
  expect(docsA.length).toBeGreaterThan(0);
  expect(docsB.length).toBeGreaterThan(0);
  const { GET } = await import("@/app/api/sign/[token]/doc/[docId]/route");
  expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ token: a.token, docId: docsB[0].id }) })).status).toBe(404);
  expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ token: a.token, docId: docsA[0].id }) })).status).toBe(200);
});
