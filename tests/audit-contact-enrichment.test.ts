import { beforeEach, expect, it } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, review, goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { createPerson, getPersonProtected } from "@/domain/records";
import { createRequest, startTask, getTask } from "@/domain/engine";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { pendingProposals } from "@/domain/proposals";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); });

async function provideContact(existing: { email?: string; phone?: string }, incoming: string) {
  const p = await createPerson(ctx, { nameEn: "Jane DOE", ...existing });
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p.id });
  ctx.llm.set("intake", intake({ actions: [action({ type: "provide_information", taskId: t.id, fields: [{ key: "contactInfo", value: incoming, quote: incoming }] })] }));
  ctx.llm.set("review", review({ items: [] }));
  ctx.llm.set("draft", goodDraft);
  const m = await ingestMessage(ctx, { channel: "email", provider: "fake", providerMessageId: "fictional-contact-enrichment", from: { email: "director@kbtrading.example", name: "CHAN Tai Man" }, to: [ctx.mail.address], cc: [], subject: "Details for Jane Doe", text: `Jane's contact is ${incoming}`, receivedAt: ctx.clock.now(), attachments: [] });
  await processInbound(ctx, m.id);
  return { p, t, before: t.checklist.find(e => e.key === "contactInfo") };
}

it("an email on file without a mobile number leaves the email-and-mobile item open, and the client adding the mobile completes it without a false conflict", async () => {
  const { p, t, before } = await provideContact({ email: "jane.doe@example.com" }, "jane.doe@example.com / +852 9123 4567");
  // Decision 52: the item needs both channels. The email on file is kept, but the item stays outstanding.
  expect(before).toMatchObject({ status: "needed", value: "jane.doe@example.com" });
  expect(await getPersonProtected(ctx, p.id)).toMatchObject({ email: "jane.doe@example.com", phone: "+852 9123 4567" });
  expect(await pendingProposals(ctx, { taskId: t.id, kind: "conflict" })).toHaveLength(0);
  expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "contactInfo")).toMatchObject({ status: "received", value: "jane.doe@example.com / +852 9123 4567" });
  expect(ctx.mail.sent()).toHaveLength(0);
});

