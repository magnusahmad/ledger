// Start manually: staff open a request themselves after a meeting or call. They choose the
// playbooks and enter what they already know; Harbourline builds the same tasks, invoice and
// confirmation as for an email, and nothing reaches the client without an approval.
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { client as clientT, conversation, message } from "@/db/schema";
import { advance, createRequest, logEvent, markStepState, startTask, type Extracted } from "./engine";
import { getPlaybook } from "./playbooks";
import { resolvePerson } from "./people";
import { createInvoiceForRequest, markInvoiceSent } from "./invoices";
import { createProposal } from "./proposals";
import { enqueue } from "./jobs";
import { itemKind } from "./labels";
import { composeReply, emptyFacts, newRequestFacts, writePersonParticulars } from "./inbound";

export class ManualRequestError extends Error {}

export type ManualItem = {
  playbookId: string;
  /** An existing person, or the name of someone new. */
  person?: { personId?: string | null; nameEn?: string | null } | null;
  /** Requirement key -> value, as agreed in person. */
  fields?: Record<string, string>;
  /** A hard deadline from outside the playbook (e.g. a hearing date). */
  dueDate?: string | null;
};

export async function startManualRequest(ctx: Ctx, r: { clientId: string; items: ManualItem[]; notes?: string | null; confirm: boolean; context?: "meeting" | "letter"; extraNotes?: string[]; attachDocumentIds?: string[]; origin?: string }) {
  const cl = await ctx.db.query.client.findFirst({ where: and(eq(clientT.id, r.clientId), eq(clientT.firmId, ctx.firmId)) });
  if (!cl) throw new ManualRequestError("Choose a client");
  if (!r.items.length) throw new ManualRequestError("Choose at least one thing to do");
  const pbs = [];
  for (const it of r.items) {
    const pb = await getPlaybook(ctx, it.playbookId).catch(() => null);
    if (!pb) throw new ManualRequestError(`Unknown playbook: ${it.playbookId}`);
    if (pb.jurisdiction !== cl.jurisdiction) throw new ManualRequestError(`${pb.name.en} isn't available for this client's jurisdiction`);
    pbs.push(pb);
  }
  const notes = r.notes?.trim() || null;
  const req = await createRequest(ctx, { clientId: cl.id, summary: notes ?? "Taken in person" });

  const taskIds: string[] = [];
  for (const [i, it] of r.items.entries()) {
    const pb = pbs[i];
    let personId: string | null = null;
    if (pb.personSelection && pb.personSelection !== "none" && (it.person?.personId || it.person?.nameEn?.trim())) {
      personId = (await resolvePerson(ctx, cl.id, { personId: it.person.personId ?? null, nameEn: it.person.nameEn?.trim() || null })).id;
    }
    const keys = new Set(pb.requirements.map((q) => q.key));
    const extracted: Extracted = {};
    for (const [k, v] of Object.entries(it.fields ?? {})) {
      if (keys.has(k) && v?.trim() && itemKind(k) !== "file") extracted[k] = { value: v.trim(), source: "Agreed in person" };
    }
    // Particulars for an existing person that differ from the file become conflicts, never overwrites.
    const conflicts = personId ? await writePersonParticulars(ctx, personId, extracted, cl.id) : [];
    for (const c of conflicts) delete extracted[c];
    const t = await startTask(ctx, { requestId: req.id, clientId: cl.id, playbookId: pb.id, personId, extracted, dueDate: it.dueDate ?? null });
    await logEvent(ctx, t.id, "request.manual", r.context === "letter" ? `Started from a letter${notes ? `: ${notes}` : ""}` : `Started manually after a meeting or call${notes ? `: ${notes}` : ""}`, {}, ctx.userId);
    taskIds.push(t.id);
  }
  const inv = await createInvoiceForRequest(ctx, req.id);

  if (!r.confirm) {
    // Already agreed with the client: no confirmation to send, so the send step is skipped and
    // the invoice is issued for staff to hand over (PDF on the invoice page).
    for (const id of taskIds) { await markStepState(ctx, id, "send", { skipped: "Agreed with the client in person" }); await advance(ctx, id); }
    if (inv) {
      await markInvoiceSent(ctx, inv.id);
      await enqueue(ctx, "xero.sync_invoice", { invoiceId: inv.id }, `xero.invoice:${inv.id}`);
    }
    return { requestId: req.id, taskIds, proposalId: null as string | null };
  }

  const contacts = await ctx.db.query.contact.findMany({ where: (c, { eq }) => eq(c.clientId, cl.id) });
  const to = contacts.find((c) => c.isInstructing && c.email) ?? contacts.find((c) => c.email);
  const lang = to?.language ?? cl.messageLang;
  const [conv] = await ctx.db.insert(conversation).values({
    id: ctx.ids.next("cnv"), firmId: ctx.firmId, clientId: cl.id, channel: "email", subject: pbs.map((p) => p.name.en).join(", "),
    counterpartyEmail: to?.email?.toLowerCase() ?? null, lastMessageAt: ctx.clock.now(), createdAt: ctx.clock.now(),
  }).returning();
  const facts = { ...emptyFacts(lang), context: r.context ?? "meeting", extraNotes: r.extraNotes ?? [], newRequests: await newRequestFacts(ctx, taskIds, lang) };
  const draft = await composeReply(ctx, { clientId: cl.id, conversationId: conv.id, inReplyTo: null, facts, requestId: req.id, to: to?.email ? [to.email] : undefined, purpose: "Confirm instructions given in person" });
  const p = await createProposal(ctx, {
    kind: "send_message", title: r.context === "letter" ? `Explain the letter to ${to?.name ?? cl.nameEn}, with the invoice` : `Approve confirmation and invoice to ${to?.name ?? cl.nameEn}`, summary: notes ?? "Taken in person",
    clientId: cl.id, requestId: req.id, payload: { messageId: draft.id, requestId: req.id, taskIds, draftSource: draft.source, purpose: "request", origin: r.origin ?? "manual", attachDocumentIds: r.attachDocumentIds ?? [] },
  });
  await ctx.db.update(message).set({ proposalId: p.id }).where(eq(message.id, draft.id));
  return { requestId: req.id, taskIds, proposalId: p.id as string | null };
}
