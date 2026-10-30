// Where an approved letter goes: the firm's folder and naming rules, kept as data
// (seed/mailroom/rules.json) so the firm can change them without code.
import path from "node:path";
import type { MailroomRead } from "@/db/schema";

export type FilingRule = { label: string; folder: string; file: string; noEmail?: boolean; unsorted?: boolean };
export type FilingRules = { clientFolder: string; unsortedFolder: string; types: Record<string, FilingRule>; fallback: FilingRule };

export const ruleFor = (rules: FilingRules, type: string): FilingRule => rules.types[type] ?? rules.fallback;

/** One folder or file name segment: no separators, no dot-dot, nothing Windows rejects. */
export function cleanSegment(s: string): string {
  const c = s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\.{2,}/g, "").replace(/\s+/g, " ").trim().replace(/^\.+|\.+$/g, "").trim();
  return c || "_";
}

function fill(template: string, values: Record<string, string>): string {
  return template.split("/").map((seg) => cleanSegment(seg.replace(/\{(\w+)\}/g, (_, k: string) => cleanSegment(values[k] ?? "")))).join("/");
}

export function fileTarget(rules: FilingRules, r: MailroomRead, client: { folder: string } | null, date: string): { folder: string; fileName: string } {
  const rule = ruleFor(rules, r.type);
  const values = { client: client?.folder ?? "", date, year: date.slice(0, 4), taxYear: r.taxYear ?? date.slice(0, 4), sender: r.sender, type: rule.label };
  const base = rule.unsorted || !client ? rules.unsortedFolder : rules.clientFolder;
  return { folder: fill(`${base}/${rule.folder}`, values), fileName: `${fill(rule.file, values)}.pdf` };
}

/** The absolute path for a folder and file name, refusing anything outside the server root. */
export function safeTarget(root: string, folder: string, file: string): string {
  const segs = folder.split(/[\\/]/).filter(Boolean);
  if ([...segs, file].some((s) => s === ".." || s === "." || /[\\/]/.test(file))) throw new Error("That folder is outside the firm's server folder");
  const base = path.resolve(root);
  const full = path.resolve(base, ...segs, file);
  if (!full.startsWith(base + path.sep)) throw new Error("That folder is outside the firm's server folder");
  return full;
}
