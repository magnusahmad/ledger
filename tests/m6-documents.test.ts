import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import {
  fillForm, readFormValues, listFieldNames, splitAddress, partialId, hkidParts, nameParts,
  mapND2A, mapNR1, mapNNC2, mapND2B, mapND4, mapNDR1, mapNSC1, mapNAR1, mapNNC1, type Presentor,
} from "@/documents/cr-forms";
import { createRequest, startTask, advance, markStepState, getTask } from "@/domain/engine";
import { createPerson, officersAsAt } from "@/domain/records";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { runJobs } from "@/domain/jobs";
import { checkForms } from "@/documents/forms-check";
import { document, filing } from "@/db/schema";
import "@/domain/inbound";
import { goodDraft } from "./agent-fixtures";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
});

const pres: Presentor = { name: "Caine Road Corporate Services Limited", address: "18/F, 88 Caine Road", tel: "30000000", email: "desk@caineroad.example", reference: "tsk_1" };
const signer = { name: "Karen Yip", capacity: "secretary" as const };

describe("Official Companies Registry forms", () => {
  it("every field each mapping writes exists in the current official PDF (a Registry revision fails this test)", async () => {
    const samples: [string, Record<string, unknown>][] = [
      ["ND2A", mapND2A({ brNumber: "70123456", companyName: "X", presentor: pres, signer, signDate: "2026-10-01",
        appointment: { capacity: "director", nameEn: "WONG Ka Man", nameZh: "黃嘉敏", correspondenceAddress: "Unit 1, 1 Road", email: "a@b", idNumber: "K987654(3)", residentialAddress: "Flat 1, 2 Road", date: "2026-10-15" },
        cessation: { capacity: "director", nameEn: "CHAN Tai Man", idNumber: "Y123456(7)", date: "2026-10-15", reason: "resignation" },
        corporateSecretary: { nameEn: "F", address: "A", email: "e", date: "2026-10-15", signatory: "K" } })],
      ["NR1", mapNR1({ brNumber: "1", companyName: "X", newAddress: "Room 801, 1 Hennessy Road, Wan Chai", effectiveDate: "2026-11-01", presentor: pres, signer, signDate: "2026-10-01" })],
      ["NNC2", mapNNC2({ brNumber: "1", existingEn: "A Limited", existingZh: "甲有限公司", resolutionDate: "2026-10-01", newEn: "B Limited", newZh: "乙有限公司", presentor: pres, signer, signDate: "2026-10-01" })],
      ["ND2B", mapND2B({ brNumber: "1", companyName: "X", presentor: pres, signer, signDate: "2026-10-01", officer: { capacity: "director", nameEn: "CHAN Tai Man", idNumber: "Y123456(7)" }, effectiveDate: "2026-10-01", changes: { nameZh: "陳大文", nameEn: "CHAN Tai Man", correspondenceAddress: "A, B", email: "x@y", idNumber: "Y1234567", residentialAddress: "Z" } })],
      ["ND4", mapND4({ brNumber: "1", companyName: "X", officer: { capacity: "director", nameEn: "CHAN Tai Man", idNumber: "Y123456(7)" }, date: "2026-10-01", presentor: pres })],
      ["NDR1", mapNDR1({ brNumber: "1", companyName: "X", applicant: "company", presentor: pres })],
      ["NSC1", mapNSC1({ brNumber: "1", companyName: "X", from: "2026-10-01", to: "2026-10-01", currency: "HKD", increase: 1000, cashRows: [{ className: "Ordinary", currency: "HKD", number: 1000, paidEach: 1, unpaidEach: 0 }], capital: [{ className: "Ordinary", currency: "HKD", totalNumber: 11000, totalAmount: 11000, paidUp: 11000 }], allottees: [{ className: "Ordinary", nameEn: "LEE Siu Ling", address: "1 Road", shares: 1000 }, { className: "Ordinary", nameEn: "Brightwater Ventures Limited", corporate: true, address: "BVI", shares: 1 }], presentor: pres, signer, signDate: "2026-10-01" })],
      ["NAR1", mapNAR1({ brNumber: "1", companyName: "X", type: "private", madeUpTo: "2026-10-28", registeredOffice: "Unit 1502, 15/F, Kowloon Bay Centre, Kowloon Bay", email: "e", phone: "+852 3000 0000", charges: "0", capital: [{ className: "Ordinary", currency: "HKD", totalNumber: 10000, totalAmount: 10000, paidUp: 10000 }], secretary: { corporate: true, nameEn: "F", address: "A", email: "e" }, directors: [{ capacity: "director", nameEn: "CHAN Tai Man", idNumber: "Y123456(7)", correspondenceAddress: "A" }], members: [{ className: "Ordinary", totalInClass: 10000, rows: [{ nameEn: "CHAN Tai Man", address: "A", shares: 7000 }, { nameEn: "LEE Siu Ling", address: "A", shares: 3000 }] }], presentor: pres, signer, signDate: "2026-10-01" })],
      ["NNC1", mapNNC1({ nameEn: "Nimbus Ledger Limited", nameZh: "雲帳有限公司", type: "private", natureDescription: "Fintech", registeredOffice: "18/F, 88 Caine Road", email: "e", phone: "+852 1", capital: [{ className: "Ordinary", number: 10000, currency: "HKD", subscribed: 10000, paidUp: 10000 }], presentor: pres })],
    ];
    for (const [form, values] of samples) {
      const names = await listFieldNames(form);
      const missing = Object.keys(values).filter((k) => !names.has(k));
      expect(missing, form).toEqual([]);
      await expect(fillForm(form, values as never)).resolves.toBeInstanceOf(Buffer);
    }
  });

  it("an ND2A for an appointment carries the appointee's name, correspondence address and effective date; the public page shows only the partial ID and PI-ND2A the full one", async () => {
    const v = mapND2A({ brNumber: "70123456", companyName: "Kowloon Bay Trading Limited", presentor: pres, signer, signDate: "2026-10-01",
      appointment: { capacity: "director", nameEn: "WONG Ka Man", nameZh: "黃嘉敏", correspondenceAddress: "Unit 1502, 15/F, Kowloon Bay Centre, 51 Wang Chiu Road, Kowloon Bay, Hong Kong", email: "kaman@example.com", idNumber: "K987654(3)", residentialAddress: "Flat 12B, 88 Robinson Road, Mid-Levels, Hong Kong", date: "2026-10-15" } });
    const pdf = await fillForm("ND2A", v);
    const got = await readFormValues(pdf);
    expect(got).toMatchObject({
      "fill_2_P.1": "Kowloon Bay Trading Limited", "cb_2_P.2": true, "fill_3_P.2": "黃嘉敏", "fill_4_P.2": "WONG", "fill_5_P.2": "Ka Man",
      "fill_10_P.2": "Unit 1502, 15/F", "fill_11_P.2": "Kowloon Bay Centre", "fill_12_P.2": "51 Wang Chiu Road", "fill_13_P.2": "Kowloon Bay", "fill_14_P.2": "Hong Kong",
      "fill_16_P.2": "K987", "fill_21_P.2": "15", "fill_22_P.2": "10", "fill_23_P.2": "2026",
      "fill_5_P.7": "K987654", "fill_6_P.7": "3", "fill_9_P.7": "Flat 12B", "fill_11_P.7": "88 Robinson Road",
    });
    expect(Object.entries(got).filter(([k]) => /_P\.[1-3]$/.test(k)).map(([, x]) => x)).not.toContain("K987654");
  });

  it("address, name and ID helpers follow the Registry's conventions", () => {
    expect(splitAddress("Room 801, 8/F, Harbour Commercial Tower, 1 Hennessy Road, Wan Chai, Hong Kong")).toEqual({ flat: "Room 801, 8/F", building: "Harbour Commercial Tower", street: "1 Hennessy Road", district: "Wan Chai", country: "Hong Kong" });
    expect(partialId("K987654(3)")).toBe("K987");
    expect(hkidParts("k 987654 (3)".replace(/ /g, ""))).toEqual(["K987654", "3"]);
    expect(nameParts("CHAN Tai Man")).toEqual({ surname: "CHAN", other: "Tai Man" });
    expect(nameParts("Jane Doe")).toEqual({ surname: "DOE", other: "Jane" });
  });

  it("a changed form on the Registry website is flagged and the old hash kept for comparison", async () => {
    const manifest = JSON.parse(readFileSync("forms/hk-cr/manifest.json", "utf8"));
    const fetcher = async (url: string) => url.includes("NR1_") ? Buffer.from("a different pdf") : readFileSync(`forms/hk-cr/${url.match(/docs\/(\w+)_fillable/)![1]}.pdf`);
    const r = await checkForms(ctx, fetcher);
    expect(r.changed).toEqual(["NR1"]);
    expect(r.checked).toBe(Object.keys(manifest).length);
  });
});

