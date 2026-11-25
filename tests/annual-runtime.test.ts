// The annual worker builds its links to outside systems from the installation's settings
// (src/annual/runtime.ts). A setting that names a file which is not there must not stop the worker:
// the part that needs the file is reported as failing by name, and everything else keeps running.
// Found on the first installation (DECISIONS.md #67), where a mapping file not yet copied to the
// machine stopped the worker from starting at all.
import { describe, it, expect } from "vitest";
import { loadConfig } from "@/lib/config";
import { csaOpener, cycleDeps, recordsFromConfig } from "@/annual/runtime";

const missing = "/nonexistent/clerk-test/csa-mapping.json";
const c = () => loadConfig({ CSA_SQL_CONNECTION: "Server=.;Database=CSA_Copy", CSA_MAPPING_FILE: missing, CSA_RESTORE_STATUS_FILE: "/nonexistent/clerk-test/restore-status.json" });

describe("annual worker settings", () => {
  it("a mapping file that is not there does not stop the worker from starting", () => {
    expect(() => recordsFromConfig(c())).not.toThrow();
    expect(() => cycleDeps(c())).not.toThrow();
  });

  it("bringing in a newer copy then fails with the missing file's name, so the health page says what to fix", async () => {
    const open = csaOpener(c());
    expect(open).not.toBeNull();
    await expect(open!()).rejects.toThrow(/mapping file.*csa-mapping\.json.*does not exist/i);
  });

  it("an installation with no connection to the records copy has nothing to open", () => {
    expect(csaOpener(loadConfig({}))).toBeNull();
    expect(csaOpener(loadConfig({ CSA_MAPPING_FILE: missing }))).toBeNull();
  });
});
