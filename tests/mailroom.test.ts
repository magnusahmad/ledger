// Mail room (CWCCPA inbound mail): scans arrive in a watched folder, are split into letters,
// read, matched to a client in code and proposed for filing with a client email. Nothing
// touches the firm's server folders or mailbox until a member of staff approves the letter.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, readdir, writeFile, mkdir, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { firm, mailroomBatch, mailroomLetter } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { LlmRequest } from "@/integrations/types";
import { splitPlan } from "@/mailroom/split";
import { matchLetter, normaliseId, type DirectoryClient } from "@/mailroom/match";
import { fileTarget, safeTarget, type FilingRules } from "@/mailroom/rules";
import { MemoryDraftBox, EmlDraftBox } from "@/mailroom/drafts";
import { batches, clients, processWaiting, importClients, ingestScan, processBatch, approveLetter, undoLetter, chooseClient, notForAClient, editLetter, openLetter, getLetter, lettersFor, type Mailroom } from "@/mailroom/service";

const RULES: FilingRules = {
  clientFolder: "Clients/{client}",
  unsortedFolder: "_Unsorted",
  types: {
    ird_demand_note: { label: "IRD demand note", folder: "Tax/{taxYear}", file: "{date} IRD demand note {taxYear}" },
    bir51: { label: "Profits tax return (BIR51)", folder: "Tax/{taxYear}", file: "{date} BIR51 {taxYear}" },
    cr_letter: { label: "Companies Registry letter", folder: "Company secretarial", file: "{date} Companies Registry letter" },
    bank_statement: { label: "Bank statement", folder: "Bank", file: "{date} {sender} statement" },
    junk: { label: "Advertising or junk", folder: "Junk", file: "{date} {sender}", noEmail: true, unsorted: true },
  },
  fallback: { label: "Letter", folder: "Correspondence", file: "{date} {sender} letter" },
};

const CLIENTS_CSV = [
  "name,name_zh,br_no,ird_file_no,cr_no,mpf_no,folder,contact_name,contact_email,language",
  "ABC Trading Limited,ABC貿易有限公司,12345678,61/12345678,1234567,,ABC Trading Limited,陳大文,david@abc.example,tc",
  "Mingtai Supply Chain Ltd,明泰供应链有限公司,71234567,61/71234567,2234567,,Mingtai Supply Chain Ltd,王总,wang@mingtai.example,sc",
  "Harbour Light Limited,,33300011,,3300011,,Harbour Light Limited,Ann Ho,ann@harbourlight.example,en",
  "Harbour Light (Asia) Limited,,33300022,,3300022,,Harbour Light (Asia) Limited,Ben Ho,ben@hlasia.example,en",
].join("\n");

const read = (o: Partial<Record<string, unknown>> = {}) => ({
  type: "ird_demand_note", sender: "Inland Revenue Department", addressee: "ABC Trading Limited",
  identifiers: { irdFileNo: "61/12345678", brNo: null, crNo: null, mpfNo: null },
  summaryEn: "Notice of assessment and demand for 2025/26 profits tax.", actionNeeded: "Pay HK$48,200 by 28 Nov 2026",
  dueDate: "2026-11-28", amountHkd: 48200, taxYear: "2025-26", ...o,
});
const email = (o: Partial<Record<string, unknown>> = {}) => ({ subject: "稅務局評稅及繳稅通知書", body: "陳先生您好：\n\n我們今天收到稅務局寄給貴公司的評稅及繳稅通知書。", ...o });

async function pdf(pages: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setCreationDate(new Date("2026-10-30T00:00:00Z"));
  doc.setModificationDate(new Date("2026-10-30T00:00:00Z"));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const t of pages) doc.addPage([595, 842]).drawText(t, { x: 50, y: 780, size: 12, font });
  return Buffer.from(await doc.save());
}
const promptOf = (req: LlmRequest) => req.messages.map((m) => typeof m.content === "string" ? m.content : m.content.map((c) => ("text" in c ? c.text : "")).join("\n")).join("\n");
const pageCount = async (b: Buffer) => (await PDFDocument.load(b)).getPageCount();

