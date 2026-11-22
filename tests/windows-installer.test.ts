// The pilot installer runs on Windows 11 with PowerShell 5.1, where it has never been run before
// the first installation. These checks read the scripts as text and protect the rules that came out
// of reviewing them for Windows (DECISIONS.md #66); they cannot prove the scripts work.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const read = (f: string) => readFileSync(path.join(root, f), "utf8");
const code = (f: string) => read(f).split("\n").filter((l) => !l.trim().startsWith("#")).join("\n");

describe("Windows installer", () => {
  it("installs packages with the development tools, because the worker and migrations run through tsx", () => {
    expect(code("deploy/windows/install.ps1")).toMatch(/npm\.cmd ci --include=dev/);
  });

  it("calls npm.cmd, never the PowerShell shim that a locked-down machine refuses to run", () => {
    expect(code("deploy/windows/install.ps1")).not.toMatch(/(^|[\s;{(])npm (ci|run|install)\b/m);
  });

  it("stops the running services before replacing the app's files, so an upgrade isn't blocked by files in use", () => {
    const s = code("deploy/windows/install.ps1");
    expect(s.indexOf("Stop-Service")).toBeGreaterThan(-1);
    expect(s.indexOf("Stop-Service")).toBeLessThan(s.indexOf("robocopy"));
  });

  it("sets the service account through Windows itself, so it doesn't depend on which WinSW version was downloaded", () => {
    const s = code("deploy/windows/install.ps1");
    expect(s).toMatch(/Win32_Service/);
    expect(s).not.toMatch(/install --username/);
  });

  it("the services and scheduled jobs start PowerShell with the policy set for that process only", () => {
    for (const f of ["deploy/windows/services/clerk-web.xml", "deploy/windows/services/clerk-worker.xml", "clients/uhy/ops/register-csa-restore.ps1"])
      expect(read(f), f).toMatch(/-ExecutionPolicy Bypass -File/);
  });

  it("the scheduled CSA restore points at the script where the installer puts it", () => {
    expect(code("clients/uhy/ops/register-csa-restore.ps1")).toMatch(/C:\\Clerk\\app\\clients\\uhy\\ops\\csa-restore\.ps1/);
  });

  it("the proxy config uses forward slashes for the certificate files, which Caddy reads the same on every system", () => {
    expect(read("deploy/windows/Caddyfile")).toMatch(/tls C:\/Clerk\/certs\/server\.crt C:\/Clerk\/certs\/server\.key/);
  });

  it("scripts that Windows PowerShell 5.1 runs contain only plain ASCII, so the machine's code page can't garble them", () => {
    for (const f of ["install.ps1", "run-service.ps1", "secrets.ps1", "pg-backup.ps1", "clerk-env.ps1"].map((n) => `deploy/windows/${n}`))
      expect(/[^\x00-\x7F]/.test(read(f)), f).toBe(false);
  });

  it("the guide tells the operator to allow scripts for that PowerShell window only, and to run the two setup commands through node", () => {
    const g = read("deploy/windows/README.md");
    expect(g).toMatch(/Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass/);
    expect(g).toMatch(/node node_modules\\tsx\\dist\\cli\.mjs scripts\\firm-init\.ts/);
    expect(g).not.toMatch(/npm run (firm:init|user:add)/);
  });
});
