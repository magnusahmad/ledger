import type { Lang } from "@/db/schema";
import type { RequirementDef } from "./playbook-types";
import { requirementLibrary } from "./playbooks";

let lib: Record<string, RequirementDef> | null = null;
function library() { return (lib ??= requirementLibrary()); }

type PlanItem = { key: string; labelEn: string; labelTc: string; labelSc: string };

/** Label for a checklist key, including agent-planned keys on one-off tasks. */
export function itemLabel(key: string, lang: Lang = "en", params?: Record<string, unknown> | null): string {
  const def = library()[key];
  if (def) return def.label[lang] ?? def.label.en;
  const plan = (params?.plan as { items?: PlanItem[] } | undefined)?.items?.find((i) => i.key === key);
  if (plan) return lang === "tc" ? plan.labelTc : lang === "sc" ? plan.labelSc : plan.labelEn;
  return key;
}

export function itemKind(key: string, params?: Record<string, unknown> | null): "data" | "file" | "check" {
  const def = library()[key];
  if (def) return def.kind;
  const plan = (params?.plan as { items?: (PlanItem & { kind: "data" | "file" })[] } | undefined)?.items?.find((i) => i.key === key);
  return plan?.kind ?? "data";
}

export function money(cents: number, currency = "HKD"): string {
  const v = (cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });
  return `${currency === "HKD" ? "HK$" : currency + " "}${v}`;
}

/** Keys holding protected information (never shown to the LLM in full). */
export const PROTECTED_KEYS = new Set(["idNo", "resAddr"]);
