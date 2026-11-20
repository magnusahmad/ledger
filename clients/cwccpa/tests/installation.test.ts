// CWCCPA's installation: the mail room only, filing into the firm's own X: drive layout and reading
// its own client list. The anonymised demo (seed/mailroom, "XYZ CPA") is for outside audiences and
// must never be what CWCCPA's installation runs on (DECISIONS.md #57, #58, #65).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadConfig } from "@/lib/config";
import { enabledModules, productionProblems } from "@/lib/modules";
import { fileTarget, type FilingRules } from "@/mailroom/rules";
import { clientsFromFolders, type ClientSource } from "@/mailroom/client-sync";
import type { MailroomRead } from "@/db/schema";

const root = path.resolve(__dirname, "../../..");
const config = () => loadConfig({ INSTALLATION_PROFILE: "cwccpa" });
const json = <T>(file: string) => JSON.parse(readFileSync(path.join(root, file), "utf8")) as T;
// Stand-ins for what is set on the machine: secrets, and the sender address CWCCPA has yet to give.
const machine = { INSTALLATION: "production", AUTH: "1", DEMO_TOOLS: "0", APP_SECRET: "s".repeat(48), or_api_key: "k", LLM_MODE: "live", DATABASE_URL: "postgres://clerk@localhost/clerk_cwccpa" };

describe("CWCCPA installation", () => {
  it("loads only the mail room, for CWCCPA's firm", () => {
    const c = config();
    expect([...enabledModules(c)]).toEqual(["mailroom"]);
    expect(c).toMatchObject({ FIRM_ID: "firm_cwc", MAILROOM_FIRM_NAME: "CWC CPA" });
  });

  it("files a tax letter into the client's Tax Folder under CWCCPA's X: drive layout, not the demo's", () => {
    const rules = json<FilingRules>(config().MAILROOM_RULES);
    const t = fileTarget(rules, { type: "ird_demand_note", taxYear: "2025-26", sender: "IRD" } as MailroomRead, { folder: "FL1401A1-Example Trading Limited", code: "FL1401A1" }, "2026-11-20");
    expect(t).toEqual({ folder: "CWCHK Client Folder/FL1401A1-Example Trading Limited/FL1401A1-Tax Folder", fileName: "2026-11-20 IRD demand note 2025-26.pdf" });
    expect(rules.display).toEqual({ root: "X:\\", separator: "\\" });
  });

  it("reads its client list from CWCCPA's own Excel list and client folders, matched on its client codes", () => {
    const sources = json<ClientSource[]>(config().MAILROOM_CLIENT_SOURCES);
    expect(sources.map((s) => s.path)).toEqual(["{server}/Admin/CWC client list.xlsx", "{server}/CWCHK Client Folder"]);
    const folders = sources.find((s) => s.kind === "folders") as Extract<ClientSource, { kind: "folders" }>;
    expect(clientsFromFolders(["FL1401A1-Example Trading Limited", "Old files"], new RegExp(folders.pattern))).toEqual([expect.objectContaining({ code: "FL1401A1" })]);
  });

  it("refuses to start in production until its own sender address is set, then starts", () => {
    expect(productionProblems(loadConfig({ INSTALLATION_PROFILE: "cwccpa", ...machine })).join(" ")).toMatch(/MAILROOM_FROM/);
    expect(productionProblems(loadConfig({ INSTALLATION_PROFILE: "cwccpa", ...machine, MAILROOM_FROM: "mail@firm.example" }))).toEqual([]);
  });
});
