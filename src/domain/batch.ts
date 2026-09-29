// Batch operations (CSA's "Mass Production"): start the same playbook for many clients in
// one action, each with its own request, invoice and drafted message queued for approval.
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { client as clientT, conversation, task as taskT, person, request as requestT } from "@/db/schema";
import { createRequest, startTask, getTask, outstanding, assertTaskReady, advance, markStepState, logEvent } from "./engine";
import { getPlaybook } from "./playbooks";
import { createInvoiceForRequest } from "./invoices";
import { composeReply } from "./inbound";
import { createProposal } from "./proposals";
import { itemLabel } from "./labels";
import { fmtDate, isIsoDate } from "./dates";
import type { ReplyFacts } from "@/agent/draft";
import { upcomingDeadlines } from "./deadlines";
import { officersAsAt } from "./records";
import { generateForTask } from "@/documents/generate";

export async function batchStart(ctx: Ctx, o: { playbookId: string; clientIds: string[]; periodYear?: number; personId?: string; effectiveDate?: string }) {
  const pb = await getPlaybook(ctx, o.playbookId);
  const officerChange = pb.id === "hk.resignDirector";
  if (officerChange) {
    if (!isIsoDate(o.effectiveDate) || new Date(`${o.effectiveDate}T00:00:00Z`).toISOString().slice(0, 10) !== o.effectiveDate) throw new Error("Choose a valid effective date");
    const officer = o.personId ? await ctx.db.query.person.findFirst({ where: and(eq(person.id, o.personId), eq(person.firmId, ctx.firmId)) }) : null;
    if (!officer) throw new Error("Choose a valid person for the director resignation");
  }
  const keyFor = (clientId: string, dls: Awaited<ReturnType<typeof upcomingDeadlines>>) => {
    const d = dls.find((x) => x.clientId === clientId && x.playbookId === o.playbookId && (!o.periodYear || x.periodYear === o.periodYear));
    return d ?? null;
  };
  const deadlines = await upcomingDeadlines(ctx, { withinDays: 400, includeCovered: true });
  const skipped: { clientId: string; reason: string }[] = [];
  let created = 0;
  for (const clientId of new Set(o.clientIds)) {
    const cl = await ctx.db.query.client.findFirst({ where: and(eq(clientT.id, clientId), eq(clientT.firmId, ctx.firmId)) });
    if (!cl) { skipped.push({ clientId, reason: "Client not found" }); continue; }
    if (officerChange && cl.jurisdiction !== pb.jurisdiction) { skipped.push({ clientId, reason: `${cl.nameEn}: this playbook covers ${pb.jurisdiction}` }); continue; }
    if (officerChange) {
      const officers = await officersAsAt(ctx, clientId, o.effectiveDate!, "director");
      if (!officers.some(p => p.personId === o.personId)) { skipped.push({ clientId, reason: `${cl.nameEn}: the selected person is not a director on that date` }); continue; }
      const same = await ctx.db.select().from(taskT).where(and(eq(taskT.firmId, ctx.firmId), eq(taskT.clientId, clientId), eq(taskT.playbookId, pb.id), eq(taskT.personId, o.personId!), eq(taskT.effectiveDate, o.effectiveDate!)));
      if (same.some(t => t.status !== "cancelled")) { skipped.push({ clientId, reason: `${cl.nameEn}: this resignation already has a task` }); continue; }
    }
    const d = keyFor(clientId, deadlines);
    const periodKey = d?.periodKey ?? (pb.periodKey && o.periodYear ? pb.periodKey.replace("{year}", String(o.periodYear)) : null);
    if (periodKey) {
      const open = await ctx.db.select().from(taskT).where(and(eq(taskT.clientId, clientId), eq(taskT.periodKey, periodKey)));
      if (open.some((t) => t.status !== "cancelled")) { skipped.push({ clientId, reason: `Already has a task for ${periodKey}` }); continue; }
    }
    const req = await createRequest(ctx, { clientId, summary: `${pb.name.en} (batch)` });
    const t = await startTask(ctx, { requestId: req.id, clientId, playbookId: pb.id, periodKey, periodYear: d?.periodYear ?? o.periodYear, title: d?.label ?? pb.name.en, ...(officerChange ? { personId: o.personId, params: { effectiveDate: o.effectiveDate }, extracted: { lastDay: { value: o.effectiveDate!, source: "Batch instruction approved by staff" } } } : {}) });
    await createInvoiceForRequest(ctx, req.id);
    const tt = await getTask(ctx, t.id);
    const lang = cl.messageLang;
    const instructing = await ctx.db.query.contact.findFirst({ where: (c, { eq, and }) => and(eq(c.clientId, clientId), eq(c.isInstructing, true)) });
    const [conv] = await ctx.db.insert(conversation).values({ id: ctx.ids.next("cnv"), firmId: ctx.firmId, clientId, channel: "email", subject: `${cl.nameEn}: ${pb.name.en}`, counterpartyEmail: instructing?.email ?? null, createdAt: ctx.clock.now() }).returning();
    await ctx.db.update(requestT).set({ conversationId: conv.id }).where(and(eq(requestT.id, req.id), eq(requestT.firmId, ctx.firmId)));
    const facts: ReplyFacts = {
      language: lang, recipientName: "", clientName: "", signOff: "", updates: [], changes: [], cancellations: [], questions: [], clarifications: [], invoice: null, uploadUrl: null,
      newRequests: [{ title: pb.name[lang] ?? pb.name.en, needed: outstanding(tt).map((e) => itemLabel(e.key, lang, tt.params)), onFile: tt.checklist.filter((e) => e.status === "on_file").map((e) => itemLabel(e.key, lang)), alreadyReceived: [], deadline: tt.dueDate ? fmtDate(tt.dueDate, lang) : null }],
      extraNotes: officerChange ? [`Prepare the resignation of ${(await ctx.db.query.person.findFirst({ where: eq(person.id, o.personId!) }))!.nameEn} with effect from ${fmtDate(o.effectiveDate!, lang)}. Ask for the resignation letter and any other outstanding details.`] : ["This is a firm-initiated reminder for recurring statutory work, not a reply to the client."],
    };
    const draft = await composeReply(ctx, { clientId, conversationId: conv.id, inReplyTo: null, facts, requestId: req.id, purpose: officerChange ? "Prepare the named director resignation; ask for missing information and include the invoice." : "Firm-initiated request: the statutory deadline is coming up; ask for what we need and send the invoice." });
    const p = await createProposal(ctx, { kind: "send_message", title: `Send ${pb.name.en} request to ${cl.nameEn}`, clientId, requestId: req.id, payload: { messageId: draft.id, requestId: req.id, taskIds: [t.id], draftSource: draft.source, purpose: "request", batch: true } });
    void p;
    created++;
  }
  return { created, skipped };
}

/** Prepare only tasks that have reached generation; every signature and filing still needs its own approval. */
export async function batchGenerate(ctx: Ctx, taskIds: string[]): Promise<{ generated: string[]; skipped: { taskId: string; reason: string }[] }> {
  const result: { generated: string[]; skipped: { taskId: string; reason: string }[] } = { generated: [], skipped: [] };
  for (const taskId of new Set(taskIds)) {
    try {
      const t = await assertTaskReady(ctx, taskId, "generate");
      const docs = await generateForTask(ctx, taskId);
      await markStepState(ctx, taskId, t.stepIndex, { generated: true, documentIds: docs.map(d => d.id), signatureFields: docs.map(d => ({ id: d.id, signers: d.signers, fields: d.signatureFields })) });
      await logEvent(ctx, taskId, "documents.generated", `Prepared ${docs.map(d => d.title).join(", ")} in a batch`, { documentIds: docs.map(d => d.id) }, ctx.userId);
      await advance(ctx, taskId);
      result.generated.push(taskId);
    } catch (e) {
      result.skipped.push({ taskId, reason: (e as Error).message });
    }
  }
  return result;
}
