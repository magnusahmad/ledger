// Approval handlers: what happens when a human approves each kind of proposal.
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { message, person as personT, task as taskT } from "@/db/schema";
import { onApprove, onReject, editDistance, type Proposal } from "./proposals";
import { sendMessage, invoiceForRequest } from "./outbound";
import { advance, cancelTask, getRequest, getTask, logEvent, markStepState, setChecklist, startTask, tasksForRequest } from "./engine";
import { assertInvoiceDraftEditable, createInvoiceForRequest, markInvoiceSent, voidInvoice, recalcTotal, applyRevision, type RevisionLine } from "./invoices";
import { updatePerson } from "./records";
import { renderInvoicePdf } from "@/documents/invoice-pdf";
import { enqueue } from "./jobs";
import { invoiceLine, invoice, document, mailDelivery, proposal } from "@/db/schema";
import { valueText } from "@/lib/display";
import { deliveryPayload, deliveryInvoiceDates, type InvoiceDeliveryDates } from "./mail-delivery";
import { Crypto } from "@/lib/crypto";
import { addDays } from "./dates";
import { completeSending } from "./sending";
import { PROTECTED_KEYS } from "./labels";

const PERSON_FIELD: Record<string, string> = { fullName: "nameEn", chiName: "nameZh", idNo: "idNumber", resAddr: "residentialAddress", corrAddr: "correspondenceAddress" };

onApprove("send_message", async (ctx, p, opts) => {
  if (p.payload.purpose === "reminder") {
    const current = p.payload.invoiceId ? await ctx.db.query.invoice.findFirst({ where: (i, { and, eq }) => and(eq(i.id, p.payload.invoiceId as string), eq(i.firmId, ctx.firmId)) }) : null;
    if (!current || !["sent", "part_paid"].includes(current.status) || current.paidCents >= current.totalCents) throw new Error("This payment reminder is no longer current");
  }
  if (opts.edits?.completedOutside === "on") {
    const mark = p.payload.markStep as { taskId: string } | undefined;
    await completeSending(ctx, mark ? [mark.taskId] : (p.payload.taskIds as string[] ?? []), !mark && p.payload.purpose === "request" ? p.requestId : null, String(opts.edits.note ?? ""), p.id, p.payload.invoiceId as string | undefined);
    return;
  }
  const messageId = p.payload.messageId as string;
  const m = (await ctx.db.query.message.findFirst({ where: eq(message.id, messageId) }))!;
  const raw = opts.edits as { subject?: string; text?: string; to?: string | string[] } | undefined;
  const edits = raw ? { ...raw, to: typeof raw.to === "string" ? raw.to.split(/[,;\s]+/).filter(Boolean) : raw.to } : undefined;
  if (edits?.text && opts.editChars === undefined) opts.editChars = editDistance(m.text ?? "", edits.text);
  // An additional invoice (costs added later) names itself; otherwise it's the request's invoice.
  const inv = p.payload.invoiceId ? (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, p.payload.invoiceId as string) })) ?? null : await invoiceForRequest(ctx, (p.payload.requestId as string | null) ?? null);
  const attachInvoice = inv && inv.status === "draft" && (m.intake as { attachInvoiceId?: string } | null)?.attachInvoiceId === inv.id;
  const existingDelivery = await ctx.db.query.mailDelivery.findFirst({ where: and(eq(mailDelivery.firmId, ctx.firmId), eq(mailDelivery.sourceKey, `message:${messageId}`)) });
  let invoiceDates: InvoiceDeliveryDates | undefined;
  if (attachInvoice) {
    const issuedOn = ctx.clock.today();
    invoiceDates = existingDelivery ? deliveryInvoiceDates(ctx, existingDelivery, inv!.id) : { invoiceId: inv!.id, issuedOn, dueOn: addDays(issuedOn, inv!.termsDays), pdfSha256: "" };
  }
  if (invoiceDates && invoiceDates.dueOn !== addDays(invoiceDates.issuedOn, inv!.termsDays)) throw new Error("Invoice delivery dates need review: captured dates do not match its credit terms");
  const attachments = existingDelivery ? deliveryPayload(ctx, existingDelivery).attachments ?? [] : attachInvoice ? [{ filename: `${inv!.number}.pdf`, mime: "application/pdf", content: await renderInvoicePdf(ctx, inv!.id, invoiceDates) }] : [];
  if (invoiceDates && !existingDelivery) invoiceDates.pdfSha256 = Crypto.sha256(attachments[0].content);
  for (const docId of existingDelivery ? [] : (p.payload.attachDocumentIds as string[] | undefined) ?? []) {
    const d = await ctx.db.query.document.findFirst({ where: (x, { eq }) => eq(x.id, docId) });
    if (d?.storageKey) attachments.push({ filename: d.title.endsWith(".pdf") ? d.title : `${d.title}.pdf`, mime: d.mime ?? "application/pdf", content: await ctx.storage.get(d.storageKey) });
  }
  const receipt = await sendMessage(ctx, messageId, { edits, attachments, invoiceDates, approvedBy: ctx.userId });
  await ctx.db.transaction(async db => {
  ctx = { ...ctx, db: db as unknown as Ctx["db"] };
  await ctx.assertExecution?.(ctx);
  if (attachInvoice) {
    await markInvoiceSent(ctx, inv!.id, invoiceDates);
    await enqueue(ctx, "xero.sync_invoice", { invoiceId: inv!.id }, `xero.invoice:${inv!.id}`);
  }
  for (const taskId of (p.payload.taskIds as string[]) ?? []) {
    const t = await getTask(ctx, taskId);
    if (t.status !== "open") continue;
    const step = t._steps[t.stepIndex];
    if (step?.kind === "send") await markStepState(ctx, taskId, "send", { sent: true, messageId });
    await logEvent(ctx, taskId, "message.sent", `Email sent to ${receipt.toAddrs.join(", ")}: ${receipt.subject ?? ""}`, { messageId }, ctx.userId);
    await advance(ctx, taskId);
  }
  if (p.payload.purpose === "chase" && p.taskId) await logEvent(ctx, p.taskId, "chase.sent", `Reminder sent to ${receipt.toAddrs.join(", ")}${p.payload.escalation ? " (escalated)" : ""}`, { messageId }, ctx.userId);
  // Confirmation and step-specific messages mark their own step (see payload.markStep).
  const mark = p.payload.markStep as { taskId: string; kind: "confirm" | "send" } | undefined;
  if (mark) { await markStepState(ctx, mark.taskId, mark.kind, { sent: true, messageId }); await advance(ctx, mark.taskId); }
  await ctx.completeExecution?.(ctx);
  });
});

