// Comparing names and values from different sources: case, punctuation and word order
// ("Jane DOE" / "DOE, Jane") don't make two values different.
export function sameValue(a: string, b: string): boolean {
  return normTokens(a) === normTokens(b);
}
export function normTokens(s: string): string {
  return s.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean).sort().join(" ");
}

/** The display placeholder is not a recorded name and cannot satisfy a name requirement. */
export function knownPersonName(value: string | null | undefined): string | null {
  const name = value?.trim();
  return name && !/^unnamed\s+person$/i.test(name) ? name : null;
}
