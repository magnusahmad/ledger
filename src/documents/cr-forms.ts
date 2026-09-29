// Fills the official Companies Registry fillable PDFs (forms/hk-cr, see manifest.json for
// source, hash and specification number). Field names are the Registry's own; each mapping
// was made against the current specification and is guarded by a test that every mapped
// field exists, so a Registry revision breaks the build instead of producing a wrong form.
import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument, PDFCheckBox, PDFTextField, PDFDropdown } from "pdf-lib";
import { embedFonts } from "./fonts";

export const FORMS_DIR = path.join(process.cwd(), "forms/hk-cr");
const CONTINUATIONS = Symbol.for("harbourline.formContinuations");
type Continuation = { page: number; values: FieldValues };
export type FieldValues = Record<string, string | boolean | null | undefined> & { [CONTINUATIONS]?: Continuation[] };

// ---------- Helpers ----------
export type Address = { flat: string; building: string; street: string; district: string; country: string };

const BUILDING = /(building|centre|center|tower|house|plaza|court|mansion|garden|place|commercial|industrial|square|estate|block|大廈|中心|大樓|廣場|花園|閣)/i;
const STREET = /(road|street|lane|avenue|drive|terrace|path|way|circuit|rise|道|街|路|里|徑)/i;
const FLAT = /^(flat|unit|room|rm|suite|shop|\d+\/f|\d+(st|nd|rd|th)? floor|g\/f|\d+樓|[a-z]?\d+室)/i;
// Recognize an explicitly supplied country in English or either Chinese script.
const countryNames = new Map<string, string>([["bvi", "British Virgin Islands"]]);
const regions = ["en", "zh-Hant", "zh-Hans"].map(locale => new Intl.DisplayNames([locale], { type: "region" }));
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
  const code = String.fromCharCode(a, b), english = regions[0].of(code)!;
  if (english === code) continue;
  for (const names of regions) countryNames.set(names.of(code)!.toLowerCase(), english);
}


/** Splits a Hong Kong-style address into the Registry's address boxes. */
export function splitAddress(addr: string | null | undefined): Address {
  const out: Address = { flat: "", building: "", street: "", district: "", country: "" };
  if (!addr) return out;
  const parts = addr.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
  const rest: string[] = [];
  for (const p of parts) {
    if (/^hong kong$|^香港$|^hk$/i.test(p)) { out.country = "Hong Kong"; continue; }
    const country = countryNames.get(p.toLowerCase());
    if (country) { out.country = country; continue; }
    if (FLAT.test(p) && !out.building && !out.street) out.flat = [out.flat, p].filter(Boolean).join(", ");
    else if (STREET.test(p) && !out.street) out.street = p;
    else if (BUILDING.test(p) && !out.building && !out.street) out.building = p;
    else rest.push(p);
  }
  out.district = rest.join(", ");
  if (!out.country) out.country = "Hong Kong";
  return out;
}

export function dateParts(d: string | null | undefined): [string, string, string] {
  if (!d) return ["", "", ""];
  const [y, m, day] = d.split("-");
  return [day, m, y];
}

/** "CHAN Tai Man" -> surname CHAN, other names Tai Man (Hong Kong convention: surname first, in capitals). */
export function nameParts(full: string): { surname: string; other: string } {
  const t = full.trim().split(/\s+/);
  if (t.length === 1) return { surname: t[0].toUpperCase(), other: "" };
  const capsFirst = t[0] === t[0].toUpperCase();
  if (capsFirst) return { surname: t[0], other: t.slice(1).join(" ") };
  return { surname: t[t.length - 1].toUpperCase(), other: t.slice(0, -1).join(" ") };
}

