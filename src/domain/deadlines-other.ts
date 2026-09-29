// Mainland China, Macau and Taiwan deadlines (M10).
import type { client } from "@/db/schema";
import type { Deadline } from "./deadlines";
export function jurisdictionDeadlines(_c: typeof client.$inferSelect, _today: string, _Y: number): Omit<Deadline, "clientId" | "clientName" | "daysLeft" | "overdue">[] {
  return [];
}
