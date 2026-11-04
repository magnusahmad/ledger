// What the case page asks for next: one primary action per case, in the order the steps must run.
import { describe, it, expect } from "vitest";
import { nextStep } from "@/annual/next-step";

const base = { kind: "AR" as const, stage: "due" as const, registryCheck: null, formSource: null, formCompare: null };

describe("next step on a case", () => {
  it("an annual return starts with the Registry check, then preparing the papers", () => {
    expect(nextStep(base)).toBe("registry_check");
    expect(nextStep({ ...base, registryCheck: { result: "no_changes" } })).toBe("prepare");
  });
  it("an AGM has no Registry check", () => {
    expect(nextStep({ ...base, kind: "AGM" })).toBe("prepare");
  });
  it("a generated NAR1 is compared with CSA's before payment, then payment, then the draft", () => {
    expect(nextStep({ ...base, stage: "prepared", formSource: "generated", registryCheck: { result: "no_changes" } })).toBe("compare");
    expect(nextStep({ ...base, stage: "prepared", formSource: "generated", formCompare: { same: true }, registryCheck: { result: "no_changes" } })).toBe("confirm_payment");
    expect(nextStep({ ...base, stage: "prepared", formSource: "csa", registryCheck: { result: "no_changes" } })).toBe("confirm_payment");
    expect(nextStep({ ...base, stage: "payment_confirmed" })).toBe("draft");
  });
  it("after the draft come sending, the signed copy, filing and registration, then nothing", () => {
    expect(nextStep({ ...base, stage: "draft_ready" })).toBe("wait_sent");
    expect(nextStep({ ...base, stage: "sent" })).toBe("signed_received");
    expect(nextStep({ ...base, stage: "signed_received" })).toBe("filed");
    expect(nextStep({ ...base, stage: "filed" })).toBe("registered");
    expect(nextStep({ ...base, stage: "registered" })).toBeNull();
  });
});
