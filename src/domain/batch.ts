// Batch operations (CSA's "Mass Production"): start the same playbook for many clients in
// one action, each with its own request, invoice and drafted message queued for approval.
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { client as clientT, conversation, task as taskT } from "@/db/schema";
import { createRequest, startTask, getTask, outstanding } from "./engine";
import { getPlaybook } from "./playbooks";
import { createInvoiceForRequest } from "./invoices";
import { composeReply } from "./inbound";
import { createProposal } from "./proposals";
import { itemLabel } from "./labels";
import { fmtDate } from "./dates";
import type { ReplyFacts } from "@/agent/draft";
import { upcomingDeadlines } from "./deadlines";

export async function batchStart(ctx: Ctx, o: { playbookId: string; clientIds: string[]; periodYear?: number }) {
  const pb = await getPlaybook(ctx, o.playbookId);
  const keyFor = (clientId: string, dls: Awaited<ReturnType<typeof upcomingDeadlines>>) => {
    const d = dls.find((x) => x.clientId === clientId && x.playbookId === o.playbookId && (!o.periodYear || x.periodYear === o.periodYear));
    return d ?? null;
  };
  const deadlines = await upcomingDeadlines(ctx, { withinDays: 400, includeCovered: true });
  const skipped: { clientId: string; reason: string }[] = [];
  let created = 0;
  for (const clientId of o.clientIds) {
    const cl = await ctx.db.query.client.findFirst({ where: eq(clientT.id, clientId) });
    if (!cl) { skipped.push({ clientId, reason: "Client not found" }); continue; }
    const d = keyFor(clientId, deadlines);
    const periodKey = d?.periodKey ?? (pb.periodKey && o.periodYear ? pb.periodKey.replace("{year}", String(o.periodYear)) : null);
    if (periodKey) {
      const open = await ctx.db.select().from(taskT).where(and(eq(taskT.clientId, clientId), eq(taskT.periodKey, periodKey)));
      if (open.some((t) => t.status !== "cancelled")) { skipped.push({ clientId, reason: `Already has a task for ${periodKey}` }); continue; }
    }
    const req = await createRequest(ctx, { clientId, summary: `${pb.name.en} (batch)` });
    const t = await startTask(ctx, { requestId: req.id, clientId, playbookId: pb.id, periodKey, periodYear: d?.periodYear ?? o.periodYear, title: d?.label ?? pb.name.en });
    await createInvoiceForRequest(ctx, req.id);
    const tt = await getTask(ctx, t.id);
    const lang = cl.messageLang;
    const instructing = await ctx.db.query.contact.findFirst({ where: (c, { eq, and }) => and(eq(c.clientId, clientId), eq(c.isInstructing, true)) });
    const [conv] = await ctx.db.insert(conversation).values({ id: ctx.ids.next("cnv"), firmId: ctx.firmId, clientId, channel: "email", subject: `${cl.nameEn}: ${pb.name.en}`, counterpartyEmail: instructing?.email ?? null, createdAt: ctx.clock.now() }).returning();
    const facts: ReplyFacts = {
      language: lang, recipientName: "", clientName: "", signOff: "", updates: [], changes: [], cancellations: [], questions: [], clarifications: [], invoice: null, uploadUrl: null,
      newRequests: [{ title: pb.name[lang] ?? pb.name.en, needed: outstanding(tt).map((e) => itemLabel(e.key, lang, tt.params)), onFile: tt.checklist.filter((e) => e.status === "on_file").map((e) => itemLabel(e.key, lang)), alreadyReceived: [], deadline: tt.dueDate ? fmtDate(tt.dueDate, lang) : null }],
      extraNotes: ["This is a firm-initiated reminder for recurring statutory work, not a reply to the client."],
    };
    const draft = await composeReply(ctx, { clientId, conversationId: conv.id, inReplyTo: null, facts, requestId: req.id, purpose: "Firm-initiated request: the statutory deadline is coming up; ask for what we need and send the invoice." });
    const p = await createProposal(ctx, { kind: "send_message", title: `Send ${pb.name.en} request to ${cl.nameEn}`, clientId, requestId: req.id, payload: { messageId: draft.id, requestId: req.id, taskIds: [t.id], draftSource: draft.source, purpose: "request", batch: true } });
    void p;
    created++;
  }
  return { created, skipped };
}
