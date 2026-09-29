// Generates a task's documents: official CR forms (filled PDFs) and templated resolutions,
// in the client's document language, filed on the task and the client.
import type { Ctx } from "@/lib/ctx";
import { document } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import { loadDocContext, type DocContext } from "./context";
import { buildPdf } from "./builder";
import { TEMPLATES } from "./templates";
import {
  fillForm, mapND2A, mapNR1, mapNNC2, mapND2B, mapND4, mapNDR1, mapNSC1, mapNAR1, mapNNC1,
  type FieldValues, type Presentor, type Signer, type Officer,
} from "./cr-forms";
import { addDays } from "@/domain/dates";

export function presentorOf(c: DocContext): Presentor {
  return { name: c.firm.legalName, address: c.firm.address ?? "", tel: c.firm.phone ?? "", email: c.firm.email ?? "", reference: c.task.id };
}

export function signerOf(c: DocContext): Signer {
  if (c.secretary?.personId === "per_firm") return { name: `Karen Yip for ${c.firm.legalName}`, capacity: "secretary" };
  const d = c.directors[0];
  return { name: d?.person.nameEn ?? "", capacity: "director" };
}

const eff = (c: DocContext) => c.task.effectiveDate ?? c.values.effDate ?? c.today;
const sameAsRO = (s?: string | null) => !s || /same as|registered office|註冊辦事處|注册办事处/i.test(s);

function officerFromPerson(c: DocContext, capacity: Officer["capacity"]): Officer {
  const p = c.person!;
  const corr = sameAsRO(c.values.corrAddr ?? p.correspondenceAddress) ? c.client.regOfficeEn : (c.values.corrAddr ?? p.correspondenceAddress);
  return { capacity, nameEn: p.nameEn, nameZh: p.nameZh, correspondenceAddress: corr, email: p.email, idNumber: p.idNumber, passportCountry: p.idCountry, residentialAddress: p.residentialAddress };
}

