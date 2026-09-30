// Enforcement letters (late-filing notices, warning letters, prosecution summonses) arrive at
// the registered office. They should start the right work with the letter's date as a hard
// deadline, not just a "you've got mail" email.
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { logMailItem } from "@/domain/mail-items";
import { approveProposal, pendingProposals, rejectProposal } from "@/domain/proposals";
import { getTask, tasksForRequest } from "@/domain/engine";
import { getPlaybook } from "@/domain/playbooks";
import { document, message } from "@/db/schema";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
});

const letter = (enforcement: Record<string, unknown> | null) => ({
  clientId: "cli_c1", addressee: "Kowloon Bay Trading Limited", sender: "Companies Registry", summaryEn: "Summons for failing to deliver the annual return for 2025.",
  urgency: "urgent", actionNeeded: "Attend court or plead by letter", enforcement,
});
const summons = { kind: "summons", dueDate: "2026-11-20", form: "NAR1", reference: "ESS 12345/2026", amountHkd: null };
const scan = { filename: "summons.pdf", mime: "application/pdf", content: Buffer.from("%PDF summons"), receivedOn: "2026-09-29" };

describe("Enforcement letters from the mail room", () => {
  it("a summons logged in the mail room becomes one card to start the prosecution response, not a plain letter notice", async () => {
    ctx.llm.on("mail", letter(summons));
    await logMailItem(ctx, scan);
    const [card] = await pendingProposals(ctx);
    expect(card).toMatchObject({ kind: "start_enforcement", clientId: "cli_c1", payload: { playbookId: "hk.prosecution", dueDate: "2026-11-20" } });
    expect(await pendingProposals(ctx, { kind: "send_message" })).toHaveLength(0);
  });

  it("starting it opens the task with the court date as its hard deadline, the letter on the task, and a draft to the client with the scan attached; nothing is sent", async () => {
    ctx.llm.on("mail", letter(summons));
    await logMailItem(ctx, scan);
    const [card] = await pendingProposals(ctx);
    await approveProposal(ctx, card.id);
    const [draftCard] = await pendingProposals(ctx, { kind: "send_message" });
    const [t] = await tasksForRequest(ctx, draftCard.requestId!);
    const task = await getTask(ctx, t.id);
    expect(task).toMatchObject({ playbookId: "hk.prosecution", dueDate: "2026-11-20" });
    expect(task.checklist.find((e) => e.key === "enforcementRef")).toMatchObject({ status: "received", value: "ESS 12345/2026" });
    const docs = await ctx.db.select().from(document).where(eq(document.taskId, t.id));
    expect(docs.map((d) => d.kind)).toContain("mail_item");
    expect(draftCard.payload.attachDocumentIds).toEqual([docs.find((d) => d.kind === "mail_item")!.id]);
    const draft = (await ctx.db.query.message.findFirst({ where: eq(message.id, draftCard.payload.messageId as string) }))!;
    expect((draft.intake as { facts: { context: string } }).facts.context).toBe("letter");
    expect(ctx.mail.sent()).toHaveLength(0);
  });

  it("a warning letter starts the warning-letter playbook with the reply-by date as its deadline", async () => {
    ctx.llm.on("mail", letter({ kind: "warning_letter", dueDate: "2026-10-20", form: "NAR1", reference: "WL/2026/88", amountHkd: null }));
    await logMailItem(ctx, scan);
    const [card] = await pendingProposals(ctx);
    expect(card.payload.playbookId).toBe("hk.warningLetter");
    await approveProposal(ctx, card.id);
    const [draftCard] = await pendingProposals(ctx, { kind: "send_message" });
    const [t] = await tasksForRequest(ctx, draftCard.requestId!);
    expect((await getTask(ctx, t.id)).dueDate).toBe("2026-10-20");
  });

  it("dismissing the card still drafts the plain letter notice for the client", async () => {
    ctx.llm.on("mail", letter(summons));
    await logMailItem(ctx, scan);
    const [card] = await pendingProposals(ctx);
    await rejectProposal(ctx, card.id, "Handled by the client's lawyers");
    const [notice] = await pendingProposals(ctx, { kind: "send_message" });
    expect(notice.payload.purpose).toBe("mail");
  });

  it("an ordinary letter keeps the plain notice", async () => {
    ctx.llm.on("mail", letter(null));
    await logMailItem(ctx, scan);
    const [card] = await pendingProposals(ctx);
    expect(card).toMatchObject({ kind: "send_message", payload: { purpose: "mail" } });
  });

  it("the enforcement playbooks are valid, take their deadline from the letter, and are marked for company secretary verification", async () => {
    for (const id of ["hk.lateFiling", "hk.warningLetter", "hk.prosecution"]) {
      const pb = await getPlaybook(ctx, id);
      expect(pb.deadline.kind).toBe("letter_date");
      expect(pb.verifyNote).toMatch(/verify/i);
    }
  });
});
