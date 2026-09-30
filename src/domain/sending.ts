import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { message, proposal } from "@/db/schema";
import { advance, getTask, logEvent, markStepState, tasksForRequest } from "./engine";
import { invoiceForRequest } from "./outbound";
import { markInvoiceSent } from "./invoices";
import { enqueue } from "./jobs";

/** Staff confirmation of delivery by any medium; never sends a message. */
export async function completeSending(ctx: Ctx, taskIds: string[], requestId: string | null, note?: string, approvingId?: string, invoiceId?: string) {
  const tasks = await Promise.all(taskIds.map(id => getTask(ctx, id)));
  const linked = requestId ? await Promise.all((await tasksForRequest(ctx, requestId)).map(t => getTask(ctx, t.id))) : tasks;
  const inv = await invoiceForRequest(ctx, requestId);
  const id = invoiceId ?? inv?.id;
  if (id) {
    const own = await ctx.db.query.invoice.findFirst({ where: (i, { and, eq }) => and(eq(i.id, id), eq(i.firmId, ctx.firmId)) });
    if (!own) throw new Error("Invoice not found");
    await markInvoiceSent(ctx, id);
    await enqueue(ctx, "xero.sync_invoice", { invoiceId: id }, `xero.invoice:${id}`);
  }
  const cards = await ctx.db.select().from(proposal).where(and(eq(proposal.firmId, ctx.firmId), eq(proposal.kind, "send_message")));
  for (const p of cards) {
    if (p.status !== "pending" && p.id !== approvingId) continue;
    const mark = p.payload.markStep as { taskId: string } | undefined;
    if (p.id !== approvingId && !(requestId && p.requestId === requestId && p.payload.purpose === "request") && !tasks.some(t => t.id === mark?.taskId)) continue;
    if (p.id !== approvingId) await ctx.db.update(proposal).set({ status: "superseded", decidedAt: ctx.clock.now() }).where(eq(proposal.id, p.id));
    await ctx.db.update(message).set({ status: "failed", error: "Completed by staff outside Harbourline" }).where(and(eq(message.id, p.payload.messageId as string), eq(message.firmId, ctx.firmId)));
  }
  for (const t of linked) {
    const kind = t._steps[t.stepIndex]?.kind;
    if (t.status !== "open" || (kind !== "send" && !(tasks.some(x => x.id === t.id) && kind === "confirm"))) continue;
    await markStepState(ctx, t.id, kind, { sent: true, completedOutside: true, note: note?.trim() || null });
    await logEvent(ctx, t.id, "message.completed_outside", `Sending marked done by staff${note?.trim() ? `: ${note.trim()}` : ""}`, {}, ctx.userId);
    await advance(ctx, t.id);
  }
}
