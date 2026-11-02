// The mail room's client index is a read-only copy of the firm's own records (Excel, Access,
// and the client folders on its X: drive), refreshed as they change. The firm's files stay
// the master; nothing is migrated, and letters already in review stay linked through a sync.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { firm } from "@/db/schema";
import { MemoryDraftBox } from "@/mailroom/drafts";
import type { FilingRules } from "@/mailroom/rules";
import { clients, importClients, ingestScan, processBatch, lettersFor, getLetter, chooseClient, type Mailroom } from "@/mailroom/service";
import { applyClients, clientsFromFolders, mapRows, mergeSources, readExcel, syncClients, lastSync } from "@/mailroom/client-sync";
import { writeFile } from "node:fs/promises";

const RULES: FilingRules = {
  clientFolder: "CWCHK Client Folder/{client}", unsortedFolder: "_Mail room unsorted",
  types: { ird_demand_note: { label: "IRD demand note", folder: "{codePrefix}Tax Folder", file: "{date} IRD demand note {taxYear}" } },
  fallback: { label: "Letter", folder: "", file: "{date} {sender} letter" },
};
const CWC_FOLDER = /^([A-Z]{2}\d{4}[A-Z]\d)-(.+)$/;

const read = (o: Record<string, unknown> = {}) => ({
  type: "ird_demand_note", sender: "Inland Revenue Department", addressee: "Peak Harbour Investments Limited",
  identifiers: { irdFileNo: "61/99887766", brNo: null, crNo: null, mpfNo: null },
  summaryEn: "Demand note.", actionNeeded: "Pay HK$1,000 by 28 Nov 2026", dueDate: "2026-11-28", amountHkd: 1000, taxYear: "2025-26", ...o,
});

async function pdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage().drawText("letter", { x: 50, y: 700, font: await doc.embedFont(StandardFonts.Helvetica) });
  return Buffer.from(await doc.save());
}

let ctx: TestCtx;
let mr: Mailroom;
let tmp: string;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx({ now: "2026-11-02T02:00:00Z" });
  ctx.firmId = "firm_cwc";
  await ctx.db.insert(firm).values({ id: "firm_cwc", legalName: "CWC CPA Limited", invoicePrefix: "CWC" });
  tmp = await mkdtemp(path.join(os.tmpdir(), "mailroom-clients-"));
  mr = { drafts: new MemoryDraftBox(), serverRoot: path.join(tmp, "server"), scanDir: path.join(tmp, "scans"), rules: RULES, fromAddress: "mail@cwccpa.example", firmName: "CWC CPA" };
  await mkdir(mr.serverRoot, { recursive: true });
});
afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

const CSV = "name,client_code,ird_file_no,contact_name,contact_email,language\nABC Trading Limited,AL1203A1,61/12345678,陳大文先生,david@abc.example,tc\nMingtai Supply Chain Limited,ML0871A1,61/71234567,王建国先生,wang@mingtai.example,sc";

describe("Keeping the client index in step with the firm's records", () => {
  it("re-importing the client list keeps every client's id, so letters waiting for review stay linked", async () => {
    await importClients(ctx, CSV);
    const before = await clients(ctx);
    await importClients(ctx, CSV.replace("david@abc.example", "d.chan@abc.example"));
    const after = await clients(ctx);
    expect(after.map((c) => c.id).sort()).toEqual(before.map((c) => c.id).sort());
    expect(after.find((c) => c.code === "AL1203A1")!.contactEmail).toBe("d.chan@abc.example");
  });

  it("a client gone from every source is kept but switched off: never deleted, and no longer offered for matching", async () => {
    await importClients(ctx, CSV);
    await importClients(ctx, CSV.split("\n").slice(0, 2).join("\n"));
    const mingtai = (await clients(ctx)).find((c) => c.code === "ML0871A1")!;
    expect(mingtai.active).toBe(false);
    expect((await clients(ctx, { activeOnly: true })).map((c) => c.code)).toEqual(["AL1203A1"]);
  });

  it("a new <code>-<name> folder on X: adds the client before any spreadsheet lists it; other folders are ignored", () => {
    expect(clientsFromFolders(["AL1203A1-ABC Trading Limited", "PH2001A1-Peak Harbour Investments Limited", "Archive", "_Mail room unsorted"], CWC_FOLDER))
      .toEqual([{ code: "AL1203A1", name: "ABC Trading Limited" }, { code: "PH2001A1", name: "Peak Harbour Investments Limited" }]);
  });

  it("reads the firm's Excel client list through a mapping of its own column headings", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Clients");
    ws.addRow(["Client Code", "Company Name", "IRD File No.", "Contact", "Email", "Lang"]);
    ws.addRow(["AL1203A1", "ABC Trading Limited", "61/12345678", "陳大文先生", "david@abc.example", "TC"]);
    ws.addRow([]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const rows = await readExcel(buf, { sheet: "Clients", columns: { code: "Client Code", name: "Company Name", irdFileNo: "IRD File No.", contactName: "Contact", contactEmail: "Email", language: "Lang" } });
    expect(rows).toEqual([{ code: "AL1203A1", name: "ABC Trading Limited", irdFileNo: "61/12345678", contactName: "陳大文先生", contactEmail: "david@abc.example", language: "tc" }]);
  });

  it("the same mapping applies to rows read from an Access table", () => {
    const records = [{ ClientCode: "AL1203A1", ClientName: "ABC Trading Limited", BRNo: 12345678, Email: null }];
    expect(mapRows(records, { code: "ClientCode", name: "ClientName", brNo: "BRNo", contactEmail: "Email" }))
      .toEqual([{ code: "AL1203A1", name: "ABC Trading Limited", brNo: "12345678" }]);
  });

  it("when sources disagree, the master source's value is used and the clash is recorded with both values", () => {
    const [m] = mergeSources([
      { source: "Clients.xlsx", rows: [{ code: "AL1203A1", name: "ABC Trading Limited", irdFileNo: "61/12345678" }] },
      { source: "Clients.accdb", rows: [{ code: "AL1203A1", name: "ABC Trading Limited", irdFileNo: "61/12345679", contactEmail: "david@abc.example" }] },
    ]);
    expect(m).toMatchObject({ code: "AL1203A1", irdFileNo: "61/12345678", contactEmail: "david@abc.example", sources: ["Clients.xlsx", "Clients.accdb"] });
    expect(m.conflicts).toEqual([{ field: "irdFileNo", values: [{ source: "Clients.xlsx", value: "61/12345678" }, { source: "Clients.accdb", value: "61/12345679" }] }]);
  });

  it("two rows with the same client code in one source are a clash, not two clients", () => {
    const merged = mergeSources([{ source: "Clients.xlsx", rows: [{ code: "AL1203A1", name: "ABC Trading Limited" }, { code: "AL1203A1", name: "ABC Trading Ltd" }] }]);
    expect(merged).toHaveLength(1);
    expect(merged[0].conflicts.map((c) => c.field)).toEqual(["name"]);
  });
});

