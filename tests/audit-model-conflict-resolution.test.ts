import { beforeEach, expect, it } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { goodDraft, review } from "./agent-fixtures";
import { startManualRequest } from "@/domain/manual";
import { type Extracted, getTask } from "@/domain/engine";
import { approveProposal, createProposal } from "@/domain/proposals";
import { appointment, person } from "@/db/schema";
import { applyReview } from "@/agent/review";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx(); await seedDemo(ctx);
  ctx.llm.on("draft", goodDraft); ctx.llm.on("review", review({ items: [] }));
});
it("an information review cannot overwrite an already received address by omitting its conflict assessment", async () => {
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice", fields: { newAddr: "ORIGINAL ADDRESS 九龍" } }], confirm: false });
  const options: { clientId: string; kind: "information" } = { clientId: "cli_c1", kind: "information" };
  await applyReview(ctx, r.taskIds[0], review({ items: [{ key: "newAddr", personId: null, status: "received", value: "CONFLICTING ADDRESS 深圳", reason: "New field despite no model conflict" }] }), options);
  expect((await getTask(ctx, r.taskIds[0])).checklist.find(e => e.key === "newAddr")?.value).toBe("ORIGINAL ADDRESS 九龍");
});
it("staff resolving a non-person address conflict updates canonical checklist and extraction without changing person or statutory records", async () => {
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice", fields: { newAddr: "ORIGINAL ADDRESS 九龍" } }], confirm: false });
  const t = await getTask(ctx, r.taskIds[0]);
  const before = { people: await ctx.db.select().from(person), appointments: await ctx.db.select().from(appointment) };
  const p = await createProposal(ctx, { kind: "conflict", clientId: t.clientId, taskId: t.id, title: "Check conflicting registered office address", payload: { taskId: t.id, key: "newAddr", onFile: "ORIGINAL ADDRESS 九龍", incoming: "REVIEWED ADDRESS 深圳", personId: null, question: "Please confirm the intended address." } });
  expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "newAddr")?.value).toBe("ORIGINAL ADDRESS 九龍");
  await approveProposal(ctx, p.id, { edits: { accept: "incoming" } });
  const after = await getTask(ctx, t.id);
  expect(after.checklist.find(e => e.key === "newAddr")?.value).toBe("REVIEWED ADDRESS 深圳");
  expect((after.extracted as Extracted).newAddr?.value).toBe("REVIEWED ADDRESS 深圳");
  expect({ people: await ctx.db.select().from(person), appointments: await ctx.db.select().from(appointment) }).toEqual(before);
  expect(ctx.mail.sent()).toHaveLength(0);
});

it.each(["change_request", "provide_information"] as const)("a %s model review with an unresolved replacement person cannot apply its accompanying fields to the original task", async type => {
  const { createPerson } = await import("@/domain/records");
  const { ingestMessage, processInbound } = await import("@/domain/inbound");
  const { intake, action } = await import("./agent-fixtures");
  const old = await createPerson(ctx, { nameEn: "Original proposed director" });
  const outside = await createPerson(ctx, { nameEn: "Unlinked replacement" });
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.appointDirector", person: { personId: old.id }, fields: { effDate: "2026-11-01" } }], confirm: false });
  const before = await getTask(ctx, r.taskIds[0]);
  ctx.llm.on("intake", intake({ actions: [action({ type, taskId: before.id, fields: [{ key: "corrAddr", value: "REPLACEMENT ADDRESS", quote: "replacement" }, { key: "effDate", value: "2026-12-01", quote: "replacement" }] })] }));
  ctx.llm.set("review", review({ items: [], switchPerson: { personId: outside.id, nameEn: outside.nameEn, nameZh: null } }));
  const m = await ingestMessage(ctx, { clientId: "cli_c1", channel: "email", provider: "fake", providerMessageId: "blocked-replacement", from: { email: "director@kbtrading.example", name: "CHAN" }, to: [ctx.mail.address], cc: [], subject: "Change director details", text: "Please check the replacement's identity before changing these details.", receivedAt: ctx.clock.now(), attachments: [] });
  await processInbound(ctx, m.id);
  expect(ctx.llm.callsFor("review").at(-1)).toBeDefined();
  const after = await getTask(ctx, before.id);
  expect(after.personId).toBe(before.personId);
  expect(after.checklist).toEqual(before.checklist);
  expect(after.extracted).toEqual(before.extracted);
  expect(after.effectiveDate).toBe(before.effectiveDate);
  expect(ctx.mail.sent()).toHaveLength(0);
});
