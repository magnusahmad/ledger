import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { action, intake, review, goodDraft, factsOf } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { getTask, tasksForRequest, taskEvents } from "@/domain/engine";
import { invoice, invoiceLine, llmCall, message, person as personT, task as taskT } from "@/db/schema";
import { getPersonProtected } from "@/domain/records";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
});

const FROM = { email: "director@kbtrading.example", name: "CHAN Tai Man" };

async function inbound(text: string, subject = "Request", attachments: { filename: string; mime: string; content: Buffer }[] = []) {
  const m = await ingestMessage(ctx, { channel: "email", provider: "fake", providerMessageId: `m-${Math.random()}`, from: FROM, to: ["desk@caineroad.example"], cc: [], subject, text, receivedAt: ctx.clock.now(), attachments });
  return processInbound(ctx, m.id);
}

function startAppointment(name = "WONG Ka Man", conf = 0.95) {
  return action({ type: "start_request", playbookId: "hk.appointDirector", person: { mode: "new", personId: null, nameEn: name, nameZh: null, email: null }, fields: [{ key: "effDate", value: "2026-10-15", quote: "from 15 October" }], confidence: conf, description: "Appoint a new director" });
}

describe("Intake: new requests", () => {
  it("an email asking to appoint a director opens one appointment task and drafts a reply in the sender's language, sending nothing yet", async () => {
    ctx.llm.on("intake", intake({ language: "tc", actions: [startAppointment()] }));
    ctx.llm.on("draft", goodDraft);
    const r = await inbound("陳生：想加黃嘉敏做董事，10月15號生效。");

    const tasks = await tasksForRequest(ctx, r.requestId!);
    expect(tasks.map((t) => t.playbookId)).toEqual(["hk.appointDirector"]);
    expect(tasks[0].effectiveDate).toBe("2026-10-15");
    expect(tasks[0].checklist.find((e) => e.key === "idCopy")?.status).toBe("needed");

    const draftCall = ctx.llm.callsFor("draft")[0];
    expect(factsOf(draftCall).language).toBe("tc");
    const [p] = await pendingProposals(ctx);
    expect(p.kind).toBe("send_message");
    const draft = await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) });
    expect(draft).toMatchObject({ direction: "out", status: "draft", language: "tc" });
    expect(ctx.mail.sent()).toHaveLength(0);
  });

  it("a message with two requests opens two tasks on one invoice, with a line per task plus statutory disbursements", async () => {
    ctx.llm.on("intake", intake({ actions: [
      action({ type: "start_request", playbookId: "hk.changeOffice", fields: [{ key: "newAddr", value: "12/F, 88 Hung To Road, Kwun Tong", quote: "88 Hung To Road" }] }),
      action({ type: "start_request", playbookId: "hk.changeName", fields: [{ key: "newName", value: "KB Global Trading Limited", quote: "KB Global Trading" }] }),
    ] }));
    ctx.llm.on("draft", goodDraft);
    const r = await inbound("We're moving to 12/F, 88 Hung To Road and renaming to KB Global Trading Limited.");
    const tasks = await tasksForRequest(ctx, r.requestId!);
    expect(tasks).toHaveLength(2);
    const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.requestId, r.requestId!) });
    const lines = await ctx.db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId, inv!.id));
    expect(lines.map((l) => [l.kind, l.amountCents])).toEqual([["fee", 150000], ["fee", 350000], ["disbursement", 29500]]);
    expect(inv!.totalCents).toBe(529500);
    expect(tasks[0].checklist.find((e) => e.key === "newAddr")).toMatchObject({ status: "received" });
  });

  it("the agent cannot invent requirement keys: fields that aren't on the playbook's checklist are ignored", async () => {
    ctx.llm.on("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeOffice", fields: [{ key: "favouriteColour", value: "blue", quote: null }] })] }));
    ctx.llm.on("draft", goodDraft);
    const r = await inbound("Move our office please.");
    const [t] = await tasksForRequest(ctx, r.requestId!);
    expect(t.checklist.map((e) => e.key)).not.toContain("favouriteColour");
    expect(t.extracted).not.toHaveProperty("favouriteColour");
  });

  it("low-confidence routing creates a triage card instead of acting", async () => {
    ctx.llm.on("intake", intake({ actions: [startAppointment("WONG Ka Man", 0.4)] }));
    const r = await inbound("maybe add someone to the board? not sure yet");
    expect(r.requestId).toBeNull();
    const props = await pendingProposals(ctx);
    expect(props.map((p) => p.kind)).toEqual(["triage"]);
    expect(await ctx.db.select().from(taskT).where(eq(taskT.status, "open"))).toHaveLength(0);
  });

  it("an unsupported request becomes a one-off task whose agent-planned checklist and fee are held for staff review", async () => {
    ctx.llm.on("intake", intake({ actions: [action({ type: "unsupported_request", description: "Open a corporate bank account with HSBC" })] }));
    ctx.llm.on("plan", { title: "Open an HSBC corporate account", items: [{ key: "bankKycPack", labelEn: "Bank KYC pack", labelTc: "銀行開戶文件", labelSc: "银行开户文件", kind: "file" }], steps: ["Prepare board resolution", "Book branch appointment"], feeHkd: 3000, caveats: ["Bank decides"] });
    ctx.llm.on("draft", goodDraft);
    const r = await inbound("Can you help us open an HSBC account?");
    const [t] = await tasksForRequest(ctx, r.requestId!);
    expect(t.playbookId).toBe("hk.custom");
    expect(t.params).toMatchObject({ plan: expect.objectContaining({ title: "Open an HSBC corporate account" }), planStatus: "proposed" });
    expect(t.checklist.map((e) => e.key)).toContain("bankKycPack");
    const kinds = (await pendingProposals(ctx)).map((p) => p.kind).sort();
    expect(kinds).toEqual(["custom_plan", "send_message"]);
  });
});

