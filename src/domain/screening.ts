// Screening step: sanctions/PEP screening of the task's people, LLM adjudication of any
// hits, a human decision on anything not clear, and the CDD record on success.
import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { cddRecord, client as clientT, contact, document, screeningResult } from "@/db/schema";
import { onEnterStep, getTask, markStepState, logEvent, advance, hasCurrentCdd, type Task } from "./engine";
import { createProposal, onApprove } from "./proposals";
import { officersAsAt } from "./records";
import { callAgent } from "@/agent/call";
import { AdjudicationZ } from "@/agent/schemas";
import { SCREEN_SYSTEM } from "@/agent/prompts";
import { addMonths } from "./dates";

const REVIEW_YEARS = { low: 3, medium: 2, high: 1 } as const;

async function peopleToScreen(ctx: Ctx, t: Task): Promise<string[]> {
  if (t.personId) return [t.personId];
  const ids = new Set((await officersAsAt(ctx, t.clientId, ctx.clock.today(), "director")).map((o) => o.personId));
  for (const c of await ctx.db.select().from(contact).where(eq(contact.clientId, t.clientId))) if (c.personId && c.isInstructing) ids.add(c.personId);
  return [...ids].filter((id) => id !== "per_firm");
}

export async function screenPerson(ctx: Ctx, personId: string, taskId: string | null) {
  const p = (await ctx.db.query.person.findFirst({ where: (x, { eq }) => eq(x.id, personId) }))!;
  const query = { name: p.nameEn, nameZh: p.nameZh, birthDate: p.dateOfBirth, nationality: p.nationality };
  const hits = await ctx.screening.match(query);
  let status: "clear" | "potential" | "match" = "clear";
  let adjudication: { id: string; verdict: string; reason: string }[] = [];
  if (hits.length) {
    const r = await callAgent(ctx, { agent: "screen", system: SCREEN_SYSTEM, taskId, schema: AdjudicationZ,
      user: `Person screened: ${JSON.stringify(query)}\nCandidate hits: ${JSON.stringify(hits)}` });
    adjudication = r.hits;
    status = r.overall === "clear" && hits.every((h) => h.score < 0.9) ? "clear" : r.overall === "clear" ? "potential" : r.overall;
  }
  const [row] = await ctx.db.insert(screeningResult).values({ id: ctx.ids.next("scn"), firmId: ctx.firmId, personId, taskId, provider: ctx.screening.name, datasetVersion: await ctx.screening.datasetVersion(), query, hits, adjudication, status, createdAt: ctx.clock.now() }).returning();
  return row;
}

export async function recordCdd(ctx: Ctx, personId: string, taskId: string | null, screeningId: string | null) {
  const t = taskId ? await getTask(ctx, taskId) : null;
  const cl = t ? await ctx.db.query.client.findFirst({ where: eq(clientT.id, t.clientId) }) : null;
  const risk = cl?.riskRating ?? "medium";
  const docs = await ctx.db.select().from(document).where(eq(document.personId, personId));
  const latest = (k: string) => docs.filter((d) => d.requirementKey === k).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.id ?? null;
  const today = ctx.clock.today();
  await ctx.db.insert(cddRecord).values({ id: ctx.ids.next("cdd"), firmId: ctx.firmId, personId, riskRating: risk, idDocumentId: latest("idCopy"), addressProofDocumentId: latest("addrProof"), livenessCheckedOn: latest("selfie") ? today : null, screeningId, verifiedOn: today, reviewDueOn: addMonths(today, 12 * REVIEW_YEARS[risk]), sourceTaskId: taskId, createdAt: ctx.clock.now() });
}

onEnterStep("screen", runScreenStep);
onEnterStep("kyc", runScreenStep);

async function runScreenStep(ctx: Ctx, task: Task) {
  const people = await peopleToScreen(ctx, task);
  const open: string[] = [];
  for (const pid of people) {
    const r = await screenPerson(ctx, pid, task.id);
    const p = (await ctx.db.query.person.findFirst({ where: (x, { eq }) => eq(x.id, pid) }))!;
    if (r.status === "clear") {
      if (!(await hasCurrentCdd(ctx, pid)) || task.personId === pid) await recordCdd(ctx, pid, task.id, r.id);
      await logEvent(ctx, task.id, "screening.clear", `${p.nameEn}: no sanctions or PEP matches (${r.datasetVersion})`);
    } else {
      open.push(pid);
      const hits = r.hits as { caption: string; datasets: string[]; score: number }[];
      await createProposal(ctx, { kind: "screening_review", title: `Screening hit: ${p.nameEn}`, clientId: task.clientId, taskId: task.id,
        summary: `${hits.length} possible match(es): ${hits.map((h) => `${h.caption} (${h.datasets.join(", ")}, score ${h.score})`).join("; ")}. Agent's view: ${(r.adjudication as { verdict: string; reason: string }[]).map((a) => `${a.verdict}: ${a.reason}`).join("; ")}`,
        payload: { screeningId: r.id, personId: pid, taskId: task.id } });
      await logEvent(ctx, task.id, "screening.hit", `${p.nameEn}: possible match, waiting for a compliance decision`);
    }
  }
  if (open.length === 0) await markStepState(ctx, task.id, "screen", { cleared: true, screened: people });
  else await markStepState(ctx, task.id, "screen", { pending: open });
}

onApprove("screening_review", async (ctx, p, opts) => {
  const { screeningId, personId, taskId } = p.payload as { screeningId: string; personId: string; taskId: string };
  const edits = (opts.edits ?? {}) as { decision?: "clear" | "escalate"; note?: string };
  const decision = edits.decision ?? "clear";
  await ctx.db.update(screeningResult).set({ status: decision === "clear" ? "cleared_by_staff" : "escalated", reviewedBy: ctx.userId }).where(eq(screeningResult.id, screeningId));
  await logEvent(ctx, taskId, "screening.decision", decision === "clear" ? `Compliance cleared the hit${edits.note ? `: ${edits.note}` : ""}` : "Escalated to the MLRO; task on hold", {}, ctx.userId);
  if (decision !== "clear") return;
  await recordCdd(ctx, personId, taskId, screeningId);
  const t = await getTask(ctx, taskId);
  const idx = t._steps.findIndex((s) => s.kind === "screen" || s.kind === "kyc");
  const pending = ((t.stepState[String(idx)] as { pending?: string[] } | undefined)?.pending ?? []).filter((x) => x !== personId);
  await markStepState(ctx, taskId, idx, { pending, cleared: pending.length === 0 });
  await advance(ctx, taskId);
});
