// Hong Kong stamp duty on transfers of Hong Kong stock (Stamp Duty Ordinance, Cap. 117,
// head 2(1)): since 17 November 2023, 0.1% on each of the bought note and the sold note,
// on the higher of consideration and value, per HK$1,000 or part thereof; plus HK$5 on
// the instrument of transfer. Verify with the company secretary before relying on it.
export function stampDuty(o: { considerationCents: number; valueCents?: number | null }) {
  const basisCents = Math.max(o.considerationCents, o.valueCents ?? 0);
  const perNoteCents = Math.ceil(basisCents / 100 / 1000) * 100; // HK$1 per HK$1,000 or part
  const instrumentCents = 500;
  return { perNoteCents, instrumentCents, totalCents: perNoteCents * 2 + instrumentCents, basisCents };
}
