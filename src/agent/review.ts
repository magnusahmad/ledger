// Requirement review: whenever a task's facts change, the agent re-checks what still
// applies. Its output is applied with deterministic guardrails: person-scoped KYC is
// rebuilt by the engine, on-file facts are never overwritten, and anything
// client-facing or invoice-affecting becomes a proposal.
import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { invoice, request as requestT, task as taskT } from "@/db/schema";
import { callAgent } from "./call";
import { ReviewZ, type Review } from "./schemas";
import { REVIEW_SYSTEM } from "./prompts";
import { playbookCatalogue } from "./context";
import { buildChecklist, computeDueDate, invalidatePreparation, getTask, logEvent, setChecklist, type Task } from "@/domain/engine";
import { getPlaybook } from "@/domain/playbooks";
import { itemLabel, PROTECTED_KEYS } from "@/domain/labels";
import { createProposal, pendingProposals } from "@/domain/proposals";
import { resolvePerson } from "@/domain/people";
import { isIsoDate } from "@/domain/dates";

export async function runReview(ctx: Ctx, taskId: string, change: { kind: "information" | "change"; description: string; newFields?: { key: string; value: string }[]; messageId?: string | null }): Promise<Review> {
  const t = await getTask(ctx, taskId);
  const pb = await getPlaybook(ctx, t.playbookId, t.playbookVersion);
  const catalogue = (await playbookCatalogue(ctx, [pb.jurisdiction])).map((p) => ({ playbookId: p.playbookId, name: p.name, whenToUse: p.whenToUse }));
  const person = t.personId ? await ctx.db.query.person.findFirst({ where: (p, { eq }) => eq(p.id, t.personId!) }) : null;
  const user = [
    `Today's date: ${ctx.clock.today()}`,
    `Playbook: ${JSON.stringify({ id: pb.id, name: pb.name.en, requirements: pb.requirements.map((r) => ({ key: r.key, label: itemLabel(r.key, "en"), aboutPerson: r.scope === "person", optional: !!r.optional, note: r.appliesWhenNote ?? null })), complianceNotes: pb.complianceNotes })}`,
    `Task: ${JSON.stringify({ taskId: t.id, title: t.title, person: person ? { personId: person.id, name: person.nameEn, nameZh: person.nameZh } : null, effectiveDate: t.effectiveDate, checklist: t.checklist.map((e) => ({ key: e.key, personId: e.personId ?? null, status: e.status, value: e.value && PROTECTED_KEYS.has(e.key) ? "(on file)" : e.value ?? null })), plan: t.params.plan ?? null })}`,
    `On-file facts for the task's person: ${person ? JSON.stringify({ name: person.nameEn, nameZh: person.nameZh, correspondenceAddress: person.correspondenceAddress, email: person.email, idNumberOnFile: !!person.idNumberEnc }) : "none"}`,
    `Other playbooks: ${JSON.stringify(catalogue)}`,
    `WHAT ARRIVED (${change.kind}): ${change.description}`,
    change.newFields?.length ? `New field values: ${JSON.stringify(change.newFields.map((f) => ({ key: f.key, value: PROTECTED_KEYS.has(f.key) ? f.value : f.value })))}` : "",
  ].filter(Boolean).join("\n\n");
  return callAgent(ctx, { agent: "review", system: REVIEW_SYSTEM, user, schema: ReviewZ, taskId, messageId: change.messageId });
}

export type ReviewOutcome = { questions: string[]; proposals: string[]; personChanged: boolean };