it.each([
  ["email", "other.person@example.com / +852 9123 4567"],
  ["mobile number", "jane.doe@example.com / +852 9888 0000"],
])("a changed known %s requires staff resolution and cannot overwrite the recorded contact", async (_part, incoming) => {
  const existing = { email: "jane.doe@example.com", phone: "+852 9123 4567" };
  const { p, t, before } = await provideContact(existing, incoming);
  expect(await getPersonProtected(ctx, p.id)).toMatchObject(existing);
  expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "contactInfo")).toEqual(before);
  expect((await getTask(ctx, t.id)).extracted.contactInfo).toBeUndefined();
  expect(await pendingProposals(ctx, { taskId: t.id, kind: "conflict" })).toHaveLength(1);
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("a repeated contact with casing and telephone-spacing differences is not a new conflicting instruction", async () => {
  const existing = { email: "jane.doe@example.com", phone: "+852 9123 4567" };
  const { p, t } = await provideContact(existing, "JANE.DOE@example.com / +852-9123-4567");
  expect(await getPersonProtected(ctx, p.id)).toMatchObject(existing);
  expect(await pendingProposals(ctx, { taskId: t.id, kind: "conflict" })).toHaveLength(0);
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("a client can add a missing email alongside the recorded mobile number without a false conflict", async () => {
  const { p, t } = await provideContact({ phone: "+852 9123 4567" }, "jane.doe@example.com / +852 9123 4567");
  expect(await getPersonProtected(ctx, p.id)).toMatchObject({ email: "jane.doe@example.com", phone: "+852 9123 4567" });
  expect(await pendingProposals(ctx, { taskId: t.id, kind: "conflict" })).toHaveLength(0);
  expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "contactInfo")?.value).toBe("jane.doe@example.com / +852 9123 4567");
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("a changed known email cannot partially add a new mobile number before staff resolves the conflicting contact", async () => {
  const { p, t, before } = await provideContact({ email: "jane.doe@example.com" }, "other.person@example.com / +852 9123 4567");
  expect(await getPersonProtected(ctx, p.id)).toMatchObject({ email: "jane.doe@example.com", phone: null });
  expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "contactInfo")).toEqual(before);
  expect((await getTask(ctx, t.id)).extracted.contactInfo).toBeUndefined();
  expect(await pendingProposals(ctx, { taskId: t.id, kind: "conflict" })).toHaveLength(1);
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("a newly provided mobile number alone merges with the existing email in both canonical task contact values", async () => {
  const { p, t } = await provideContact({ email: "jane.doe@example.com" }, "+852 9123 4567");
  expect(await getPersonProtected(ctx, p.id)).toMatchObject({ email: "jane.doe@example.com", phone: "+852 9123 4567" });
  const after = await getTask(ctx, t.id);
  expect(after.checklist.find(e => e.key === "contactInfo")?.value).toBe("jane.doe@example.com / +852 9123 4567");
  expect(after.extracted.contactInfo).toMatchObject({ value: "jane.doe@example.com / +852 9123 4567" });
  expect(await pendingProposals(ctx, { taskId: t.id, kind: "conflict" })).toHaveLength(0);
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("unparseable unrelated text cannot replace known contact information merely because it has no overlapping component", async () => {
  const { p, t, before } = await provideContact({ email: "jane.doe@example.com" }, "salary and savings; Blue Harbour Trading Limited");
  expect(await getPersonProtected(ctx, p.id)).toMatchObject({ email: "jane.doe@example.com", phone: null });
  expect((await getTask(ctx, t.id)).checklist.find(e => e.key === "contactInfo")).toEqual(before);
  expect((await getTask(ctx, t.id)).extracted.contactInfo).toBeUndefined();
  expect(await pendingProposals(ctx, { taskId: t.id, kind: "conflict" })).toHaveLength(1);
  expect(ctx.mail.sent()).toHaveLength(0);
});


it("repeating an email with a numeric local part cannot invent a mobile number from the email digits", async () => {
  const email = "jane9123456@example.com";
  const { p, t } = await provideContact({ email }, email);
  expect.soft(await getPersonProtected(ctx, p.id)).toMatchObject({ email, phone: null });
  expect.soft((await getTask(ctx, t.id)).checklist.find(e => e.key === "contactInfo")?.value).toBe(email);
  expect.soft(await pendingProposals(ctx, { taskId: t.id, kind: "conflict" })).toHaveLength(0);
  expect.soft(ctx.mail.sent()).toHaveLength(0);
});

it("a numeric-local-part email plus a real mobile records the real mobile and the merged canonical contact without a false conflict", async () => {
  const email = "jane9123456@example.com";
  const phone = "+852 9123 4567";
  const { p, t } = await provideContact({ email }, `${email} / ${phone}`);
  expect.soft(await getPersonProtected(ctx, p.id)).toMatchObject({ email, phone });
  const after = await getTask(ctx, t.id);
  expect.soft(after.checklist.find(e => e.key === "contactInfo")?.value).toBe(`${email} / ${phone}`);
  expect.soft(after.extracted.contactInfo).toMatchObject({ value: `${email} / ${phone}` });
  expect.soft(await pendingProposals(ctx, { taskId: t.id, kind: "conflict" })).toHaveLength(0);
  expect.soft(ctx.mail.sent()).toHaveLength(0);
});

it.each([
  ["emails", "jane.doe@example.com or other.person@example.com / +852 9123 4567"],
  ["mobile numbers", "jane.doe@example.com / +852 9123 4567 or +852 9888 0000"],
])("two distinct %s in a compound contact require human resolution without changing the person or task", async (_part, incoming) => {
  const existing = { email: "jane.doe@example.com", phone: "+852 9123 4567" };
  const { p, t, before } = await provideContact(existing, incoming);
  expect.soft(await getPersonProtected(ctx, p.id)).toMatchObject(existing);
  expect.soft((await getTask(ctx, t.id)).checklist.find(e => e.key === "contactInfo")).toEqual(before);
  expect.soft((await getTask(ctx, t.id)).extracted.contactInfo).toBeUndefined();
  expect.soft(await pendingProposals(ctx, { taskId: t.id, kind: "conflict" })).toHaveLength(1);
  expect.soft(ctx.mail.sent()).toHaveLength(0);
});
