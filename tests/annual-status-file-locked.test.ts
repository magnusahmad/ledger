// The status workbook and review log sit on the firm's share, where staff open them in Excel.
// Windows refuses to replace a file that is open, so the write fails there (it never does on a Mac).
// Staff should be told in plain words, and nothing half-written may be left on their share.
import { describe, it, expect } from "vitest";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { atomicWrite } from "@/annual/writeback";

const refuse = (code: string) => async () => { throw Object.assign(new Error(`${code}: operation not permitted`), { code }); };

describe("replacing a status file on the share", () => {
  it("a file that is open on someone's computer is reported in plain words, the old file is kept and no temporary file is left behind", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "status-"));
    const file = path.join(dir, "Clerk annual returns.xlsx");
    await writeFile(file, "old");
    for (const code of ["EBUSY", "EPERM", "EACCES"])
      await expect(atomicWrite(file, "new", refuse(code))).rejects.toThrow(/"Clerk annual returns\.xlsx" is open on someone's computer/);
    expect(await readFile(file, "utf8")).toBe("old");
    expect(await readdir(dir)).toEqual(["Clerk annual returns.xlsx"]);
  });

  it("any other failure is reported as it is, also without leaving a temporary file", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "status-"));
    await expect(atomicWrite(path.join(dir, "log.csv"), "x", refuse("ENOSPC"))).rejects.toThrow(/ENOSPC/);
    expect(await readdir(dir)).toEqual([]);
  });

  it("a file that is not open is replaced in one step", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "status-"));
    const file = path.join(dir, "log.csv");
    await writeFile(file, "old");
    await atomicWrite(file, "new");
    expect(await readFile(file, "utf8")).toBe("new");
    expect(await readdir(dir)).toEqual(["log.csv"]);
  });
});
