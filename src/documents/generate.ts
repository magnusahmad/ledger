// Generates a task's documents: official CR forms (filled PDFs) and templated resolutions,
// in the client's document language, filed on the task and the client.
import type { Ctx } from "@/lib/ctx";
import { document } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import { loadDocContext, annualReturnDate, type DocContext } from "./context";
import { buildPdf } from "./builder";
import { TEMPLATES } from "./templates";
import {
  fillForm, mapND2A, mapNR1, mapNNC2, mapND2B, mapND4, mapNDR1, mapNSC1, mapNAR1, mapNNC1,
  type FieldValues, type Presentor, type Signer, type Officer,
} from "./cr-forms";
import { secretaryResignationValues } from "./secretary-resignation";
import { allotmentFormData } from "./share-document-plan";
import { nsc2Values } from "./nsc2";
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
    case "ND2B": {
      if (!c.person || c.person.kind === "corporate") throw new Error("ND2B: corporate officer changes require manual preparation.");
      const changed = (key: string) => c.values[key] && c.values[key] !== "On file" ? c.values[key] : undefined;
      const changes = { nameEn: changed("nameEn") ?? changed("fullName"), nameZh: changed("nameZh") ?? changed("chiName"), correspondenceAddress: changed("corrAddr"), residentialAddress: changed("resAddr"), email: changed("email") ?? changed("contactInfo")?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0], idNumber: changed("idNo"), passportCountry: changed("idCountry") };
      if (!Object.values(changes).some(Boolean)) throw new Error("ND2B: structure and verify the changed particulars before preparing the form.");
      const role = c.officers.find(o => o.personId === c.person?.id)?.role === "secretary" ? "secretary" : "director";
      return mapND2B({ ...base, officer: officerFromPerson(c, role), effectiveDate: eff(c), changes });
    }
    case "ND4": if (c.pb.id === "hk.resignSecretary") return secretaryResignationValues(c); return mapND4({ ...base, officer: officerFromPerson(c, "director"), date: c.values.lastDay ?? eff(c) });
    case "NDR1": return mapNDR1({ ...base, applicant: "company" });
    case "NSC2": return nsc2Values(c, base);
    case "NSC1": return mapNSC1({ ...base, from: eff(c), to: eff(c), ...allotmentFormData(c) });
    case "NAR1": {
      const madeUpTo = annualReturnDate(c.task, c.client, c.today);
      const byClass = new Map<string, typeof c.members>();
      for (const m of c.members) {
        if (!m.address?.trim()) throw new Error(`NAR1: verify the member address for ${m.name}; the registered office is not assumed to be their address.`);
        byClass.set(m.className, [...(byClass.get(m.className) ?? []), m]);
      }
      if (c.directors.some(d => d.person.kind === "corporate")) throw new Error("NAR1: corporate director mapping is unsupported; prepare the complete form manually.");
      return mapNAR1({
        ...base, businessName: null, type: "private", natureDescription: c.client.businessNatureEn, madeUpTo,
        registeredOffice: c.client.regOfficeEn ?? "", email: c.firm.email ?? "", phone: c.firm.phone, charges: "0",
        capital,
        secretary: c.secretary?.personId === "per_firm" ? { corporate: true, nameEn: c.firm.legalName, nameZh: c.firm.legalNameZh, address: c.firm.address ?? "", email: c.firm.email, tcspLicence: c.firm.tcspLicence } : undefined,
        directors: c.directors.map((x) => ({ capacity: "director", nameEn: x.person.nameEn, nameZh: x.person.nameZh, correspondenceAddress: x.person.correspondenceAddress ?? c.client.regOfficeEn, email: x.person.email, idNumber: x.protected.idNumber })),
        members: [...byClass.entries()].map(([cls, ms]) => ({ className: cls, totalInClass: ms.reduce((s, m) => s + m.quantity, 0), rows: ms.map((m) => ({ nameEn: m.name, nameZh: m.nameZh, address: m.address!, corporate: m.corporate, shares: m.quantity })) })),
      });
    }
    case "NNC1": {
      const p = c.incorporation;
      if (!p) throw new Error("NNC1: founder members, first officers and subscribed capital must be fully supplied.");
      const secretaryBr = c.firm.settings?.businessRegistrationNumber;
      if (typeof secretaryBr !== "string" || !/^\d{8}$/.test(secretaryBr)) throw new Error("NNC1: verify the corporate secretary business registration number.");
      if (!c.firm.tcspLicence || !c.firm.address) throw new Error("NNC1: verify the corporate secretary address and TCSP licence.");
      return mapNNC1({ nameEn: p.nameEn, nameZh: p.nameZh, type: "private", natureDescription: p.natureDescription, registeredOffice: p.registeredOffice,
        email: p.director.email, phone: c.firm.phone ?? "", presentor: presentorOf(c), signDate: c.today,
        capital: [{ className: p.capital.className, number: p.capital.number, currency: p.capital.currency, subscribed: p.capital.subscribedCents / 100, paidUp: p.capital.paidUpCents / 100 }],
        founder: p.founder, secretary: { nameEn: c.firm.legalName, nameZh: c.firm.legalNameZh, address: c.firm.address, email: c.firm.email, brNumber: secretaryBr, tcspLicence: c.firm.tcspLicence },
        director: { ...p.director, capacity: "director", passportCountry: p.director.idCountry },
      });
    }
    default: throw new Error(`No mapping for form ${form}`);
  }
}

export type GeneratedDoc = { id: string; title: string; template: string; signers: string | undefined; signatureFields: { field: string; page: number; x: number; y: number; w: number; h: number }[] };

export async function generateForTask(ctx: Ctx, taskId: string): Promise<GeneratedDoc[]> {
  const c = await loadDocContext(ctx, taskId);
  // Validate every output before storing any document: an unsupported form must not
  // leave a partial resolution/certificate pack that appears ready for signature.
  const prepared = c.pb.documents.map(ref => {
    if (ref.template.startsWith("cr:")) return { ref, values: formValues(ref.template.slice(3), c), blocks: undefined };
    const template = TEMPLATES[ref.template];
    if (!template) throw new Error(`Unsupported document template: ${ref.template}`);
    return { ref, values: undefined, blocks: template(c) };
  });
  const out: GeneratedDoc[] = [];
  for (const { ref, values, blocks } of prepared) {
    let pdf: Buffer, text = "", signatureFields: GeneratedDoc["signatureFields"] = [];
    if (ref.template.startsWith("cr:")) {
      const form = ref.template.slice(3);
      pdf = await fillForm(form, values!);
      text = `${ref.name} (official Companies Registry form ${form}, pre-filled)`;
    } else {
      const built = await buildPdf(blocks!, { lang: c.lang, header: `${c.client.nameEn} · ${ref.name}`, footer: `Prepared by ${c.firm.legalName} · ${c.task.id}` });
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
