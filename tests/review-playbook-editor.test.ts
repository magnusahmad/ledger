import { beforeEach, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { getPlaybook, listPlaybooks, loadPlaybookLibrary, savePlaybookVersion } from "@/domain/playbooks";
import { getTask, startTask } from "@/domain/engine";
import { generateForTask } from "@/documents/generate";
import { firm, playbook, document } from "@/db/schema";
import type { PlaybookDef } from "@/domain/playbook-types";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); });
const save = (pb: PlaybookDef) => savePlaybookVersion(ctx, pb.id, pb.version, JSON.stringify(pb));

it("editing a playbook saves a new immutable version and keeps existing tasks on their original definition", async () => {
  const old = await getPlaybook(ctx, "hk.changeOffice");
  const existing = await startTask(ctx, { clientId: "cli_c1", playbookId: old.id });
  const draft = structuredClone(old); draft.feeCents += 15000; draft.name.tc = "更改註冊地址（已審閱）";
  const saved = await save(draft);
  expect(saved.version).toBe(old.version + 1);
  expect(await getPlaybook(ctx, old.id, old.version)).toEqual(old);
  expect(await getPlaybook(ctx, old.id)).toEqual({ ...draft, version: old.version + 1 });
  expect((await getTask(ctx, existing.id)).playbookVersion).toBe(old.version);
  const future = await startTask(ctx, { clientId: "cli_c1", playbookId: old.id });
  expect(future.playbookVersion).toBe(saved.version);
  expect((await listPlaybooks(ctx)).filter(p => p.id === old.id)).toEqual([saved]);
  await loadPlaybookLibrary(ctx);
  expect(await getPlaybook(ctx, old.id, saved.version)).toEqual(saved);
});

it("concurrent or stale playbook editors cannot overwrite a more recent version", async () => {
  const old = await getPlaybook(ctx, "hk.changeOffice");
  const results = await Promise.allSettled([save({ ...old, feeCents: 20000 }), save({ ...old, feeCents: 30000 })]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  const rejected = results.find(r => r.status === "rejected") as PromiseRejectedResult;
  expect(String(rejected.reason)).toMatch(/changed|newer|reload/i);
  expect((await getPlaybook(ctx, old.id)).version).toBe(old.version + 1);
});

it("a firm cannot edit another firm's private playbook or alter its shared library version", async () => {
  await ctx.db.insert(firm).values({ id: "firm_other", legalName: "Other Firm", invoicePrefix: "OTHER-" });
  const other = { ...ctx, firmId: "firm_other" };
  await loadPlaybookLibrary(other);
  const own = await getPlaybook(ctx, "hk.changeOffice");
  await save({ ...own, feeCents: 90000 });
  expect(await getPlaybook(other, own.id)).toEqual(own);
  const privatePb = { ...own, id: "hk.otherPrivate" };
  await ctx.db.insert(playbook).values({ firmId: other.firmId, id: privatePb.id, version: privatePb.version, jurisdiction: "HK", def: privatePb });
  await expect(save(privatePb)).rejects.toThrow(/not found/i);
  expect(await getPlaybook(other, privatePb.id)).toEqual(privatePb);
});

it("malformed JSON, unknown templates, unknown or duplicate requirements and unsafe steps never write a version", async () => {
  const old = await getPlaybook(ctx, "hk.changeOffice");
  await expect(savePlaybookVersion(ctx, old.id, old.version, "{broken")).rejects.toThrow(/JSON/i);
  const mutations: [string, (p: PlaybookDef) => void][] = [
    ["template", p => { p.documents[0].template = "tpl:made-up"; }],
    ["requirements", p => { p.requirements.push({ key: "made-up" }); }],
    ["duplicate", p => { p.requirements.push(p.requirements[0]); }],
    ["steps", p => { p.steps[0].kind = "execute_code" as never; }],
    ["human", p => { p.steps.find(s => s.kind === "file")!.human = false; }],
    ["generate", p => { p.steps = p.steps.filter(s => s.kind !== "generate"); }],
    ["collect", p => { p.steps = p.steps.filter(s => s.kind !== "collect"); }],
    ["register", p => { p.steps = p.steps.filter(s => s.kind !== "register"); }],
    ["feeCents", p => { p.feeCents = -1; }],
    ["id", p => { p.id = "hk.changed"; }],
  ];
  for (const [message, mutate] of mutations) {
    const draft = structuredClone(old); mutate(draft);
    await expect(savePlaybookVersion(ctx, old.id, old.version, JSON.stringify(draft))).rejects.toThrow(new RegExp(message, "i"));
  }
  const versions = await ctx.db.select().from(playbook).where(and(eq(playbook.firmId, ctx.firmId), eq(playbook.id, old.id)));
  expect(versions).toHaveLength(1);
  expect(await getPlaybook(ctx, old.id)).toEqual(old);
});

it("meeting minutes edits require complete recorded facts and a manual chair-signature task", async () => {
  const draft = structuredClone(await getPlaybook(ctx, "hk.changeOffice"));
  draft.documents = [{ template: "tpl:board-meeting-minutes", name: "Recorded board minutes", signers: "none", wetInk: true }];
  draft.steps = [{ kind: "collect", label: "Record meeting" }, { kind: "generate", label: "Prepare minutes" }, { kind: "task", label: "Verify chair signature", human: true }];
  draft.registerEffects = [];
  await expect(save(draft)).rejects.toThrow(/meetingDate/);
  draft.requirements = ["meetingDate", "meetingTime", "meetingPlace", "meetingChair", "meetingAttendees", "meetingDecisions"].map(key => ({ key }));
  draft.documents[0].signers = "chair";
  await expect(save(draft)).rejects.toThrow(/signers/);
  draft.documents[0].signers = "none";
  draft.steps.pop();
  await expect(save(draft)).rejects.toThrow(/human task/);
  draft.steps.push({ kind: "task", label: "Verify chair signature", human: true });
  const next = await save(draft);
  expect(next.documents).toEqual(draft.documents);
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: next.id, extracted: {
    meetingDate: { value: "2026-09-28" }, meetingTime: { value: "14:30" }, meetingPlace: { value: "Hong Kong office 香港辦公室" },
    meetingChair: { value: "CHAN Tai Man" }, meetingAttendees: { value: "CHAN Tai Man; WONG Mei Ling" }, meetingDecisions: { value: "The directors approved moving the registered office." },
  } });
  const generated = await generateForTask(ctx, t.id);
  expect(generated).toHaveLength(1);
  const [stored] = await ctx.db.select().from(document).where(eq(document.id, generated[0].id));
  expect(stored.extractedText).toContain("CHAN Tai Man");
  expect(stored.extractedText).toContain("The directors approved moving the registered office.");
  expect(stored.extractedText).toContain("14:30");
});
