// Arithmetic over staff-confirmed facts. No assumed capital reduction per cancelled share.
import type { Movements } from "@/agent/structure";
import { isIsoDate } from "./dates";

export function verifiedBuyback(items: Movements["items"], capital: { name: string; currency: string; issued: number; paidUpCents: number }[], holders: { personId: string; name: string; className: string; quantity: number }[]) {
  if (items.length !== 1 || capital.length !== 1) throw new Error("NSC2: multiple buy-backs or share classes require manual preparation and review of class rights.");
  const item = items[0], cls = capital[0];
  const amount = item.considerationCents;
  const reduction = item.capitalPaymentCents;
  if (item.kind !== "buyback" || item.className !== cls.name || item.currency !== cls.currency || item.existingUnpaidCents !== 0 || !item.buybackFunding || reduction === undefined || item.postBuybackCapitalCents === undefined) {
    throw new Error("NSC2: verify buy-back funding, capital payment, post-buyback capital, currency and fully paid existing capital.");
  }
  if (amount === null || !Number.isSafeInteger(amount) || amount <= 0 || reduction > amount || reduction > cls.paidUpCents || item.postBuybackCapitalCents !== cls.paidUpCents - reduction) throw new Error("NSC2: purchase consideration or post-buyback capital is inconsistent with the capital payment.");
  if ((item.buybackFunding === "profits" && reduction !== 0) || (item.buybackFunding === "capital" && reduction !== amount) || (item.buybackFunding === "mixed" && (reduction <= 0 || reduction >= amount))) throw new Error("NSC2: funding source and payment out of capital disagree.");
  if (reduction && (!isIsoDate(item.paymentDate) || new Date(`${item.paymentDate}T00:00:00Z`).toISOString().slice(0, 10) !== item.paymentDate)) throw new Error("NSC2: verify the date of payment out of capital.");
  const matches = holders.filter(h => h.className === cls.name && (item.fromPersonId ? h.personId === item.fromPersonId : h.name === item.fromName));
  if (matches.length !== 1 || matches[0].quantity < item.quantity || item.quantity >= cls.issued) throw new Error("NSC2: verify the selling member and shares held; the buy-back must leave shares in issue.");
  return { item, cls, seller: matches[0], capitalReductionCents: reduction, remaining: cls.issued - item.quantity, postCapitalCents: item.postBuybackCapitalCents };
}
