import { MovementsZ } from "@/agent/structure";
import type { DocContext } from "./context";
import type { NSC1Input } from "./cr-forms";

function movements(c: DocContext) {
  const plan = MovementsZ.safeParse(c.task.params.structured);
  if (!plan.success || !plan.data.items.length) throw new Error("NSC1 / share certificate: structured share allotment or transfer details are required.");
  return plan.data.items;
}

/** Supported subset: one existing class, cash and fully paid, with explicit addresses. */
export function allotmentFormData(c: DocContext): Pick<NSC1Input, "currency" | "increase" | "cashRows" | "capital" | "allottees"> {
  const items = movements(c);
  if (c.capital.length !== 1) throw new Error("NSC1: multiple or new share classes require manual preparation and review of their rights.");
  const cls = c.capital[0];
  const cashRows: NSC1Input["cashRows"] = [];
  const allottees: NSC1Input["allottees"] = [];
  let increaseCents = 0, count = 0;
  for (const item of items) {
    if (item.kind !== "allotment" || item.className !== cls.name || item.considerationType !== "cash" || item.unpaidCents !== 0 || item.existingUnpaidCents !== 0 || item.currency !== cls.currency || !item.allotteeAddress?.trim() || !item.allotteeKind || !item.toName?.trim()) {
      throw new Error("NSC1: verify allotment cash consideration, fully paid new and existing capital, currency, allottee name, address and entity type. Other allotments require manual preparation.");
    }
    const paid = item.considerationCents ?? (item.pricePerShareCents === null ? null : item.pricePerShareCents * item.quantity);
    if (paid === null || !Number.isSafeInteger(paid) || paid <= 0 || (item.pricePerShareCents !== null && item.pricePerShareCents * item.quantity !== paid)) throw new Error("NSC1: allotment consideration is missing or inconsistent with the per-share price.");
    const paidEach = paid / item.quantity / 100;
    const same = cashRows.find(r => r.paidEach === paidEach);
    if (same) same.number += item.quantity;
    else cashRows.push({ className: cls.name, currency: cls.currency, number: item.quantity, paidEach, unpaidEach: 0 });
    allottees.push({ className: cls.name, nameEn: item.toName, nameZh: item.toNameZh, corporate: item.allotteeKind === "corporate", address: item.allotteeAddress, shares: item.quantity });
    increaseCents += paid; count += item.quantity;
  }
  return { currency: cls.currency, increase: increaseCents / 100, cashRows, allottees, capital: [{ className: cls.name, currency: cls.currency, totalNumber: cls.issued + count, totalAmount: (cls.paidUpCents + increaseCents) / 100, paidUp: (cls.paidUpCents + increaseCents) / 100 }] };
}

/** Project a pending transaction without changing the statutory register. */
export function certificateHoldings(c: DocContext): DocContext["members"] {
  if (c.pb.id === "hk.incorporation") {
    const p = c.incorporation;
    if (!p) throw new Error("Share certificate: incorporation founder holdings must be supplied.");
    return [{ personId: p.founderPersonId, name: p.founder.nameEn, nameZh: p.founder.nameZh, className: p.capital.className, shareClassId: "pending-incorporation", quantity: p.capital.number, percent: 100 }];
  }
  if (!["hk.allotShares", "hk.transferShares"].includes(c.pb.id)) return c.members;
  const holders = c.members.map(m => ({ ...m }));
  const affected = new Set<string>();
  for (const item of movements(c)) {
    if (item.kind !== "allotment" && item.kind !== "transfer") throw new Error("Share certificate: unsupported structured share movement.");
    const cls = c.capital.find(x => x.name === item.className);
    if (!cls) throw new Error("Share certificate: verify the share class before generation.");
    if (item.kind === "transfer") {
      const matches = holders.filter(h => h.className === item.className && (item.fromPersonId ? h.personId === item.fromPersonId : h.name === item.fromName));
      if (matches.length !== 1 || matches[0].quantity < item.quantity) throw new Error("Share certificate: transfer exceeds the identified holder's shares.");
      matches[0].quantity -= item.quantity;
      affected.add(`${matches[0].personId}|${item.className}`);
    }
    if (!item.toName && !item.toPersonId) throw new Error("Share certificate: recipient is required.");
    let recipient = holders.find(h => h.className === item.className && (item.toPersonId ? h.personId === item.toPersonId : h.name === item.toName));
    if (!recipient) {
      if (!item.toName) throw new Error("Share certificate: recipient name is required.");
      recipient = { personId: item.toPersonId ?? `new:${item.toName}`, name: item.toName, nameZh: item.toNameZh, className: item.className, shareClassId: cls.shareClassId, quantity: 0, percent: 0 };
      holders.push(recipient);
    }
    recipient.quantity += item.quantity;
    affected.add(`${recipient.personId}|${item.className}`);
  }
  return holders.filter(h => h.quantity > 0 && affected.has(`${h.personId}|${h.className}`));
}
