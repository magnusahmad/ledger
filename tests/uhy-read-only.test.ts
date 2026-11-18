// The UHY pilot never writes to CSA, Access or DN (pilot brief, "Principles"; decision #55).
// The DN reader's byte-for-byte check is in uhy-dn-reader.test.ts; this file guards the code paths:
// the source readers contain no write calls, the CSA query function refuses anything but SELECT,
// and the restore script only ever restores a copy and never connects to the live CSA instance.
import { describe, it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const readerFiles = async () => {
  const dir = path.join(root, "src/integrations/uhy");
  return Promise.all((await readdir(dir)).filter((f) => f.endsWith(".ts")).map(async (f) => ({ f, src: await readFile(path.join(dir, f), "utf8") })));
};

describe("no reader writes to CSA, Access or DN", () => {
  it("the DN and Access readers contain no file-writing calls", async () => {
    const files = await readerFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const { f, src } of files) {
      expect(src, f).not.toMatch(/\b(writeFile|appendFile|unlink|rename|rm|copyFile|createWriteStream|mkdir)\s*\(/);
      expect(src, f).not.toMatch(/\.xlsx\.write|\.csv\.write/);
    }
  });

  it("the CSA reader refuses any statement other than SELECT", async () => {
    const src = await readFile(path.join(root, "src/integrations/csa/sql-source.ts"), "utf8");
    expect(src).toMatch(/must be SELECT statements/);
  });

  it("the CSA restore script never connects to the live CSA instance and leaves the copy read-only", async () => {
    const ps = await readFile(path.join(root, "scripts/uhy/csa-restore.ps1"), "utf8");
    const code = ps.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n");
    expect(code).not.toMatch(/CSAEXPERT/i);
    expect(code).not.toMatch(/(Database|Initial Catalog)\s*=\s*\[?CSA_Expert_1\b/i);
    expect(code).not.toMatch(/USE\s+\[?CSA_Expert_1\b/i);
    expect(code).toMatch(/SET READ_ONLY/);
    expect(code).toMatch(/RESTORE HEADERONLY/);
  });
});
