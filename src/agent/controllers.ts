// Extract explicit controller instructions; staff approve the resulting dated register preview.
import { z } from "zod";
import type { Ctx } from "@/lib/ctx";
import { isIsoDate } from "@/domain/dates";
import { callAgent } from "./call";
const date = z.string().refine(isIsoDate, "Choose a valid controller date");
const text = z.string().trim().min(1);
export const ControllersZ = z.strictObject({ items: z.array(z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("add"), personId: text, nature: text, registrableFrom: date }),
  z.strictObject({ kind: z.literal("cease"), controllerId: text, ceasedOn: date }),
])).min(1) });
export type ControllerPlan = z.infer<typeof ControllersZ>;
export async function structureControllers(ctx: Ctx, o: { taskId: string; instruction: string; people: { id: string; nameEn: string }[]; controllers: { id: string; personId: string; nature: string; registrableFrom: string; ceasedOn: string | null }[] }) {
  return callAgent(ctx, { agent: "structure_controllers", taskId: o.taskId, schema: ControllersZ,
    system: "Extract only explicitly confirmed changes to the significant controllers register. Use person IDs and controller IDs from the supplied records. Each addition needs the confirmed nature of control and explicit registrable-from date; each cessation needs a controller record ID and explicit cessation date. Never infer control from names, keywords or shareholdings, invent dates, or silently substitute a different person. Missing facts must fail validation and remain for staff attention. Your structured plan is a suggestion for a human preview, never permission to update the register.",
    user: `Instruction: ${o.instruction}\nPeople (names only): ${JSON.stringify(o.people)}\nExisting controller records: ${JSON.stringify(o.controllers)}`,
  });
}
