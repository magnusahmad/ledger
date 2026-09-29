import { PDFDocument, PDFName, PDFDict, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { embedFonts } from "@/documents/fonts";
import { describe, expect, it } from "vitest";
import { formValues } from "@/documents/generate";
import { mapNAR1, mapNSC1, mapND2B, splitAddress, fillForm, readFormValues, type NAR1Input } from "@/documents/cr-forms";
import type { DocContext } from "@/documents/context";
import { shareCertificate } from "@/documents/templates";

const presentor = { name: "Fictional Firm", address: "Unit 1, 1 Test Road, Hong Kong", tel: "30000000", email: "desk@example.test", reference: "task" };
const base = { brNumber: "70000001", companyName: "Example Limited", presentor, signer: { name: "CHAN Test", capacity: "director" as const }, signDate: "2026-09-29" };
const capital = [{ className: "Ordinary", currency: "HKD", totalNumber: 100, totalAmount: 100, paidUp: 100 }];
const annual: NAR1Input = { ...base, type: "private", madeUpTo: "2025-03-01", registeredOffice: presentor.address, email: "desk@example.test", charges: "0", capital, directors: [{ capacity: "director", nameEn: "CHAN Test" }], members: [{ className: "Ordinary", totalInClass: 100, rows: [{ nameEn: "CHAN Test", address: presentor.address, shares: 100 }] }] };
const context = (): DocContext => ({
  task: { id: "task", effectiveDate: "2026-10-01", params: {}, periodKey: "NAR1:2025" }, pb: { id: "hk.annualReturn" },
  firm: { legalName: presentor.name, address: presentor.address }, client: { nameEn: "Example Limited", incorporatedOn: "2020-03-01", regOfficeEn: presentor.address },
  today: "2026-09-29", asAt: "2025-03-01", values: {}, capital: [{ name: "Ordinary", currency: "HKD", issued: 100, paidUpCents: 10000 }],
  directors: [], members: [], officers: [], person: { id: "p", nameEn: "CHAN Test", idNumber: "Y123456(7)", kind: "individual" }, lang: "en",
} as unknown as DocContext);

describe("Reviewed statutory form safeguards", () => {
  it("the embedded PDF font has drawable outlines for every Latin and Chinese character, not just correct text metadata", async () => {
    const pdf = await PDFDocument.create();
    const fonts = await embedFonts(pdf, "tc");
    const text = "CHAN First 70000001 陳黃";
    const font = fonts.pick(text);
    const encoded = font.encodeText(text).asString();
    pdf.addPage().drawText(text, { font });
    const saved = await PDFDocument.load(await pdf.save());
    const descriptor = saved.context.enumerateIndirectObjects().map(([, object]) => object).find(object => object instanceof PDFDict && object.has(PDFName.of("FontFile2"))) as PDFDict;
    const embedded = fontkit.create(Buffer.from(decodePDFRawStream(descriptor.lookup(PDFName.of("FontFile2")) as PDFRawStream).decode()));
    for (const [index, character] of [...text].entries()) {
      if (character === " ") continue;
      const glyphId = parseInt(encoded.slice(index * 4, index * 4 + 4), 16);
      expect(embedded.getGlyph(glyphId).path.toSVG().length, character).toBeGreaterThan(0);
    }
  });
  it("an explicit overseas member address keeps its country instead of defaulting to Hong Kong", () => {
    expect(splitAddress("Unit 7, Corporate Centre, Road Town, British Virgin Islands").country).toBe("British Virgin Islands");
    expect(splitAddress("Unit 2, 2 Test Road, Singapore").country).toBe("Singapore");
  });
  it.each([
    ["capital classes", { capital: Array(5).fill(capital[0]) }],
  ])("an annual return requiring unsupported continuation %s is blocked instead of silently truncated", (_label, overrides) => {
    expect(() => mapNAR1({ ...annual, ...overrides })).toThrow(/continuation|unsupported/i);
  });
  it("an annual return includes every natural director and every member class using official continuation sheets", async () => {
    const directors = ["CHAN First", "LEE Second", "WONG Third"].map(nameEn => ({ capacity: "director" as const, nameEn, correspondenceAddress: presentor.address, idNumber: "Y123456(7)" }));
    const rows = ["CHAN Member", "LEE Member", "WONG Member"].map(nameEn => ({ nameEn, address: presentor.address, shares: 10 }));
    const values = mapNAR1({ ...annual, directors, members: [{ className: "Ordinary", totalInClass: 30, rows }, { className: "Preference", totalInClass: 10, rows: [rows[0]] }] });
    const pdf = await PDFDocument.load(await fillForm("NAR1", values));
    expect(pdf.getPageCount()).toBe(31); // original 27, two Sheet C and two additional Schedule 1
    expect(values).toMatchObject({ "fill_6_P.8": "2", "fill_9_P.8": "3", "fill_29_P.9": "1" });
    const extra = (values as unknown as Record<symbol, { page: number; values: Record<string, string> }[]>)[Symbol.for("harbourline.formContinuations")];
    expect(extra.filter(p => p.page === 13).map(p => p.values["fill_7_P.13"])).toEqual(["LEE", "WONG"]);
    expect(extra.filter(p => p.page === 9).map(p => [p.values["fill_5_P.9"], p.values["fill_8_P.9"]])).toEqual([["Ordinary", "WONG"], ["Preference", "CHAN"]]);
  });
  it("an annual return for the prior period reports that anniversary rather than the current year", () => {
    expect(formValues("NAR1", context())).toMatchObject({ "fill_6_P.1": "01", "fill_7_P.1": "03", "fill_8_P.1": "2025" });
  });
  it("the annual return uses the member's own address and corporate name instead of the company's office", () => {
    const c = context();
    c.members = [{ personId: "corp", name: "Holding Limited", nameZh: null, quantity: 100, className: "Ordinary", shareClassId: "cls", percent: 100, address: "Unit 9, 9 Member Road, Hong Kong", corporate: true }] as DocContext["members"];
    expect(formValues("NAR1", c)).toMatchObject({ "fill_10_P.9": "Holding Limited", "fill_11_P.9": "Unit 9", "fill_13_P.9": "9 Member Road" });
  });
  it("a supported incorporation fills subscribed capital, founder, corporate secretary, first director and protected particulars", async () => {
    const c = context(); c.pb.id = "hk.incorporation";
    Object.assign(c, { incorporation: {
      nameEn: "New Harbour Limited", nameZh: "新港有限公司", natureDescription: "Trading", registeredOffice: presentor.address,
      capital: { className: "Ordinary", currency: "HKD", number: 100, subscribedCents: 10000, paidUpCents: 10000 },
      founder: { nameEn: "CHAN Founder", nameZh: "陳創辦", address: "Unit 2, 2 Founder Road, Hong Kong" },
      director: { nameEn: "CHAN Founder", nameZh: "陳創辦", correspondenceAddress: "Unit 2, 2 Founder Road, Hong Kong", residentialAddress: "Flat 3, 3 Home Road, Hong Kong", idNumber: "K987654(3)", idCountry: "HK", email: "founder@example.test", adult: true, consentToAct: true }, secretaryIsFirm: true,
      founderPersonId: "founder", directorPersonId: "founder",
    } });
    c.firm.tcspLicence = "TC000001"; c.firm.settings = { businessRegistrationNumber: "70000000" };
    const values = await readFormValues(await fillForm("NNC1", formValues("NNC1", c)));
    expect(values).toMatchObject({ "fill_1_P.1": "New Harbour Limited", "fill_4_P.2": "100", "fill_6_P.2": "100", "fill_2_P.3": "CHAN", "fill_3_P.3": "Founder", "fill_11_P.3": "100", "fill_2_P.5": "Fictional Firm", "fill_8_P.5": "70000000", "fill_9_P.5": "TC000001", "fill_2_P.6": "CHAN", "fill_3_P.6": "Founder", "fill_14_P.6": "K987", "fill_5_P.14": "K987654", "fill_6_P.14": "3", "fill_11_P.14": "3 Home Road" });
  });
  it("an incorporation with no mapped founders or first officers is blocked rather than published as a filled form", () => {
    const c = context(); c.pb.id = "hk.incorporation";
    expect(() => formValues("NNC1", c)).toThrow(/NNC1.*founder|NNC1.*officer/i);
  });
  it("an allotment without verified cash, unpaid and allottee facts is blocked rather than reporting zero increase", () => {
    expect(() => formValues("NSC1", context())).toThrow(/NSC1.*allotment/i);
  });
  it("an allotment cannot silently omit its third allottee or a second allottee class", () => {
    const a = { className: "Ordinary", nameEn: "CHAN Test", address: presentor.address, shares: 1 };
    const d = { ...base, from: "2026-10-01", to: "2026-10-01", currency: "HKD", increase: 3, capital, cashRows: [{ className: "Ordinary", currency: "HKD", number: 3, paidEach: 1, unpaidEach: 0 }], allottees: [a, a, a] };
    expect(() => mapNSC1(d)).toThrow(/continuation|unsupported/i);
    expect(() => mapNSC1({ ...d, allottees: [a, { ...a, className: "Preference" }] })).toThrow(/continuation|unsupported/i);
  });
  it("a cash allotment reports the transaction, allottees and capital immediately after allotment", () => {
    const c = context(); c.pb.id = "hk.allotShares";
    c.task.params.structured = { items: [{ kind: "allotment", className: "Ordinary", quantity: 20, toName: "LEE New", toNameZh: null, toPersonId: "new", fromPersonId: null, fromName: null, pricePerShareCents: 250, considerationCents: 5000, considerationType: "cash", unpaidCents: 0, existingUnpaidCents: 0, currency: "HKD", allotteeAddress: "Unit 9, 9 New Road, Hong Kong", allotteeKind: "individual" }] };
    expect(formValues("NSC1", c)).toMatchObject({ "fill_10_P.1": "50", "fill_17_P.1": "20", "fill_18_P.1": "2.5", "fill_4_P.3": "120", "fill_5_P.3": "150", "fill_6_P.3": "150", "fill_5_P.7": "LEE", "fill_6_P.7": "New", "fill_13_P.7": "20" });
  });
  it("a transfer certificate uses the proposed recipient and holdings, without certifying the old owner's shares", () => {
    const c = context(); c.pb.id = "hk.transferShares";
    c.members = [{ personId: "old", name: "CHAN Old", nameZh: null, quantity: 100, className: "Ordinary", shareClassId: "cls", percent: 100 }];
    c.task.params.structured = { items: [{ kind: "transfer", className: "Ordinary", quantity: 100, toName: "LEE New", toNameZh: null, toPersonId: "new", fromPersonId: "old", fromName: "CHAN Old", pricePerShareCents: 100, considerationCents: 10000 }] };
    const text = JSON.stringify(shareCertificate(c));
    expect(text).toContain("LEE New"); expect(text).not.toContain("CHAN Old"); expect(text).toContain("100 Ordinary shares");
  });
  it("ND2B carries changed names and email without overwriting the existing identity", () => {
    const c = context(); c.values = { fullName: "CHAN New Name", chiName: "陳新名", contactInfo: "new@example.test / +852 3000 0000" };
    expect(formValues("ND2B", c)).toMatchObject({ "fill_4_P.1": "CHAN", "fill_5_P.1": "Test", "fill_6_P.2": "CHAN", "fill_7_P.2": "New Name", "fill_2_P.2": "陳新名", "fill_27_P.2": "new@example.test" });
  });
  it("ND2B includes changed full ID and residential address only on its protected sheet", async () => {
    const values = mapND2B({ ...base, officer: { capacity: "director", nameEn: "CHAN Test", idNumber: "Y123456(7)" }, effectiveDate: "2026-10-01", changes: { idNumber: "K987654(3)", residentialAddress: "Flat 2, 8 Test Road, Hong Kong" } });
    const got = await readFormValues(await fillForm("ND2B", values));
    expect(got).toMatchObject({ "fill_29_P.3": "1", "fill_31_P.2": "K987", "fill_5_P.6": "K987654", "fill_6_P.6": "3", "fill_9_P.6": "Flat 2", "fill_11_P.6": "8 Test Road" });
    expect(Object.entries(got).filter(([k]) => !k.endsWith("P.6")).map(([,v]) => v)).not.toContain("K987654");
  });
  it("a certificate for an unstructured pending share transaction stops instead of certifying the old holdings", () => {
    const c = context(); c.pb.id = "hk.transferShares";
    c.members = [{ name: "CHAN Test", nameZh: null, quantity: 100, className: "Ordinary" }] as DocContext["members"];
    expect(() => shareCertificate(c)).toThrow(/structured.*share|share.*structured/i);
  });
});

describe("Historical annual return context", () => {
  it("the actual changeDetail checklist instruction is structured into ND2B without changing the person's register record", async () => {
    const { resetDb, makeCtx } = await import("./helpers");
    const { seedDemo } = await import("@/db/seed-demo");
    const { createRequest, startTask } = await import("@/domain/engine");
    const { loadDocContext } = await import("@/documents/context");
    const { getPersonProtected, officersAsAt } = await import("@/domain/records");
    await resetDb(); const ctx = makeCtx(); await seedDemo(ctx);
    const [officer] = await officersAsAt(ctx, "cli_c1", ctx.clock.today(), "director");
    const before = await getPersonProtected(ctx, officer.personId);
    ctx.llm.on("structure_particulars", { changes: [{ field: "nameEn", value: "CHAN New Name" }, { field: "email", value: "new@example.test" }] });
    const req = await createRequest(ctx, { clientId: "cli_c1" });
    const task = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.changeParticulars", personId: officer.personId, extracted: { changeDetail: { value: "Change my name to CHAN New Name and email to new@example.test" }, effDate: { value: "2026-10-01" } } });
    const c = await loadDocContext(ctx, task.id);
    expect(formValues("ND2B", c)).toMatchObject({ "fill_6_P.2": "CHAN", "fill_7_P.2": "New Name", "fill_27_P.2": "new@example.test" });
    expect((await getPersonProtected(ctx, officer.personId)).nameEn).toBe(before.nameEn);
    expect(ctx.llm.callsFor("structure_particulars")).toHaveLength(1);
  });
  it("a late annual return uses officers and share capital at its reporting anniversary", async () => {
    const { resetDb, makeCtx } = await import("./helpers");
    const { seedDemo } = await import("@/db/seed-demo");
    const { createRequest } = await import("@/domain/engine");
    const { startTask } = await import("@/domain/engine");
    const { createPerson, appoint } = await import("@/domain/records");
    const { allot, issuedAsAt } = await import("@/domain/shares");
    const { loadDocContext } = await import("@/documents/context");
    await resetDb(); const ctx = makeCtx(); await seedDemo(ctx);
    const p = await createPerson(ctx, { nameEn: "LEE Later" });
    await appoint(ctx, { clientId: "cli_c1", personId: p.id, role: "director", fromDate: "2026-01-01" });
    const [shareClass] = await issuedAsAt(ctx, "cli_c1", "2025-10-28");
    await allot(ctx, { clientId: "cli_c1", shareClassId: shareClass.shareClassId, date: "2026-01-01", toPersonId: p.id, quantity: 50, amountPaidCents: 5000 });
    const req = await createRequest(ctx, { clientId: "cli_c1" });
    const task = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.annualReturn", periodKey: "NAR1:2025", periodYear: 2025 });
    const c = await loadDocContext(ctx, task.id);
    expect(c.asAt).toBe("2025-10-28");
    expect(c.directors.some(d => d.personId === p.id)).toBe(false);
    expect(c.members.some(m => m.personId === p.id)).toBe(false);
    expect(c.capital[0].issued).toBe(shareClass.issued);
  });
});

describe("Supported incorporation workflow", () => {
  it("incorporation documents share one encrypted plan and initial registers only appear after the certificate details and human application", async () => {
    const { resetDb, makeCtx } = await import("./helpers");
    const { seedDemo } = await import("@/db/seed-demo");
    const { createRequest, startTask, getTask } = await import("@/domain/engine");
    const { createClient, officersAsAt } = await import("@/domain/records");
    const { membersAsAt, issuedAsAt } = await import("@/domain/shares");
    const { generateForTask } = await import("@/documents/generate");
    const { planIncorporationRegister } = await import("@/domain/incorporation");
    const { task: taskTable, document } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    await resetDb(); const ctx = makeCtx(); await seedDemo(ctx);
    const c = await createClient(ctx, { nameEn: "Prospect", jurisdiction: "HK", lifecycle: "prospect", operatingStatus: "not_incorporated" });
    const plan = { nameEn: "New Harbour Limited", nameZh: "新港有限公司", natureDescription: "Trading", registeredOffice: "Unit 1, 1 Test Road, Hong Kong",
      capital: { className: "Ordinary", currency: "HKD", number: 100, subscribedCents: 10000, paidUpCents: 10000 },
      founder: { nameEn: "CHAN Founder", nameZh: "陳創辦", address: "Unit 2, 2 Founder Road, Hong Kong" },
      director: { nameEn: "CHAN Founder", nameZh: "陳創辦", correspondenceAddress: "Unit 2, 2 Founder Road, Hong Kong", residentialAddress: "Flat 3, 3 Home Road, Hong Kong", idNumber: "K987654(3)", idCountry: "HK", email: "founder@example.test", adult: true, consentToAct: true }, secretaryIsFirm: true };
    ctx.llm.on("structure_incorporation", plan);
    const req = await createRequest(ctx, { clientId: c.id });
    const t = await startTask(ctx, { requestId: req.id, clientId: c.id, playbookId: "hk.incorporation", extracted: { propName: { value: plan.nameEn }, founders: { value: JSON.stringify(plan) }, capital: { value: "100 ordinary shares at HK$1 fully paid" }, directorsList: { value: "CHAN Founder, the sole founder, consents and is over 18" } } });
    const { peopleToScreen, screenPerson, recordCdd } = await import("@/domain/screening");
    let toScreen = await getTask(ctx, t.id);
    await expect(peopleToScreen(ctx, toScreen)).rejects.toThrow(/Upload.*idCopy/);
    const checklist = toScreen.checklist.map(e => ({ ...e }));
    for (const key of ["idCopy", "addrProof", "selfie"]) {
      const id = `inc-upload-${key}`;
      await ctx.db.insert(document).values({ id, firmId: ctx.firmId, taskId: t.id, clientId: c.id, kind: "upload", title: key, source: "upload", requirementKey: key });
      const item = checklist.find(e => e.key === key)!; item.documentId = id; item.status = "received";
    }
    await ctx.db.update(taskTable).set({ checklist }).where(eq(taskTable.id, t.id));
    toScreen = await getTask(ctx, t.id);
    const people = await peopleToScreen(ctx, toScreen);
    expect(people).toHaveLength(1);
    const { portalUpload } = await import("@/domain/portal");
    await expect(portalUpload(ctx, req.uploadToken, { taskId: t.id, key: "selfie", filename: "replacement-selfie.png", mime: "image/png", content: Buffer.from("fictional selfie") })).resolves.toBeDefined();
    const screened = await screenPerson(ctx, people[0], t.id); await recordCdd(ctx, people[0], t.id, screened.id);
    expect((await ctx.db.query.document.findFirst({ where: eq(document.id, "inc-upload-idCopy") }))?.personId).toBe(people[0]);
    const docs = await generateForTask(ctx, t.id);
    expect(docs.some(d => d.signatureFields.some(f => f.field === `sign:${people[0]}`))).toBe(true);
    const certificate = docs.find(d => d.template === "tpl:share-certificate")!;
    const certificateRow = await ctx.db.query.document.findFirst({ where: eq(document.id, certificate.id) });
    expect(certificateRow?.extractedText).toContain("CHAN Founder");
    expect(certificateRow?.extractedText).toContain("100 Ordinary shares");
    expect(await officersAsAt(ctx, c.id, "2026-10-01")).toHaveLength(0);
    expect(await membersAsAt(ctx, c.id, "2026-10-01")).toHaveLength(0);
    let latest = await getTask(ctx, t.id);
    const values = Object.fromEntries(latest.checklist.filter(e => e.value).map(e => [e.key, e.value! ]));
    expect(JSON.stringify(latest.params)).not.toContain("K987654");
    await expect(planIncorporationRegister(ctx, latest, values)).rejects.toThrow(/registered company number.*incorporation date/);
    await ctx.db.update(taskTable).set({ params: { ...latest.params, incorporationRegistration: { companyNumber: "79999999", incorporatedOn: "2026-10-01" } } }).where(eq(taskTable.id, t.id));
    latest = await getTask(ctx, t.id);
    const changes = await planIncorporationRegister(ctx, latest, values);
    for (const change of changes) await change.apply(); // the approved register effect
    expect(await officersAsAt(ctx, c.id, "2026-09-30")).toHaveLength(0);
    expect((await officersAsAt(ctx, c.id, "2026-10-01")).map(o => o.role).sort()).toEqual(["director", "secretary"]);
    expect((await membersAsAt(ctx, c.id, "2026-10-01"))[0]).toMatchObject({ name: "CHAN Founder", quantity: 100 });
    expect((await issuedAsAt(ctx, c.id, "2026-10-01"))[0]).toMatchObject({ issued: 100, paidUpCents: 10000 });
    expect(ctx.llm.callsFor("structure_incorporation")).toHaveLength(1);
  });
});