let ctx: TestCtx;
let mr: Mailroom & { drafts: MemoryDraftBox };
let tmp: string;

beforeEach(async () => {
  await resetDb();
  ctx = makeCtx({ now: "2026-10-30T01:12:00Z" });
  ctx.firmId = "firm_cwc";
  await ctx.db.insert(firm).values({ id: "firm_cwc", legalName: "CWC CPA Limited", invoicePrefix: "CWC" });
  tmp = await mkdtemp(path.join(os.tmpdir(), "mailroom-"));
  mr = { drafts: new MemoryDraftBox(), serverRoot: path.join(tmp, "server"), scanDir: path.join(tmp, "scans"), rules: RULES, fromAddress: "mail@cwccpa.example", firmName: "CWC CPA" };
  await mkdir(mr.serverRoot, { recursive: true });
  await importClients(ctx, CLIENTS_CSV);
});
afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

async function oneLetter(r = read(), e = email()) {
  ctx.llm.set("mailroom_split", { letters: [{ fromPage: 1, toPage: 2 }] });
  ctx.llm.set("mailroom_read", r);
  ctx.llm.set("mailroom_email", e);
  const batch = await ingestScan(ctx, mr, { filename: "scan-0930.pdf", content: await pdf(["page one", "page two"]) });
  await processBatch(ctx, mr, batch!.id);
  return (await lettersFor(ctx, batch!.id))[0];
}

