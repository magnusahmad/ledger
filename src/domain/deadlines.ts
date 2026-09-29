// Deadline engine (full implementation in M9).
import type { Ctx } from "@/lib/ctx";

export type Deadline = { clientId: string; key: string; label: string; dueDate: string; playbookId: string; periodKey: string | null; periodYear: number };

export async function upcomingDeadlines(_ctx: Ctx, _opts: { clientId?: string; withinDays: number }): Promise<Deadline[]> {
  return [];
}