describe("Generate, file, register and confirm steps", () => {
  it("an appointment moves from collected details through generated documents, filing, register update and confirmation to done", async () => {
    ctx.llm.on("draft", goodDraft);
    const req = await createRequest(ctx, { clientId: "cli_c1" });
    const p = await createPerson(ctx, { nameEn: "WONG Ka Man", nameZh: "黃嘉敏", idNumber: "K987654(3)", residentialAddress: "Flat 12B, 88 Robinson Road, Mid-Levels", correspondenceAddress: "Unit 1502, 15/F, Kowloon Bay Centre, Kowloon Bay", email: "kaman@example.com", phone: "+852 9123 4567" });
    const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p.id, extracted: { effDate: { value: "2026-10-15" } } });
    // Everything on file except the KYC documents; supply them.
    const { tickItem } = await import("@/domain/step-hooks");
    await markStepState(ctx, t.id, "send", { sent: true });
    for (const k of ["idCopy", "addrProof", "selfie"]) await tickItem(ctx, t.id, k, null);
    // No screening hits (fake provider), so screening clears on its own and documents are generated.
    const cur = await getTask(ctx, t.id);
    expect(cur._steps[cur.stepIndex].kind).toBe("sign");
    const docs = await ctx.db.select().from(document).where(eq(document.taskId, t.id));
    expect(docs.map((d) => d.title).sort()).toEqual(["Board written resolution: appointment of director", "Consent to act as director", "Form ND2A: appointment"]);
    const nd2a = docs.find((d) => d.title.startsWith("Form ND2A"))!;
    const values = await readFormValues(await ctx.storage.get(nd2a.storageKey!));
    expect(values).toMatchObject({ "fill_4_P.2": "WONG", "fill_21_P.2": "15", "fill_1_P.1": "70123456" });

    await markStepState(ctx, t.id, "sign", { signed: true });
    await advance(ctx, t.id);
    const [fileP] = await pendingProposals(ctx, { taskId: t.id, kind: "record_filing" });
    await expect(approveProposal(ctx, fileP.id, { edits: {} })).rejects.toThrow(/reference/);
    await approveProposal(ctx, fileP.id, { edits: { reference: "ND2A-2026-0915-001" } });
    expect(await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, t.id))).toEqual([expect.objectContaining({ form: "ND2A", reference: "ND2A-2026-0915-001" })]);

    const [regP] = await pendingProposals(ctx, { taskId: t.id, kind: "register_change" });
    expect(regP.summary).toMatch(/Appoint WONG Ka Man as director with effect from 2026-10-15/);
    expect(await officersAsAt(ctx, "cli_c1", "2026-10-15", "director")).toHaveLength(1);
    await approveProposal(ctx, regP.id);
    expect((await officersAsAt(ctx, "cli_c1", "2026-10-15", "director")).map((o) => o.person.nameEn).sort()).toEqual(["CHAN Tai Man", "WONG Ka Man"]);
    expect(await officersAsAt(ctx, "cli_c1", "2026-10-14", "director")).toHaveLength(1);

    await runJobs(ctx);
    const [conf] = await pendingProposals(ctx, { taskId: t.id, kind: "send_message" });
    expect(conf.title).toMatch(/Confirm completion/);
    await approveProposal(ctx, conf.id);
    expect((await getTask(ctx, t.id)).status).toBe("done");
    expect(ctx.mail.sent()).toHaveLength(1);
  });

  it("a resolution for a client whose document language is Traditional Chinese is written in Chinese with Chinese names", async () => {
    const req = await createRequest(ctx, { clientId: "cli_c4" }); // Tsing Yi Logistics: document language Traditional Chinese
    const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c4", playbookId: "hk.changeOffice", extracted: { newAddr: { value: "Unit 8, 9/F, Tsing Yi Industrial Centre, Tsing Yi" }, effDate: { value: "2026-11-01" } } });
    const { generateForTask } = await import("@/documents/generate");
    const docs = await generateForTask(ctx, t.id);
    const res = await ctx.db.query.document.findFirst({ where: eq(document.id, docs.find((d) => d.template === "tpl:board-resolution")!.id) });
    expect(res!.extractedText).toContain("青衣物流有限公司");
    expect(res!.extractedText).toContain("議決將本公司註冊辦事處更改為");
    expect(res!.language).toBe("tc");
  });
});
