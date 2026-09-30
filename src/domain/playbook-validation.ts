import { z } from "zod";
import type { PlaybookDef, RequirementDef } from "./playbook-types";
import { TEMPLATES } from "@/documents/templates";

const text = z.string().trim().min(1);
const tri = z.strictObject({ en: text, tc: text, sc: text });
const nonnegative = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const deadline = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("none"), rule: z.string().optional() }),
  z.strictObject({ kind: z.literal("letter_date"), rule: text }),
  z.strictObject({ kind: z.literal("event"), days: nonnegative, from: z.enum(["effectiveDate", "resolution"]), rule: text }),
  z.strictObject({ kind: z.literal("anniversary"), days: nonnegative, rule: text }),
  z.strictObject({ kind: z.literal("fye"), months: nonnegative, rule: text }),
  z.strictObject({ kind: z.literal("br_expiry"), rule: text }),
  z.strictObject({ kind: z.literal("fixed_annual"), month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31), rule: text }),
]);
const simpleEffects = ["update_person_particulars", "change_registered_office", "change_name", "allot_shares", "transfer_shares", "buyback_shares", "update_controllers", "change_fye", "change_auditor", "record_annual_return", "record_agm", "renew_br", "record_cdd_review", "activate_client", "deregister", "change_capital"] as const;
const effect = z.union([
  z.strictObject({ kind: z.enum(simpleEffects) }),
  z.strictObject({ kind: z.enum(["appoint_officer", "cease_officer"]), role: text, personParam: text.optional() }),
  z.strictObject({ kind: z.literal("replace_officer"), role: text }),
  z.strictObject({ kind: z.literal("set_operating_status"), status: z.enum(["dormant", "operating"]) }),
  z.strictObject({ kind: z.literal("set_jurisdiction_field"), field: text, param: text }),
]);
const schema = z.strictObject({
  id: text, version: z.number().int().positive(), jurisdiction: z.enum(["HK", "CN", "MO", "TW"]),
  category: text, name: tri, phrase: tri, description: text, whenToUse: text,
  startedBy: z.enum(["client request", "firm calendar", "either"]),
  personSelection: z.enum(["new", "existing_officer", "existing_member", "any", "none"]).optional(),
  forms: z.string().optional(), deadline,
  requirements: z.array(z.strictObject({ key: text, scope: z.enum(["person", "client"]).optional(), condition: z.enum(["always", "personLacksCurrentCdd", "clientIsNew", "personIsNew"]).optional(), appliesWhenNote: z.string().optional(), optional: z.boolean().optional() })),
  steps: z.array(z.strictObject({ kind: z.enum(["send", "pay", "collect", "kyc", "screen", "generate", "sign", "file", "register", "confirm", "task", "wait_until"]), label: text, human: z.boolean().optional(), instructions: z.string().optional(), authority: z.string().optional() })).min(1),
  documents: z.array(z.strictObject({ template: text, name: text, signers: z.enum(["directors", "person", "members", "transferor_transferee", "chair", "none"]).optional(), wetInk: z.boolean().optional() })),
  registerEffects: z.array(effect), feeCents: nonnegative,
  statutoryFees: z.array(z.strictObject({ description: text, amountCents: nonnegative })).optional(),
  complianceNotes: z.array(text), periodKey: text.optional(), verifyNote: z.string().optional(),
});
const CR_FORMS = new Set(["ND2A", "NR1", "NNC2", "ND2B", "ND4", "NDR1", "NSC2", "NSC1", "NAR1", "NNC1"]);
const MINUTES_REQUIREMENTS = ["meetingDate", "meetingTime", "meetingPlace", "meetingChair", "meetingAttendees", "meetingDecisions"];

export function validatePlaybook(json: string, requirements: Record<string, RequirementDef>): PlaybookDef {
  let input: unknown;
  try { input = JSON.parse(json); } catch { throw new Error("Invalid JSON. Check commas, quotes and brackets before saving."); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map(i => `${i.path.join(".") || "playbook"}: ${i.message}`).join("; "));
  const pb: PlaybookDef = parsed.data;
  const seen = new Set<string>();
  for (const r of pb.requirements) {
    if (!requirements[r.key]) throw new Error(`requirements: unknown item ${r.key}. Choose a key from the requirement library.`);
    if (seen.has(r.key)) throw new Error(`requirements: duplicate item ${r.key}.`);
    seen.add(r.key);
  }
  for (const d of pb.documents) {
    if (!(d.template.startsWith("cr:") ? CR_FORMS.has(d.template.slice(3)) : Object.hasOwn(TEMPLATES, d.template))) throw new Error(`documents: unknown template ${d.template}.`);
    if (["tpl:board-meeting-minutes", "tpl:members-meeting-minutes"].includes(d.template)) {
      if (d.signers !== "none" || !d.wetInk) throw new Error("documents: meeting minutes require signers 'none' and wetInk true for the chair's verified signature.");
      if (!pb.steps.some((s, i) => s.kind === "task" && s.human === true && i > pb.steps.findIndex(x => x.kind === "generate") && !pb.steps.slice(0, i).some(x => x.kind === "file" || x.kind === "register"))) throw new Error("steps: meeting minutes need a human task after generate to obtain and verify the chair's signature.");
      for (const key of MINUTES_REQUIREMENTS) if (!pb.requirements.some(r => r.key === key && !r.optional && (!r.condition || r.condition === "always"))) throw new Error(`requirements: ${d.template} needs required ${key}.`);
    }
  }
  const at = (kind: string) => pb.steps.findIndex(s => s.kind === kind);
  if (pb.requirements.length && at("collect") < 0) throw new Error("steps: requirements need a collect step.");
  if (pb.documents.length && at("generate") < 0) throw new Error("steps: documents need a generate step.");
  if (pb.registerEffects.length && at("register") < 0) throw new Error("steps: register effects need a register step.");
  for (const [i, step] of pb.steps.entries()) {
    if (step.kind === "sign" && step.human === false) throw new Error(`steps.${i}.human: sign cannot disable human approval.`);
    if (["send", "file", "register", "confirm"].includes(step.kind) && step.human !== true) throw new Error(`steps.${i}.human: ${step.kind} must require human approval.`);
    if (["generate", "sign", "file", "register"].includes(step.kind) && pb.requirements.length && at("collect") > i) throw new Error(`steps: collect must precede ${step.kind}.`);
    if (step.kind === "sign" && (at("generate") < 0 || at("generate") > i)) throw new Error("steps: generate must precede sign.");
    if (step.kind === "file" && pb.documents.length && at("generate") > i) throw new Error("steps: generate must precede file.");
    if (step.kind === "register" && at("file") > i) throw new Error("steps: file must precede register.");
  }
  return pb;
}
