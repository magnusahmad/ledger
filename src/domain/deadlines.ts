// Deadline engine: statutory and firm-policy deadlines computed from client data and
// last-done records (filings, recorded AGMs, CDD reviews). A period is satisfied by a
// filing with its period key, or covered while an open task carries that key. Nothing
// rolls forward on its own (PRODUCT_SPEC.md §12). Rules are playbook data where possible
// and all need company secretary verification.
import { and, eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { appointment, businessRegistration, cddRecord, client as clientT, filing, significantController, task as taskT } from "@/db/schema";
import { addDays, addMonths, daysBetween } from "./dates";

export type Deadline = {
  clientId: string; clientName: string; key: string; label: string; dueDate: string; playbookId: string;
  periodKey: string | null; periodYear: number; daysLeft: number; overdue: boolean;
};

import { financialYearEnds, financialPeriodKey } from "./fye-periods";

export async function upcomingDeadlines(ctx: Ctx, opts: { clientId?: string; withinDays: number; includeCovered?: boolean }): Promise<Deadline[]> {
  const today = ctx.clock.today();
  const horizon = addDays(today, opts.withinDays);
  const clients = await ctx.db.select().from(clientT).where(and(eq(clientT.firmId, ctx.firmId), opts.clientId ? eq(clientT.id, opts.clientId) : undefined));
  const out: Deadline[] = [];
  for (const c of clients) {
    if (c.lifecycle === "prospect" || c.lifecycle === "ceased" || c.operatingStatus === "not_incorporated" || c.operatingStatus === "deregistering" || c.operatingStatus === "struck_off") continue;
    const filings = await ctx.db.select().from(filing).where(eq(filing.clientId, c.id));
    const doneKeys = new Set(filings.map((f) => f.periodKey).filter(Boolean) as string[]);
    const openTasks = await ctx.db.select().from(taskT).where(and(eq(taskT.clientId, c.id), eq(taskT.status, "open")));
    const covered = new Set(openTasks.map((t) => t.periodKey).filter(Boolean) as string[]);
    const Y = Number(today.slice(0, 4));
    const push = (d: Omit<Deadline, "clientId" | "clientName" | "daysLeft" | "overdue">) => {
      if (d.dueDate > horizon) return;
      if (d.periodKey && (doneKeys.has(d.periodKey) || (!opts.includeCovered && covered.has(d.periodKey)))) return;
      const daysLeft = daysBetween(today, d.dueDate);
      out.push({ ...d, clientId: c.id, clientName: c.nameEn, daysLeft, overdue: daysLeft < 0 });
    };

    if (c.jurisdiction === "HK" && c.incorporatedOn) {
      // Annual return: private company, within 42 days after each anniversary of incorporation.
      for (const y of [Y - 1, Y, Y + 1]) {
        const anniv = `${y}${c.incorporatedOn.slice(4)}`;
        if (anniv <= c.incorporatedOn) continue;
        const periodKey = `NAR1:${y}`;
        if (y === Y - 1 && (doneKeys.has(periodKey) || filings.some((f) => f.form === "NAR1" && f.filedOn >= anniv))) continue;
        push({ key: "NAR1", label: `Annual return ${y}`, dueDate: addDays(anniv, 42), playbookId: "hk.annualReturn", periodKey, periodYear: y });
        if (!doneKeys.has(periodKey)) break;
      }
      // AGM / accounts: within 9 months after the financial year end; not for dormant companies.
      if (c.operatingStatus !== "dormant" && c.fyeMonth && c.fyeDay) {
        const lastAgm = (c.jurisdictionData as { lastAgm?: string | null }).lastAgm ?? null;
        const firstChanged = c.jurisdictionData.firstChangedPeriodEnd as string | undefined;
        const finalYear = Math.max(Y + 1, firstChanged ? Number(firstChanged.slice(0, 4)) : Y);
        for (let y = Y - 1; y <= finalYear; y++) {
          for (const fye of financialYearEnds(c, y)) {
            if (fye < c.incorporatedOn) continue;
            const periodKey = financialPeriodKey(c, fye);
            if (lastAgm && lastAgm >= fye) continue;
            // Existing filings/tasks retain their old annual keys across a calendar change.
            if (doneKeys.has(`AGM:${y}`) || (!opts.includeCovered && covered.has(`AGM:${y}`))) continue;
            push({ key: "AGM", label: `AGM and accounts for year ended ${fye}`, dueDate: addMonths(fye, 9), playbookId: "hk.agm", periodKey, periodYear: y });
          }
        }
      }
      // Business registration expiry.
      const br = await ctx.db.query.businessRegistration.findFirst({ where: eq(businessRegistration.clientId, c.id) });
      if (br?.expiresOn) push({ key: "BR", label: "Business registration renewal", dueDate: br.expiresOn, playbookId: "hk.brRenewal", periodKey: `BR:${br.expiresOn}`, periodYear: Number(br.expiresOn.slice(0, 4)) });
    }

    // Periodic CDD review (firm policy): earliest review date among current officers and controllers.
    const people = new Set<string>();
    for (const a of await ctx.db.select().from(appointment).where(eq(appointment.clientId, c.id))) if (!a.toDate || a.toDate > today) people.add(a.personId);
    for (const s of await ctx.db.select().from(significantController).where(eq(significantController.clientId, c.id))) if (!s.ceasedOn) people.add(s.personId);
    people.delete("per_firm");
    if (people.size) {
      const cdds = await ctx.db.select().from(cddRecord).where(inArray(cddRecord.personId, [...people]));
      const latest = new Map<string, string>();
      for (const r of cdds) if (!latest.has(r.personId) || r.reviewDueOn > latest.get(r.personId)!) latest.set(r.personId, r.reviewDueOn);
      const due = [...latest.values()].sort()[0];
      if (due) push({ key: "KYC", label: "Periodic KYC review", dueDate: due, playbookId: "hk.kycReview", periodKey: `KYC:${due}`, periodYear: Number(due.slice(0, 4)) });
    }

    if (c.jurisdiction !== "HK") {
      const { jurisdictionDeadlines } = await import("./deadlines-other");
      for (const d of jurisdictionDeadlines(c, today, Y)) push(d);
    }
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
