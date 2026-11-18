// UHY's Access admin database issues client codes. The reader opens the database itself (never its
// .laccdb lock file), lists tables and columns before any mapping exists, and maps one table by
// column name. No .accdb fixture can be written on this machine, so table access goes through a
// small interface; the mdb-reader adapter itself is verified on the pilot machine.
import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describeAccess, readAccessClients, openAccess, type AccessDb } from "@/integrations/uhy/access";

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
