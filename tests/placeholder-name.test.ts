import { beforeEach, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, goodDraft, factsOf } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { createPerson, getPersonProtected } from "@/domain/records";
import { resolvePerson } from "@/domain/people";
import { createRequest, startTask, getTask } from "@/domain/engine";
import { ingestMessage, processInbound, writePersonParticulars } from "@/domain/inbound";
import { pendingProposals } from "@/domain/proposals";
import { portalUpload } from "@/domain/portal";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
});

async function unnamedTask() {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const person = await resolvePerson(ctx, "cli_c1", {});
  const task = await startTask(ctx, { clientId: "cli_c1", requestId: req.id, playbookId: "hk.appointDirector", personId: person.id });
  return { req, person, task };
}

it.each(["Unnamed person", " UNNAMED PERSON ", "   "])("a placeholder or blank name (%s) remains required rather than being treated as on file", async nameEn => {
  const p = await createPerson(ctx, { nameEn });
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p.id });
  expect(t.checklist.find(e => e.key === "fullName")).toMatchObject({ status: "needed" });
  expect(t.checklist.find(e => e.key === "fullName")?.value).toBeUndefined();
});

it.each(["LEE Siu Ling", "李小玲"])("a real recorded name (%s) is reused without asking for it again", async nameEn => {
  const p = await createPerson(ctx, { nameEn });
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p.id });
  expect(t.checklist.find(e => e.key === "fullName")).toMatchObject({ status: "on_file", value: nameEn });
});

it.each(["en", "tc", "sc"] as const)("a director not named in the email is requested in the %s draft facts, independently of the sender's display name", async language => {
  ctx.llm.on("intake", intake({ language, actions: [action({ type: "start_request", playbookId: "hk.appointDirector", person: { mode: "new", personId: null, nameEn: null, nameZh: null, email: null } })] }));
  ctx.llm.on("draft", goodDraft);
  const msg = await ingestMessage(ctx, { channel: "email", provider: "fake", providerMessageId: "unnamed-director", from: { email: "director@kbtrading.example", name: "CHAN Tai Man" }, to: [ctx.mail.address], cc: [], subject: "Director", text: "Please appoint a new director.", receivedAt: ctx.clock.now(), attachments: [] });
  await processInbound(ctx, msg.id);
  const facts = factsOf(ctx.llm.callsFor("draft")[0]) as { newRequests: { needed: string[]; onFile: string[] }[] };
  const fullNameLabel = { en: "Full name as shown on ID", tc: "全名（與身份證明文件相同）", sc: "全名（与身份证明文件相同）" }[language];
  expect(facts.newRequests[0].needed).toContain(fullNameLabel);
  expect(facts.newRequests[0].onFile).not.toContain(fullNameLabel);
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("a real name subsequently supplied in a message fills an unnamed person's record without creating a conflict", async () => {
  const { person } = await unnamedTask();
  expect(await writePersonParticulars(ctx, person.id, { fullName: { value: "LEE Siu Ling", source: "Her name is LEE Siu Ling" } }, "cli_c1")).toEqual([]);
  expect((await getPersonProtected(ctx, person.id)).nameEn).toBe("LEE Siu Ling");
  expect(await pendingProposals(ctx, { kind: "conflict" })).toHaveLength(0);
});

it("an uploaded ID can supply the real name for an unnamed person without conflicting with the placeholder", async () => {
  const { req, person, task } = await unnamedTask();
  ctx.llm.on("extract", { fields: [{ key: "fullName", value: "LEE Siu Ling", quote: "LEE Siu Ling" }], documents: [], conflicts: [] });
  await portalUpload(ctx, req.uploadToken, { taskId: task.id, key: "idCopy", filename: "fictional-id.jpg", mime: "image/jpeg", content: await readFile("tests/fixtures/upload-corpus/readable-scan.jpg") });
  expect(ctx.llm.callsFor("extract")).toHaveLength(1);
  expect((await getPersonProtected(ctx, person.id)).nameEn).toBe("LEE Siu Ling");
  expect((await getTask(ctx, task.id)).checklist.find(e => e.key === "fullName")).toMatchObject({ status: "received", value: "LEE Siu Ling" });
  expect(await pendingProposals(ctx, { kind: "conflict" })).toHaveLength(0);
});

it("a different name still conflicts with a real recorded name and cannot overwrite it without approval", async () => {
  const p = await createPerson(ctx, { nameEn: "LEE Siu Ling" });
  expect(await writePersonParticulars(ctx, p.id, { fullName: { value: "CHAN Mei Ling" } }, "cli_c1")).toEqual(["fullName"]);
  expect((await getPersonProtected(ctx, p.id)).nameEn).toBe("LEE Siu Ling");
  expect(await pendingProposals(ctx, { kind: "conflict" })).toHaveLength(1);
});
