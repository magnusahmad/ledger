import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { writeFileSync, mkdirSync } from "node:fs";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { createRequest, startTask, advance, markStepState, getTask } from "@/domain/engine";
import { createPerson, getPersonProtected } from "@/domain/records";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { portalView, portalUpload, portalSubmitField } from "@/domain/portal";
import { cddRecord, screeningResult, request as requestT } from "@/db/schema";
import { FakeScreening } from "@/integrations/screening/fake";
import { LocalOpenSanctions } from "@/integrations/screening/opensanctions-local";
import "@/domain/inbound";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
});

const noExtraction = { fields: [], documents: [], conflicts: [] };

async function appointment(clientId: string, name: string, personOpts: Record<string, string> = {}) {
  const req = await createRequest(ctx, { clientId });
  const p = await createPerson(ctx, { nameEn: name, ...personOpts });
  const t = await startTask(ctx, { requestId: req.id, clientId, playbookId: "hk.appointDirector", personId: p.id, extracted: { effDate: { value: "2026-10-15" } } });
  await markStepState(ctx, t.id, "send", { sent: true });
  return { req, t, p };
}

describe("Upload portal", () => {
  it("shows the client what is still needed for each task in their language, and never on-file protected values", async () => {
    const { req } = await appointment("cli_c1", "WONG Ka Man", { idNumber: "K987654(3)" });
    const v = await portalView(ctx, req.uploadToken);
    expect(v.language).toBe("tc"); // Kowloon Bay Trading messages in Traditional Chinese
    const items = v.tasks[0].items.map((i) => i.label);
    expect(items).toContain("香港身份證或護照副本");
    expect(JSON.stringify(v)).not.toContain("K987654");
    await expect(portalView(ctx, "not-a-token")).rejects.toThrow();
  });

  it("an uploaded ID copy ticks the item for that task's person only", async () => {
    ctx.llm.on("extract", noExtraction);
    const a = await appointment("cli_c1", "WONG Ka Man");
    const req = (await ctx.db.query.request.findFirst({ where: eq(requestT.id, a.req.id) }))!;
    const p2 = await createPerson(ctx, { nameEn: "MA Siu Fung" });
    const t2 = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p2.id });
    await portalUpload(ctx, req.uploadToken, { taskId: a.t.id, key: "idCopy", filename: "hkid.jpg", mime: "image/jpeg", content: Buffer.from("jpg") });
    expect((await getTask(ctx, a.t.id)).checklist.find((e) => e.key === "idCopy")).toMatchObject({ status: "received", documentId: expect.any(String) });
    expect((await getTask(ctx, t2.id)).checklist.find((e) => e.key === "idCopy")?.status).toBe("needed");
  });

  it("uploads can't target a task outside the link's request", async () => {
    const a = await appointment("cli_c1", "WONG Ka Man");
    const other = await appointment("cli_c2", "Someone Else");
    await expect(portalUpload(ctx, a.req.uploadToken, { taskId: other.t.id, key: "idCopy", filename: "x.jpg", mime: "image/jpeg", content: Buffer.from("x") })).rejects.toThrow();
  });

  it("extracted values fill empty fields on the person's record, while a value that differs from the file becomes a conflict", async () => {
    const { req, t, p } = await appointment("cli_c1", "WONG Ka Man", { idNumber: "K987654(3)" });
    ctx.llm.on("extract", { fields: [{ key: "idNo", value: "K111111(1)", quote: "K111111(1)" }, { key: "resAddr", value: "Flat 12B, 88 Robinson Road, Mid-Levels", quote: "88 Robinson Road" }], documents: [], conflicts: [] });
    await portalUpload(ctx, req.uploadToken, { taskId: t.id, key: "idCopy", filename: "hkid.jpg", mime: "image/jpeg", content: Buffer.from("jpg") });
    const prot = await getPersonProtected(ctx, p.id);
    expect(prot.residentialAddress).toBe("Flat 12B, 88 Robinson Road, Mid-Levels");
    expect(prot.idNumber).toBe("K987654(3)");
    expect((await pendingProposals(ctx, { kind: "conflict" })).map((x) => x.payload.key)).toEqual(["idNo"]);
  });

  it("typed details from the portal are saved and tick their items", async () => {
    const { req, t } = await appointment("cli_c1", "WONG Ka Man");
    await portalSubmitField(ctx, req.uploadToken, { taskId: t.id, key: "corrAddr", value: "Unit 1502, Kowloon Bay Centre" });
    expect((await getTask(ctx, t.id)).checklist.find((e) => e.key === "corrAddr")).toMatchObject({ status: "received", value: "Unit 1502, Kowloon Bay Centre" });
  });
});

