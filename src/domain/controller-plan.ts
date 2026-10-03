import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { person, significantController, task } from "@/db/schema";
import type { Task } from "./engine";
import { ControllersZ, structureControllers } from "@/agent/controllers";
import { addController, ceaseController } from "./controllers";

export async function planControllerInstructions(ctx: Ctx, t: Task, instruction: string) {
  const people = await ctx.db.select({ id: person.id, nameEn: person.nameEn }).from(person).where(eq(person.firmId, ctx.firmId));
  const controllers = await ctx.db.select().from(significantController).where(and(eq(significantController.firmId, ctx.firmId), eq(significantController.clientId, t.clientId)));
  const plan = t.params.controllerPlan ? ControllersZ.parse(t.params.controllerPlan) : await structureControllers(ctx, { taskId: t.id, instruction, people, controllers });
  for (const item of plan.items) {
    if (item.kind === "add" && !people.some(p => p.id === item.personId)) throw new Error("Controller person must belong to this firm");
    if (item.kind === "cease") {
      const existing = controllers.find(c => c.id === item.controllerId && !c.ceasedOn);
      if (!existing || item.ceasedOn <= existing.registrableFrom) throw new Error("Controller cessation requires an active record and a later valid date");
    }
  }
  if (!t.params.controllerPlan) await ctx.db.update(task).set({ params: { ...t.params, controllerPlan: plan } }).where(eq(task.id, t.id));
  return plan.items.map(item => ({
    effect: "update_controllers" as const,
    description: item.kind === "add" ? `Enter ${people.find(p => p.id === item.personId)!.nameEn} as a significant controller from ${item.registrableFrom}: ${item.nature}` : `Record cessation of controller ${item.controllerId} on ${item.ceasedOn}`,
    apply: async () => {
      if (item.kind === "add") {
        await addController(ctx, { clientId: t.clientId, personId: item.personId, nature: item.nature, registrableFrom: item.registrableFrom, sourceTaskId: t.id });
      } else {
        await ceaseController(ctx, t.clientId, item.controllerId, item.ceasedOn);
      }
    },
  }));
}
