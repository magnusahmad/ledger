// The one action a case asks for next (UHY pilot screens show one primary action per case).
import type { ArStage } from "@/db/schema";

export type NextStep = "registry_check" | "prepare" | "compare" | "confirm_payment" | "draft" | "wait_sent" | "signed_received" | "filed" | "registered";

export function nextStep(c: { kind: "AR" | "AGM"; stage: ArStage; registryCheck: unknown; formSource: "generated" | "csa" | null; formCompare: unknown }): NextStep | null {
  switch (c.stage) {
    case "due": return c.kind === "AR" && !c.registryCheck ? "registry_check" : "prepare";
    case "prepared": return c.formSource === "generated" && !c.formCompare ? "compare" : "confirm_payment";
    case "payment_confirmed": return "draft";
    case "draft_ready": return "wait_sent";
    case "sent": return "signed_received";
    case "signed_received": return "filed";
    case "filed": return "registered";
    case "registered": return null;
  }
}

export const NEXT_LABEL: Record<NextStep, string> = {
  registry_check: "Check the Registry", prepare: "Prepare the papers", compare: "Compare with CSA's form", confirm_payment: "Confirm payment",
  draft: "Draft the email", wait_sent: "Send the draft from Outlook", signed_received: "Signed copy back?", filed: "Record filing", registered: "Record registration",
};
