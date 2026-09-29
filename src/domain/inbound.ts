// Inbound pipeline: store the message, let the intake agent read it against the client's
// open tasks, apply what it found (internal changes automatically, anything client-facing
// as a proposal), and draft one reply for approval.
import { and, asc, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import type { InboundMail } from "@/integrations/types";
import { attachment, client as clientT, conversation, document, message, request as requestT, task as taskT, type Lang } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import { runIntake } from "@/agent/intake";
import { runReview, applyReview } from "@/agent/review";
import { planCustomTask } from "@/agent/planner";
import { draftEmail, type ReplyFacts } from "@/agent/draft";
import { AgentError } from "@/agent/call";
import type { Intake, IntakeAction } from "@/agent/schemas";
import { findClientsBySenderEmail } from "./lookup";
import { addContact, createClient, getPersonProtected, updatePerson } from "./records";
import { resolvePerson } from "./people";
import { advance, createRequest, getTask, logEvent, outstanding, setChecklist, startTask, tasksForRequest, type Extracted, type Task } from "./engine";
import { getPlaybook } from "./playbooks";
import { createInvoiceForRequest, invoiceWithLines } from "./invoices";
import { createProposal } from "./proposals";
import { getFirm } from "./firm";
import { itemLabel, money, PROTECTED_KEYS } from "./labels";
import { fmtDate } from "./dates";
import "./handlers";
import "./payments";
import "./accounting-sync";

const MIN_CONFIDENCE = 0.7;
const ONBOARDING = new Set(["hk.transferIn", "hk.incorporation"]);

// ---------- Ingest ----------
export async function ingestMessage(ctx: Ctx, m: Omit<InboundMail, "references" | "html" | "rfcMessageId" | "inReplyTo" | "providerThreadId"> & Partial<InboundMail> & { channel: "email" | "paste" | "portal"; clientId?: string | null }) {
  if (m.providerMessageId) {
    const dup = await ctx.db.query.message.findFirst({ where: and(eq(message.provider, m.provider), eq(message.providerMessageId, m.providerMessageId)) });
    if (dup) return { ...dup, duplicate: true as const };
  }
  // Thread: provider thread id, then In-Reply-To, else a new conversation.
  let conv = m.providerThreadId ? await ctx.db.query.conversation.findFirst({ where: and(eq(conversation.firmId, ctx.firmId), eq(conversation.providerThreadId, m.providerThreadId)) }) : undefined;
  if (!conv && m.inReplyTo) {
    const parent = await ctx.db.query.message.findFirst({ where: eq(message.rfcMessageId, m.inReplyTo) });
    if (parent) conv = await ctx.db.query.conversation.findFirst({ where: eq(conversation.id, parent.conversationId) });
  }
  if (!conv) {
    [conv] = await ctx.db.insert(conversation).values({
      id: ctx.ids.next("cnv"), firmId: ctx.firmId, clientId: m.clientId ?? null, channel: m.channel,
      providerThreadId: m.providerThreadId ?? null, subject: m.subject.replace(/^(re|fwd?):\s*/i, ""), counterpartyEmail: m.from.email?.toLowerCase() ?? null,
      lastMessageAt: m.receivedAt, createdAt: ctx.clock.now(),
    }).returning();
  } else {
    await ctx.db.update(conversation).set({ lastMessageAt: m.receivedAt }).where(eq(conversation.id, conv.id));
  }
  const [row] = await ctx.db.insert(message).values({
    id: ctx.ids.next("msg"), firmId: ctx.firmId, conversationId: conv.id, direction: "in", provider: m.provider,
    providerMessageId: m.providerMessageId ?? null, rfcMessageId: m.rfcMessageId ?? null, inReplyTo: m.inReplyTo ?? null,
    fromAddr: m.from.email?.toLowerCase() ?? null, fromName: m.from.name ?? null, toAddrs: m.to, ccAddrs: m.cc,
    subject: m.subject, text: m.text, html: m.html ?? null, status: "received", at: m.receivedAt,
  }).returning();
  for (const a of m.attachments) {
    const docId = ctx.ids.next("doc");
    const key = `attachments/${row.id}/${a.filename.replace(/[^\w.\-]/g, "_")}`;
    await ctx.storage.put(key, a.content);
    await ctx.db.insert(document).values({ id: docId, firmId: ctx.firmId, clientId: conv.clientId, kind: "upload", title: a.filename, storageKey: key, mime: a.mime, sha256: Crypto.sha256(a.content), source: m.channel === "portal" ? "upload" : "email", createdAt: ctx.clock.now() });
    await ctx.db.insert(attachment).values({ id: ctx.ids.next("att"), firmId: ctx.firmId, messageId: row.id, documentId: docId, filename: a.filename, mime: a.mime, size: a.content.length });
  }
  return { ...row, duplicate: false as const };
}

// ---------- Process ----------
export type ProcessResult = { messageId: string; clientId: string | null; requestId: string | null; taskIds: string[]; proposalIds: string[] };

export async function processInbound(ctx: Ctx, messageId: string): Promise<ProcessResult> {
  const msg = await ctx.db.query.message.findFirst({ where: eq(message.id, messageId) });
  if (!msg) throw new Error("Message not found");
  const conv = (await ctx.db.query.conversation.findFirst({ where: eq(conversation.id, msg.conversationId) }))!;
  const result: ProcessResult = { messageId, clientId: null, requestId: null, taskIds: [], proposalIds: [] };
  const atts = await ctx.db.select().from(attachment).where(eq(attachment.messageId, messageId));

  const matches = msg.fromAddr ? await findClientsBySenderEmail(ctx, msg.fromAddr) : [];
  const candidateIds = [...new Set([...(conv.clientId ? [conv.clientId] : []), ...matches.map((x) => x.client.id)])];
  const history = await ctx.db.select().from(message).where(and(eq(message.conversationId, conv.id))).orderBy(asc(message.at));

  let intake: Intake;
  try {
    ({ intake } = await runIntake(ctx, {
      messageId, from: { email: msg.fromAddr, name: msg.fromName }, subject: msg.subject, text: msg.text ?? "",
      attachments: atts.map((a) => ({ filename: a.filename, mime: a.mime })), candidateClientIds: candidateIds,
      threadHistory: history.filter((h) => h.id !== messageId && (h.status === "sent" || h.status === "received")).map((h) => ({ direction: h.direction, text: h.text ?? "" })),
    }));
  } catch (e) {
    if (!(e instanceof AgentError)) throw e;
    const p = await createProposal(ctx, { kind: "triage", title: `Couldn't read a message from ${msg.fromName ?? msg.fromAddr ?? "unknown sender"}`, summary: "The intake agent failed twice. Read the message and start the request by hand.", clientId: conv.clientId, payload: { messageId, reason: e.message } });
    await markProcessed(ctx, messageId, { error: e.message });
    return { ...result, proposalIds: [p.id] };
  }

  // ----- Client -----
  let clientId: string | null = null;
  if (intake.client.kind === "existing" && intake.client.clientId && candidateIds.includes(intake.client.clientId)) clientId = intake.client.clientId;
  else if (intake.client.kind === "unclear" && candidateIds.length === 1) clientId = candidateIds[0];
  else if (intake.client.kind === "new_prospect" || (candidateIds.length === 0 && intake.actions.some((a) => a.type !== "general_correspondence"))) {
    clientId = await createProspect(ctx, intake, msg);
  }
  if (!clientId) {
    const p = await createProposal(ctx, { kind: "triage", title: `Which client is this? ${msg.fromName ?? msg.fromAddr}`, summary: intake.client.reason, payload: { messageId, candidates: candidateIds, intake } });
    await markProcessed(ctx, messageId, { intake });
    return { ...result, proposalIds: [p.id] };
  }
  result.clientId = clientId;
  if (conv.clientId !== clientId) await ctx.db.update(conversation).set({ clientId }).where(eq(conversation.id, conv.id));
  for (const a of atts) if (a.documentId) await ctx.db.update(document).set({ clientId }).where(eq(document.id, a.documentId));
  const cl = (await ctx.db.query.client.findFirst({ where: eq(clientT.id, clientId) }))!;

  // ----- Actions -----
  const facts = emptyFacts(intake.language);
  const confident = (a: IntakeAction) => a.confidence >= MIN_CONFIDENCE || a.type === "general_correspondence" || a.type === "ask_question";
  for (const a of intake.actions.filter((x) => !confident(x))) {
    const p = await createProposal(ctx, { kind: "triage", title: `Not sure what ${msg.fromName ?? "the client"} wants`, summary: `${a.type}: ${a.description ?? a.playbookId ?? ""} (confidence ${Math.round(a.confidence * 100)}%)`, clientId, payload: { messageId, action: a } });
    result.proposalIds.push(p.id);
  }
  const actions = intake.actions.filter(confident);

  const starts = actions.filter((a) => a.type === "start_request" && a.playbookId);
  const unsupported = actions.filter((a) => a.type === "unsupported_request");
  const validStarts: { a: IntakeAction; pbId: string }[] = [];
  for (const a of starts) {
    const pb = await getPlaybook(ctx, a.playbookId!).catch(() => null);
    if (pb) validStarts.push({ a, pbId: pb.id });
    else unsupported.push({ ...a, type: "unsupported_request", description: a.description ?? `Request for ${a.playbookId}` });
  }
  if (cl.lifecycle === "prospect" && (validStarts.length || unsupported.length) && !validStarts.some((s) => ONBOARDING.has(s.pbId))) {
    validStarts.unshift({ a: { type: "start_request", taskId: null, playbookId: "hk.transferIn", person: null, fields: [], attachments: [], effectiveDate: null, description: "Onboarding as a new client", confidence: 1, evidence: null }, pbId: "hk.transferIn" });
  }

  let requestId: string | null = null;
  const newTasks: Task[] = [];
  if (validStarts.length || unsupported.length) {
    const req = await createRequest(ctx, { clientId, summary: intake.summary, conversationId: conv.id, sourceMessageId: messageId });
    requestId = req.id;
    for (const { a, pbId } of validStarts) newTasks.push(await startFromAction(ctx, clientId, req.id, pbId, a, messageId));
    for (const a of unsupported) {
      const t = await startCustom(ctx, clientId, req.id, a, cl.nameEn, messageId).catch((e) => { if (e instanceof AgentError) return null; throw e; });
      if (t) {
        newTasks.push(t);
        const p = await createProposal(ctx, { kind: "custom_plan", title: `Review planned one-off task: ${t.title}`, summary: a.description, clientId, taskId: t.id, requestId: req.id, payload: { taskId: t.id } });
        result.proposalIds.push(p.id);
      } else {
        const p = await createProposal(ctx, { kind: "triage", title: `Unsupported request: ${a.description}`, clientId, payload: { messageId, action: a } });
        result.proposalIds.push(p.id);
      }
    }
    await createInvoiceForRequest(ctx, req.id);
    result.requestId = req.id;
    result.taskIds.push(...newTasks.map((t) => t.id));
  }

  const touchedTasks: Task[] = [];
  for (const a of actions.filter((x) => ["provide_information", "change_request", "cancel_request"].includes(x.type))) {
    const t = a.taskId ? await getTask(ctx, a.taskId).catch(() => null) : null;
    if (!t || t.clientId !== clientId || t.status !== "open") {
      const p = await createProposal(ctx, { kind: "triage", title: `Which task is this for? (${a.type.replace("_", " ")})`, summary: a.description ?? JSON.stringify(a.fields.map((f) => f.key)), clientId, payload: { messageId, action: a } });
      result.proposalIds.push(p.id);
      continue;
    }
    if (a.type === "cancel_request") {
      const p = await proposeCancel(ctx, t, a.description ?? "Client asked to cancel", messageId);
      result.proposalIds.push(p.id);
      facts.cancellations.push({ title: pbTitle(await getPlaybook(ctx, t.playbookId, t.playbookVersion), intake.language), note: a.description ?? "" });
      continue;
    }
    const questions = a.type === "provide_information"
      ? await applyInformation(ctx, t, a, atts, messageId, result)
      : await applyChange(ctx, t, a, messageId, result);
    facts.clarifications.push(...questions);
    touchedTasks.push(await getTask(ctx, t.id));
    if (a.type === "change_request") facts.changes.push({ title: pbTitle(await getPlaybook(ctx, t.playbookId, t.playbookVersion), intake.language), change: a.description ?? "", nowNeeded: outstanding(await getTask(ctx, t.id)).map((e) => itemLabel(e.key, intake.language, t.params)) });
  }
  for (const a of actions.filter((x) => x.type === "ask_question")) facts.questions.push({ question: a.description ?? "", facts: await answerFacts(ctx, clientId) });

  // Advance touched tasks (e.g. collection complete) and new tasks (send step waits for approval).
  for (const t of touchedTasks) await advance(ctx, t.id);

  // ----- Reply -----
  const needsReply = newTasks.length > 0 || facts.questions.length > 0 || facts.changes.length > 0 || facts.cancellations.length > 0 || touchedTasks.length > 0 || facts.clarifications.length > 0;
  if (needsReply) {
    for (const t of newTasks) {
      const tt = await getTask(ctx, t.id);
      const pb = await getPlaybook(ctx, tt.playbookId, tt.playbookVersion);
      facts.newRequests.push({
        title: pbTitle(pb, intake.language) + (tt.personId ? ` (${(await ctx.db.query.person.findFirst({ where: (p, { eq }) => eq(p.id, tt.personId!) }))?.nameEn})` : ""),
        needed: outstanding(tt).map((e) => itemLabel(e.key, intake.language, tt.params)),
        onFile: tt.checklist.filter((e) => e.status === "on_file").map((e) => itemLabel(e.key, intake.language, tt.params)),
        alreadyReceived: tt.checklist.filter((e) => e.status === "received").map((e) => `${itemLabel(e.key, intake.language, tt.params)}${e.value && !PROTECTED_KEYS.has(e.key) ? `: ${e.value}` : ""}`),
        deadline: tt.dueDate ? `${fmtDate(tt.dueDate, intake.language)} (${pb.deadline.kind !== "none" ? pb.deadline.rule : ""})` : null,
      });
    }
    for (const t of touchedTasks) {
      const tt = await getTask(ctx, t.id);
      const ttTitle = pbTitle(await getPlaybook(ctx, tt.playbookId, tt.playbookVersion), intake.language);
      if (facts.changes.some((c) => c.title.startsWith(ttTitle))) continue;
      facts.updates.push({
        title: tt.title, received: tt.checklist.filter((e) => e.status === "received").map((e) => itemLabel(e.key, intake.language, tt.params)),
        stillNeeded: outstanding(tt).map((e) => itemLabel(e.key, intake.language, tt.params)), nextStep: tt._steps[tt.stepIndex]?.label ?? null,
      });
    }
    const reqForLink = requestId ?? touchedTasks[0]?.requestId ?? null;
    const draft = await composeReply(ctx, { clientId, conversationId: conv.id, inReplyTo: msg, facts, requestId: reqForLink, messageId });
    const p = await createProposal(ctx, {
      kind: "send_message", title: requestId ? `Approve reply and invoice to ${msg.fromName ?? msg.fromAddr}` : `Approve reply to ${msg.fromName ?? msg.fromAddr}`,
      summary: intake.summary, clientId, requestId, payload: { messageId: draft.id, requestId, taskIds: [...newTasks, ...touchedTasks].map((t) => t.id), draftSource: draft.source, purpose: requestId ? "request" : "update" },
    });
    await ctx.db.update(message).set({ proposalId: p.id }).where(eq(message.id, draft.id));
    result.proposalIds.push(p.id);
  }
  await markProcessed(ctx, messageId, { intake });
  return result;
}

// ---------- Helpers ----------
function emptyFacts(language: Lang): ReplyFacts {
  return { language, recipientName: "", clientName: "", signOff: "", newRequests: [], updates: [], changes: [], cancellations: [], questions: [], clarifications: [], invoice: null, uploadUrl: null };
}

function pbTitle(pb: { name: Record<Lang, string> }, lang: Lang) { return pb.name[lang] ?? pb.name.en; }

async function markProcessed(ctx: Ctx, messageId: string, data: { intake?: unknown; error?: string }) {
  await ctx.db.update(message).set({ processedAt: ctx.clock.now(), intake: (data.intake as Record<string, unknown>) ?? null, error: data.error ?? null }).where(eq(message.id, messageId));
}

async function createProspect(ctx: Ctx, intake: Intake, msg: typeof message.$inferSelect) {
  const name = intake.client.companyName?.trim() || `${intake.client.senderName ?? msg.fromName ?? msg.fromAddr} (new prospect)`;
  const cl = await createClient(ctx, {
    nameEn: name, lifecycle: "prospect", operatingStatus: intake.actions.some((a) => a.playbookId === "hk.incorporation") ? "not_incorporated" : "operating",
    companyNumber: intake.client.companyNumber, messageLang: intake.language, staffId: ctx.userId, jurisdiction: "HK",
  });
  const person = msg.fromAddr ? await resolvePerson(ctx, cl.id, { nameEn: intake.client.senderName ?? msg.fromName ?? msg.fromAddr, email: msg.fromAddr }) : null;
  await addContact(ctx, { clientId: cl.id, personId: person?.id ?? null, name: intake.client.senderName ?? msg.fromName ?? msg.fromAddr ?? "Contact", role: "Gives instructions and receives invoices", email: msg.fromAddr, channel: "email", language: intake.language, isBilling: true, isInstructing: true });
  return cl.id;
}

function toExtracted(fields: { key: string; value: string; quote: string | null }[], allowed: Set<string>): Extracted {
  const out: Extracted = {};
  for (const f of fields) if (allowed.has(f.key) && f.value?.trim()) out[f.key] = { value: f.value.trim(), source: f.quote };
  return out;
}

async function startFromAction(ctx: Ctx, clientId: string, requestId: string, pbId: string, a: IntakeAction, messageId: string): Promise<Task> {
  const pb = await getPlaybook(ctx, pbId);
  let personId: string | null = null;
  if (pb.personSelection && pb.personSelection !== "none" && a.person && a.person.mode !== "none") {
    const p = await resolvePerson(ctx, clientId, { personId: a.person.mode === "existing" ? a.person.personId : null, nameEn: a.person.nameEn, nameZh: a.person.nameZh, email: a.person.email });
    personId = p.id;
  }
  const extracted = toExtracted(a.fields, new Set(pb.requirements.map((r) => r.key)));
  if (a.effectiveDate && !extracted.effDate && pb.requirements.some((r) => r.key === "effDate")) extracted.effDate = { value: a.effectiveDate, source: a.evidence };
  // Person particulars given in the first message go on the new person's record; for an
  // existing person, differing values are conflicts (never silent overwrites).
  const conflicts = personId ? await writePersonParticulars(ctx, personId, extracted, clientId) : [];
  for (const c of conflicts) delete extracted[c];
  const t = await startTask(ctx, { requestId, clientId, playbookId: pb.id, personId, extracted });
  await logEvent(ctx, t.id, "agent.intake", `Harbourline read the client's message: ${a.description ?? pb.name.en}`, { evidence: a.evidence, confidence: a.confidence, messageId }, "agent");
  return t;
}

const PERSON_FIELD: Record<string, "nameEn" | "nameZh" | "idNumber" | "residentialAddress" | "correspondenceAddress"> = {
  fullName: "nameEn", chiName: "nameZh", idNo: "idNumber", resAddr: "residentialAddress", corrAddr: "correspondenceAddress",
};

/** Returns keys that conflict with on-file values (these become conflict proposals). */
async function writePersonParticulars(ctx: Ctx, personId: string, ex: Extracted, clientId: string, taskId?: string): Promise<string[]> {
  const p = await getPersonProtected(ctx, personId);
  const patch: Record<string, string> = {};
  const conflicts: string[] = [];
  for (const [key, field] of Object.entries(PERSON_FIELD)) {
    const v = ex[key]?.value;
    if (!v) continue;
    const onFile = (p as Record<string, unknown>)[field] as string | null;
    if (!onFile) { patch[field] = v; continue; }
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]/g, "");
    if (norm(onFile) !== norm(v)) {
      conflicts.push(key);
      await createProposal(ctx, { kind: "conflict", title: `Conflicting ${itemLabel(key)} for ${p.nameEn}`, summary: `On file: ${PROTECTED_KEYS.has(key) ? "(protected)" : onFile}. Client now says: ${v}.`, clientId, taskId: taskId ?? null, payload: { taskId: taskId ?? null, key, onFile: PROTECTED_KEYS.has(key) ? "(protected value on file)" : onFile, incoming: v, personId, question: `Could you please confirm your ${itemLabel(key).toLowerCase()}? It differs from our records.` } });
    }
  }
  const ci = ex.contactInfo?.value;
  if (ci) {
    const email = ci.match(/[\w.+-]+@[\w.-]+/)?.[0];
    const phone = ci.match(/\+?\d[\d\s-]{6,}/)?.[0]?.trim();
    if (email && !p.email) (patch as Record<string, string>).email = email;
    if (phone && !p.phone) (patch as Record<string, string>).phone = phone;
  }
  if (Object.keys(patch).length) await updatePerson(ctx, personId, patch, "From client's message");
  return conflicts;
}