describe("Splitting a batch scan into letters", () => {
  it("splits along the page ranges the model reads, one letter per range", async () => {
    ctx.llm.set("mailroom_split", { letters: [{ fromPage: 1, toPage: 2 }, { fromPage: 3, toPage: 3 }, { fromPage: 4, toPage: 5 }] });
    ctx.llm.set("mailroom_read", read());
    ctx.llm.set("mailroom_email", email());
    const batch = await ingestScan(ctx, mr, { filename: "scan.pdf", content: await pdf(["a", "b", "c", "d", "e"]) });
    await processBatch(ctx, mr, batch!.id);
    const letters = await lettersFor(ctx, batch!.id);
    expect(letters.map((l) => [l.pageFrom, l.pageTo])).toEqual([[1, 2], [3, 3], [4, 5]]);
    expect(await pageCount(await ctx.storage.get(letters[2].storageKey))).toBe(2);
  });

  it("page ranges that skip, overlap or run past the scan are not trusted: the whole scan becomes one letter", () => {
    expect(splitPlan(5, [{ fromPage: 1, toPage: 2 }, { fromPage: 4, toPage: 5 }])).toEqual([{ fromPage: 1, toPage: 5 }]);
    expect(splitPlan(5, [{ fromPage: 1, toPage: 3 }, { fromPage: 3, toPage: 5 }])).toEqual([{ fromPage: 1, toPage: 5 }]);
    expect(splitPlan(5, [{ fromPage: 1, toPage: 6 }])).toEqual([{ fromPage: 1, toPage: 5 }]);
    expect(splitPlan(3, [{ fromPage: 1, toPage: 1 }, { fromPage: 2, toPage: 3 }])).toEqual([{ fromPage: 1, toPage: 1 }, { fromPage: 2, toPage: 3 }]);
  });

  it("today's list counts each batch's letters and how many are still to check", async () => {
    const l = await oneLetter();
    await approveLetter(ctx, mr, l.id);
    ctx.llm.set("mailroom_split", { letters: [{ fromPage: 1, toPage: 1 }, { fromPage: 2, toPage: 2 }] });
    const b = await ingestScan(ctx, mr, { filename: "second.pdf", content: await pdf(["p", "q"]) });
    await processBatch(ctx, mr, b!.id);
    const list = await batches(ctx);
    expect(list.map((x) => [x.filename, x.letters, x.toReview])).toEqual(expect.arrayContaining([["scan-0930.pdf", 1, 0], ["second.pdf", 2, 2]]));
  });

  it("a batch left half-read by a restart is finished on the next run, keeping letters already read", async () => {
    ctx.llm.set("mailroom_split", { letters: [{ fromPage: 1, toPage: 1 }, { fromPage: 2, toPage: 2 }] });
    ctx.llm.set("mailroom_read", read());
    ctx.llm.set("mailroom_email", email());
    const b = await ingestScan(ctx, mr, { filename: "scan.pdf", content: await pdf(["a", "b"]) });
    await processBatch(ctx, mr, b!.id);
    const [first, second] = await lettersFor(ctx, b!.id);
    // Simulate the worker dying after reading letter 1: letter 2 and the batch are still "reading".
    await ctx.db.update(mailroomLetter).set({ status: "reading" }).where(eq(mailroomLetter.id, second.id));
    await ctx.db.update(mailroomBatch).set({ status: "reading" }).where(eq(mailroomBatch.id, b!.id));
    const readsBefore = ctx.llm.callsFor("mailroom_read").length;
    await processWaiting(ctx, mr);
    const after = await lettersFor(ctx, b!.id);
    expect(after.map((l) => [l.id, l.status])).toEqual([[first.id, "proposed"], [second.id, "proposed"]]);
    expect(ctx.llm.callsFor("mailroom_read").length - readsBefore).toBe(1);
    expect((await batches(ctx)).find((x) => x.id === b!.id)!.status).toBe("ready");
  });

  it("a batch interrupted before any letters were saved is read again from the start", async () => {
    ctx.llm.set("mailroom_split", { letters: [{ fromPage: 1, toPage: 2 }] });
    ctx.llm.set("mailroom_read", read());
    ctx.llm.set("mailroom_email", email());
    const b = await ingestScan(ctx, mr, { filename: "scan.pdf", content: await pdf(["a", "b"]) });
    await ctx.db.update(mailroomBatch).set({ status: "reading" }).where(eq(mailroomBatch.id, b!.id));
    await processWaiting(ctx, mr);
    expect((await lettersFor(ctx, b!.id)).map((l) => l.status)).toEqual(["proposed"]);
  });

  it("the same scan dropped twice is processed once", async () => {
    const content = await pdf(["x"]);
    const a = await ingestScan(ctx, mr, { filename: "scan.pdf", content });
    const b = await ingestScan(ctx, mr, { filename: "scan copy.pdf", content });
    expect(a).not.toBeNull();
    expect(b).toBeNull();
  });
});

