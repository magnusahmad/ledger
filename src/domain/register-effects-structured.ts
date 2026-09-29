// Register effects that need structured facts (allotments, transfers, controllers).
// Filled in with the share-movement milestone (M9).
import type { Ctx } from "@/lib/ctx";
import type { RegisterEffect } from "./playbook-types";
import type { Task } from "./engine";

export async function planStructured(_ctx: Ctx, _t: Task, _e: RegisterEffect, _v: Record<string, string>, _eff: string): Promise<{ effect: RegisterEffect["kind"]; description: string; apply: () => Promise<void> }[]> {
  return [];
}
