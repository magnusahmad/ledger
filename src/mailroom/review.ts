// Rules for the review screen that don't need a browser: which key does what, and how the
// filing destination reads. Shortcuts never fire while staff are typing in a field.
export type ReviewKey = "approve" | "change" | "next" | "prev" | "toggleList";

const KEYS: Record<string, ReviewKey> = { enter: "approve", c: "change", j: "next", k: "prev", "[": "toggleList" };

export function keyAction(e: { key: string; typing: boolean; modifier: boolean }): ReviewKey | null {
  if (e.typing || e.modifier) return null;
  return KEYS[e.key.toLowerCase()] ?? null;
}

export function filingLine(folder: string | null, file: string | null): { path: string; file: string | null } {
  const parts = (folder ?? "").split("/").filter(Boolean);
  return { path: parts.length ? parts.join(" › ") : "Not decided yet", file };
}