describe("Matching a letter to a client (in code, never the model's guess)", () => {
  const dir: DirectoryClient[] = [
    { id: "c1", name: "ABC Trading Limited", nameZh: null, brNo: "12345678", irdFileNo: "61/12345678", crNo: "1234567", mpfNo: null },
    { id: "c2", name: "Harbour Light Limited", nameZh: null, brNo: "33300011", irdFileNo: null, crNo: "3300011", mpfNo: null },
    { id: "c3", name: "Harbour Light (Asia) Limited", nameZh: null, brNo: "33300022", irdFileNo: null, crNo: "3300022", mpfNo: null },
    { id: "c4", name: "Twin Co Limited", nameZh: null, brNo: "55500000", irdFileNo: null, crNo: null, mpfNo: null },
    { id: "c5", name: "Twin Co (HK) Limited", nameZh: null, brNo: "55500000", irdFileNo: null, crNo: null, mpfNo: null },
  ];

  it("matches when an identifier points to exactly one client, and says which identifier", () => {
    expect(matchLetter(read(), dir)).toEqual({ kind: "matched", clientId: "c1", reason: "IRD file number 61/12345678" });
  });

  it("compares identifiers ignoring spaces, dashes, slashes and case", () => {
    expect(normaliseId(" 61-1234 5678 ")).toBe(normaliseId("61/12345678"));
    expect(matchLetter(read({ identifiers: { irdFileNo: "61 12345678", brNo: null, crNo: null, mpfNo: null } }), dir)).toMatchObject({ kind: "matched", clientId: "c1" });
  });

  it("an identifier shared by two clients asks staff instead of guessing", () => {
    const m = matchLetter(read({ addressee: "Twin Co", identifiers: { irdFileNo: null, brNo: "55500000", crNo: null, mpfNo: null } }), dir);
    expect(m.kind).toBe("ask");
    if (m.kind === "ask") expect(m.candidates.sort()).toEqual(["c4", "c5"]);
  });

  it("a letter with no identifier and a name close to two clients asks, offering both look-alikes", () => {
    const m = matchLetter(read({ addressee: "Harbour Light Ltd", identifiers: { irdFileNo: null, brNo: null, crNo: null, mpfNo: null } }), dir);
    expect(m.kind).toBe("ask");
    if (m.kind === "ask") expect(m.candidates).toEqual(expect.arrayContaining(["c2", "c3"]));
  });

  it("an exact company name, with no identifier, matches only when no other client is a near look-alike", () => {
    expect(matchLetter(read({ addressee: "ABC TRADING LTD", identifiers: { irdFileNo: null, brNo: null, crNo: null, mpfNo: null } }), dir)).toEqual({ kind: "matched", clientId: "c1", reason: "company name" });
  });

  it("an identifier and a company name that point to different clients ask staff", () => {
    const m = matchLetter(read({ addressee: "Harbour Light (Asia) Limited", identifiers: { irdFileNo: null, brNo: null, crNo: "3300011", mpfNo: null } }), dir);
    expect(m.kind).toBe("ask");
  });

  it("junk mail is never matched to a client", () => {
    expect(matchLetter(read({ type: "junk" }), dir)).toEqual({ kind: "junk" });
  });
});

describe("CWCCPA's server layout (seed/mailroom/rules.json, from the folder example the firm shared)", () => {
  const cwc = JSON.parse(readFileSync(path.join(process.cwd(), "seed/mailroom/rules.json"), "utf8")) as FilingRules;
  const client = { folder: "FL1401A1-ABC Trading Limited", code: "FL1401A1" };

  it("a tax letter goes in the client's tax folder: CWCHK Client Folder/<code>-<name>/<code>-Tax Folder", () => {
    expect(fileTarget(cwc, read(), client, "2026-10-30").folder).toBe("CWCHK Client Folder/FL1401A1-ABC Trading Limited/FL1401A1-Tax Folder");
  });

  it("a letter that isn't about tax goes in the client's own folder, not a subfolder we made up", () => {
    expect(fileTarget(cwc, read({ type: "cr_annual_return" }), client, "2026-10-30").folder).toBe("CWCHK Client Folder/FL1401A1-ABC Trading Limited");
  });

  it("junk and letters for non-clients stay out of the client folders", () => {
    expect(fileTarget(cwc, read({ type: "junk", sender: "Pacific Office Supplies" }), null, "2026-10-30").folder.startsWith("CWCHK Client Folder/FL")).toBe(false);
  });

  it("importing the client index with client codes names each folder <code>-<name>, as the firm does", async () => {
    await importClients(ctx, "name,client_code,ird_file_no,contact_email,language\nABC Trading Limited,FL1401A1,61/12345678,a@abc.example,en\nNo Code Limited,,,b@nc.example,en");
    const cs = await clients(ctx);
    expect(cs.find((c) => c.name === "ABC Trading Limited")).toMatchObject({ code: "FL1401A1", folder: "FL1401A1-ABC Trading Limited" });
    expect(cs.find((c) => c.name === "No Code Limited")).toMatchObject({ code: null, folder: "No Code Limited" });
  });
});

