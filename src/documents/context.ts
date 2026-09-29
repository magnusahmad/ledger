// Everything a document template or form mapping needs, loaded once per generation.
import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { businessRegistration, client as clientT, significantController } from "@/db/schema";
import { getFirm } from "@/domain/firm";
import { getPersonProtected, officersAsAt } from "@/domain/records";
import { issuedAsAt, membersAsAt } from "@/domain/shares";
import { getTask } from "@/domain/engine";
import { getPlaybook } from "@/domain/playbooks";
import type { PlaybookDef } from "@/domain/playbook-types";

export async function loadDocContext(ctx: Ctx, taskId: string) {
  const task = await getTask(ctx, taskId);
  const pb = await getPlaybook(ctx, task.playbookId, task.playbookVersion);
  const client = (await ctx.db.query.client.findFirst({ where: eq(clientT.id, task.clientId) }))!;
  const firm = await getFirm(ctx);
  const today = ctx.clock.today();
  const asAt = task.effectiveDate && task.effectiveDate > today ? task.effectiveDate : today;
  const officers = await officersAsAt(ctx, client.id, today);
  const directors = await Promise.all(officers.filter((o) => o.role === "director").map(async (o) => ({ ...o, protected: await getPersonProtected(ctx, o.personId) })));
  const secretary = officers.find((o) => o.role === "secretary") ?? null;
  const members = await membersAsAt(ctx, client.id, today);
  const capital = await issuedAsAt(ctx, client.id, today);
  const br = await ctx.db.query.businessRegistration.findFirst({ where: eq(businessRegistration.clientId, client.id) });
  const scs = await ctx.db.select().from(significantController).where(eq(significantController.clientId, client.id));
  const person = task.personId ? await getPersonProtected(ctx, task.personId) : null;
  const values: Record<string, string> = {};
  for (const e of task.checklist) if (e.value && (!e.personId || e.personId === task.personId)) values[e.key] = e.value;
  for (const [k, v] of Object.entries(task.extracted)) if (!values[k] && typeof (v as { value?: string })?.value === "string") values[k] = (v as { value: string }).value;
  const lang: "en" | "tc" | "sc" | "bilingual" = client.docLang ?? "en";
  return { task, pb, client, firm, today, asAt, officers, directors, secretary, members, capital, br, scs, person, values, lang };
}

export type DocContext = Awaited<ReturnType<typeof loadDocContext>>;
export type { PlaybookDef };
