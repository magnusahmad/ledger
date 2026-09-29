import { beforeEach, expect, it } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { allPlaybookFiles, getPlaybook } from "@/domain/playbooks";
import { startTask } from "@/domain/engine";
import { applyRegisterChanges, planRegisterChanges } from "@/domain/register-effects";
import { officersAsAt } from "@/domain/records";
import { loadDocContext } from "@/documents/context";
import { secretaryResignationValues } from "@/documents/secretary-resignation";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });
it("the library offers secretary self-notification by ND4 with explicit notice and signatory requirements", async () => {
  const pb = allPlaybookFiles().find(p => p.id === "hk.resignSecretary");
  expect(pb?.forms).toBe("ND4");
  expect(pb?.requirements.map(r => r.key)).toEqual(expect.arrayContaining(["lastDay", "resignationNoticeBasis", "resigningSignatory"]));
});
it("a secretary resignation ends only the selected secretary and preserves the historical appointment", async () => {
  expect(allPlaybookFiles().some(p => p.id === "hk.resignSecretary")).toBe(true);
  await getPlaybook(ctx, "hk.resignSecretary");
  const t = await startTask(ctx, { clientId: "cli_c1", personId: "per_firm", playbookId: "hk.resignSecretary", extracted: { lastDay: { value: "2026-10-01" } } });
  await applyRegisterChanges(ctx, t.id);
  expect((await officersAsAt(ctx, "cli_c1", "2026-09-30", "secretary")).map(o=>o.personId)).toContain("per_firm");
  expect(await officersAsAt(ctx, "cli_c1", "2026-10-01", "secretary")).toHaveLength(0);
  expect(await officersAsAt(ctx, "cli_c1", "2026-10-01", "director")).toHaveLength(1);
});

it("a secretary resignation cannot target a person who is only a director", async () => {
  const t = await startTask(ctx, { clientId: "cli_c1", personId: "per_p1", playbookId: "hk.resignSecretary", extracted: { lastDay: { value: "2026-10-01" } } });
  await expect(planRegisterChanges(ctx, t.id)).rejects.toThrow(/secretary/i);
});

it("ND4 identifies the corporate secretary and requires an explicit notice declaration and signatory", async () => {
  const t = await startTask(ctx, { clientId: "cli_c1", personId: "per_firm", playbookId: "hk.resignSecretary", extracted: { lastDay: { value: "2026-10-01" }, resignationNoticeBasis: { value: "notice_copy" }, resigningSignatory: { value: "CHAN Authorised" } } });
  const c = await loadDocContext(ctx, t.id);
  const fields = secretaryResignationValues(c);
  expect(fields["fill_10_P.1"]).toBe(c.person!.nameEn);
  expect(fields["cb_2_P.2"]).toBe(true);
  expect(fields["cb_1_P.2"]).toBeUndefined();
  expect(fields["fill_2_P.2"]).toBe("CHAN Authorised");
  expect(fields["fill_3_P.2"]).toBe(c.today.split("-").reverse().join("/"));
  expect(() => secretaryResignationValues({ ...c, values: { ...c.values, resignationNoticeBasis: "" } })).toThrow(/notice declaration/i);
  expect(() => secretaryResignationValues({ ...c, officers: [] })).toThrow(/current secretary/i);
});
