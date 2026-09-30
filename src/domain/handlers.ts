// Approval handlers: what happens when a human approves each kind of proposal.
import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { message, person as personT, task as taskT } from "@/db/schema";
import { onApprove, onReject, editDistance, type Proposal } from "./proposals";
import { sendMessage, invoiceForRequest } from "./outbound";
import { advance, cancelTask, getTask, logEvent, markStepState, setChecklist, startTask, tasksForRequest } from "./engine";
import { markInvoiceSent, voidInvoice, recalcTotal, applyRevision, type RevisionLine } from "./invoices";
import { updatePerson } from "./records";
import { renderInvoicePdf } from "@/documents/invoice-pdf";
import { enqueue } from "./jobs";
import { invoiceLine, invoice } from "@/db/schema";

const PERSON_FIELD: Record<string, string> = { fullName: "nameEn", chiName: "nameZh", idNo: "idNumber", resAddr: "residentialAddress", corrAddr: "correspondenceAddress" };

onApprove("send_message", async (ctx, p, opts) => {
  const messageId = p.payload.messageId as string;
  const m = (await ctx.db.query.message.findFirst({ where: eq(message.id, messageId) }))!;
  const raw = opts.edits as { subject?: string; text?: string; to?: string | string[] } | undefined;
  const edits = raw ? { ...raw, to: typeof raw.to === "string" ? raw.to.split(/[,;\s]+/).filter(Boolean) : raw.to } : undefined;
  if (edits?.text && opts.editChars === undefined) opts.editChars = editDistance(m.text ?? "", edits.text);
  // An additional invoice (costs added later) names itself; otherwise it's the request's invoice.
  const inv = p.payload.invoiceId ? (await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, p.payload.invoiceId as string) })) ?? null : await invoiceForRequest(ctx, (p.payload.requestId as string | null) ?? null);
  const attachInvoice = inv && inv.status === "draft" && (m.intake as { attachInvoiceId?: string } | null)?.attachInvoiceId === inv.id;
  const attachments = attachInvoice ? [{ filename: `${inv!.number}.pdf`, mime: "application/pdf", content: await renderInvoicePdf(ctx, inv!.id) }] : [];
  for (const docId of (p.payload.attachDocumentIds as string[] | undefined) ?? []) {
    const d = await ctx.db.query.document.findFirst({ where: (x, { eq }) => eq(x.id, docId) });
    if (d?.storageKey) attachments.push({ filename: d.title.endsWith(".pdf") ? d.title : `${d.title}.pdf`, mime: d.mime ?? "application/pdf", content: await ctx.storage.get(d.storageKey) });
  }
  await sendMessage(ctx, messageId, { edits, attachments, approvedBy: ctx.userId });
  if (attachInvoice) {
    await markInvoiceSent(ctx, inv!.id);
    await enqueue(ctx, "xero.sync_invoice", { invoiceId: inv!.id }, `xero.invoice:${inv!.id}`);
  }
  for (const taskId of (p.payload.taskIds as string[]) ?? []) {
    const t = await getTask(ctx, taskId);
    if (t.status !== "open") continue;
    const step = t._steps[t.stepIndex];
    if (step?.kind === "send") await markStepState(ctx, taskId, "send", { sent: true, messageId });
    await logEvent(ctx, taskId, "message.sent", `Email sent to ${m.toAddrs.join(", ")}: ${m.subject ?? ""}`, { messageId }, ctx.userId);
    await advance(ctx, taskId);
  }
  // Confirmation and step-specific messages mark their own step (see payload.markStep).
  const mark = p.payload.markStep as { taskId: string; kind: "confirm" | "send" } | undefined;
  if (mark) { await markStepState(ctx, mark.taskId, mark.kind, { sent: true, messageId }); await advance(ctx, mark.taskId); }
});

onReject("send_message", async (ctx, p) => {
  await ctx.db.update(message).set({ status: "failed", error: "Rejected by staff" }).where(eq(message.id, p.payload.messageId as string));
});

onApprove("cancel_task", async (ctx, p) => {
  const taskId = p.payload.taskId as string;
  await cancelTask(ctx, taskId, (p.payload.reason as string) ?? "Cancelled at the client's request");
  const t = await getTask(ctx, taskId);
  if (p.payload.voidInvoice && t.requestId) {
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
  await ctx.db.update(taskT).set({ params: { ...t.params, plan, planStatus: "approved" }, title: (plan.title as string) ?? t.title }).where(eq(taskT.id, taskId));
  if (edits?.feeHkd !== undefined) {
    const inv = await invoiceForRequest(ctx, t.requestId);
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
    await advance(ctx, taskId);
  }
});

onApprove("triage", async () => { /* acknowledged: staff handle it by hand */ });

onApprove("change_request", async (ctx, p) => {
  const { taskId, mode, playbookId } = p.payload as { taskId: string; mode: "swap" | "add"; playbookId: string };
  const t = await getTask(ctx, taskId);
  const nt = await startTask(ctx, { requestId: t.requestId, clientId: t.clientId, playbookId, personId: t.personId, extracted: t.extracted as never });
  if (mode === "swap") await cancelTask(ctx, taskId, `Replaced by ${playbookId}`);
  const inv = await invoiceForRequest(ctx, t.requestId);
  if (inv?.status === "draft") {
    const { getPlaybook } = await import("./playbooks");
    const pb = await getPlaybook(ctx, playbookId);
    if (mode === "swap") await ctx.db.delete(invoiceLine).where(eq(invoiceLine.taskId, taskId));
    if (pb.feeCents) await ctx.db.insert(invoiceLine).values({ id: ctx.ids.next("inl"), firmId: ctx.firmId, invoiceId: inv.id, taskId: nt.id, description: nt.title, amountCents: pb.feeCents, kind: "fee", sort: 50 });
    await recalcTotal(ctx, inv.id);
  }
  // Already-sent step state carries over to the new task.
  const sent = (await tasksForRequest(ctx, t.requestId!)).some((x) => Object.values(x.stepState).some((s) => (s as { sent?: boolean }).sent));
  if (sent) { await markStepState(ctx, nt.id, "send", { sent: true }); await advance(ctx, nt.id); }
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