describe("Intake: changes of mind, new information and cancellations", () => {
  async function openAppointment() {
    ctx.llm.set("intake", intake({ actions: [startAppointment()] }));
    ctx.llm.set("draft", goodDraft);
    const r = await inbound("Please appoint WONG Ka Man as a director from 15 October.");
    return (await tasksForRequest(ctx, r.requestId!))[0];
  }

  it("a change of appointee mid-task re-requests KYC for the new person and drops the old person's items", async () => {
    const t = await openAppointment();
    const oldPerson = t.personId!;
    ctx.llm.set("intake", intake({ actions: [action({ type: "change_request", taskId: t.id, description: "Appoint MA Siu Fung instead of WONG Ka Man", person: { mode: "new", personId: null, nameEn: "MA Siu Fung", nameZh: "馬少峰", email: null } })] }));
    ctx.llm.set("review", review({ items: [{ key: "effDate", personId: null, status: "received", value: "2026-10-15", reason: "Unchanged" }], switchPerson: { nameEn: "MA Siu Fung", nameZh: "馬少峰", personId: null }, summary: "Appointee changed" }));
    await inbound("Sorry, change of plan: please appoint MA Siu Fung instead of Ka Man.");
    const after = await getTask(ctx, t.id);
    expect(after.personId).not.toBe(oldPerson);
    const personItems = after.checklist.filter((e) => e.personId);
    expect(new Set(personItems.map((e) => e.personId))).toEqual(new Set([after.personId]));
    expect(after.checklist.find((e) => e.key === "idCopy")?.status).toBe("needed");
    expect(after.checklist.find((e) => e.key === "fullName")).toMatchObject({ status: "on_file", value: "MA Siu Fung" });
    const ev = await taskEvents(ctx, t.id);
    expect(ev.some((e) => e.kind === "task.person_changed")).toBe(true);
  });

  it("details arriving for an open task update that task's checklist and are shown as received", async () => {
    const t = await openAppointment();
    ctx.llm.set("intake", intake({ actions: [action({ type: "provide_information", taskId: t.id, fields: [
      { key: "idNo", value: "HKID K987654(3), Hong Kong", quote: "HKID K987654(3)" },
      { key: "resAddr", value: "Flat 12B, 88 Robinson Road, Mid-Levels", quote: "Flat 12B" },
    ], attachments: [{ filename: "hkid_wong.jpg", key: "idCopy", personId: t.personId }] })] }));
    ctx.llm.set("review", (req: unknown) => review({ items: [] , summary: "No change to requirements" }));
    await inbound("Details for Ka Man: HKID K987654(3), lives at Flat 12B, 88 Robinson Road.", "Re: director", [{ filename: "hkid_wong.jpg", mime: "image/jpeg", content: Buffer.from("fakejpg") }]);
    const after = await getTask(ctx, t.id);
    expect(after.checklist.find((e) => e.key === "idNo")).toMatchObject({ status: "received" });
    expect(after.checklist.find((e) => e.key === "idCopy")).toMatchObject({ status: "received", documentId: expect.any(String) });
    const p = await getPersonProtected(ctx, after.personId!);
    expect(p.idNumber).toBe("HKID K987654(3), Hong Kong");
  });

  it("the agent cannot route information to a task that belongs to another client", async () => {
    await openAppointment();
    const [other] = await ctx.db.insert(taskT).values({ id: "tsk_other", firmId: ctx.firmId, clientId: "cli_c2", playbookId: "hk.changeOffice", playbookVersion: 2, title: "Other client's task", checklist: [{ key: "newAddr", status: "needed" }] }).returning();
    ctx.llm.set("intake", intake({ actions: [action({ type: "provide_information", taskId: other.id, fields: [{ key: "newAddr", value: "Somewhere", quote: null }] })] }));
    await inbound("New address is Somewhere.");
    const untouched = await ctx.db.query.task.findFirst({ where: eq(taskT.id, "tsk_other") });
    expect(untouched!.checklist[0].status).toBe("needed");
    expect((await pendingProposals(ctx)).some((p) => p.kind === "triage")).toBe(true);
  });

  it("a cancellation proposes voiding the unpaid invoice and cancelling the task, and applies nothing until approved", async () => {
    const t = await openAppointment();
    ctx.llm.set("intake", intake({ actions: [action({ type: "cancel_request", taskId: t.id, description: "Client no longer wants to add a director" })] }));
    await inbound("We've decided not to add a director after all.");
    expect((await getTask(ctx, t.id)).status).toBe("open");
    const cancel = (await pendingProposals(ctx)).find((p) => p.kind === "cancel_task")!;
    expect(cancel.payload).toMatchObject({ taskId: t.id, voidInvoice: true });
    await approveProposal(ctx, cancel.id);
    expect((await getTask(ctx, t.id)).status).toBe("cancelled");
    const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.requestId, t.requestId!) });
    expect(inv!.status).toBe("void");
  });

  it("information that contradicts what is on file becomes a conflict card with a drafted question, and the file is not overwritten", async () => {
    // CHAN Tai Man is on file with HKID Y123456(7).
    ctx.llm.set("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.changeParticulars", person: { mode: "existing", personId: "per_p1", nameEn: "CHAN Tai Man", nameZh: null, email: null }, fields: [{ key: "changeDetail", value: "New passport", quote: null }] })] }));
    ctx.llm.set("draft", goodDraft);
    const r = await inbound("I have a new passport.");
    const [t] = await tasksForRequest(ctx, r.requestId!);
    ctx.llm.set("intake", intake({ actions: [action({ type: "provide_information", taskId: t.id, fields: [{ key: "idNo", value: "Y999999(9)", quote: "my HKID is Y999999(9)" }] })] }));
    ctx.llm.set("review", review({ items: [], conflicts: [{ key: "idNo", onFile: "Y123456(7)", incoming: "Y999999(9)", question: "Could you confirm your HKID number? Our records show a different number." }] }));
    await inbound("my HKID is Y999999(9)");
    const conflict = (await pendingProposals(ctx)).find((p) => p.kind === "conflict");
    expect(conflict?.payload).toMatchObject({ key: "idNo", incoming: "Y999999(9)" });
    expect((await getPersonProtected(ctx, "per_p1")).idNumber).toBe("Y123456(7)");
  });
});

