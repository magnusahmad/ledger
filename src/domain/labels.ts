import type { Lang } from "@/db/schema";
import type { RequirementDef } from "./playbook-types";
import { requirementLibrary } from "./playbooks";
import { contactInfoPatch } from "./records";
import type { ChecklistEntry } from "@/db/schema";
import { fmtDate, isIsoDate } from "./dates";

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

const CONTACT_LABELS = { en: { email: "Email", phone: "Mobile number" }, tc: { email: "電郵", phone: "手提電話號碼" }, sc: { email: "电邮", phone: "手机号码" } };

/** Compound contact details can be partly supplied; ask only for the missing channel. */
export function neededItemLabel(e: Pick<ChecklistEntry, "key" | "value">, lang: Lang = "en", params?: Record<string, unknown> | null): string {
  if (e.key === "contactInfo") {
    const parts = contactInfoPatch(e.value, { email: null, phone: null });
    if (parts.email && !parts.phone) return CONTACT_LABELS[lang].phone;
    if (parts.phone && !parts.email) return CONTACT_LABELS[lang].email;
  }
  return itemLabel(e.key, lang, params);
}

export function receivedItemLabel(e: Pick<ChecklistEntry, "key" | "value">, lang: Lang = "en", params?: Record<string, unknown> | null): string {
  let label = itemLabel(e.key, lang, params);
  if (e.key === "contactInfo") {
    const parts = contactInfoPatch(e.value, { email: null, phone: null });
    if (parts.email && !parts.phone) label = CONTACT_LABELS[lang].email;
    if (parts.phone && !parts.email) label = CONTACT_LABELS[lang].phone;
  }
  return `${label}${e.value && !PROTECTED_KEYS.has(e.key) ? `: ${isIsoDate(e.value) ? fmtDate(e.value, lang) : e.value}` : ""}`;
}

export function money(cents: number, currency = "HKD"): string {
  if (Number.isSafeInteger(cents)) {
    const amount = BigInt(Math.abs(cents));
    const hundred = BigInt(100);
    const whole = (amount / hundred).toLocaleString("en-US");
    const remainder = Number(amount % hundred);
    const sign = cents < 0 || Object.is(cents, -0) ? "-" : "";
    const v = `${sign}${whole}${remainder ? `.${String(remainder).padStart(2, "0")}` : ""}`;
    return `${currency === "HKD" ? "HK$" : currency + " "}${v}`;
  }
  const v = (cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });
  return `${currency === "HKD" ? "HK$" : currency + " "}${v}`;
}

/** Keys holding protected information (never shown to the LLM in full). */
export const PROTECTED_KEYS = new Set(["idNo", "resAddr"]);
