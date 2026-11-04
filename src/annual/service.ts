// Preparing papers and drafting the dispatch email (UHY pilot brief, "The annual cycle"). The NAR1 is
// generated from the CSA snapshot and filed to F:; the email is drafted in the preparer's own team
// mailbox, in the contact's language, with the case's computed dates. Nothing is sent: staff review
// and send from Outlook, and the sync sees it in Sent Items.
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { appUser, arCase, client as clientT, contact, firm as firmT, type Lang } from "@/db/schema";
import { fillForm, mapNAR1 } from "@/documents/cr-forms";
import { nar1InputFromCsa, dispatchFactsFromCsa } from "@/integrations/csa/nar1";
import { arPlaybook, markPrepared, recordDraft } from "./cases";
import { annualReturnDates, buildDispatchEmail, checkReturnBy, maxRegistryFee, type DispatchTemplate } from "./dispatch";
import { compactDate, filePaper, type UhyFilingRules } from "./writeback";
import type { MailboxSource } from "./mail-sync";

export type AnnualDeps = {
  /** Null until Microsoft 365 is connected: papers can still be prepared, but not drafted. */
  mail: MailboxSource | null; mailboxes: string[];
  /** UNC path of the F: share; null when filing to F: isn't configured. */
  filingRoot: string | null; filingRules: UhyFilingRules;
  template: DispatchTemplate | Record<string, unknown>;
};

const ddmmyyyy = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

async function loadCase(ctx: Ctx, id: string) {
  const c = await ctx.db.query.arCase.findFirst({ where: and(eq(arCase.id, id), eq(arCase.firmId, ctx.firmId)) });
  if (!c) throw new Error("Case not found");
  const cl = (await ctx.db.query.client.findFirst({ where: and(eq(clientT.id, c.clientId), eq(clientT.firmId, ctx.firmId)) }))!;
  return { c, cl };
}

export async function prepareCase(ctx: Ctx, deps: AnnualDeps, caseId: string, o: { returnBy?: string } = {}): Promise<{ ok: true; filedPath: string | null } | { ok: false; reason: string }> {
  const { c, cl } = await loadCase(ctx, caseId);
  if (c.kind !== "AR") return { ok: false, reason: "AGM papers are prepared by staff for now; mark them prepared when ready." };
  if (!cl.incorporatedOn) return { ok: false, reason: "The company has no incorporation date in CSA." };
  const today = ctx.clock.today();
  const dates = annualReturnDates({ incorporatedOn: cl.incorporatedOn, year: c.periodYear, playbook: await arPlaybook(ctx), today });
  const returnBy = o.returnBy ?? c.returnBy ?? dates.returnBy;
  const bad = checkReturnBy(dates, returnBy, today);
  if (bad) return { ok: false, reason: bad };
  const f = (await ctx.db.query.firm.findFirst({ where: eq(firmT.id, ctx.firmId) }))!;
  const me = await ctx.db.query.appUser.findFirst({ where: and(eq(appUser.id, ctx.userId), eq(appUser.firmId, ctx.firmId)) });
  const r = await nar1InputFromCsa(ctx, cl.id, {
    madeUpTo: dates.madeUpDate, signDate: "", email: f.email ?? "",
    presentor: { name: f.legalName, address: f.address ?? "", tel: f.phone ?? "", email: f.email ?? "", reference: `${me?.initials ?? ""}, ${cl.code ?? ""}, Due Date:${ddmmyyyy(dates.deadline)}` },
  });
  if (!r.ok) return r;
  const pdf = await fillForm("NAR1", mapNAR1(r.input));
  const filedPath = deps.filingRoot
    ? await filePaper({ root: deps.filingRoot, rules: deps.filingRules, client: { code: cl.code, name: cl.nameEn }, kind: "annualReturn", madeUpDate: dates.madeUpDate, year: c.periodYear, content: pdf })
    : null;
  const name = filedPath ? path.basename(filedPath) : `${cl.code ?? cl.id}-Annual Return-${compactDate(dates.madeUpDate)}.pdf`;
  const key = `annual/${c.id}/${name}`;
  await ctx.storage.put(key, pdf);
  await markPrepared(ctx, c.id, { formSource: "generated", documentId: key, returnBy });
  return { ok: true, filedPath };
}

export async function draftDispatch(ctx: Ctx, deps: AnnualDeps, caseId: string, o: { returnBy?: string; includeAgm?: boolean; cddItems?: { person: string; items: string[] }[] }) {
  const { c, cl } = await loadCase(ctx, caseId);
  if (c.stage !== "payment_confirmed") throw new Error("Confirm payment before drafting the email to the client");
  if (c.kind !== "AR") throw new Error("The dispatch email is drafted from the annual-return case");
  if (!deps.mail) throw new Error("Microsoft 365 isn't connected for this installation yet, so drafts can't be created");
  const me = await ctx.db.query.appUser.findFirst({ where: and(eq(appUser.id, ctx.userId), eq(appUser.firmId, ctx.firmId)) });
  const mailbox = me?.email?.toLowerCase();
  if (!mailbox || !deps.mailboxes.map((m) => m.toLowerCase()).includes(mailbox)) throw new Error("Drafts go into your own mailbox, and yours isn't one of the team mailboxes");
  const to = (await ctx.db.select().from(contact).where(and(eq(contact.firmId, ctx.firmId), eq(contact.clientId, cl.id))).orderBy(desc(contact.isInstructing)))
    .find((k) => k.email);
  if (!to?.email) throw new Error("This company has no contact email in CSA");
  const facts = await dispatchFactsFromCsa(ctx, cl.id);
  if (!facts?.signer) throw new Error("CSA shows no director to sign");
  const pb = await arPlaybook(ctx);
  const today = ctx.clock.today();
  const dates = annualReturnDates({ incorporatedOn: cl.incorporatedOn!, year: c.periodYear, playbook: pb, today });
  const f = (await ctx.db.query.firm.findFirst({ where: eq(firmT.id, ctx.firmId) }))!;
  const lang = to.language as Lang;
  const email = buildDispatchEmail({
    today, lang, template: deps.template, salutation: to.salutation?.[lang] ?? to.name, companyName: lang === "en" ? cl.nameEn : cl.nameTc ?? cl.nameEn, year: c.periodYear,
    dates, returnBy: o.returnBy ?? c.returnBy ?? dates.returnBy, signer: { name: facts.signer, page: 8 },
    standardFeeCents: pb.registryFeeBands![0].amountCents, maxFeeCents: maxRegistryFee(pb), firmAddress: f.address ?? "",
    agm: o.includeAgm ? { directors: facts.directors, members: facts.members, corporateMembers: facts.corporateMembers } : null,
    cddItems: o.cddItems ?? [],
  });
  const attachments = c.formSource === "generated" && c.formDocumentId ? [{ filename: path.basename(c.formDocumentId), mime: "application/pdf", content: await ctx.storage.get(c.formDocumentId) }] : [];
  const d = await deps.mail.createDraft(mailbox, { to: [to.email], subject: email.subject, text: email.text, attachments });
  await recordDraft(ctx, c.id, { mailbox, draftId: d.draftId, conversationId: d.conversationId });
  return d;
}