onReject("send_message", async (ctx, p) => {
  await ctx.db.update(message).set({ status: "failed", error: "Rejected by staff" }).where(eq(message.id, p.payload.messageId as string));
});

onApprove("cancel_task", async (ctx, p) => {
  const taskId = p.payload.taskId as string;
  await cancelTask(ctx, taskId, (p.payload.reason as string) ?? "Cancelled at the client's request", ctx.userId, p.id);
  const t = await getTask(ctx, taskId);
  if (p.payload.voidInvoice && t.requestId) {
    if ((await tasksForRequest(ctx, t.requestId)).some(t => t.status !== "cancelled")) return;
    const inv = await invoiceForRequest(ctx, t.requestId);
    if (inv && inv.status !== "void") await voidInvoice(ctx, inv.id, "All tasks on the invoice were cancelled");
    if (inv?.xeroInvoiceId) await enqueue(ctx, "xero.void_invoice", { invoiceId: inv.id }, `xero.void:${inv.id}`);
  }
});

onApprove("custom_plan", async (ctx, p, opts) => {
  const taskId = p.payload.taskId as string;
  const t = await getTask(ctx, taskId);
  const edits = opts.edits as { feeHkd?: number; title?: string } | undefined;
  const plan = { ...(t.params.plan as Record<string, unknown>), ...(edits?.feeHkd !== undefined ? { feeHkd: edits.feeHkd } : {}), ...(edits?.title ? { title: edits.title } : {}) };
  const inv = edits?.feeHkd !== undefined ? await invoiceForRequest(ctx, t.requestId) : null;
  if (inv?.status === "draft") await assertInvoiceDraftEditable(ctx, inv.id);
  await ctx.db.update(taskT).set({ params: { ...t.params, plan, planStatus: "approved" }, title: (plan.title as string) ?? t.title }).where(eq(taskT.id, taskId));
  if (edits?.feeHkd !== undefined) {
    if (inv?.status === "draft") {
      await ctx.db.update(invoiceLine).set({ amountCents: Math.round(edits.feeHkd * 100) }).where(eq(invoiceLine.taskId, taskId));
      await recalcTotal(ctx, inv.id);
    }
  }
  await logEvent(ctx, taskId, "plan.approved", "Staff approved the planned checklist", {}, ctx.userId);
});