async function startCustom(ctx: Ctx, clientId: string, requestId: string, a: IntakeAction, clientName: string, messageId: string): Promise<Task> {
  const plan = await planCustomTask(ctx, { description: a.description ?? "", clientName, messageId });
  const t = await startTask(ctx, { requestId, clientId, playbookId: "hk.custom", title: plan.title, params: { plan, planStatus: "proposed", description: a.description }, extracted: { taskScope: { value: a.description ?? plan.title, source: a.evidence } } });
  const checklist = [...t.checklist, ...plan.items.map((i) => ({ key: i.key, personId: null, status: "needed" as const }))];
  await setChecklist(ctx, t.id, checklist, "Checklist planned by the agent (staff to review)", "agent");
  return getTask(ctx, t.id);
}

async function applyInformation(ctx: Ctx, t: Task, a: IntakeAction, atts: (typeof attachment.$inferSelect)[], messageId: string, result: ProcessResult): Promise<string[]> {
  const pb = await getPlaybook(ctx, t.playbookId, t.playbookVersion);
  const allowed = new Set(t.checklist.map((e) => e.key));
  const ex = toExtracted(a.fields, allowed);
  const conflicts = t.personId ? await writePersonParticulars(ctx, t.personId, ex, t.clientId, t.id) : [];
  const next = t.checklist.map((e) => ({ ...e }));
  const personKeys = new Set(pb.requirements.filter((r) => r.scope === "person").map((r) => r.key));
  const received: string[] = [];
  for (const [key, v] of Object.entries(ex)) {
    if (conflicts.includes(key)) continue;
    const i = next.findIndex((e) => e.key === key && (!personKeys.has(key) || e.personId === t.personId));
    if (i >= 0 && next[i].status !== "on_file") { next[i] = { ...next[i], status: "received", value: v.value, source: v.source ?? null }; received.push(key); }
  }
  for (const m of a.attachments) {
    const att = atts.find((x) => x.filename === m.filename);
    if (!att?.documentId || !m.key || !allowed.has(m.key)) continue;
    const pid = personKeys.has(m.key) ? (m.personId ?? t.personId) : null;
    const i = next.findIndex((e) => e.key === m.key && (!personKeys.has(m.key) || e.personId === pid));
    if (i < 0) continue;
    next[i] = { ...next[i], status: "received", documentId: att.documentId, source: m.filename };
    await ctx.db.update(document).set({ taskId: t.id, personId: pid, requirementKey: m.key, kind: m.key === "idCopy" ? "id_copy" : m.key === "addrProof" ? "address_proof" : "upload" }).where(eq(document.id, att.documentId));
    received.push(m.key);
  }
  const extracted = { ...t.extracted, ...ex };
  await ctx.db.update(taskT).set({ extracted }).where(eq(taskT.id, t.id));
  await setChecklist(ctx, t.id, next, "Information received from the client", "agent");
  await logEvent(ctx, t.id, "agent.information", `Harbourline filed ${received.length} item(s) from the client's message`, { keys: received, messageId }, "agent");
  const review = await runReview(ctx, t.id, { kind: "information", description: a.description ?? "Client provided information", newFields: a.fields.map((f) => ({ key: f.key, value: f.value })), messageId });
  const out = await applyReview(ctx, t.id, review, { clientId: t.clientId });
  result.proposalIds.push(...out.proposals);
  return out.questions;
}

