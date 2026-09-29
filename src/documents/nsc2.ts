// Official NSC2 Specification 1/2025 (February 2025), reviewed against pages 1–2 and notes.
// https://www.cr.gov.hk/en/companies_ordinance/docs/NSC2_fillable.pdf
// Supported here: a single class private-company buy-back; listed treasury-share routes are blocked.
import { MovementsZ } from "@/agent/structure";
import { verifiedBuyback } from "@/domain/buyback-facts";
import type { DocContext } from "./context";
import { dateParts, type FieldValues, type Presentor, type Signer } from "./cr-forms";

const format = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
export function nsc2Values(c: DocContext, base: { brNumber: string; companyName: string; presentor: Presentor; signer: Signer; signDate: string }): FieldValues {
  if (c.client.jurisdiction !== "HK" || !/private/i.test(c.client.companyType ?? "")) throw new Error("NSC2: verify private-company status. Public or listed-company treasury-share returns need manual preparation.");
  const parsed = MovementsZ.safeParse(c.task.params.structured);
  if (!parsed.success) throw new Error("NSC2: structured buy-back funding and capital details are required.");
  const { item, cls, remaining, postCapitalCents, capitalReductionCents } = verifiedBuyback(parsed.data.items, c.capital, c.members);
  const delivered = c.task.effectiveDate ?? c.values.effDate;
  if (!delivered) throw new Error("NSC2: the actual date shares were delivered to the company is required.");
  if (capitalReductionCents && !c.values.solvencyStatement) throw new Error("NSC2: verify the solvency statement and capital-payment procedure before preparing the return.");
  const [day, month, year] = dateParts(delivered);
  const [payDay, payMonth, payYear] = dateParts(item.paymentDate);
  const p = base.presentor;
  return {
    "fill_1_P.1": base.brNumber, "fill_1_P.2": base.brNumber, "fill_2_P.1": base.companyName,
    "fill_3_P.1": cls.name, "fill_4_P.1": format(item.quantity), "fill_5_P.1": `${day}/${month}/${year}`,
    // Price range, treasury shares and aggregate consideration are listed-company-only fields.
    "fill_23_P.1": capitalReductionCents ? `${cls.currency} ${format(capitalReductionCents / 100)}` : "",
    "fill_24_P.1": capitalReductionCents ? payDay : "", "fill_25_P.1": capitalReductionCents ? payMonth : "", "fill_26_P.1": capitalReductionCents ? payYear : "",
    "fill_27_P.1": p.name, "fill_28_P.1": p.address, "fill_29_P.1": p.tel, "fill_31_P.1": p.email, "fill_32_P.1": p.reference,
    "fill_2_P.2": cls.name, "fill_3_P.2": cls.currency, "fill_4_P.2": format(remaining),
    "fill_5_P.2": format(postCapitalCents / 100), "fill_6_P.2": format(postCapitalCents / 100), "fill_7_P.2": "0",
    "Dropdown_1_P.2": base.signer.capacity === "secretary" ? "—".repeat(93) : " ",
    "Dropdown_2_P.2": base.signer.capacity === "director" ? "—".repeat(93) : " ",
    "fill_34_P.2": "0", "fill_35_P.2": "0", "fill_36_P.2": `${base.signer.name} (${base.signer.capacity === "director" ? "Director" : "Company Secretary"})`, "fill_37_P.2": dateParts(base.signDate).join("/"),
  };
}