onApprove("conflict", async (ctx, p, opts) => {
  const { key, incoming, personId, taskId } = p.payload as { key: string; incoming: string; personId?: string; taskId?: string };
  const accept = (opts.edits as { accept?: "incoming" | "onFile" } | undefined)?.accept ?? "incoming";
  if (accept === "incoming" && personId && PERSON_FIELD[key]) await updatePerson(ctx, personId, { [PERSON_FIELD[key]]: incoming }, "Staff accepted the client's corrected value");
  if (taskId) {
    const t = await getTask(ctx, taskId);
    const next = t.checklist.map((e) => e.key === key && (!e.personId || e.personId === personId) ? { ...e, status: "received" as const, value: accept === "incoming" ? incoming : e.value } : e);
    await setChecklist(ctx, taskId, next, `Conflict on ${key} resolved (${accept === "incoming" ? "client's value" : "value on file"})`, ctx.userId);
    const accepted = next.find(e => e.key === key && (!e.personId || e.personId === personId));
    if (accepted?.value) await ctx.db.update(taskT).set({ extracted: { ...t.extracted, [key]: { ...(t.extracted[key] as Record<string, unknown> | undefined), value: PROTECTED_KEYS.has(key) ? "Provided" : accepted.value, source: "Staff resolved the conflicting value" } } }).where(and(eq(taskT.id, taskId), eq(taskT.firmId, ctx.firmId)));
    await advance(ctx, taskId);
  }
});

onApprove("triage", async () => { /* acknowledged: staff handle it by hand */ });