async function applyChange(ctx: Ctx, t: Task, a: IntakeAction, messageId: string, result: ProcessResult): Promise<string[]> {
  await logEvent(ctx, t.id, "agent.change", `Client changed the instructions: ${a.description ?? ""}`, { messageId }, "agent");
  const review = await runReview(ctx, t.id, { kind: "change", description: a.description ?? "", newFields: a.fields.map((f) => ({ key: f.key, value: f.value })), messageId });
  const out = await applyReview(ctx, t.id, review, { clientId: t.clientId, newPersonHint: a.person && a.person.mode !== "none" ? { nameEn: a.person.nameEn, nameZh: a.person.nameZh, email: a.person.email, personId: a.person.mode === "existing" ? a.person.personId : null } : null });
  // Values given alongside the change (e.g. the new date) land on the checklist too.
  if (a.fields.length) {
    const cur = await getTask(ctx, t.id);
    const ex = toExtracted(a.fields, new Set(cur.checklist.map((e) => e.key)));
    const next = cur.checklist.map((e) => ex[e.key] && e.status !== "on_file" && (!e.personId || e.personId === cur.personId) ? { ...e, status: "received" as const, value: ex[e.key].value } : e);
    await setChecklist(ctx, t.id, next, "Updated from the client's change", "agent");
  }
  result.proposalIds.push(...out.proposals);
  return out.questions;
}