describe("Where a letter is filed (the firm's rules, as data)", () => {
  const client = { folder: "ABC Trading Limited" };

  it("folder and file name follow the firm's rule for the letter type", () => {
    expect(fileTarget(RULES, read(), client, "2026-10-30")).toEqual({ folder: "Clients/ABC Trading Limited/Tax/2025-26", fileName: "2026-10-30 IRD demand note 2025-26.pdf" });
  });

  it("an unknown letter type uses the fallback rule", () => {
    expect(fileTarget(RULES, read({ type: "something_new", sender: "Hang Seng Bank" }), client, "2026-10-30")).toEqual({ folder: "Clients/ABC Trading Limited/Correspondence", fileName: "2026-10-30 Hang Seng Bank letter.pdf" });
  });

  it("junk goes to the unsorted folder, not a client folder", () => {
    expect(fileTarget(RULES, read({ type: "junk", sender: "Pizza Express" }), null, "2026-10-30")).toEqual({ folder: "_Unsorted/Junk", fileName: "2026-10-30 Pizza Express.pdf" });
  });

  it("text read from a letter can never move a file outside the server folder", () => {
    const t = fileTarget(RULES, read({ taxYear: "../../../etc", sender: "a/b\\c" }), { folder: "../Other" }, "2026-10-30");
    expect(t.folder).not.toContain("..");
    expect(() => safeTarget("/srv/share", "../outside", "x.pdf")).toThrow();
    expect(safeTarget("/srv/share", "Clients/ABC", "x.pdf")).toBe(path.join("/srv/share", "Clients", "ABC", "x.pdf"));
  });
});

describe("The approval gate: staff approve every letter", () => {
  it("nothing is filed and no email draft is saved before staff approve", async () => {
    const l = await oneLetter();
    expect(l).toMatchObject({ status: "proposed", matchKind: "matched", clientId: expect.any(String), folder: "Clients/ABC Trading Limited/Tax/2025-26" });
    expect(await readdir(mr.serverRoot)).toEqual([]);
    expect(mr.drafts.all()).toHaveLength(0);
  });

  it("approving files the letter in the client folder and saves the email as a draft, never sends it", async () => {
    const l = await oneLetter();
    await approveLetter(ctx, mr, l.id);
    const filed = path.join(mr.serverRoot, "Clients", "ABC Trading Limited", "Tax", "2025-26", "2026-10-30 IRD demand note 2025-26.pdf");
    expect(await readFile(filed)).toEqual(await ctx.storage.get(l.storageKey));
    expect(mr.drafts.all()).toHaveLength(1);
    expect(mr.drafts.all()[0]).toMatchObject({ to: ["david@abc.example"], subject: "稅務局評稅及繳稅通知書" });
    expect(mr.drafts.all()[0].attachments?.[0].filename).toBe("2026-10-30 IRD demand note 2025-26.pdf");
    expect(ctx.mail.sent()).toHaveLength(0);
    expect(await getLetter(ctx, l.id)).toMatchObject({ status: "approved", approvedBy: "user_ky", filedPath: filed });
  });

  it("approving never overwrites a file already in the client folder", async () => {
    const l = await oneLetter();
    const dir = path.join(mr.serverRoot, "Clients", "ABC Trading Limited", "Tax", "2025-26");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "2026-10-30 IRD demand note 2025-26.pdf"), "someone else's file");
    await approveLetter(ctx, mr, l.id);
    expect(await readFile(path.join(dir, "2026-10-30 IRD demand note 2025-26.pdf"), "utf8")).toBe("someone else's file");
    expect(existsSync(path.join(dir, "2026-10-30 IRD demand note 2025-26 (2).pdf"))).toBe(true);
  });

  it("approving the same letter twice files it once and drafts once", async () => {
    const l = await oneLetter();
    await approveLetter(ctx, mr, l.id);
    await approveLetter(ctx, mr, l.id);
    expect(await readdir(path.join(mr.serverRoot, "Clients", "ABC Trading Limited", "Tax", "2025-26"))).toHaveLength(1);
    expect(mr.drafts.all()).toHaveLength(1);
  });

  it("a letter waiting for staff to say whose it is cannot be approved until a client is chosen", async () => {
    const l = await oneLetter(read({ addressee: "Harbour Light Ltd", type: "cr_letter", identifiers: { irdFileNo: null, brNo: null, crNo: null, mpfNo: null } }), email({ subject: "Letter from the Companies Registry", body: "Dear Ann," }));
    expect(l).toMatchObject({ matchKind: "ask", clientId: null });
    await expect(approveLetter(ctx, mr, l.id)).rejects.toThrow(/whose letter/i);
    expect(await readdir(mr.serverRoot)).toEqual([]);
  });

  it("junk is filed to the unsorted folder with no email draft", async () => {
    const l = await oneLetter(read({ type: "junk", sender: "Pizza Express", identifiers: { irdFileNo: null, brNo: null, crNo: null, mpfNo: null } }));
    expect(l).toMatchObject({ matchKind: "junk", emailBody: null });
    await approveLetter(ctx, mr, l.id);
    expect(existsSync(path.join(mr.serverRoot, "_Unsorted", "Junk", "2026-10-30 Pizza Express.pdf"))).toBe(true);
    expect(mr.drafts.all()).toHaveLength(0);
    expect(ctx.llm.callsFor("mailroom_email")).toHaveLength(0);
  });
});