onApprove("change_request", async (ctx, p) => {
  const { taskId, mode, playbookId } = p.payload as { taskId: string; mode: "swap" | "add"; playbookId: string };
  const t = await getTask(ctx, taskId);
  if (t.status !== "open" || !t.requestId) throw new Error("This task is no longer open for a request change");
  const inv = await invoiceForRequest(ctx, t.requestId);
  const previousSend = t.stepState[String(t._steps.findIndex(step => step.kind === "send"))] as { sent?: boolean; skipped?: string } | undefined;
  if ((inv && inv.status !== "draft") || (!inv && (previousSend?.sent || previousSend?.skipped))) {
    const { startManualRequest } = await import("./manual");
    const fields = Object.fromEntries(Object.entries(t.extracted).flatMap(([key, value]) => value && typeof value === "object" && "value" in value && typeof value.value === "string" ? [[key, value.value]] : []));
    const next = await startManualRequest(ctx, { clientId: t.clientId, items: [{ playbookId, person: t.personId ? { personId: t.personId } : null, fields }], confirm: true,
      context: "change", origin: "change", notes: `Follow-up to request ${t.requestId}: ${mode === "swap" ? "replace" : "add to"} ${t.title}` });
    const nt = await getTask(ctx, next.taskIds[0]);
    await ctx.db.update(taskT).set({ params: { ...nt.params, sourceRequestId: t.requestId, sourceTaskId: t.id } }).where(and(eq(taskT.id, nt.id), eq(taskT.firmId, ctx.firmId)));
    await logEvent(ctx, t.id, "request.follow_up", `Staff approved ${mode === "swap" ? "replacement" : "additional"} work in request ${next.requestId}`, { requestId: next.requestId, taskIds: next.taskIds }, ctx.userId);
    if (mode === "swap") await cancelTask(ctx, taskId, `Replaced by ${playbookId} in request ${next.requestId}`, ctx.userId, p.id);
    return;
  }
  const cards = await ctx.db.select().from(proposal).where(and(eq(proposal.firmId, ctx.firmId), eq(proposal.requestId, t.requestId), eq(proposal.kind, "send_message"), inArray(proposal.status, ["pending", "processing", "recovery"]), sql`${proposal.payload}->>'purpose' = 'request'`));
  if (cards.some(card => card.status !== "pending")) throw new Error("Recover the approved invoice delivery before changing this request");
  if (inv) await assertInvoiceDraftEditable(ctx, inv.id);
  const nt = await startTask(ctx, { requestId: t.requestId, clientId: t.clientId, playbookId, personId: t.personId, extracted: t.extracted as never });
  if (mode === "swap") await cancelTask(ctx, taskId, `Replaced by ${playbookId}`, ctx.userId, p.id);
  if (inv?.status === "draft") {
    const { getPlaybook } = await import("./playbooks");
    const pb = await getPlaybook(ctx, playbookId);
    if (pb.feeCents) await ctx.db.insert(invoiceLine).values({ id: ctx.ids.next("inl"), firmId: ctx.firmId, invoiceId: inv.id, taskId: nt.id, description: nt.title, amountCents: pb.feeCents, kind: "fee", sort: 50 });
    for (const [index, fee] of (pb.statutoryFees ?? []).entries()) await ctx.db.insert(invoiceLine).values({ id: ctx.ids.next("inl"), firmId: ctx.firmId, invoiceId: inv.id, taskId: nt.id, description: fee.description, amountCents: fee.amountCents, kind: "disbursement", sort: 51 + index });
    await recalcTotal(ctx, inv.id);
  } else if (!inv) await createInvoiceForRequest(ctx, t.requestId);
  // Refresh the entire active task list and quote together; the earlier draft did
  // not authorize sending the new scope, even if the service is free of charge.
  const active = (await tasksForRequest(ctx, t.requestId)).filter(task => task.status === "open");
  const current = await ctx.db.select().from(proposal).where(and(eq(proposal.firmId, ctx.firmId), eq(proposal.requestId, t.requestId), eq(proposal.kind, "send_message"), eq(proposal.status, "pending"), sql`${proposal.payload}->>'purpose' = 'request'`));
  const original = cards[0] ?? current[0];
  if (!original) throw new Error("A fresh request quote needs the original draft context; start a separate follow-up request");
  const source = await ctx.db.query.message.findFirst({ where: and(eq(message.firmId, ctx.firmId), eq(message.id, original.payload.messageId as string)) });
  if (!source) throw new Error("Original request draft not found");
  for (const card of current) {
    await ctx.db.update(proposal).set({ status: "superseded", decidedAt: ctx.clock.now() }).where(eq(proposal.id, card.id));
    await ctx.db.update(message).set({ status: "failed", error: "Request scope changed; replaced by a fresh quote" }).where(and(eq(message.firmId, ctx.firmId), eq(message.id, card.payload.messageId as string), eq(message.status, "draft")));
  }
  const { composeReply, emptyFacts, newRequestFacts } = await import("./inbound");
  const { createProposal } = await import("./proposals");
  const lang = source.language === "tc" || source.language === "sc" ? source.language : "en";
  const ids = active.map(task => task.id);
  const req = await getRequest(ctx, t.requestId);
  const draft = await composeReply(ctx, { clientId: t.clientId, conversationId: source.conversationId, inReplyTo: null, facts: { ...emptyFacts(lang), context: "change", newRequests: await newRequestFacts(ctx, ids, lang) }, requestId: req.id, to: source.toAddrs, purpose: "request" });
  const fresh = await createProposal(ctx, { kind: "send_message", title: "Approve updated work and invoice", clientId: t.clientId, requestId: req.id, payload: { messageId: draft.id, requestId: req.id, taskIds: ids, draftSource: draft.source, purpose: "request" } });
  await ctx.db.update(message).set({ proposalId: fresh.id }).where(eq(message.id, draft.id));
});

export type { Proposal };
void personT; void invoice;

