// Turns a client's free-text share instruction into structured movements. Staff see the
// result as a register-change preview before anything is applied.
import { z } from "zod";
import type { Ctx } from "@/lib/ctx";
import { callAgent } from "./call";

export const MovementsZ = z.object({
  items: z.array(z.object({
    kind: z.enum(["allotment", "transfer", "buyback"]),
    fromPersonId: z.string().nullable(), fromName: z.string().nullable(),
    toPersonId: z.string().nullable(), toName: z.string().nullable(), toNameZh: z.string().nullable(),
    className: z.string(), quantity: z.number().int().positive(),
    pricePerShareCents: z.number().nullable(), considerationCents: z.number().nullable(),
  })),
});
export type Movements = z.infer<typeof MovementsZ>;

const SYSTEM = `You convert a Hong Kong company secretary's instruction about shares into structured share movements. Use personIds from the members list when the person is an existing member; otherwise give their name. Amounts are in cents (HK$1 = 100). Only include what the instruction states.`;

export async function structureMovements(ctx: Ctx, o: { taskId: string; instruction: string; members: { personId: string; name: string; className: string; quantity: number }[]; classes: string[] }): Promise<Movements> {
  return callAgent(ctx, { agent: "structure", system: SYSTEM, schema: MovementsZ, taskId: o.taskId,
    user: `Instruction: ${o.instruction}\nCurrent members: ${JSON.stringify(o.members)}\nShare classes: ${JSON.stringify(o.classes)}` });
}