describe("The scheduled sync", () => {
  it("sources that haven't changed since the last sync aren't applied again", async () => {
    const dir = path.join(tmp, "X"); await mkdir(path.join(dir, "AL1203A1-ABC Trading Limited"), { recursive: true });
    const sources = [{ kind: "folders" as const, name: "X: folders", path: dir, pattern: CWC_FOLDER.source }];
    expect((await syncClients(ctx, mr, sources))).toMatchObject({ applied: true, added: 1 });
    expect((await syncClients(ctx, mr, sources))).toMatchObject({ applied: false });
    await mkdir(path.join(dir, "PH2001A1-Peak Harbour Investments Limited"));
    expect((await syncClients(ctx, mr, sources))).toMatchObject({ applied: true, added: 1 });
  });

  it("a source that can't be read leaves the client list as it was and reports why", async () => {
    await importClients(ctx, CSV);
    const r = await syncClients(ctx, mr, [{ kind: "csv", name: "Clients.csv", path: path.join(tmp, "missing.csv"), columns: { name: "name" } }]);
    expect(r).toMatchObject({ applied: false, error: expect.stringMatching(/Clients\.csv/) });
    expect((await clients(ctx, { activeOnly: true })).map((c) => c.code).sort()).toEqual(["AL1203A1", "ML0871A1"]);
    expect(await lastSync(ctx)).toMatchObject({ error: expect.stringMatching(/Clients\.csv/) });
  });
});

describe("Letters that arrived before their client was known", () => {
  async function waitingLetter() {
    await importClients(ctx, CSV);
    ctx.llm.set("mailroom_read", read());
    ctx.llm.set("mailroom_email", { subject: "IRD demand note", body: "Dear Ms Lee," });
    const b = await ingestScan(ctx, mr, { filename: "scan.pdf", content: await pdf() });
    await processBatch(ctx, mr, b!.id);
    return (await lettersFor(ctx, b!.id))[0];
  }

  it("a sync that brings in the letter's client matches it and drafts the email, for staff to approve as usual", async () => {
    const l = await waitingLetter();
    expect(l.matchKind).toBe("ask");
    const r = await applyClients(ctx, mr, mergeSources([{ source: "X: folders", rows: [{ code: "PH2001A1", name: "Peak Harbour Investments Limited", irdFileNo: "61/99887766", contactName: "Ms Lee", contactEmail: "lee@peak.example", language: "en" }] }]), { deactivateMissing: false });
    expect(r.rematched).toBe(1);
    expect(await getLetter(ctx, l.id)).toMatchObject({ status: "proposed", matchKind: "matched", matchReason: "IRD file number 61/99887766", folder: "CWCHK Client Folder/PH2001A1-Peak Harbour Investments Limited/PH2001A1-Tax Folder", emailTo: "lee@peak.example" });
  });

  it("a letter staff have already decided is left alone by a sync", async () => {
    const l = await waitingLetter();
    const abc = (await clients(ctx)).find((c) => c.code === "AL1203A1")!;
    await chooseClient(ctx, mr, l.id, abc.id);
    const r = await applyClients(ctx, mr, mergeSources([{ source: "X: folders", rows: [{ code: "PH2001A1", name: "Peak Harbour Investments Limited", irdFileNo: "61/99887766" }] }]), { deactivateMissing: false });
    expect(r.rematched).toBe(0);
    expect((await getLetter(ctx, l.id)).clientId).toBe(abc.id);
  });
});