describe("CDD and screening", () => {
  async function toScreen(name: string, clientId = "cli_c1") {
    const r = await appointment(clientId, name, { idNumber: "K987654(3)", residentialAddress: "x", correspondenceAddress: "y", email: "a@b.example", phone: "+852 1" });
    const { tickItem } = await import("@/domain/step-hooks");
    for (const k of ["idCopy", "addrProof", "selfie"]) await tickItem(ctx, r.t.id, k, null);
    return r;
  }

  it("a clear screening creates the CDD record with a risk-based review date and moves on", async () => {
    const { t, p } = await toScreen("WONG Ka Man");
    const cur = await getTask(ctx, t.id);
    expect(cur._steps[cur.stepIndex].kind).not.toBe("screen");
    const [cdd] = await ctx.db.select().from(cddRecord).where(eq(cddRecord.personId, p.id));
    expect(cdd).toMatchObject({ verifiedOn: "2026-09-29", reviewDueOn: "2028-09-29", riskRating: "medium", sourceTaskId: t.id });
    const [s] = await ctx.db.select().from(screeningResult).where(eq(screeningResult.personId, p.id));
    expect(s).toMatchObject({ status: "clear", datasetVersion: "fake-2026-09-29" });
  });

  it("a strong sanctions hit blocks the task until a compliance decision; clearing it records who decided", async () => {
    ctx.screening = new FakeScreening({ "WONG KA MAN": [{ id: "os-1", caption: "WONG Ka Man", score: 0.97, topics: ["sanction"], datasets: ["us_ofac_sdn"], birthDates: ["1990-01-01"] }] });
    ctx.llm.on("screen", { hits: [{ id: "os-1", verdict: "possible", reason: "Name matches; no date of birth on file to compare" }], overall: "potential" });
    const { t, p } = await toScreen("WONG Ka Man");
    let cur = await getTask(ctx, t.id);
    expect(cur._steps[cur.stepIndex].kind).toBe("screen");
    const [rev] = await pendingProposals(ctx, { kind: "screening_review" });
    expect(rev.summary).toMatch(/us_ofac_sdn/);
    await approveProposal(ctx, rev.id, { edits: { decision: "clear", note: "Different date of birth confirmed from HKID" } });
    cur = await getTask(ctx, t.id);
    expect(cur._steps[cur.stepIndex].kind).not.toBe("screen");
    const [s] = await ctx.db.select().from(screeningResult).where(eq(screeningResult.personId, p.id));
    expect(s).toMatchObject({ status: "cleared_by_staff", reviewedBy: "user_ky" });
  });

  it("escalating a hit keeps the task blocked", async () => {
    ctx.screening = new FakeScreening({ "WONG KA MAN": [{ id: "os-1", caption: "WONG Ka Man", score: 0.99, topics: ["sanction"], datasets: ["un_sc_sanctions"] }] });
    ctx.llm.on("screen", { hits: [{ id: "os-1", verdict: "likely_match", reason: "Exact" }], overall: "match" });
    const { t } = await toScreen("WONG Ka Man");
    const [rev] = await pendingProposals(ctx, { kind: "screening_review" });
    await approveProposal(ctx, rev.id, { edits: { decision: "escalate" } });
    const cur = await getTask(ctx, t.id);
    expect(cur._steps[cur.stepIndex].kind).toBe("screen");
  });

  it("a person with current CDD from another client's engagement isn't asked for KYC again", async () => {
    // CHAN Tai Man (director of Kowloon Bay Trading, CDD 2024-11-02, medium risk) joins Silverstrand's board.
    const req = await createRequest(ctx, { clientId: "cli_c2" });
    const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c2", playbookId: "hk.appointDirector", personId: "per_p1" });
    expect(t.checklist.filter((e) => ["idCopy", "addrProof", "selfie", "idNo", "resAddr"].includes(e.key)).every((e) => e.status === "on_file")).toBe(true);
  });
});

describe("Local OpenSanctions matcher", () => {
  it("matches names regardless of order and case, scores exact names highest, and uses birth dates to lower scores", async () => {
    mkdirSync("storage/test", { recursive: true });
    const csv = [
      "id,schema,name,aliases,birth_date,countries,addresses,identifiers,sanctions,phones,emails,program_ids,dataset,first_seen,last_seen,last_change",
      'os-1,Person,WONG Ka Man,"Ka Man Wong;黃嘉敏",1961-02-03,cn,,,,,,,"OFAC SDN",2020-01-01,2026-09-01,2026-09-01',
      'os-2,Person,CHAN Tai,,,hk,,,,,,,EU FSF,2020-01-01,2026-09-01,2026-09-01',
      'os-3,Company,Wong Ka Man Trading Ltd,,,,,,,,,,UK HMT,2020-01-01,2026-09-01,2026-09-01',
    ].join("\n");
    writeFileSync("storage/test/targets.simple.csv", csv);
    const m = new LocalOpenSanctions("storage/test/targets.simple.csv");
    const hits = await m.match({ name: "Wong Ka Man", birthDate: "1990-05-05" });
    expect(hits[0]).toMatchObject({ id: "os-1", datasets: ["OFAC SDN"] });
    expect(hits[0].score).toBeLessThan(1);
    expect((await m.match({ name: "黃嘉敏" }))[0]?.id).toBe("os-1");
    expect(await m.match({ name: "Lee Siu Ling" })).toEqual([]);
    expect((await m.match({ name: "Wong Ka Man" })).map((h) => h.id)).not.toContain("os-3");
  });
});
