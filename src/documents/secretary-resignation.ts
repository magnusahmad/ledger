import type { DocContext } from "./context";
import { mapND4, type FieldValues } from "./cr-forms";
import { presentorOf } from "./generate";
import { validRegisterDate } from "./register-export";
export function secretaryResignationValues(c: DocContext): FieldValues {
  const p = c.person;
  const date = c.values.lastDay ?? c.task.effectiveDate ?? "";
  const basis = c.values.resignationNoticeBasis;
  const signer = c.values.resigningSignatory?.trim();
  if (!p || !validRegisterDate(date) || !signer || !["notice_given", "notice_copy", "not_required"].includes(basis)) throw new Error("ND4 requires the resigning secretary, valid date, notice declaration and authorised signatory");
  if (!c.officers.some(o => o.role === "secretary" && o.personId === p.id)) throw new Error("ND4 requires a current secretary of this company");
  const v = mapND4({ brNumber: c.br?.brNumber ?? "", companyName: c.client.nameEn, officer: { capacity: "secretary", nameEn: p.nameEn, nameZh: p.nameZh, idNumber: p.idNumber }, date, presentor: presentorOf(c) });
  if (p.kind === "corporate") {
    for (const n of [4,5,6,7,8]) delete v[`fill_${n}_P.1`];
    v["fill_9_P.1"] = p.nameZh ?? ""; v["fill_10_P.1"] = p.nameEn;
  }
  v["fill_1_P.2"] = c.br?.brNumber ?? "";
  v[`cb_${basis === "notice_given" ? 1 : basis === "notice_copy" ? 2 : 3}_P.2`] = true;
  v["fill_2_P.2"] = signer;
  v["fill_3_P.2"] = c.today.split("-").reverse().join("/");
  return v;
}