async function proposeCancel(ctx: Ctx, t: Task, reason: string, messageId: string) {
  let voidInvoice = false;
  if (t.requestId) {
    const req = await ctx.db.query.request.findFirst({ where: eq(requestT.id, t.requestId) });
    if (req?.invoiceId) {
      const inv = await invoiceWithLines(ctx, req.invoiceId);
      const others = (await tasksForRequest(ctx, t.requestId)).filter((x) => x.id !== t.id && x.status === "open");
      voidInvoice = inv.paidCents === 0 && inv.status !== "void" && others.length === 0;
    }
  }
  return createProposal(ctx, { kind: "cancel_task", title: `Cancel: ${t.title}`, summary: reason, clientId: t.clientId, taskId: t.id, requestId: t.requestId, payload: { taskId: t.id, voidInvoice, reason, messageId } });
}

async function answerFacts(ctx: Ctx, clientId: string): Promise<string> {
  const tasks = await ctx.db.select().from(taskT).where(and(eq(taskT.clientId, clientId), eq(taskT.status, "open")));
  const lines: string[] = [];
  for (const t0 of tasks) {
    const t = await getTask(ctx, t0.id);
    lines.push(`${t.title}: current step "${t._steps[t.stepIndex]?.label ?? "done"}"; waiting for ${outstanding(t).map((e) => itemLabel(e.key)).join(", ") || "nothing from the client"}${t.dueDate ? `; statutory deadline ${t.dueDate}` : ""}.`);
  }
  const { upcomingDeadlines } = await import("./deadlines");
  for (const d of await upcomingDeadlines(ctx, { clientId, withinDays: 180 })) lines.push(`${d.label} due ${d.dueDate}.`);
  return lines.join("\n") || "No open work for this client.";
}

