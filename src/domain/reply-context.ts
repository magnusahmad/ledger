// Question-specific evidence and nonbinding quotes; no service tasks or invoices.
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { task as taskT } from "@/db/schema";
import type { IntakeAction } from "@/agent/schemas";
import type { ReplyFacts, QuoteFacts } from "@/agent/draft";
import { planCustomTask } from "@/agent/planner";
import { getPlaybook } from "./playbooks";
import { buildChecklist, getTask } from "./engine";
import { itemLabel, neededItemLabel, money, PROTECTED_KEYS } from "./labels";
import { upcomingDeadlines } from "./deadlines";

export async function questionFacts(ctx: Ctx, clientId: string, a: IntakeAction): Promise<ReplyFacts["questions"][number]> {
  const lines: string[] = [];
  if (a.questionTopic === "task_status") {
    const tasks = await ctx.db.select().from(taskT).where(and(eq(taskT.firmId, ctx.firmId), eq(taskT.clientId, clientId), eq(taskT.status, "open"), a.taskId ? eq(taskT.id, a.taskId) : undefined));
    for (const row of tasks) {
      const t = await getTask(ctx, row.id);
      lines.push(`${t.title}: ${t._steps[t.stepIndex]?.label ?? "done"}; waiting for ${t.checklist.filter(e => e.status === "needed" && !e.optional).map(e => neededItemLabel(e)).join(", ") || "nothing from the client"}${t.dueDate ? `; deadline ${t.dueDate}` : ""}.`);
    }
  } else {
    const topics: Record<string, string> = { annual_return: "hk.annualReturn", business_registration: "hk.brRenewal", kyc: "hk.kycReview", agm: "hk.agm" };
    const playbookId = topics[a.questionTopic];
    if (playbookId) for (const d of await upcomingDeadlines(ctx, { clientId, withinDays: 366, includeCovered: true })) {
      if (d.playbookId === playbookId) lines.push(`${d.label} due ${d.dueDate}.`);
    }
  }
  return { question: a.description ?? "", facts: lines.join("\n"), answerStatus: lines.length ? "available" : "needs_staff" };
}

export async function quoteFacts(ctx: Ctx, a: IntakeAction, opts: { clientId: string; clientName: string; jurisdiction: string; language: ReplyFacts["language"]; messageId: string }): Promise<QuoteFacts> {
  const pb = a.playbookId ? await getPlaybook(ctx, a.playbookId) : null;
  if (pb && pb.jurisdiction !== opts.jurisdiction) throw new Error("Quote playbook does not cover this client's jurisdiction");
  if (pb && !pb.id.endsWith(".custom")) {
    const extracted = Object.fromEntries(a.fields.filter(f => pb.requirements.some(r => r.key === f.key)).map(f => [f.key, { value: f.value, source: f.quote }]));
    const checklist = await buildChecklist(ctx, pb, { clientId: opts.clientId, personId: a.person?.mode === "existing" ? a.person.personId : null, extracted });
    const lines = [{ description: pb.name[opts.language], amount: money(pb.feeCents) }, ...(pb.statutoryFees ?? []).map(f => ({ description: f.description, amount: money(f.amountCents) }))];
    return { title: pb.name[opts.language], supplied: [...[a.description ?? a.evidence ?? ""].filter(Boolean), ...a.fields.filter(f => pb.requirements.some(r => r.key === f.key) && !PROTECTED_KEYS.has(f.key)).map(f => `${itemLabel(f.key, opts.language)}: ${f.value}`)], needed: checklist.filter(e => e.status === "needed" && !e.optional).map(e => itemLabel(e.key, opts.language)), steps: [], caveats: [], lines, totalFormatted: money(pb.feeCents + (pb.statutoryFees ?? []).reduce((n, f) => n + f.amountCents, 0)), status: "proposed" };
  }
  const plan = await planCustomTask(ctx, { description: [a.description, a.evidence].filter(Boolean).join("\n"), clientName: opts.clientName, messageId: opts.messageId, language: opts.language, quotation: true });
  if (!Number.isFinite(plan.feeHkd) || plan.feeHkd < 0 || !Number.isSafeInteger(Math.round(plan.feeHkd * 100))) throw new Error("Invalid proposed quote fee");
  return { title: plan.title, supplied: [a.evidence ?? a.description ?? ""].filter(Boolean), needed: plan.items.map(i => opts.language === "tc" ? i.labelTc : opts.language === "sc" ? i.labelSc : i.labelEn), steps: plan.steps, caveats: plan.caveats, lines: [{ description: plan.title, amount: money(Math.round(plan.feeHkd * 100)) }], totalFormatted: money(Math.round(plan.feeHkd * 100)), feeBasis: plan.feeBasis, status: "proposed" };
}
