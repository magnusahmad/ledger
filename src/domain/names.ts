// Comparing names and values from different sources: case, punctuation and word order
// ("Jane DOE" / "DOE, Jane") don't make two values different.
export function sameValue(a: string, b: string): boolean {
  return normTokens(a) === normTokens(b);
}
export function normTokens(s: string): string {
  return s.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean).sort().join(" ");
}
