// Replies staff send straight from the shared mailbox (Gmail), not through Harbourline.
// They join the thread so later reading has the full history, and they withdraw any draft
// Harbourline was holding for that thread so the client isn't answered twice.
import { and, eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import type { InboundMail } from "@/integrations/types";
import { client as clientT, message, proposal, request as requestT, task as taskT } from "@/db/schema";
import { ingestMessage } from "./inbound";
import { getTask, logEvent } from "./engine";
import { getPlaybook } from "./playbooks";
import { itemLabel } from "./labels";
import { createProposal } from "./proposals";
import { findClientsBySenderEmail } from "./lookup";
import { callAgent, AgentError } from "@/agent/call";
import { MailboxReviewZ, type MailboxReview } from "@/agent/schemas";
import { MAILBOX_REVIEW_SYSTEM } from "@/agent/prompts";
import { playbookCatalogue } from "@/agent/context";

export async function recordMailboxReply(ctx: Ctx, m: InboundMail) {
  const row = await ingestMessage(ctx, { ...m, channel: "email", direction: "out" });
  if (row.duplicate) return { messageId: row.id, recorded: false, withdrawn: [] as string[] };

  // Withdraw drafts on this thread that were waiting for approval.
  const drafts = await ctx.db.select().from(message).where(and(eq(message.conversationId, row.conversationId), eq(message.status, "draft")));
  const withdrawn: string[] = [];
  for (const d of drafts) {
    if (!d.proposalId) continue;
    const p = await ctx.db.query.proposal.findFirst({ where: and(eq(proposal.id, d.proposalId), eq(proposal.status, "pending")) });
    if (!p) continue;
    await ctx.db.update(proposal).set({ status: "superseded", decidedAt: ctx.clock.now(), payload: { ...p.payload, supersededBy: "mailbox_reply", replyMessageId: row.id } }).where(eq(proposal.id, p.id));
    await ctx.db.update(message).set({ status: "failed", error: "Replied from the mailbox instead" }).where(eq(message.id, d.id));
    withdrawn.push(p.id);
    // The withdrawn draft may have been the one sending the invoice and upload link. Keep that
    // from being lost: the same text goes back on Today for staff to edit and approve.
    if (p.payload.purpose === "request" && p.requestId) {
      const [copy] = await ctx.db.insert(message).values({ ...d, id: ctx.ids.next("msg"), status: "draft", proposalId: null, error: null, at: ctx.clock.now() }).returning();
      const who = d.toAddrs[0] ? (await ctx.db.query.contact.findFirst({ where: (c, { and, eq }) => and(eq(c.email, d.toAddrs[0]), eq(c.clientId, p.clientId ?? "")) }))?.name ?? d.toAddrs[0] : "the client";
      const np = await createProposal(ctx, {
        kind: "send_message", title: `Still to send: invoice and upload link to ${who}`,
        summary: "The reply sent from the mailbox didn't go through Harbourline, so the invoice and upload link weren't sent. Edit this draft to follow on from that reply.",
        clientId: p.clientId, requestId: p.requestId, payload: { ...p.payload, messageId: copy.id, replaces: p.id },
      });
      await ctx.db.update(message).set({ proposalId: np.id }).where(eq(message.id, copy.id));
    }
  }

  // Note it on the thread's open tasks.
  const reqs = await ctx.db.select({ id: requestT.id }).from(requestT).where(eq(requestT.conversationId, row.conversationId));
  const tasks = reqs.length ? await ctx.db.select().from(taskT).where(and(inArray(taskT.requestId, reqs.map((r) => r.id)), eq(taskT.status, "open"))) : [];
  for (const t of tasks) {
    await logEvent(ctx, t.id, "message.mailbox_reply", `Reply sent from the mailbox: ${m.subject}${withdrawn.length ? " (Harbourline’s draft withdrawn)" : ""}`, { messageId: row.id }, "mailbox");
  }
  const suggestion = await suggestTaskUpdates(ctx, row.id).catch((e) => { if (e instanceof AgentError) return null; throw e; });
  return { messageId: row.id, recorded: true, withdrawn, proposalId: suggestion };
}

export type MailboxChange = MailboxReview["changes"][number];

/** Reads the reply against the client's open tasks and suggests matching updates as one card. Applies nothing itself. */
async function suggestTaskUpdates(ctx: Ctx, messageId: string): Promise<string | null> {
  const reply = (await ctx.db.query.message.findFirst({ where: eq(message.id, messageId) }))!;
  const conv = (await ctx.db.query.conversation.findFirst({ where: (c, { eq }) => eq(c.id, reply.conversationId) }))!;
  let clientId = conv.clientId;
  if (!clientId && reply.toAddrs[0]) {
    const matches = await findClientsBySenderEmail(ctx, reply.toAddrs[0]);
    if (matches.length === 1) clientId = matches[0].client.id;
  }
  if (!clientId) return null;
  const cl = (await ctx.db.query.client.findFirst({ where: eq(clientT.id, clientId) }))!;
  const open = await ctx.db.select().from(taskT).where(and(eq(taskT.clientId, clientId), eq(taskT.status, "open")));
  const tasks = await Promise.all(open.map((t) => getTask(ctx, t.id)));
  const history = (await ctx.db.select().from(message).where(eq(message.conversationId, conv.id))).filter((m) => m.id !== messageId && (m.status === "received" || m.status === "sent")).sort((a, b) => a.at.getTime() - b.at.getTime()).slice(-4);
  const catalogue = (await playbookCatalogue(ctx, [cl.jurisdiction])).map((p) => ({ playbookId: p.playbookId, name: p.name, whenToUse: p.whenToUse }));
  const user = [
    `Client: ${cl.nameEn}`,
    `Open tasks: ${JSON.stringify(tasks.map((t) => ({ taskId: t.id, title: t.title, checklist: t.checklist.map((e) => ({ key: e.key, label: itemLabel(e.key, "en", t.params), status: e.status })) })))}`,
    `Playbooks: ${JSON.stringify(catalogue)}`,
    history.length ? `Earlier in the thread (oldest first):\n${history.map((m) => `[${m.direction === "in" ? "client" : "firm"}] ${(m.text ?? "").slice(0, 800)}`).join("\n---\n")}` : "",
    `STAFF REPLY (subject: ${reply.subject ?? ""}):\n${reply.text ?? ""}`,
  ].filter(Boolean).join("\n\n");
  const r = await callAgent(ctx, { agent: "mailbox_review", system: MAILBOX_REVIEW_SYSTEM, user, schema: MailboxReviewZ, messageId });
  const changes = await validChanges(ctx, clientId, cl.jurisdiction, r.changes);
  if (!changes.length) return null;
  const to = reply.toAddrs[0] ? await ctx.db.query.contact.findFirst({ where: (c, { and, eq }) => and(eq(c.clientId, clientId!), eq(c.email, reply.toAddrs[0])) }) : null;
  const p = await createProposal(ctx, {
    kind: "mailbox_update", title: `Update tasks to match the mailbox reply to ${to?.name ?? cl.nameEn}`, summary: r.summary, clientId,
    payload: { messageId, conversationId: conv.id, changes },
  });
  return p.id;
}

/** Drops anything the model invented: other clients' tasks, closed tasks, unknown items or playbooks. */
async function validChanges(ctx: Ctx, clientId: string, jurisdiction: string, changes: MailboxChange[]): Promise<MailboxChange[]> {
  const out: MailboxChange[] = [];
  for (const c of changes) {
    if (c.type === "start") {
      const pb = c.playbookId ? await getPlaybook(ctx, c.playbookId).catch(() => null) : null;
      if (pb && pb.jurisdiction === jurisdiction && !pb.id.endsWith(".custom")) out.push(c);
      continue;
    }
    const t = c.taskId ? await getTask(ctx, c.taskId).catch(() => null) : null;
    if (!t || t.clientId !== clientId || t.status !== "open") continue;
    if (c.type === "not_needed" || c.type === "received") {
      const e = t.checklist.find((x) => x.key === c.key);
      if (!e || e.status === "not_needed" || e.status === "on_file" || (c.type === "received" && !c.value?.trim())) continue;
    }
    out.push(c);
  }
  return out;
}
