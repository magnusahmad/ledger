// Everything a document template or form mapping needs, loaded once per generation.
import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { businessRegistration, client as clientT, significantController, person as personT } from "@/db/schema";
import { getFirm } from "@/domain/firm";
import { getPersonProtected, officersAsAt } from "@/domain/records";
import { issuedAsAt, membersAsAt } from "@/domain/shares";
import { getTask } from "@/domain/engine";
import { getPlaybook } from "@/domain/playbooks";
import type { PlaybookDef } from "@/domain/playbook-types";

/** The reporting anniversary belongs to the task's period, even for a late return. */
export function annualReturnDate(task: { periodKey: string | null }, client: { incorporatedOn: string | null }, today: string) {
  if (!client.incorporatedOn) throw new Error("NAR1: incorporation date is required to determine the reporting anniversary.");
  const year = task.periodKey?.match(/^NAR1:(\d{4})$/)?.[1] ?? today.slice(0, 4);
  const anniversary = `${year}${client.incorporatedOn.slice(4)}`;
  // Clamp 29 February to the last day of February in a non-leap year.
  return anniversary.endsWith("-02-29") && new Date(`${anniversary}T00:00:00Z`).getUTCMonth() !== 1 ? `${year}-02-28` : anniversary;
}

export async function loadDocContext(ctx: Ctx, taskId: string) {
  const task = await getTask(ctx, taskId);
  const pb = await getPlaybook(ctx, task.playbookId, task.playbookVersion);
  const client = (await ctx.db.query.client.findFirst({ where: eq(clientT.id, task.clientId) }))!;
  const firm = await getFirm(ctx);
  const today = ctx.clock.today();
  const asAt = pb.id === "hk.annualReturn" ? annualReturnDate(task, client, today) : task.effectiveDate ?? today;
  const officers = await officersAsAt(ctx, client.id, asAt);
  const directors = await Promise.all(officers.filter((o) => o.role === "director").map(async (o) => ({ ...o, protected: await getPersonProtected(ctx, o.personId) })));
  const secretary = officers.find((o) => o.role === "secretary") ?? null;
  const holdings = await membersAsAt(ctx, client.id, asAt);
  const members = await Promise.all(holdings.map(async m => {
    const p = await ctx.db.query.person.findFirst({ where: eq(personT.id, m.personId) });
    return { ...m, address: p?.correspondenceAddress, corporate: p?.kind === "corporate" } as typeof m & { address?: string | null; corporate?: boolean };
  }));
  const capital = await issuedAsAt(ctx, client.id, asAt);
  const br = await ctx.db.query.businessRegistration.findFirst({ where: eq(businessRegistration.clientId, client.id) });
  const scs = await ctx.db.select().from(significantController).where(eq(significantController.clientId, client.id));
  const person = task.personId ? await getPersonProtected(ctx, task.personId) : null;
  const values: Record<string, string> = {};
  for (const e of task.checklist) if (e.value && (!e.personId || e.personId === task.personId)) values[e.key] = e.value;
  for (const [k, v] of Object.entries(task.extracted)) if (!values[k] && typeof (v as { value?: string })?.value === "string") values[k] = (v as { value: string }).value;
  if (pb.id === "hk.changeParticulars" && values.changeDetail) {
    const { particularsFor } = await import("@/domain/particulars");
    const proposed = await particularsFor(ctx, task, values.changeDetail);
    for (const change of proposed.changes) values[change.field] = change.value;
  }
  if (["hk.allotShares", "hk.transferShares", "hk.buyback"].includes(pb.id)) {
    const { movementsFor } = await import("@/domain/register-effects-structured");
    task.params = { ...task.params, structured: await movementsFor(ctx, task, values) };
  }
  const incorporation = pb.id === "hk.incorporation" ? await (await import("@/domain/incorporation")).incorporationFor(ctx, task, values) : null;
  const lang: "en" | "tc" | "sc" | "bilingual" = client.docLang ?? "en";
  return { task, pb, client, firm, today, asAt, officers, directors, secretary, members, capital, br, scs, person, values, incorporation, lang };
}

export type DocContext = Awaited<ReturnType<typeof loadDocContext>>;
export type { PlaybookDef };
