// Mainland China, Macau and Taiwan deadlines. Rules summarised from secondary sources;
// verify with a local company secretary or agent.
import type { client } from "@/db/schema";
import type { Deadline } from "./deadlines";
import { addMonths } from "./dates";

type D = Omit<Deadline, "clientId" | "clientName" | "daysLeft" | "overdue">;
type Subscription = { holder: string; amountCents: number; paidCents?: number; deadline: string };

export function jurisdictionDeadlines(c: typeof client.$inferSelect, today: string, Y: number): D[] {
  const out: D[] = [];
  const jd = c.jurisdictionData as { subscriptions?: Subscription[]; fyeApprovalMonths?: number };
  if (c.jurisdiction === "CN") {
    // Annual report on the National Enterprise Credit Information Publicity System: 1 Jan to 30 Jun, for the previous year.
    for (const y of [Y - 1, Y]) out.push({ key: "CNAR", label: `Annual report for ${y}`, dueDate: `${y + 1}-06-30`, playbookId: "cn.annualReport", periodKey: `CNAR:${y}`, periodYear: y });
    const subs = (jd.subscriptions ?? []).filter((s) => (s.paidCents ?? 0) < s.amountCents);
    const next = subs.map((s) => s.deadline).sort()[0];
    if (next) out.push({ key: "CNCAP", label: "Subscribed capital contribution due", dueDate: next, playbookId: "cn.changeCapital", periodKey: `CNCAP:${next}`, periodYear: Number(next.slice(0, 4)) });
    // 2024 Company Law transition: companies set up before 1 July 2024 must bring contribution
    // periods within 5 years of 1 July 2027 (i.e. paid by 30 June 2032), adjusting by 30 June 2027.
    if (c.incorporatedOn && c.incorporatedOn < "2024-07-01" && subs.some((s) => s.deadline > "2032-06-30"))
      out.push({ key: "CNCAPADJ", label: "Adjust capital contribution period (2024 Company Law transition)", dueDate: "2027-06-30", playbookId: "cn.changeCapital", periodKey: "CNCAPADJ:2027", periodYear: 2027 });
  }
  if (c.jurisdiction === "TW") {
    // Company Act art. 22-1 annual declaration, 1 to 31 March.
    for (const y of [Y, Y + 1]) out.push({ key: "TW221", label: `Article 22-1 annual declaration ${y}`, dueDate: `${y}-03-31`, playbookId: "tw.declaration221", periodKey: `TW221:${y}`, periodYear: y });
  }
  if (c.jurisdiction === "MO" && c.fyeMonth && c.fyeDay) {
    // Approval of annual accounts by the quota holders (firm default: within 3 months of year end; verify).
    const pad = (x: number) => String(x).padStart(2, "0");
    for (const y of [Y - 1, Y]) {
      const fye = `${y}-${pad(c.fyeMonth)}-${pad(c.fyeDay)}`;
      if (fye >= today) continue;
      out.push({ key: "MOACC", label: `Approve accounts for year ended ${fye}`, dueDate: addMonths(fye, jd.fyeApprovalMonths ?? 3), playbookId: "mo.approveAccounts", periodKey: `MOACC:${y}`, periodYear: y });
    }
  }
  return out.filter((d) => d.dueDate >= addMonths(today, -24));
}
