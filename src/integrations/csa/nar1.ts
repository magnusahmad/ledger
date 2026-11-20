// Annual-return facts from the latest CSA snapshot: the NAR1 input (src/documents/cr-forms.ts) and the
// counts the dispatch email needs. Anything the generator can't fill faithfully returns a reason, and
// the case uses CSA's own form instead. Particulars are as at CSA's backup time; staff confirm them.
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { client as clientT, csaRow } from "@/db/schema";
import type { NAR1Input, Presentor } from "@/documents/cr-forms";
import { latestImport } from "./import";
import type { CsaCompany, CsaMember, CsaOfficer, CsaShareClass } from "./sql-source";

async function snapshot(ctx: Ctx, clientId: string) {
  const c = await ctx.db.query.client.findFirst({ where: and(eq(clientT.id, clientId), eq(clientT.firmId, ctx.firmId)) });
  const mark = (c?.jurisdictionData as { csa?: { csaId: string } } | undefined)?.csa;
  const imp = await latestImport(ctx);
  if (!c || !mark || !imp) return null;
  const rows = await ctx.db.select().from(csaRow).where(and(eq(csaRow.firmId, ctx.firmId), eq(csaRow.importId, imp.id), eq(csaRow.companyCsaId, mark.csaId)));
  const of = <T>(e: string) => rows.filter((r) => r.entity === e).map((r) => r.data as T);
  const company = of<CsaCompany>("company")[0];
  if (!company) return null;
  const current = of<CsaOfficer>("officer").filter((o) => !o.ceasedOn);
  return { company, officers: current, members: of<CsaMember>("member"), classes: of<CsaShareClass>("share_class"), backupTakenAt: imp.backupTakenAt.toISOString() };
}

const n = (x: number) => x.toLocaleString("en-US");

export async function nar1InputFromCsa(ctx: Ctx, clientId: string, o: { madeUpTo: string; presentor: Presentor; signDate: string; email: string; charges?: string }):
  Promise<{ ok: true; input: NAR1Input; asAt: string } | { ok: false; reason: string }> {
  const s = await snapshot(ctx, clientId);
  if (!s) return { ok: false, reason: "No CSA record for this company yet; use CSA's form." };
  if (s.company.companyType === "non_hk") return { ok: false, reason: "A registered non-Hong Kong company files NN3; use CSA's form." };
  const directors = s.officers.filter((x) => x.role !== "secretary");
  if (!directors.length) return { ok: false, reason: "CSA shows no current director; check CSA before preparing the return." };
  if (directors.some((d) => d.kind === "corporate")) return { ok: false, reason: "A corporate director isn't supported by the automatic NAR1 yet; use CSA's form." };
  if (s.classes.length > 4 || new Set(s.classes.map((c) => c.currency)).size > 1) return { ok: false, reason: "More than four share classes or currencies needs continuation sheets; use CSA's form." };
  for (const cls of s.classes) {
    const held = s.members.filter((m) => m.className === cls.className).reduce((t, m) => t + m.shares, 0);
    if (held !== cls.issuedShares) return { ok: false, reason: `Members hold ${n(held)} ${cls.className} shares but CSA shows ${n(cls.issuedShares)} issued; fix CSA first.` };
  }
  const sec = s.officers.find((x) => x.role === "secretary");
  const missingAddress = s.members.find((m) => !m.address);
  if (missingAddress) return { ok: false, reason: `CSA has no address for member ${missingAddress.nameEn}; add it in CSA first.` };
  return {
    ok: true, asAt: s.backupTakenAt,
    input: {
      brNumber: s.company.brNumber ?? "", companyName: s.company.nameEn, type: s.company.companyType === "public" || s.company.companyType === "guarantee" ? s.company.companyType : "private",
      madeUpTo: o.madeUpTo, registeredOffice: s.company.registeredOffice ?? "", email: o.email, charges: o.charges ?? "",
      capital: s.classes.map((c) => ({ className: c.className, currency: c.currency, totalNumber: c.issuedShares, totalAmount: c.totalAmount, paidUp: c.paidUp })),
      secretary: sec ? { corporate: sec.kind === "corporate", nameZh: sec.nameZh, nameEn: sec.nameEn, address: sec.correspondenceAddress ?? "", email: sec.email, idNumber: sec.kind === "individual" ? sec.idNumber : null, brNumber: sec.kind === "corporate" ? sec.brNumber : null } : undefined,
      directors: directors.map((d) => ({ capacity: d.role === "alternate" ? "alternate" : "director", nameZh: d.nameZh, nameEn: d.nameEn, correspondenceAddress: d.correspondenceAddress, email: d.email, idNumber: d.idNumber })),
      members: s.classes.map((c) => ({ className: c.className, totalInClass: c.issuedShares, rows: s.members.filter((m) => m.className === c.className).map((m) => ({ nameEn: m.nameEn, nameZh: m.nameZh, corporate: m.kind === "corporate", address: m.address!, shares: m.shares })) })),
      presentor: o.presentor, signer: { name: directors[0].nameEn, capacity: "director" }, signDate: o.signDate,
    },
  };
}

export async function dispatchFactsFromCsa(ctx: Ctx, clientId: string) {
  const s = await snapshot(ctx, clientId);
  if (!s) return null;
  const directors = s.officers.filter((x) => x.role !== "secretary");
  const holders = new Map(s.members.map((m) => [m.nameEn.toLowerCase(), m.kind]));
  return { signer: directors[0]?.nameEn ?? null, directors: directors.length, members: holders.size, corporateMembers: [...holders.values()].filter((k) => k === "corporate").length, asAt: s.backupTakenAt };
}

/** Current particulars for reading a client's reply: names, roles, holdings and the registered office.
 *  ID numbers and home addresses are left out; the model doesn't need them to spot a change. */
export async function particularsFromCsa(ctx: Ctx, clientId: string) {
  const s = await snapshot(ctx, clientId);
  if (!s) return null;
  return {
    registeredOffice: s.company.registeredOffice, asAt: s.backupTakenAt,
    officers: s.officers.map((o) => ({ role: o.role, name: o.nameEn, nameZh: o.nameZh })),
    members: s.members.map((m) => ({ name: m.nameEn, nameZh: m.nameZh, className: m.className, shares: m.shares })),
  };
}