/** The Registry's "partial number": the first 4 alphanumeric characters. */
export function partialId(id: string | null | undefined): string {
  return (id ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
}

/** "K987654(3)" -> ["K987654", "3"]. */
export function hkidParts(id: string | null | undefined): [string, string] {
  const m = (id ?? "").toUpperCase().match(/([A-Z]{1,2}\d{6})\s*\(?([0-9A])\)?/);
  return m ? [m[1], m[2]] : [(id ?? "").toUpperCase(), ""];
}

export function isHkid(id: string | null | undefined) { return /[A-Z]{1,2}\d{6}\s*\(?[0-9A]\)?/i.test(id ?? ""); }

export type Presentor = { name: string; address: string; tel: string; email: string; reference: string };
export type Signer = { name: string; capacity: "director" | "secretary" };
export type Officer = {
  capacity: "secretary" | "director" | "alternate";
  nameZh?: string | null; nameEn: string; correspondenceAddress?: string | null; email?: string | null;
  idNumber?: string | null; passportCountry?: string | null; residentialAddress?: string | null;
};

const addrFields = (a: Address, f: string[]) => Object.fromEntries(f.map((k, i) => [k, [a.flat, a.building, a.street, a.district, a.country][i]]).filter(([k]) => k));
const cap = (c: Officer["capacity"], boxes: [string, string, string]) => ({ [boxes[0]]: c === "secretary", [boxes[1]]: c === "director", [boxes[2]]: c === "alternate" });

function presentor(p: Presentor, names: [string, string, string, string, string, string]): FieldValues {
  return { [names[0]]: p.name, [names[1]]: p.address, [names[2]]: p.tel, [names[3]]: "", [names[4]]: p.email, [names[5]]: p.reference };
}

// ---------- Form mappings ----------
export type ND2AInput = {
  brNumber: string; companyName: string; presentor: Presentor; signer: Signer; signDate: string;
  appointment?: Officer & { date: string; alreadyOfficer?: boolean };
  cessation?: Officer & { date: string; reason: "resignation" | "deceased"; continues?: boolean };
  corporateSecretary?: { nameZh?: string | null; nameEn: string; address: string; email: string; brNumber?: string; tcspLicence?: string; date: string; signatory: string };
};

export function mapND2A(d: ND2AInput): FieldValues {
  const v: FieldValues = {};
  for (let p = 1; p <= 7; p++) v[`fill_1_P.${p}`] = d.brNumber;
  v["fill_2_P.1"] = d.companyName;
  Object.assign(v, presentor(d.presentor, ["fill_14_P.1", "fill_15_P.1", "fill_16_P.1", "fill_17_P.1", "fill_18_P.1", "fill_19_P.1"]));
  if (d.cessation) {
    const c = d.cessation, n = nameParts(c.nameEn), [dd, mm, yy] = dateParts(c.date);
    Object.assign(v, cap(c.capacity, ["cb_1_P.1", "cb_2_P.1", "cb_3_P.1"]), {
      "fill_4_P.1": c.nameZh ?? "", "fill_5_P.1": n.surname, "fill_6_P.1": n.other,
      [isHkid(c.idNumber) ? "fill_7_P.1" : "fill_8_P.1"]: partialId(c.idNumber),
      "cb_4_P.1": c.reason === "resignation", "cb_5_P.1": c.reason === "deceased",
      "fill_11_P.1": dd, "fill_12_P.1": mm, "fill_13_P.1": yy,
      ...(c.capacity !== "secretary" ? { "cb_6_P.1": !!c.continues, "cb_7_P.1": !c.continues } : {}),
    });
  }
  if (d.appointment) {
    const a = d.appointment, n = nameParts(a.nameEn), addr = splitAddress(a.correspondenceAddress), [dd, mm, yy] = dateParts(a.date);
    Object.assign(v, cap(a.capacity, ["cb_1_P.2", "cb_2_P.2", "cb_3_P.2"]), {
      "fill_3_P.2": a.nameZh ?? "", "fill_4_P.2": n.surname, "fill_5_P.2": n.other,
      ...addrFields(addr, ["fill_10_P.2", "fill_11_P.2", "fill_12_P.2", "fill_13_P.2", "fill_14_P.2"]),
      "fill_15_P.2": a.email ?? "",
      ...(isHkid(a.idNumber) ? { "fill_16_P.2": partialId(a.idNumber) } : { "fill_17_P.2": a.passportCountry ?? "", "fill_18_P.2": partialId(a.idNumber) }),
      "fill_21_P.2": dd, "fill_22_P.2": mm, "fill_23_P.2": yy,
      ...(a.capacity !== "secretary" ? { "cb_5_P.2": !!a.alreadyOfficer, "cb_6_P.2": !a.alreadyOfficer } : {}),
    });
    // PI-ND2A: protected information (full ID number, residential address), not shown publicly.
    const [idMain, idCheck] = hkidParts(a.idNumber);
    const res = splitAddress(a.residentialAddress);
    Object.assign(v, cap(a.capacity, ["cb_1_P.7", "cb_2_P.7", "cb_3_P.7"]), {
      "fill_2_P.7": a.nameZh ?? "", "fill_3_P.7": n.surname, "fill_4_P.7": n.other,
      ...(isHkid(a.idNumber) ? { "fill_5_P.7": idMain, "fill_6_P.7": idCheck } : { "fill_7_P.7": a.passportCountry ?? "", "fill_8_P.7": a.idNumber ?? "" }),
      ...(a.capacity !== "secretary" ? addrFields(res, ["fill_9_P.7", "fill_10_P.7", "fill_11_P.7", "fill_12_P.7", "fill_13_P.7"]) : {}),
    });
  }
  if (d.corporateSecretary) {
    const s = d.corporateSecretary, addr = splitAddress(s.address), [dd, mm, yy] = dateParts(s.date);
    Object.assign(v, { "cb_1_P.3": true, "fill_3_P.3": s.nameZh ?? "", "fill_4_P.3": s.nameEn,
      ...addrFields(addr, ["fill_5_P.3", "fill_6_P.3", "fill_7_P.3", "fill_8_P.3", "fill_9_P.3"]),
      "fill_10_P.3": s.email, "fill_11_P.3": s.brNumber ?? "", "fill_12_P.3": s.tcspLicence ?? "",
      "fill_14_P.3": dd, "fill_15_P.3": mm, "fill_16_P.3": yy, "fill_17_P.3": s.signatory });
  }
  v["fill_22_P.3"] = d.signer.name;
  v["fill_23_P.3"] = dateParts(d.signDate).join("/");
  return v;
}

export type NR1Input = { brNumber: string; companyName: string; newAddress: string; effectiveDate: string; presentor: Presentor; signer: Signer; signDate: string };
export function mapNR1(d: NR1Input): FieldValues {
  const a = splitAddress(d.newAddress), [dd, mm, yy] = dateParts(d.effectiveDate);
  return {
    "fill_1_P.1": d.brNumber, "fill_2_P.1": d.companyName,
    "fill_3_P.1": a.flat, "fill_4_P.1": a.building, "fill_5_P.1": a.street, "fill_6_P.1": a.district,
    "fill_7_P.1": dd, "fill_8_P.1": mm, "fill_9_P.1": yy,
    "fill_18_P.1": d.signer.name, "fill_19_P.1": dateParts(d.signDate).join("/"),
    ...presentor(d.presentor, ["fill_20_P.1", "fill_21_P.1", "fill_22_P.1", "fill_23_P.1", "fill_24_P.1", "fill_25_P.1"]),
  };
}

export type NNC2Input = { brNumber: string; existingEn: string; existingZh?: string | null; resolutionDate: string; newEn?: string | null; newZh?: string | null; presentor: Presentor; signer: Signer; signDate: string };
export function mapNNC2(d: NNC2Input): FieldValues {
  const [dd, mm, yy] = dateParts(d.resolutionDate);
  return {
    "fill_1_P.1": d.brNumber, "fill_2_P.1": d.existingEn, "fill_3_P.1": d.existingZh ?? "",
    "fill_4_P.1": dd, "fill_5_P.1": mm, "fill_6_P.1": yy, "fill_7_P.1": d.newEn ?? "", "fill_8_P.1": d.newZh ?? "",
    "fill_9_P.1": d.signer.name, "fill_10_P.1": dateParts(d.signDate).join("/"),
    "fill_11_P.1": "", "fill_12_P.1": d.presentor.name, "fill_13_P.1": d.presentor.address, "fill_14_P.1": d.presentor.tel, "fill_16_P.1": d.presentor.email, "fill_17_P.1": d.presentor.reference,
  };
}

export type ND2BInput = {
  brNumber: string; companyName: string; presentor: Presentor; signer: Signer; signDate: string;
  officer: Officer; effectiveDate: string;
  changes: { nameZh?: string; nameEn?: string; correspondenceAddress?: string; email?: string; idNumber?: string; passportCountry?: string; residentialAddress?: string };
};
export function mapND2B(d: ND2BInput): FieldValues {
  const o = d.officer, n = nameParts(o.nameEn), [dd, mm, yy] = dateParts(d.effectiveDate), c = d.changes;
  const v: FieldValues = { "fill_1_P.1": d.brNumber, "fill_2_P.1": d.companyName, ...cap(o.capacity, ["cb_1_P.1", "cb_2_P.1", "cb_3_P.1"]),
    "fill_3_P.1": o.nameZh ?? "", "fill_4_P.1": n.surname, "fill_5_P.1": n.other, [isHkid(o.idNumber) ? "fill_6_P.1" : "fill_7_P.1"]: partialId(o.idNumber),
    ...presentor(d.presentor, ["fill_8_P.1", "fill_9_P.1", "fill_10_P.1", "fill_11_P.1", "fill_12_P.1", "fill_13_P.1"]) };
  for (let p = 2; p <= 3; p++) v[`fill_1_P.${p}`] = d.brNumber;
  if (c.nameZh) Object.assign(v, { "fill_2_P.2": c.nameZh, "fill_3_P.2": dd, "fill_4_P.2": mm, "fill_5_P.2": yy });
  if (c.nameEn) { const nn = nameParts(c.nameEn); Object.assign(v, { "fill_6_P.2": nn.surname, "fill_7_P.2": nn.other, "fill_8_P.2": dd, "fill_9_P.2": mm, "fill_10_P.2": yy }); }
  if (c.residentialAddress) Object.assign(v, { "fill_16_P.2": dd, "fill_17_P.2": mm, "fill_18_P.2": yy });
  if (c.correspondenceAddress) { const a = splitAddress(c.correspondenceAddress); Object.assign(v, addrFields(a, ["fill_19_P.2", "fill_20_P.2", "fill_21_P.2", "fill_22_P.2", "fill_23_P.2"]), { "fill_24_P.2": dd, "fill_25_P.2": mm, "fill_26_P.2": yy }); }
  if (c.email) Object.assign(v, { "fill_27_P.2": c.email, "fill_28_P.2": dd, "fill_29_P.2": mm, "fill_30_P.2": yy });
  if (c.idNumber && isHkid(c.idNumber)) Object.assign(v, { "fill_31_P.2": partialId(c.idNumber), "fill_32_P.2": dd, "fill_33_P.2": mm, "fill_34_P.2": yy });
  else if (c.idNumber) Object.assign(v, { "fill_35_P.2": c.passportCountry ?? "", "fill_36_P.2": partialId(c.idNumber), "fill_37_P.2": dd, "fill_38_P.2": mm, "fill_39_P.2": yy });
  if (c.idNumber || c.residentialAddress) {
    const pn = nameParts(c.nameEn ?? o.nameEn);
    const [idMain, idCheck] = hkidParts(c.idNumber);
    Object.assign(v, cap(o.capacity, ["cb_1_P.6", "cb_2_P.6", "cb_3_P.6"]), {
      "fill_1_P.6": d.brNumber, "fill_2_P.6": c.nameZh ?? o.nameZh ?? "", "fill_3_P.6": pn.surname, "fill_4_P.6": pn.other,
      ...(c.idNumber ? isHkid(c.idNumber) ? { "fill_5_P.6": idMain, "fill_6_P.6": idCheck } : { "fill_7_P.6": c.passportCountry ?? "", "fill_8_P.6": c.idNumber } : {}),
      ...(c.residentialAddress ? addrFields(splitAddress(c.residentialAddress), ["fill_9_P.6", "fill_10_P.6", "fill_11_P.6", "fill_12_P.6", "fill_13_P.6"]) : {}),
      "fill_29_P.3": "1",
    });
  }
  v["fill_30_P.3"] = d.signer.name;
  v["fill_31_P.3"] = dateParts(d.signDate).join("/");
  return v;
}

export type ND4Input = { brNumber: string; companyName: string; officer: Officer; date: string; continues?: boolean; presentor: Presentor };
export function mapND4(d: ND4Input): FieldValues {
  const o = d.officer, n = nameParts(o.nameEn), [dd, mm, yy] = dateParts(d.date);
  return { "fill_1_P.1": d.brNumber, "fill_2_P.1": d.companyName, ...cap(o.capacity, ["cb_1_P.1", "cb_2_P.1", "cb_3_P.1"]),
    "fill_4_P.1": o.nameZh ?? "", "fill_5_P.1": n.surname, "fill_6_P.1": n.other, [isHkid(o.idNumber) ? "fill_7_P.1" : "fill_8_P.1"]: partialId(o.idNumber),
    "fill_11_P.1": dd, "fill_12_P.1": mm, "fill_13_P.1": yy,
    ...presentor(d.presentor, ["fill_14_P.1", "fill_15_P.1", "fill_16_P.1", "fill_17_P.1", "fill_18_P.1", "fill_19_P.1"]) };
}

export type NDR1Input = { brNumber: string; companyName: string; applicant: "company" | "director" | "member"; presentor: Presentor };
export function mapNDR1(d: NDR1Input): FieldValues {
  return { "fill_1_P.1": d.brNumber, "fill_2_P.1": d.companyName, "cb_1_P.1": d.applicant === "company", "cb_2_P.1": d.applicant === "director", "cb_3_P.1": d.applicant === "member",
    "fill_4_P.1": d.presentor.name, "fill_5_P.1": d.presentor.address, "fill_8_P.1": d.presentor.tel, "fill_10_P.1": d.presentor.email, "fill_11_P.1": d.presentor.reference };
}

export type CapitalRow = { className: string; currency: string; totalNumber: number; totalAmount: number; paidUp: number };
export type NSC1Input = {
  brNumber: string; companyName: string; from: string; to: string; currency: string; increase: number;
  cashRows: { className: string; currency: string; number: number; paidEach: number; unpaidEach: number }[];
  capital: CapitalRow[]; allottees: { className: string; nameZh?: string | null; nameEn: string; corporate?: boolean; address: string; shares: number }[];
  presentor: Presentor; signer: Signer; signDate: string;
};
export function mapNSC1(d: NSC1Input): FieldValues {
  if (d.cashRows.length > 3 || d.capital.length > 1 || d.allottees.length > 2 || new Set(d.allottees.map(a => a.className)).size > 1) {
    throw new Error("NSC1: unsupported continuation sheets or multiple-class rights; prepare and review the complete official form manually.");
  }
  if (!d.cashRows.length || !d.allottees.length) throw new Error("NSC1: allotment details and allottees are required.");
  const [fd, fm, fy] = dateParts(d.from), [td, tm, ty] = dateParts(d.to);
  const v: FieldValues = { "fill_2_P.1": d.companyName, "fill_3_P.1": fd, "fill_4_P.1": fm, "fill_5_P.1": fy, "fill_6_P.1": td, "fill_7_P.1": tm, "fill_8_P.1": ty,
    "cb_1_P.1": d.increase > 0, "cb_2_P.1": d.increase <= 0, "fill_9_P.1": d.currency, "fill_10_P.1": d.increase.toLocaleString("en-US"),
    ...presentor(d.presentor, ["fill_30_P.1", "fill_31_P.1", "fill_32_P.1", "fill_33_P.1", "fill_34_P.1", "fill_35_P.1"]) };
  for (const p of [1, 2, 3, 7]) v[`fill_1_P.${p}`] = d.brNumber;
  d.cashRows.slice(0, 3).forEach((r, i) => { const b = 15 + i * 5; Object.assign(v, { [`fill_${b}_P.1`]: r.className, [`fill_${b + 1}_P.1`]: r.currency, [`fill_${b + 2}_P.1`]: r.number.toLocaleString("en-US"), [`fill_${b + 3}_P.1`]: String(r.paidEach), [`fill_${b + 4}_P.1`]: String(r.unpaidEach) }); });
  v["cb_1_P.3"] = true;
  v["fill_26_P.3"] = "1"; // one Schedule 2 in this supported subset
  v["fill_26_P.7"] = "1"; v["fill_27_P.7"] = "1";
  d.capital.slice(0, 3).forEach((r, i) => { const b = 2 + i * 6; Object.assign(v, { [`fill_${b}_P.3`]: r.className, [`fill_${b + 1}_P.3`]: r.currency, [`fill_${b + 2}_P.3`]: r.totalNumber.toLocaleString("en-US"), [`fill_${b + 3}_P.3`]: r.totalAmount.toLocaleString("en-US"), [`fill_${b + 4}_P.3`]: r.paidUp.toLocaleString("en-US"), [`fill_${b + 5}_P.3`]: (r.totalAmount - r.paidUp).toLocaleString("en-US") }); });
  v["fill_27_P.3"] = d.signer.name;
  v["fill_28_P.3"] = dateParts(d.signDate).join("/");
  const cls = d.allottees[0]?.className ?? "";
  v["fill_2_P.7"] = cls;
  v["fill_3_P.7"] = d.allottees.filter((a) => a.className === cls).reduce((s, a) => s + a.shares, 0).toLocaleString("en-US");
  d.allottees.slice(0, 2).forEach((a, i) => {
    const n = nameParts(a.nameEn), addr = splitAddress(a.address);
    const f = i === 0 ? { zh: 4, sur: 5, oth: 6, corp: 7, addr: [8, 9, 10, 11, 12], n: 13 } : { zh: 15, sur: 16, oth: 17, corp: 18, addr: [19, 20, 21, 22, 23], n: 24 };
    Object.assign(v, { [`fill_${f.zh}_P.7`]: a.nameZh ?? "", ...(a.corporate ? { [`fill_${f.corp}_P.7`]: a.nameEn } : { [`fill_${f.sur}_P.7`]: n.surname, [`fill_${f.oth}_P.7`]: n.other }),
      ...addrFields(addr, f.addr.map((x) => `fill_${x}_P.7`)), [`fill_${f.n}_P.7`]: a.shares.toLocaleString("en-US") });
  });
  return v;
}

export type NAR1Input = {
  brNumber: string; companyName: string; businessName?: string | null; type: "private" | "public" | "guarantee";
  natureCode?: string | null; natureDescription?: string | null; madeUpTo: string;
  registeredOffice: string; email: string; phone?: string | null; charges: string;
  capital: CapitalRow[];
  secretary?: { corporate: boolean; nameZh?: string | null; nameEn: string; address: string; email?: string | null; idNumber?: string | null; brNumber?: string | null; tcspLicence?: string | null };
  directors: Officer[];
  members: { className: string; totalInClass: number; rows: { nameZh?: string | null; nameEn: string; corporate?: boolean; address: string; shares: number; remarks?: string }[] }[];
  presentor: Presentor; signer: Signer; signDate: string;
};
export function mapNAR1(d: NAR1Input): FieldValues {
  if (d.capital.length > 4 || new Set(d.capital.map(c => c.currency)).size > 1) {
    throw new Error("NAR1: unsupported continuation sheets or currency totals; prepare and review the complete official form manually.");
  }
  const [dd, mm, yy] = dateParts(d.madeUpTo), ro = splitAddress(d.registeredOffice);
  const v: FieldValues = {
    "fill_2_P.1": d.companyName, "fill_3_P.1": d.businessName ?? "", "cb_1_P.1": d.type === "private", "cb_2_P.1": d.type === "public", "cb_3_P.1": d.type === "guarantee",
    "fill_4_P.1": d.natureCode ?? "", "fill_5_P.1": d.natureDescription ?? "", "fill_6_P.1": dd, "fill_7_P.1": mm, "fill_8_P.1": yy,
    "fill_15_P.1": ro.flat, "fill_16_P.1": ro.building, "fill_17_P.1": ro.street, "fill_18_P.1": ro.district,
    ...presentor(d.presentor, ["fill_19_P.1", "fill_20_P.1", "fill_21_P.1", "fill_22_P.1", "fill_23_P.1", "fill_24_P.1"]),
    "fill_2_P.2": d.email, "fill_3_P.2": (d.phone ?? "").replace(/^\+852\s*/, ""), "fill_4_P.2": d.charges,
  };
  for (const p of [1, 2, 3, 4, 5, 6, 7, 8]) v[`fill_1_P.${p}`] = d.brNumber;
  d.capital.slice(0, 4).forEach((r, i) => { const b = 6 + i * 5; Object.assign(v, { [`fill_${b}_P.2`]: r.className, [`fill_${b + 1}_P.2`]: r.currency, [`fill_${b + 2}_P.2`]: r.totalNumber.toLocaleString("en-US"), [`fill_${b + 3}_P.2`]: r.totalAmount.toLocaleString("en-US"), [`fill_${b + 4}_P.2`]: r.paidUp.toLocaleString("en-US") }); });
  const cur = d.capital[0]?.currency ?? "HKD";
  Object.assign(v, { "fill_27_P.2": cur, "fill_28_P.2": d.capital.reduce((s, r) => s + r.totalAmount, 0).toLocaleString("en-US"), "fill_29_P.2": d.capital.reduce((s, r) => s + r.paidUp, 0).toLocaleString("en-US") });
  const s = d.secretary;
  if (s && !s.corporate) {
    const n = nameParts(s.nameEn), a = splitAddress(s.address);
    Object.assign(v, { "fill_2_P.3": s.nameZh ?? "", "fill_3_P.3": n.surname, "fill_4_P.3": n.other, "fill_9_P.3": a.flat, "fill_10_P.3": a.building, "fill_11_P.3": a.street, "fill_12_P.3": a.district, "fill_13_P.3": s.email ?? "", "fill_14_P.3": partialId(s.idNumber), "fill_17_P.3": s.tcspLicence ?? "" });
  } else if (s) {
    const a = splitAddress(s.address);
    Object.assign(v, { "fill_2_P.4": s.nameZh ?? "", "fill_3_P.4": s.nameEn, "fill_4_P.4": a.flat, "fill_5_P.4": a.building, "fill_6_P.4": a.street, "fill_7_P.4": a.district, "fill_8_P.4": s.email ?? "", "fill_9_P.4": s.brNumber ?? "", "fill_10_P.4": s.tcspLicence ?? "" });
  }
  const dir = d.directors.find((x) => x.capacity !== "secretary");
  if (dir) {
    const n = nameParts(dir.nameEn), a = splitAddress(dir.correspondenceAddress);
    Object.assign(v, { "cb_1_P.5": dir.capacity === "director", "cb_2_P.5": dir.capacity === "alternate", "fill_3_P.5": dir.nameZh ?? "", "fill_4_P.5": n.surname, "fill_5_P.5": n.other,
      ...addrFields(a, ["fill_10_P.5", "fill_11_P.5", "fill_12_P.5", "fill_13_P.5", "fill_14_P.5"]), "fill_15_P.5": dir.email ?? "",
      ...(isHkid(dir.idNumber) ? { "fill_16_P.5": partialId(dir.idNumber) } : { "fill_17_P.5": dir.passportCountry ?? "", "fill_18_P.5": partialId(dir.idNumber) }) });
  }
  v["cb_1_P.8"] = true; // members listed in Schedule 1
  v["cb_4_P.8"] = d.type === "private";
  v["fill_11_P.8"] = d.signer.name;
  v["fill_12_P.8"] = dateParts(d.signDate).join("/");
  const m = d.members[0];
  if (m) {
    Object.assign(v, { "fill_1_P.9": dd, "fill_2_P.9": mm, "fill_3_P.9": yy, "fill_4_P.9": d.brNumber, "fill_5_P.9": m.className, "fill_6_P.9": m.totalInClass.toLocaleString("en-US") });
    m.rows.slice(0, 2).forEach((r, i) => {
      const n = nameParts(r.nameEn), a = splitAddress(r.address);
      const f = i === 0 ? { zh: 7, sur: 8, oth: 9, corp: 10, addr: [11, 12, 13, 14, 15], rem: 17, n: 16 } : { zh: 18, sur: 19, oth: 20, corp: 21, addr: [22, 23, 24, 25, 26], rem: 28, n: 27 };
      Object.assign(v, { [`fill_${f.zh}_P.9`]: r.nameZh ?? "", ...(r.corporate ? { [`fill_${f.corp}_P.9`]: r.nameEn } : { [`fill_${f.sur}_P.9`]: n.surname, [`fill_${f.oth}_P.9`]: n.other }),
        ...addrFields(a, f.addr.map((x) => `fill_${x}_P.9`)), [`fill_${f.n}_P.9`]: r.shares.toLocaleString("en-US"), [`fill_${f.rem}_P.9`]: r.remarks ?? "" });
    });
    v["fill_29_P.9"] = "1"; v["fill_30_P.9"] = "1";
  }
  const extra: Continuation[] = [];
  // Sheet C is the Registry's dedicated natural-person director continuation,
  // not a copy of the main director page. Its first four fields identify the return.
  for (const director of d.directors.slice(1)) {
    const source = mapNAR1({ ...d, directors: [director], members: [] });
    const values: FieldValues = { "fill_1_P.13": dd, "fill_2_P.13": mm, "fill_3_P.13": yy, "fill_4_P.13": d.brNumber };
    for (const [key, value] of Object.entries(source)) {
      const match = key.match(/^(fill|cb)_(\d+)_P\.5$/);
      if (match && !(match[1] === "fill" && match[2] === "1")) values[`${match[1]}_${Number(match[2]) + (match[1] === "fill" ? 3 : 0)}_P.13`] = value;
    }
    extra.push({ page: 13, values });
  }
  const schedules = d.members.flatMap(group => {
    const chunks: typeof group[] = [];
    for (let i = 0; i < group.rows.length; i += 2) chunks.push({ ...group, rows: group.rows.slice(i, i + 2) });
    return chunks;
  });
  v["fill_6_P.8"] = String(Math.max(0, d.directors.length - 1));
  v["fill_9_P.8"] = String(schedules.length);
  for (let index = 1; index < schedules.length; index++) {
    const source = mapNAR1({ ...d, directors: [], members: [schedules[index]] });
    const values: FieldValues = Object.fromEntries(Object.entries(source).filter(([key]) => key.endsWith("_P.9")));
    values["fill_29_P.9"] = String(index + 1); values["fill_30_P.9"] = String(index + 1);
    extra.push({ page: 9, values });
  }
  if (extra.length) v[CONTINUATIONS] = extra;
  return v;
}

export type NNC1Input = {
  nameEn: string; nameZh?: string | null; type: "private" | "public"; natureCode?: string | null; natureDescription: string;
  registeredOffice: string; email: string; phone: string;
  capital: { className: string; number: number; currency: string; subscribed: number; paidUp: number }[];
  presentor: Presentor;
  founder?: { nameEn: string; nameZh?: string | null; address: string };
  secretary?: { nameEn: string; nameZh?: string | null; address: string; email?: string | null; brNumber?: string | null; tcspLicence?: string | null };
  director?: Officer & { adult: boolean; consentToAct: boolean };
  signDate?: string;
};
export function mapNNC1(d: NNC1Input): FieldValues {
  const a = splitAddress(d.registeredOffice);
  const v: FieldValues = { "fill_1_P.1": d.nameEn, "fill_2_P.1": d.nameZh ?? "", "cb_1_P.1": d.type === "private", "cb_2_P.1": d.type === "public",
    "fill_3_P.1": d.natureCode ?? "", "fill_4_P.1": d.natureDescription, "fill_5_P.1": a.flat, "fill_6_P.1": a.building, "fill_7_P.1": a.street, "fill_8_P.1": a.district,
    "fill_9_P.1": "", "fill_10_P.1": d.presentor.name, "fill_11_P.1": d.presentor.address, "fill_12_P.1": d.presentor.tel, "fill_14_P.1": d.presentor.email, "fill_15_P.1": d.presentor.reference,
    "fill_1_P.2": d.email, "fill_2_P.2": d.phone.replace(/^\+852\s*/, "") };
  d.capital.slice(0, 2).forEach((r, i) => { const b = 3 + i * 6; Object.assign(v, { [`fill_${b}_P.2`]: r.className, [`fill_${b + 1}_P.2`]: r.number.toLocaleString("en-US"), [`fill_${b + 2}_P.2`]: r.currency, [`fill_${b + 3}_P.2`]: r.subscribed.toLocaleString("en-US"), [`fill_${b + 4}_P.2`]: r.paidUp.toLocaleString("en-US"), [`fill_${b + 5}_P.2`]: (r.subscribed - r.paidUp).toLocaleString("en-US") }); });
  Object.assign(v, { "fill_15_P.2": d.capital.reduce((s, r) => s + r.number, 0).toLocaleString("en-US"), "fill_16_P.2": d.capital[0]?.currency ?? "HKD", "fill_17_P.2": d.capital.reduce((s, r) => s + r.subscribed, 0).toLocaleString("en-US"), "fill_18_P.2": d.capital.reduce((s, r) => s + r.paidUp, 0).toLocaleString("en-US"), "fill_19_P.2": d.capital.reduce((s, r) => s + r.subscribed - r.paidUp, 0).toLocaleString("en-US") });
  if (d.founder && d.secretary && d.director) {
    if (d.capital.length !== 1) throw new Error("NNC1: multiple capital classes require continuation mapping.");
    const f = d.founder, n = nameParts(f.nameEn), capital = d.capital[0];
    Object.assign(v, { "fill_1_P.3": f.nameZh ?? "", "fill_2_P.3": n.surname, "fill_3_P.3": n.other,
      ...addrFields(splitAddress(f.address), ["fill_5_P.3", "fill_6_P.3", "fill_7_P.3", "fill_8_P.3", "fill_9_P.3"]),
      "fill_10_P.3": capital.className, "fill_11_P.3": String(capital.number), "fill_12_P.3": capital.currency, "fill_13_P.3": String(capital.subscribed),
      "fill_18_P.3": String(capital.number), "fill_19_P.3": capital.currency, "fill_20_P.3": String(capital.subscribed),
    });
    const s = d.secretary;
    Object.assign(v, { "fill_1_P.5": s.nameZh ?? "", "fill_2_P.5": s.nameEn,
      ...addrFields(splitAddress(s.address), ["fill_3_P.5", "fill_4_P.5", "fill_5_P.5", "fill_6_P.5"]),
      "fill_7_P.5": s.email ?? "", "fill_8_P.5": s.brNumber ?? "", "fill_9_P.5": s.tcspLicence ?? "" });
    const director = d.director, dn = nameParts(director.nameEn), [main, check] = hkidParts(director.idNumber);
    Object.assign(v, { "fill_1_P.6": director.nameZh ?? "", "fill_2_P.6": dn.surname, "fill_3_P.6": dn.other,
      ...addrFields(splitAddress(director.correspondenceAddress), ["fill_8_P.6", "fill_9_P.6", "fill_10_P.6", "fill_11_P.6", "fill_12_P.6"]),
      "fill_13_P.6": director.email ?? "", "cb_1_P.6": director.adult && director.consentToAct,
      ...(isHkid(director.idNumber) ? { "fill_14_P.6": partialId(director.idNumber) } : { "fill_15_P.6": director.passportCountry ?? "", "fill_16_P.6": partialId(director.idNumber) }),
      "fill_1_P.14": d.nameEn, "cb_2_P.14": true, "fill_2_P.14": director.nameZh ?? "", "fill_3_P.14": dn.surname, "fill_4_P.14": dn.other,
      ...(isHkid(director.idNumber) ? { "fill_5_P.14": main, "fill_6_P.14": check } : { "fill_7_P.14": director.passportCountry ?? "", "fill_8_P.14": director.idNumber ?? "" }),
      ...addrFields(splitAddress(director.residentialAddress), ["fill_9_P.14", "fill_10_P.14", "fill_11_P.14", "fill_12_P.14", "fill_13_P.14"]),
      "fill_6_P.8": "1", "fill_7_P.8": f.nameEn, "fill_8_P.8": dateParts(d.signDate).join("/"),
    });
  }
  return v;
}

// ---------- Filler ----------
export async function listFieldNames(form: string): Promise<Set<string>> {
  const doc = await PDFDocument.load(readFileSync(path.join(FORMS_DIR, `${form}.pdf`)), { ignoreEncryption: true });
  return new Set(doc.getForm().getFields().map((f) => f.getName()));
}

async function writeFields(doc: PDFDocument, form: string, values: FieldValues) {
  const pdfForm = doc.getForm();
  const fonts = await embedFonts(doc, "tc", { text: Object.values(values).filter(v => typeof v === "string").join(""), bold: false });
  const unknown: string[] = [];
  for (const [name, val] of Object.entries(values)) {
    if (val === undefined || val === null) continue;
    let field;
    try { field = pdfForm.getField(name); } catch { unknown.push(name); continue; }
    if (field instanceof PDFCheckBox) { if (val === true) field.check(); else field.uncheck(); }
    else if (field instanceof PDFDropdown) { field.select(String(val)); }
    else if (field instanceof PDFTextField) {
      const text = String(val);
      field.setText(text);
      field.updateAppearances(fonts.pick(text || "A"));
    }
  }
  if (unknown.length) throw new Error(`${form}: unknown fields ${unknown.join(", ")}`);
}

export async function fillForm(form: string, values: FieldValues, opts: { flatten?: boolean } = {}): Promise<Buffer> {
  const source = readFileSync(path.join(FORMS_DIR, `${form}.pdf`));
  const doc = await PDFDocument.load(source, { ignoreEncryption: true });
  await writeFields(doc, form, values);
  if (opts.flatten) doc.getForm().flatten();
  for (const continuation of values[CONTINUATIONS] ?? []) {
    const sheet = await PDFDocument.load(source, { ignoreEncryption: true });
    await writeFields(sheet, form, continuation.values);
    // Flatten each populated official sheet before copying so identically named
    // PDF widgets cannot share values with other members/directors in the pack.
    sheet.getForm().flatten();
    // save() embeds/subsets the fonts; copying an unsaved sheet drops glyphs.
    const ready = await PDFDocument.load(await sheet.save(), { ignoreEncryption: true });
    const [page] = await doc.copyPages(ready, [continuation.page - 1]);
    doc.addPage(page);
  }
  return Buffer.from(await doc.save());
}

export async function readFormValues(pdf: Buffer): Promise<Record<string, string | boolean>> {
  const doc = await PDFDocument.load(pdf, { ignoreEncryption: true });
  const out: Record<string, string | boolean> = {};
  for (const f of doc.getForm().getFields()) {
    if (f instanceof PDFTextField) { const t = f.getText(); if (t) out[f.getName()] = t; }
    else if (f instanceof PDFCheckBox && f.isChecked()) out[f.getName()] = true;
  }
  return out;
}