describe("Undo and corrections", () => {
  it("undo removes the filed copy and the draft, and the letter goes back to review", async () => {
    const l = await oneLetter();
    await approveLetter(ctx, mr, l.id);
    const filed = (await getLetter(ctx, l.id)).filedPath!;
    await undoLetter(ctx, mr, l.id);
    expect(existsSync(filed)).toBe(false);
    expect(mr.drafts.all()).toHaveLength(0);
    expect(await getLetter(ctx, l.id)).toMatchObject({ status: "proposed", filedPath: null });
  });

  it("undo only removes the copy we filed, never an identical file staff had already saved", async () => {
    const l = await oneLetter();
    const dir = path.join(mr.serverRoot, "Clients", "ABC Trading Limited", "Tax", "2025-26");
    await mkdir(dir, { recursive: true });
    const theirs = path.join(dir, "2026-10-30 IRD demand note 2025-26.pdf");
    await writeFile(theirs, await ctx.storage.get(l.storageKey));
    await approveLetter(ctx, mr, l.id);
    await undoLetter(ctx, mr, l.id);
    expect(existsSync(theirs)).toBe(true);
    expect(await readdir(dir)).toEqual(["2026-10-30 IRD demand note 2025-26.pdf"]);
  });

  it("undo never deletes a filed copy that someone has changed since", async () => {
    const l = await oneLetter();
    await approveLetter(ctx, mr, l.id);
    const filed = (await getLetter(ctx, l.id)).filedPath!;
    await writeFile(filed, "annotated by staff");
    await expect(undoLetter(ctx, mr, l.id)).rejects.toThrow(/changed/i);
    expect(await readFile(filed, "utf8")).toBe("annotated by staff");
  });

  it("choosing a client for an unclear letter re-drafts the email in that client's language and sets its folder", async () => {
    const l = await oneLetter(read({ addressee: "Harbour Light Ltd", type: "cr_letter", identifiers: { irdFileNo: null, brNo: null, crNo: null, mpfNo: null } }), email({ subject: "Letter from the Companies Registry", body: "Dear Ann," }));
    const target = l.candidates.find((c) => c.name === "Harbour Light Limited")!;
    await chooseClient(ctx, mr, l.id, target.id);
    const after = await getLetter(ctx, l.id);
    expect(after).toMatchObject({ matchKind: "matched", clientId: target.id, folder: "Clients/Harbour Light Limited/Company secretarial" });
    expect(promptOf(ctx.llm.callsFor("mailroom_email").at(-1)!)).toContain('"language":"en"');
    expect(after.corrections).toEqual([expect.objectContaining({ field: "client", to: target.id })]);
  });

  it("a letter for a company that isn't a client is filed to the unsorted folder with no email", async () => {
    const l = await oneLetter(read({ addressee: "Dragon Gate Holdings Limited", type: "cr_letter", identifiers: { irdFileNo: null, brNo: null, crNo: "3456789", mpfNo: null } }));
    await notForAClient(ctx, mr, l.id);
    expect(await getLetter(ctx, l.id)).toMatchObject({ matchKind: "junk", clientId: null, emailBody: null, folder: "_Unsorted/Not a client" });
    await approveLetter(ctx, mr, l.id);
    expect(existsSync(path.join(mr.serverRoot, "_Unsorted", "Not a client", "2026-10-30 Companies Registry letter.pdf"))).toBe(true);
    expect(mr.drafts.all()).toHaveLength(0);
    expect((await getLetter(ctx, l.id)).corrections).toEqual([expect.objectContaining({ field: "client", to: null })]);
  });

  it("the email is drafted in the client contact's language with the letter's date and amount", async () => {
    await oneLetter();
    const req = promptOf(ctx.llm.callsFor("mailroom_email")[0]);
    expect(req).toContain('"language":"tc"');
    expect(req).toContain("2026-11-28");
    expect(req).toContain("48200");
  });

  it("staff edits to the folder, file name or email are recorded as corrections and used when filing", async () => {
    const l = await oneLetter();
    await editLetter(ctx, mr, l.id, { folder: "Clients/ABC Trading Limited/Tax/2025-26/Demand notes", fileName: "Demand note.pdf", emailBody: "陳先生您好：附上通知書。" });
    await approveLetter(ctx, mr, l.id);
    expect(existsSync(path.join(mr.serverRoot, "Clients", "ABC Trading Limited", "Tax", "2025-26", "Demand notes", "Demand note.pdf"))).toBe(true);
    expect(mr.drafts.all()[0].text).toBe("陳先生您好：附上通知書。");
    expect((await getLetter(ctx, l.id)).corrections.map((c) => c.field).sort()).toEqual(["emailBody", "fileName", "folder"]);
  });

  it("an email sent back unchanged from the browser (CRLF line endings) is not counted as a correction", async () => {
    const l = await oneLetter();
    await editLetter(ctx, mr, l.id, { emailBody: l.emailBody!.replace(/\n/g, "\r\n"), fileName: l.fileName! });
    expect((await getLetter(ctx, l.id)).corrections).toEqual([]);
  });

  it("review time per letter runs from first opening the letter to approving it", async () => {
    const l = await oneLetter();
    await openLetter(ctx, l.id);
    ctx.clock.advanceSeconds(45);
    await openLetter(ctx, l.id);
    ctx.clock.advanceSeconds(15);
    await approveLetter(ctx, mr, l.id);
    expect((await getLetter(ctx, l.id)).reviewMs).toBe(60_000);
  });
});

describe("Email drafts for Outlook", () => {
  it("an .eml draft opens in Outlook as an unsent message with the scan attached", async () => {
    const box = new EmlDraftBox(path.join(tmp, "drafts"), "mail@cwccpa.example");
    const ref = await box.save({ to: ["david@abc.example"], subject: "Letter", text: "Hello", attachments: [{ filename: "a.pdf", mime: "application/pdf", content: Buffer.from("%PDF") }] });
    const eml = await readFile(path.join(tmp, "drafts", ref), "utf8");
    expect(eml).toMatch(/^X-Unsent: 1/m);
    expect(eml).toContain("a.pdf");
    await box.remove(ref);
    expect(await readdir(path.join(tmp, "drafts"))).toEqual([]);
  });
});
