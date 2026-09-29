import type { Ctx } from "@/lib/ctx";
import { callAgent } from "./call";
import { PlanZ, type Plan } from "./schemas";
import { PLAN_SYSTEM } from "./prompts";

export async function planCustomTask(ctx: Ctx, opts: { description: string; clientName: string; messageId?: string | null }): Promise<Plan> {
  return callAgent(ctx, {
    agent: "plan", system: PLAN_SYSTEM, messageId: opts.messageId,
    user: `Client: ${opts.clientName}\nRequest: ${opts.description}`, schema: PlanZ,
  });
}
