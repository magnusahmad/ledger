// Current guard data applies to historical playbook pins too; no deployment reseed is needed.
import policy from "../../seed/register-guards.json";
import type { Ctx } from "@/lib/ctx";
import type { RegisterEffect, RegisterGuard } from "./playbook-types";
import { officersAsAt } from "./records";
import { membersAsAt } from "./shares";

export function registerGuardFor(playbookId: string, effect: RegisterEffect): RegisterGuard | undefined {
  if (effect.kind !== "appoint_officer" && effect.kind !== "cease_officer") return undefined;
  const current = policy.byPlaybook as Record<string, Record<string, RegisterGuard>>;
  return effect.guard ?? current[playbookId]?.[`${effect.kind}:${effect.role}`];
}

export async function assertRegisterGuard(ctx: Ctx, guard: RegisterGuard | undefined, clientId: string, date: string, removed: string[] = []) {
  if (!guard) return;
  const directors = await officersAsAt(ctx, clientId, date, "director");
  if (guard.kind === "sole_member_is_sole_director") {
    const members = [...new Set((await membersAsAt(ctx, clientId, date)).map(m => m.personId))];
    if (members.length !== 1 || directors.length !== 1 || directors[0].personId !== members[0] || directors[0].person.kind !== "individual") throw new Error("Reserve nomination requires the sole individual member to be the sole director");
  } else {
    const remaining = directors.filter(d => d.person.kind === "individual" && !removed.includes(d.personId));
    if (remaining.length < guard.minimum) throw new Error(`A replacement is required: at least ${guard.minimum} individual director must remain`);
  }
}