/** Builds recipient, invoice and link facts and drafts the outbound message. */
export async function composeReply(ctx: Ctx, o: { clientId: string; conversationId: string; inReplyTo: typeof message.$inferSelect | null; facts: ReplyFacts; requestId: string | null; messageId?: string | null; to?: string[]; purpose?: string }) {
  const f = o.facts;
  const firm = await getFirm(ctx);
  const cl = (await ctx.db.query.client.findFirst({ where: eq(clientT.id, o.clientId) }))!;
  const contacts = await ctx.db.query.contact.findMany({ where: (c, { eq }) => eq(c.clientId, o.clientId) });
  const toAddr = o.to?.[0] ?? o.inReplyTo?.fromAddr ?? contacts.find((c) => c.isInstructing)?.email ?? contacts[0]?.email ?? null;
  const ct = contacts.find((c) => c.email && toAddr && c.email.toLowerCase() === toAddr.toLowerCase());
  f.recipientName = ct?.salutation?.[f.language] ?? ct?.name ?? o.inReplyTo?.fromName ?? (f.language === "en" ? "Sir or Madam" : "客戶");
  f.clientName = (f.language === "tc" ? cl.nameTc : f.language === "sc" ? cl.nameSc : null) ?? cl.nameEn;
  f.signOff = firm.signOff?.[f.language] ?? firm.legalName;
  if (o.requestId) {
    const req = (await ctx.db.query.request.findFirst({ where: eq(requestT.id, o.requestId) }))!;
    f.uploadUrl = `${ctx.config.APP_URL}/u/${req.uploadToken}`;
    if (req.invoiceId && o.purpose !== "update") {
      const inv = await invoiceWithLines(ctx, req.invoiceId);
      if (inv.status === "draft") {
        const details = await ctx.bank.accountDetails();
        f.invoice = {
          number: inv.number, totalFormatted: money(inv.totalCents, inv.currency),
          lines: inv.lines.map((l) => ({ description: l.description, amount: money(l.amountCents, inv.currency) })),
          terms: inv.termsDays ? (f.language === "en" ? `payable within ${inv.termsDays} days; we have started work` : `${inv.termsDays}天內付款；我們已開始處理`) : (f.language === "en" ? "payable on receipt; we start work once payment arrives" : "收到發票後付款；收到款項後即開始處理"),
          paymentInstructions: Object.entries(details).map(([k, v]) => `${k}: ${v}`).join("\n"),
        };
      }
    }
  }
  const d = await draftEmail(ctx, f, { messageId: o.messageId, purpose: o.purpose });
  const subject = o.inReplyTo?.subject ? (/^re:/i.test(o.inReplyTo.subject) ? o.inReplyTo.subject : `Re: ${o.inReplyTo.subject}`) : d.subject;
  const [row] = await ctx.db.insert(message).values({
    id: ctx.ids.next("msg"), firmId: ctx.firmId, conversationId: o.conversationId, direction: "out", status: "draft",
    fromAddr: ctx.mail.address, toAddrs: toAddr ? [toAddr] : [], subject, text: d.body, language: f.language,
    inReplyTo: o.inReplyTo?.rfcMessageId ?? null, at: ctx.clock.now(),
    intake: { facts: f, requestId: o.requestId, attachInvoiceId: f.invoice ? (await ctx.db.query.request.findFirst({ where: eq(requestT.id, o.requestId!) }))?.invoiceId ?? null : null },
  }).returning();
  return { ...row, source: d.source };
}
