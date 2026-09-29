// Playbook v2 definition. Playbooks are data (AGENTS.md): company secretaries edit them.
// Intent matching never uses keywords: `whenToUse` is read by the intake agent.
import type { Jurisdiction, Lang } from "@/db/schema";

export type Tri = Record<Lang, string>;

export type StepKind =
  | "send" | "pay" | "collect" | "kyc" | "screen" | "generate" | "sign" | "file"
  | "register" | "confirm" | "task" | "wait_until";

export type StepDef = {
  kind: StepKind;
  label: string;
  /** Human-gated steps wait for a click in the intray. */
  human?: boolean;
  /** For `task` steps: what staff do. */
  instructions?: string;
  /** For `file` steps: which authority/portal. */
  authority?: string;
};

/** Deterministic conditions evaluated by the engine before the agent review. */
export type RequirementCondition =
  | "always"
  | "personLacksCurrentCdd"   // KYC items: skip when the person has current CDD on file
  | "clientIsNew"
  | "personIsNew";

export type RequirementRef = {
  key: string;
  /** Items about the task's person (director, transferee...) rather than the company. */
  scope?: "person" | "client";
  condition?: RequirementCondition;
  /** Natural-language note for the requirement-review agent. */
  appliesWhenNote?: string;
  optional?: boolean;
};

export type RequirementDef = {
  label: Tri;
  kind: "data" | "file" | "check";
  /** Hint for the extraction agent. Never used for matching by rules. */
  extractionHint?: string;
};

export type RegisterEffect =
  | { kind: "appoint_officer"; role: string; personParam?: string }
  | { kind: "cease_officer"; role: string; personParam?: string }
  | { kind: "replace_officer"; role: string }
  | { kind: "update_person_particulars" }
  | { kind: "change_registered_office" }
  | { kind: "change_name" }
  | { kind: "allot_shares" }
  | { kind: "transfer_shares" }
  | { kind: "buyback_shares" }
  | { kind: "update_controllers" }
  | { kind: "change_fye" }
  | { kind: "change_auditor" }
  | { kind: "record_annual_return" }
  | { kind: "record_agm" }
  | { kind: "renew_br" }
  | { kind: "record_cdd_review" }
  | { kind: "activate_client" }
  | { kind: "deregister" }
  | { kind: "set_operating_status"; status: "dormant" | "operating" }
  | { kind: "set_jurisdiction_field"; field: string; param: string }
  | { kind: "change_capital" };

export type DocumentRef = {
  template: string;            // e.g. "cr:ND2A", "tpl:board-resolution"
  name: string;
  signers?: "directors" | "person" | "members" | "transferor_transferee" | "chair" | "none";
  wetInk?: boolean;
};

export type DeadlineRule =
  | { kind: "event"; days: number; from: "effectiveDate" | "resolution"; rule: string }
  | { kind: "anniversary"; days: number; rule: string }
  | { kind: "fye"; months: number; rule: string }
  | { kind: "br_expiry"; rule: string }
  | { kind: "fixed_annual"; month: number; day: number; rule: string }
  | { kind: "none"; rule?: string };

export type PlaybookDef = {
  id: string;
  version: number;
  jurisdiction: Jurisdiction;
  category: string;
  name: Tri;
  phrase: Tri;
  description: string;
  whenToUse: string;
  startedBy: "client request" | "firm calendar" | "either";
  personSelection?: "new" | "existing_officer" | "existing_member" | "any" | "none";
  forms?: string;
  deadline: DeadlineRule;
  requirements: RequirementRef[];
  steps: StepDef[];
  documents: DocumentRef[];
  registerEffects: RegisterEffect[];
  feeCents: number;
  statutoryFees?: { description: string; amountCents: number }[];
  complianceNotes: string[];
  /** Filing / period key template for deadline satisfaction, e.g. "NAR1:{year}". */
  periodKey?: string;
  verifyNote?: string;
};
