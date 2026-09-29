// What the agents see about a client. Protected information (full ID numbers,
// residential addresses) is never included; the agent sees that it is on file.
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { client as clientT, conversation, document, invoice, message, significantController, type Lang } from "@/db/schema";
import { contactsFor, officersAsAt } from "@/domain/records";
import { membersAsAt, issuedAsAt } from "@/domain/shares";
import { hasCurrentCdd, openTasksForClient, currentStep, getTask } from "@/domain/engine";
import { listPlaybooks, getPlaybook } from "@/domain/playbooks";
import { itemLabel, PROTECTED_KEYS, money } from "@/domain/labels";
import type { PlaybookDef } from "@/domain/playbook-types";
import { requirementLibrary } from "@/domain/playbooks";
import { upcomingDeadlines } from "@/domain/deadlines";

export async function clientSnapshot(ctx: Ctx, clientId: string) {
  const c = await ctx.db.query.client.findFirst({ where: eq(clientT.id, clientId) });
  if (!c) return null;
  const today = ctx.clock.today();
  const officers = await officersAsAt(ctx, clientId, today);
  const members = await membersAsAt(ctx, clientId, today).catch(() => []);
  const capital = await issuedAsAt(ctx, clientId, today).catch(() => []);
  const scs = await ctx.db.select().from(significantController).where(and(eq(significantController.clientId, clientId)));
  const contacts = await contactsFor(ctx, clientId);
  const tasks = await openTasksForClient(ctx, clientId);
  const docs = await ctx.db.select({ title: document.title, kind: document.kind, createdAt: document.createdAt }).from(document)
    .where(eq(document.clientId, clientId)).orderBy(desc(document.createdAt)).limit(20);
  const invoices = await ctx.db.select().from(invoice).where(eq(invoice.clientId, clientId)).orderBy(desc(invoice.createdAt)).limit(6);
  const convs = await ctx.db.select({ id: conversation.id }).from(conversation).where(eq(conversation.clientId, clientId));
  const msgs = convs.length ? await ctx.db.select().from(message)
    .where(and(inArray(message.conversationId, convs.map((x) => x.id)), inArray(message.status, ["received", "sent"])))
    .orderBy(desc(message.at)).limit(8) : [];
  const personIds = [...new Set([...officers.map((o) => o.personId), ...members.map((m) => m.personId)])];
  const cdd: Record<string, string | null> = {};
  for (const pid of personIds) cdd[pid] = (await hasCurrentCdd(ctx, pid))?.reviewDueOn ?? null;

  const openTasks = [];
  for (const t0 of tasks) {
    const t = await getTask(ctx, t0.id);
    openTasks.push({
      taskId: t.id, playbookId: t.playbookId, title: t.title, personId: t.personId,
      currentStep: currentStep(t)?.label ?? null, effectiveDate: t.effectiveDate, dueDate: t.dueDate,
      checklist: t.checklist.map((e) => ({
        key: e.key, label: itemLabel(e.key, "en", t.params), personId: e.personId ?? null, status: e.status,
        value: e.value && PROTECTED_KEYS.has(e.key) ? "(provided)" : e.value ?? null,
      })),
    });
  }
  let deadlines: { what: string; due: string }[] = [];
  try { deadlines = (await upcomingDeadlines(ctx, { clientId, withinDays: 120 })).map((d) => ({ what: d.label, due: d.dueDate })); } catch { /* deadline engine optional */ }

  return {
    clientId: c.id,
    lifecycle: c.lifecycle,
    jurisdiction: c.jurisdiction,
    names: { en: c.nameEn, tc: c.nameTc, sc: c.nameSc },
    companyNumber: c.companyNumber,
    companyType: c.companyType,
    operatingStatus: c.operatingStatus,
    incorporatedOn: c.incorporatedOn,
    financialYearEnd: c.fyeMonth ? `${c.fyeDay}/${c.fyeMonth}` : null,
    registeredOffice: c.regOfficeEn,
    messageLanguage: c.messageLang,
    paymentTerms: c.paymentTermsDays ? `${c.paymentTermsDays} days credit` : "upfront",
    officers: officers.map((o) => ({ personId: o.personId, name: o.person.nameEn, nameZh: o.person.nameZh, role: o.role, since: o.fromDate, email: o.person.email, kycOnFileUntil: cdd[o.personId] ?? null })),
    members: members.map((m) => ({ personId: m.personId, name: m.name, class: m.className, shares: m.quantity, percent: m.percent })),
    shareCapital: capital.map((x) => ({ class: x.name, issued: x.issued, paidUp: money(x.paidUpCents, x.currency) })),
    significantControllers: scs.filter((s) => !s.ceasedOn).map((s) => ({ personId: s.personId, nature: s.nature })),
    contacts: contacts.map((x) => ({ name: x.name, role: x.role, email: x.email, language: x.language, billing: x.isBilling })),
    openTasks,
    documentsOnFile: docs.map((d) => d.title),
    recentInvoices: invoices.map((i) => ({ number: i.number, status: i.status, total: money(i.totalCents, i.currency) })),
    upcomingDeadlines: deadlines,
    recentMessages: msgs.reverse().map((m) => ({ direction: m.direction, at: m.at.toISOString().slice(0, 10), text: (m.text ?? "").slice(0, 600) })),
  };
}

export type Snapshot = NonNullable<Awaited<ReturnType<typeof clientSnapshot>>>;

export async function playbookCatalogue(ctx: Ctx, jurisdictions: string[]) {
  const lib = requirementLibrary();
  const pbs = (await listPlaybooks(ctx)).filter((p) => jurisdictions.includes(p.jurisdiction));
  return pbs.map((p) => ({
    playbookId: p.id,
    jurisdiction: p.jurisdiction,
    name: p.name.en,
    whenToUse: p.whenToUse,
    person: p.personSelection ?? "none",
    fields: p.requirements.map((r) => ({ key: r.key, label: lib[r.key]?.label.en ?? r.key, hint: lib[r.key]?.extractionHint ?? null, aboutPerson: r.scope === "person" })),
  }));
}

export async function playbookFor(ctx: Ctx, id: string): Promise<PlaybookDef | null> {
  try { return await getPlaybook(ctx, id); } catch { return null; }
}

export function langName(l: Lang) { return l === "tc" ? "Traditional Chinese (Hong Kong written style)" : l === "sc" ? "Simplified Chinese" : "English"; }