export async function applyReview(ctx: Ctx, taskId: string, r: Review, opts: { clientId: string; actor?: string; newPersonHint?: { nameEn: string | null; nameZh: string | null; email: string | null; personId: string | null } | null }): Promise<ReviewOutcome> {
  let t: Task = await getTask(ctx, taskId);
  const pb = await getPlaybook(ctx, t.playbookId, t.playbookVersion);
  const out: ReviewOutcome = { questions: [...r.questionsForClient], proposals: [], personChanged: false };
  const personRefKeys = new Set(pb.requirements.filter((x) => x.scope === "person").map((x) => x.key));

  // 1. Switch person: the engine rebuilds every person-scoped item for the new person.
  const sp = r.switchPerson ?? (opts.newPersonHint?.nameEn ? { nameEn: opts.newPersonHint.nameEn, nameZh: opts.newPersonHint.nameZh, personId: opts.newPersonHint.personId } : null);
  if (sp && sp.nameEn) {
    const newPerson = await resolvePerson(ctx, opts.clientId, { personId: sp.personId, nameEn: sp.nameEn, nameZh: sp.nameZh, email: opts.newPersonHint?.email ?? null });
    if (newPerson.id !== t.personId) {
      const personChecklist = await buildChecklist(ctx, { ...pb, requirements: pb.requirements.filter((x) => x.scope === "person") }, { clientId: opts.clientId, personId: newPerson.id });
      const kept = t.checklist.filter((e) => !personRefKeys.has(e.key));
      await ctx.db.update(taskT).set({ personId: newPerson.id, title: `${pb.name.en}: ${newPerson.nameEn}` }).where(eq(taskT.id, taskId));
      await setChecklist(ctx, taskId, [...kept, ...personChecklist], `Now for ${newPerson.nameEn}`, opts.actor ?? "agent");
      await logEvent(ctx, taskId, "task.person_changed", `Person changed to ${newPerson.nameEn}`, { from: t.personId, to: newPerson.id }, opts.actor ?? "agent");
      out.personChanged = true;
      t = await getTask(ctx, taskId);
    }
  }

  // 2. Item changes (non-person items; person items only for the current person and never "on_file").
  const allowed = new Set([...pb.requirements.map((x) => x.key), ...t.checklist.map((e) => e.key)]);
  const next = t.checklist.map((e) => ({ ...e }));
  let changed = false;
  for (const it of r.items) {
    if (!allowed.has(it.key)) continue;
    const isPerson = personRefKeys.has(it.key);
    const idx = next.findIndex((e) => e.key === it.key && (!isPerson || (e.personId ?? null) === (t.personId ?? null)));
    if (idx < 0) {
      if (it.status === "needed" && !isPerson) { next.push({ key: it.key, personId: null, status: "needed", reason: it.reason }); changed = true; }
      continue;
    }
    const cur = next[idx];
    if (it.status === "on_file" && cur.status !== "on_file") continue; // only the engine decides what is on file
    if (it.status === "received" && !it.value && !cur.documentId && !cur.value) continue;
    if (cur.status === "on_file" && isPerson && it.status === "received") continue; // conflicts go through proposals
    if (cur.status !== it.status || (it.value && it.value !== cur.value)) {
      next[idx] = { ...cur, status: it.status, value: it.value ?? cur.value ?? null, reason: it.reason ?? cur.reason ?? null };
      changed = true;
    }
  }
  if (changed) await setChecklist(ctx, taskId, next, r.summary, opts.actor ?? "agent");

  // 3. Effective date.
  if (r.effectiveDate && isIsoDate(r.effectiveDate) && r.effectiveDate !== t.effectiveDate) {
    await ctx.db.update(taskT).set({ effectiveDate: r.effectiveDate, dueDate: await computeDueDate(ctx, pb, opts.clientId, r.effectiveDate) }).where(eq(taskT.id, taskId));
    await invalidatePreparation(ctx, taskId, "Effective date changed");
    await logEvent(ctx, taskId, "task.effective_date", `Effective date now ${r.effectiveDate}`, {}, opts.actor ?? "agent");
  }

  // 4. Conflicts, playbook fit and invoice changes need a human.
  const existingConflicts = new Set((await pendingProposals(ctx, { taskId, kind: "conflict" })).map((p) => p.payload.key as string));
  for (const c of r.conflicts.filter((x) => !existingConflicts.has(x.key))) {
    const p = await createProposal(ctx, { kind: "conflict", title: `Conflicting ${itemLabel(c.key)}`, summary: `On file: ${c.onFile}. Client now says: ${c.incoming}.`, clientId: opts.clientId, taskId, payload: { taskId, key: c.key, onFile: c.onFile, incoming: c.incoming, question: c.question, personId: t.personId } });
    out.proposals.push(p.id);
    out.questions.push(c.question);
  }
  if (r.playbookFit !== "ok" && r.suggestedPlaybookId) {
    const p = await createProposal(ctx, { kind: "change_request", title: r.playbookFit === "swap" ? `Switch to ${r.suggestedPlaybookId}` : `Add ${r.suggestedPlaybookId}`, summary: r.summary, clientId: opts.clientId, taskId, requestId: t.requestId, payload: { taskId, mode: r.playbookFit, playbookId: r.suggestedPlaybookId } });
    out.proposals.push(p.id);
  }
  if (r.invoiceChange.needed && t.requestId) {
    const req = await ctx.db.query.request.findFirst({ where: eq(requestT.id, t.requestId) });
    const inv = req?.invoiceId ? await ctx.db.query.invoice.findFirst({ where: eq(invoice.id, req.invoiceId) }) : null;
    if (inv && inv.status !== "draft") {
      const p = await createProposal(ctx, { kind: "revise_invoice", title: `Revise invoice ${inv.number}`, summary: r.invoiceChange.reason, clientId: opts.clientId, taskId, requestId: t.requestId, payload: { invoiceId: inv.id, reason: r.invoiceChange.reason } });
      out.proposals.push(p.id);
    }
  }
  return out;
}