describe("Agent reliability", () => {
  it("a draft missing the invoice number is regenerated once, then falls back to the template", async () => {
    ctx.llm.on("intake", intake({ actions: [startAppointment()] }));
    ctx.llm.on("draft", { subject: "Hi", body: "Dear Mr Chan, we'll handle it. Karen" });
    await inbound("Please appoint WONG Ka Man.");
    expect(ctx.llm.callsFor("draft")).toHaveLength(2);
    const [p] = await pendingProposals(ctx);
    const draft = await ctx.db.query.message.findFirst({ where: eq(message.id, p.payload.messageId as string) });
    const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.clientId, "cli_c1"), orderBy: (t, { desc }) => desc(t.createdAt) });
    expect(draft!.text).toContain(inv!.number);
    expect(p.payload.draftSource).toBe("template");
  });

  it("an intake response that fails the schema is repaired once; a second failure becomes a triage card and nothing else happens", async () => {
    ctx.llm.on("intake", { nonsense: true });
    const r = await inbound("Please appoint WONG Ka Man.");
    expect(ctx.llm.callsFor("intake")).toHaveLength(2);
    expect(r.requestId).toBeNull();
    expect((await pendingProposals(ctx)).map((p) => p.kind)).toEqual(["triage"]);
  });

  it("every agent call is logged against the message it processed", async () => {
    ctx.llm.on("intake", intake({ actions: [startAppointment()] }));
    ctx.llm.on("draft", goodDraft);
    const r = await inbound("Please appoint WONG Ka Man.");
    const calls = await ctx.db.select().from(llmCall);
    expect(calls.map((c) => c.agent).sort()).toEqual(["draft", "intake"]);
    expect(calls.every((c) => c.messageId === r.messageId)).toBe(true);
  });

  it("the intake prompt gives the agent today's date, the client's open tasks and the playbook catalogue, and never protected information", async () => {
    ctx.llm.on("intake", intake({ actions: [startAppointment()] }));
    ctx.llm.on("draft", goodDraft);
    await inbound("Please appoint WONG Ka Man.");
    const prompt = JSON.stringify(ctx.llm.callsFor("intake")[0].messages);
    expect(prompt).toContain("2026-09-29");
    expect(prompt).toContain("hk.appointDirector");
    expect(prompt).toContain("Kowloon Bay Trading Limited");
    expect(prompt).not.toContain("Y123456(7)"); // CHAN's HKID
    expect(prompt).not.toContain("Laguna City"); // CHAN's residential address
  });
});
