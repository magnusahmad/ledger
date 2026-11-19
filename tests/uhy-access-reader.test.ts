// UHY's Access admin database issues client codes. The reader opens the database itself (never its
// .laccdb lock file), lists tables and columns before any mapping exists, and maps one table by
// column name. No .accdb fixture can be written on this machine, so table access goes through a
// small interface; the mdb-reader adapter itself is verified on the pilot machine.
import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describeAccess, readAccessClients, openAccess, findAccessCopy, type AccessDb } from "@/integrations/uhy/access";

function fakeDb(tables: Record<string, { columns: { name: string; type: string }[]; rows: Record<string, unknown>[] }>): AccessDb {
  return {
    tableNames: () => Object.keys(tables),
    table: (n) => {
      const t = tables[n];
      if (!t) throw new Error(`no table ${n}`);
      return { columns: t.columns, rowCount: t.rows.length, rows: () => t.rows };
    },
  };
}

const db = fakeDb({
  Clients: {
    columns: [{ name: "ClientCode", type: "text" }, { name: "CoName", type: "text" }, { name: "ChiName", type: "text" }, { name: "OpenDate", type: "datetime" }],
    rows: [
      { ClientCode: " x101 ", CoName: "Harbour Lantern Limited", ChiName: "港燈籠有限公司", OpenDate: new Date(Date.UTC(2017, 9, 12)) },
      { ClientCode: "X101B", CoName: "Harbour Lantern Limited", ChiName: null, OpenDate: new Date(Date.UTC(2024, 0, 3)) },
      { ClientCode: null, CoName: "No Code Limited", ChiName: null, OpenDate: null },
    ],
  },
});

describe("Access discovery", () => {
  it("lists tables, column names, types and row counts, and no values", () => {
    const d = describeAccess(db);
    expect(d).toEqual([{ table: "Clients", rowCount: 3, columns: [{ name: "ClientCode", type: "text" }, { name: "CoName", type: "text" }, { name: "ChiName", type: "text" }, { name: "OpenDate", type: "datetime" }] }]);
    expect(JSON.stringify(d)).not.toContain("Harbour");
  });
});

describe("Access client list", () => {
  it("maps the client table by column name and upper-cases codes", () => {
    const r = readAccessClients(db, { table: "Clients", columns: { code: "ClientCode", nameEn: "CoName", nameZh: "ChiName", openedOn: "OpenDate" } });
    expect(r.missingColumns).toEqual([]);
    expect(r.rows[0]).toEqual({ code: "X101", nameEn: "Harbour Lantern Limited", nameZh: "港燈籠有限公司", openedOn: "2017-10-12" });
    expect(r.skippedRows).toBe(1);
  });

  it("a returning client with a new code stays a separate row with the same name", () => {
    const r = readAccessClients(db, { table: "Clients", columns: { code: "ClientCode", nameEn: "CoName" } });
    expect(r.rows.map((x) => x.code)).toEqual(["X101", "X101B"]);
    expect(r.sameNameCodes).toEqual([{ nameEn: "Harbour Lantern Limited", codes: ["X101", "X101B"] }]);
  });

  it("a mapped column the table doesn't have is reported, not guessed", () => {
    const r = readAccessClients(db, { table: "Clients", columns: { code: "ClientCode", nameEn: "CoName", nameZh: "Chinese Name" } });
    expect(r.missingColumns).toEqual(["nameZh (Chinese Name)"]);
    expect(r.rows[0].nameZh).toBeUndefined();
  });

  it("a mapping without the code or name column is refused", () => {
    expect(() => readAccessClients(db, { table: "Clients", columns: { code: "Ref", nameEn: "CoName" } })).toThrow(/Ref/);
  });
});

describe("opening the database", () => {
  it("the .laccdb lock file is refused and the database beside it is named", async () => {
    await expect(openAccess("F:\\Co-sec\\Admin\\Clients.laccdb")).rejects.toThrow(/lock file.*Clients\.accdb/);
    await expect(openAccess("F:\\Co-sec\\Admin\\Clients.ldb")).rejects.toThrow(/lock file.*Clients\.mdb/);
  });

  it("a file that is not an Access database is refused", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "acc-"));
    const f = path.join(dir, "Clients.accdb");
    await writeFile(f, "not a database");
    await expect(openAccess(f)).rejects.toThrow();
  });
});

// UHY keeps the Access database on a QNAP SmartShare link that staff can only reach through a browser.
// Someone downloads it once a week into a folder on the pilot machine; the reader takes the newest
// copy there and says how old it is, so a missed week is visible instead of silently stale.
describe("weekly Access downloads", () => {
  const now = new Date("2026-11-19T09:00:00Z");
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
  async function folder(files: Record<string, number>) {
    const dir = await mkdtemp(path.join(tmpdir(), "uhy-access-"));
    for (const [name, age] of Object.entries(files)) { const f = path.join(dir, name); await writeFile(f, "x"); await utimes(f, daysAgo(age), daysAgo(age)); }
    return dir;
  }

  it("a folder of weekly downloads uses the newest Access copy", async () => {
    const dir = await folder({ "Clients (1).accdb": 15, "Clients (2).accdb": 8, "Clients.accdb": 1 });
    const s = await findAccessCopy(dir, { now });
    expect(path.basename(s.file)).toBe("Clients.accdb");
  });

  it("lock files and other files in the folder are never picked as the database", async () => {
    const dir = await folder({ "Clients.accdb": 6, "Clients.laccdb": 0, "notes.xlsx": 0, "Old.mdb": 9 });
    expect(path.basename((await findAccessCopy(dir, { now })).file)).toBe("Clients.accdb");
  });

  it("an empty folder says no Access copy has been downloaded yet", async () => {
    const dir = await folder({ "readme.txt": 0 });
    await expect(findAccessCopy(dir, { now })).rejects.toThrow(/No Access copy .*downloaded/);
  });

  it("a copy within 10 days carries its age and no warning", async () => {
    const s = await findAccessCopy(await folder({ "Clients.accdb": 6 }), { now });
    expect(s).toMatchObject({ ageDays: 6, warning: null });
    expect(s.copiedAt.toISOString()).toBe(daysAgo(6).toISOString());
  });

  it("a copy older than 10 days warns staff and names its age, but is still read", async () => {
    const s = await findAccessCopy(await folder({ "Clients.accdb": 12 }), { now });
    expect(s.ageDays).toBe(12);
    expect(s.warning).toMatch(/12 days old/);
  });

  it("the warning threshold can be changed for the installation", async () => {
    const s = await findAccessCopy(await folder({ "Clients.accdb": 6 }), { now, maxAgeDays: 5 });
    expect(s.warning).toMatch(/6 days old/);
  });

  it("a single file path still works and reports its age", async () => {
    const dir = await folder({ "Clients.accdb": 3 });
    const s = await findAccessCopy(path.join(dir, "Clients.accdb"), { now });
    expect(s).toMatchObject({ ageDays: 3, warning: null });
  });

  it("a lock file given directly is refused, naming the database beside it", async () => {
    const dir = await folder({ "Clients.accdb": 3, "Clients.laccdb": 0 });
    await expect(findAccessCopy(path.join(dir, "Clients.laccdb"), { now })).rejects.toThrow(/Clients\.accdb/);
  });
});
