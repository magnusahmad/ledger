// Rules for the review screen that don't need a browser: which key does what, and how the
// filing destination reads. Shortcuts never fire while staff are typing in a field.
export type ReviewKey = "approve" | "change" | "next" | "prev" | "toggleList";

const KEYS: Record<string, ReviewKey> = { enter: "approve", c: "change", j: "next", k: "prev", "[": "toggleList" };

export function keyAction(e: { key: string; typing: boolean; modifier: boolean }): ReviewKey | null {
  if (e.typing || e.modifier) return null;
  return KEYS[e.key.toLowerCase()] ?? null;
}

/** Where the letter goes, as staff read it: " › " crumbs, or their own drive and separator. */
export function filingLine(folder: string | null, file: string | null, display?: { root: string; separator: string }): { path: string; file: string | null } {
  const parts = (folder ?? "").split("/").filter(Boolean);
  if (!parts.length) return { path: "Not decided yet", file };
  return { path: display ? display.root + parts.join(display.separator) : parts.join(" › "), file };
}
