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
    // Needed for an official allotment return; missing facts block generation.
    considerationType: z.enum(["cash", "noncash"]).optional(),
    unpaidCents: z.number().int().nonnegative().optional(),
    existingUnpaidCents: z.number().int().nonnegative().optional(),
    currency: z.string().optional(), allotteeAddress: z.string().optional(),
    allotteeKind: z.enum(["individual", "corporate"]).optional(),
    buybackFunding: z.enum(["profits", "capital", "mixed"]).optional(),
    capitalPaymentCents: z.number().int().nonnegative().optional(),
    postBuybackCapitalCents: z.number().int().nonnegative().optional(),
    paymentDate: z.string().optional(),
  })),
});
export type Movements = z.infer<typeof MovementsZ>;

const SYSTEM = `You convert a Hong Kong company secretary's instruction about shares into structured share movements. Use personIds from the members list when the person is an existing member; otherwise give their name. Amounts are in cents (HK$1 = 100). Only include what the instruction states. For allotments also extract the consideration type (cash or noncash), unpaid amount in cents, existing unpaid share capital in cents, currency, each allottee's address and whether they are an individual or corporate entity. Do not infer cash consideration, fully paid status, existing unpaid capital, currency, an address or entity type from silence. Omit unknown facts. These facts are required before the official NSC1 can be generated. For buybacks extract explicitly stated funding (profits, capital, mixed), capitalPaymentCents (zero only when explicitly wholly from profits), postBuybackCapitalCents (the verified remaining issued capital), paymentDate and existingUnpaidCents. Never infer these from purchase price or cancelled share count; missing facts block NSC2.`;

export async function structureMovements(ctx: Ctx, o: { taskId: string; instruction: string; members: { personId: string; name: string; className: string; quantity: number }[]; classes: string[] }): Promise<Movements> {
  return callAgent(ctx, { agent: "structure", system: SYSTEM, schema: MovementsZ, taskId: o.taskId,
    user: `Instruction: ${o.instruction}\nCurrent members: ${JSON.stringify(o.members)}\nShare classes: ${JSON.stringify(o.classes)}` });
}

const ParticularsZ = z.object({ changes: z.array(z.object({
  field: z.enum(["nameEn", "nameZh", "resAddr", "corrAddr", "email", "idNo", "idCountry"]),
  value: z.string().min(1),
})) });

export async function structureParticulars(ctx: Ctx, taskId: string, instruction: string) {
  return callAgent(ctx, {
    agent: "structure_particulars", taskId, schema: ParticularsZ,
    system: "Extract only explicitly proposed NEW particulars from this officer-change instruction for form ND2B. Never return old values as changes. Do not infer or invent missing information. nameEn/nameZh are new English/Chinese names; resAddr is a new residential address; corrAddr a new correspondence address; email a new email; idNo a new full HKID or passport number; idCountry the passport issuing country. Return no change for a field the instruction does not change.",
    user: instruction,
  });
}