function splitName(s: string | undefined): { en: string | null; zh: string | null } {
  if (!s) return { en: null, zh: null };
  const zh = s.match(/[㐀-鿿][㐀-鿿（）()\s]*有限公司/)?.[0] ?? s.match(/[㐀-鿿]{2,}/)?.[0] ?? null;
  const en = s.match(/[A-Za-z][A-Za-z0-9&.,'()\- ]*Limited/i)?.[0] ?? (zh ? null : s.trim());
  return { en: en?.trim() ?? null, zh };
}

export function formValues(form: string, c: DocContext): FieldValues {
  const base = { brNumber: c.br?.brNumber ?? "", companyName: c.client.nameEn + (c.client.nameTc ? `\n${c.client.nameTc}` : ""), presentor: presentorOf(c), signer: signerOf(c), signDate: c.today };
  const firmSecretary = { nameEn: c.firm.legalName, nameZh: c.firm.legalNameZh, address: c.firm.address ?? "", email: c.firm.email ?? "", tcspLicence: c.firm.tcspLicence ?? "", date: eff(c), signatory: "Karen Yip" };
  const capital = c.capital.map((x) => ({ className: x.name, currency: x.currency, totalNumber: x.issued, totalAmount: x.paidUpCents / 100, paidUp: x.paidUpCents / 100 }));
  switch (form) {
    case "ND2A":
      if (c.pb.id === "hk.appointDirector") return mapND2A({ ...base, appointment: { ...officerFromPerson(c, "director"), date: eff(c), alreadyOfficer: false } });
      if (c.pb.id === "hk.resignDirector") return mapND2A({ ...base, cessation: { ...officerFromPerson(c, "director"), date: c.values.lastDay ?? eff(c), reason: "resignation", continues: false } });
      return mapND2A({ ...base, corporateSecretary: firmSecretary });
    case "NR1": return mapNR1({ ...base, newAddress: c.pb.id === "hk.transferIn" ? c.firm.address ?? "" : c.values.newAddr ?? "", effectiveDate: eff(c) });
    case "NNC2": { const n = splitName(c.values.newName); return mapNNC2({ ...base, existingEn: c.client.nameEn, existingZh: c.client.nameTc, resolutionDate: c.today, newEn: n.en, newZh: n.zh }); }
    case "ND2B": return mapND2B({ ...base, officer: officerFromPerson(c, "director"), effectiveDate: eff(c), changes: { correspondenceAddress: c.values.corrAddr, idNumber: c.values.idNo && c.values.idNo !== "On file" ? c.values.idNo : undefined } });
    case "ND4": return mapND4({ ...base, officer: officerFromPerson(c, "director"), date: c.values.lastDay ?? eff(c) });
    case "NDR1": return mapNDR1({ ...base, applicant: "company" });
    case "NSC1": return mapNSC1({ ...base, from: eff(c), to: eff(c), currency: "HKD", increase: 0, cashRows: [], capital, allottees: [] });
    case "NAR1": {
      const year = Number(c.today.slice(0, 4));
      const madeUpTo = c.client.incorporatedOn ? `${year}${c.client.incorporatedOn.slice(4)}` : c.today;
      const byClass = new Map<string, typeof c.members>();
      for (const m of c.members) byClass.set(m.className, [...(byClass.get(m.className) ?? []), m]);
      return mapNAR1({
        ...base, businessName: null, type: "private", natureDescription: c.client.businessNatureEn, madeUpTo,
        registeredOffice: c.client.regOfficeEn ?? "", email: c.firm.email ?? "", phone: c.firm.phone, charges: "0",
        capital,
        secretary: c.secretary?.personId === "per_firm" ? { corporate: true, nameEn: c.firm.legalName, nameZh: c.firm.legalNameZh, address: c.firm.address ?? "", email: c.firm.email, tcspLicence: c.firm.tcspLicence } : undefined,
        directors: c.directors.map((x) => ({ capacity: "director", nameEn: x.person.nameEn, nameZh: x.person.nameZh, correspondenceAddress: x.person.correspondenceAddress ?? c.client.regOfficeEn, email: x.person.email, idNumber: x.protected.idNumber })),
        members: [...byClass.entries()].map(([cls, ms]) => ({ className: cls, totalInClass: ms.reduce((s, m) => s + m.quantity, 0), rows: ms.map((m) => ({ nameEn: m.name, nameZh: m.nameZh, address: c.client.regOfficeEn ?? "", shares: m.quantity })) })),
      });
    }
    case "NNC1": { const n = splitName(c.values.propName); return mapNNC1({ nameEn: n.en ?? c.client.nameEn, nameZh: n.zh, type: "private", natureDescription: c.values.business ?? "", registeredOffice: c.firm.address ?? "", email: c.firm.email ?? "", phone: c.firm.phone ?? "", capital: [], presentor: presentorOf(c) }); }
    default: throw new Error(`No mapping for form ${form}`);
  }
}

export type GeneratedDoc = { id: string; title: string; template: string; signers: string | undefined; signatureFields: { field: string; page: number; x: number; y: number; w: number; h: number }[] };

export async function generateForTask(ctx: Ctx, taskId: string): Promise<GeneratedDoc[]> {
  const c = await loadDocContext(ctx, taskId);
  const out: GeneratedDoc[] = [];
  for (const ref of c.pb.documents) {
    let pdf: Buffer, text = "", signatureFields: GeneratedDoc["signatureFields"] = [];
    if (ref.template.startsWith("cr:")) {
      const form = ref.template.slice(3);
      pdf = await fillForm(form, formValues(form, c));
      text = `${ref.name} (official Companies Registry form ${form}, pre-filled)`;
    } else {
      const tpl = TEMPLATES[ref.template];
      if (!tpl) continue;
      const built = await buildPdf(tpl(c), { lang: c.lang, header: `${c.client.nameEn} · ${ref.name}`, footer: `Prepared by ${c.firm.legalName} · ${c.task.id}` });
      pdf = built.pdf; text = built.text; signatureFields = built.signatureFields;
    }
    const id = ctx.ids.next("doc");
    const key = `documents/${c.client.id}/${id}.pdf`;
    await ctx.storage.put(key, pdf);
    await ctx.db.insert(document).values({
      id, firmId: ctx.firmId, clientId: c.client.id, taskId, personId: c.person?.id ?? null,
      kind: ref.template.startsWith("cr:") ? "form" : ref.template.includes("resolution") ? "resolution" : ref.template.includes("certificate") ? "certificate" : "letter",
      title: ref.name, storageKey: key, mime: "application/pdf", sha256: Crypto.sha256(pdf), language: c.lang, source: "generated", extractedText: text, createdAt: ctx.clock.now(),
    });
    out.push({ id, title: ref.name, template: ref.template, signers: ref.signers, signatureFields });
  }
  return out;
}

export { addDays };
