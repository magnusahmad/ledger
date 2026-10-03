import type { Ctx } from "@/lib/ctx";
import { callAgent } from "./call";
import { PlanZ, type Plan } from "./schemas";
import { PLAN_SYSTEM } from "./prompts";

export async function planCustomTask(ctx: Ctx, opts: { description: string; clientName: string; messageId?: string | null; language?: "en" | "tc" | "sc"; quotation?: boolean }): Promise<Plan> {
  return callAgent(ctx, {
    agent: "plan", system: PLAN_SYSTEM, messageId: opts.messageId,
    user: `Client: ${opts.clientName}\nRequest: ${opts.description}${opts.quotation ? "\nPurpose: propose the underlying service requested, not a task or administrative fee for preparing a quotation. Price that service in feeHkd and set feeBasis to one_off, monthly or annual as appropriate. Describe the service deliverables and exclusions in steps/caveats, not our internal quote-approval process. Do not invent a quotation-preparation charge, credit, refund or payment-before-work condition. Identify any pricing assumptions for staff review." : ""}${opts.language ? `\nWrite title, steps and caveats in ${opts.language}. Keep checklist labels trilingual.` : ""}`, schema: PlanZ,
  });
}