onApprove("revise_invoice", async (ctx, p, opts) => {
  const { invoiceId, reason, lines } = p.payload as { invoiceId: string; reason: string; lines?: RevisionLine[] };
  const edits = opts.edits as { lines?: RevisionLine[] } | undefined;
  const use = edits?.lines ?? lines;
  if (!use?.length) throw new Error("A revision needs its new lines");
  const nw = await applyRevision(ctx, invoiceId, { reason, lines: use });
  if (nw.status === "sent") await enqueue(ctx, "xero.sync_invoice", { invoiceId: nw.id }, `xero.invoice:${nw.id}`);
});

// A mailbox reply's suggested task updates: apply only the changes staff kept ticked.
onApprove("mailbox_update", async (ctx, p, opts) => {
  const changes = (p.payload.changes as { type: string; taskId: string | null; key: string | null; value: string | null; playbookId: string | null; text: string }[]) ?? [];
  const edits = (opts.edits ?? {}) as Record<string, unknown>;
  const keep = (i: number) => edits.selection !== "explicit" || !!edits[`apply:${i}`];
  const touched = new Set<string>();
  const start: string[] = [];
  for (const [i, c] of changes.entries()) {
    if (!keep(i)) continue;
    if (c.type === "start" && c.playbookId) { start.push(c.playbookId); continue; }
    if (!c.taskId) continue;
    const t = await getTask(ctx, c.taskId);
    if (t.status !== "open") continue;
    if (c.type === "not_needed" || c.type === "received") {
      const next = t.checklist.map((e) => e.key === c.key && (!e.personId || e.personId === t.personId) ? { ...e, status: c.type === "received" ? "received" as const : "not_needed" as const, value: c.type === "received" ? c.value : e.value ?? null, reason: c.type === "not_needed" ? "Waived in a reply from the mailbox" : e.reason, source: "Reply from the mailbox" } : e);
      await setChecklist(ctx, t.id, next, c.text, ctx.userId);
      touched.add(t.id);
    } else if (c.type === "cancel") {
      await cancelTask(ctx, t.id, c.text || "Cancelled as agreed in a reply from the mailbox");
    } else {
      await logEvent(ctx, t.id, "note.mailbox", c.text, { proposalId: p.id }, ctx.userId);
    }
  }
  for (const id of touched) await advance(ctx, id);
  if (start.length && p.clientId) {
    const { startManualRequest } = await import("./manual");
    await startManualRequest(ctx, { clientId: p.clientId, items: start.map((playbookId) => ({ playbookId })), notes: "Agreed in a reply from the mailbox", confirm: true });
  }
});

// An enforcement letter (late filing, warning, summons): start the matching work with the
// letter's date as the hard deadline, the scan on the task, and a draft to the client.
onApprove("start_enforcement", async (ctx, p) => {
  const pl = p.payload as { playbookId: string; dueDate: string | null; form: string | null; reference: string | null; letter: { documentId: string; sender: string; summary: string; receivedOn: string; actionNeeded: string | null } };
  const { startManualRequest } = await import("./manual");
  const fields: Record<string, string> = {};
  if (pl.reference) fields.enforcementRef = pl.reference;
  if (pl.form) fields.overdueForm = pl.form;
  const r = await startManualRequest(ctx, {
    clientId: p.clientId!, items: [{ playbookId: pl.playbookId, fields, dueDate: pl.dueDate }], confirm: true, context: "letter", origin: "letter",
    notes: `Letter from ${pl.letter.sender} received ${valueText(pl.letter.receivedOn)}: ${pl.letter.summary}`,
    extraNotes: [`Letter from ${pl.letter.sender}, received ${valueText(pl.letter.receivedOn)}: ${pl.letter.summary}.`, pl.dueDate ? `The date that matters: ${valueText(pl.dueDate)}.` : "", pl.letter.actionNeeded ? `What it asks for: ${pl.letter.actionNeeded}.` : ""].filter(Boolean),
    attachDocumentIds: [pl.letter.documentId],
  });
  await ctx.db.update(document).set({ taskId: r.taskIds[0] }).where(eq(document.id, pl.letter.documentId));
});
onReject("start_enforcement", async (ctx, p) => {
  const { draftLetterNotice } = await import("./mail-items");
  const l = p.payload.letter as import("./mail-items").LoggedLetter;
  await draftLetterNotice(ctx, l);
});
