// Display rules for staff screens: what raw codes and states read as in the interface.
import { describe, it, expect } from "vitest";
import { statusLabel, stepStatus, when, timelineText, languageLabel, jurisdictionLabel, fyeLabel, documentSourceLabel, plural, valueText } from "@/lib/display";

describe("Display labels", () => {
  it("invoice, task and payment statuses read in sentence case, and a sent invoice reads as unpaid", () => {
    expect(statusLabel("sent")).toBe("Unpaid");
    expect(statusLabel("part_paid")).toBe("Part paid");
    expect(statusLabel("paid")).toBe("Paid");
    expect(statusLabel("draft")).toBe("Draft");
    expect(statusLabel("cleared_by_staff")).toBe("Cleared by staff");
  });

  it("a task waiting on payment, the client or signatures says what it is waiting for, not the playbook's step name", () => {
    expect(stepStatus({ kind: "pay", label: "Payment received" })).toBe("Awaiting payment");
    expect(stepStatus({ kind: "collect", label: "Collect details and documents" })).toBe("Waiting for the client");
    expect(stepStatus({ kind: "sign", label: "Collect e-signatures" })).toBe("Awaiting signatures");
    expect(stepStatus({ kind: "file", label: "Submit ND2A" })).toBe("Submit ND2A");
    expect(stepStatus(null, "done")).toBe("Completed");
  });

  it("recent activity shows as relative time, and anything older than a week shows its date", () => {
    const now = new Date("2026-09-30T12:00:00Z");
    expect(when(new Date("2026-09-30T11:48:00Z"), now)).toBe("12m ago");
    expect(when(new Date("2026-09-27T12:00:00Z"), now)).toBe("3d ago");
    expect(when(new Date("2025-11-03T12:00:00Z"), now)).toBe("3 Nov 2025");
  });

  it("the timeline hides step-entered events, since the steps list already shows where the task is", () => {
    expect(timelineText({ kind: "step.entered", summary: "Now: Payment received" })).toBeNull();
    expect(timelineText({ kind: "step.completed", summary: "Done: Send invoice and information request" })).toBe("Completed: Send invoice and information request");
    expect(timelineText({ kind: "task.created", summary: 'Opened from playbook "New company incorporation"' })).toBe("Task opened");
    expect(timelineText({ kind: "portal.upload", summary: "Client uploaded hkid.jpg" })).toBe("Client uploaded hkid.jpg");
  });

  it("stored codes for language, jurisdiction, year end and document source render as words", () => {
    expect(languageLabel("tc")).toBe("Traditional Chinese");
    expect(languageLabel("sc")).toBe("Simplified Chinese");
    expect(languageLabel("en")).toBe("English");
    expect(jurisdictionLabel("HK")).toBe("Hong Kong");
    expect(fyeLabel(31, 3)).toBe("31 March");
    expect(documentSourceLabel("seed")).toBe("On file");
    expect(documentSourceLabel("generated")).toBe("Prepared by Harbourline");
  });

  it("counts use the right plural instead of (s)", () => {
    expect(plural(1, "task")).toBe("1 task");
    expect(plural(2, "task")).toBe("2 tasks");
    expect(plural(0, "client")).toBe("0 clients");
  });

  it("a checklist value that is a date reads as a date, and other values are shown as given", () => {
    expect(valueText("2026-11-01")).toBe("1 Nov 2026");
    expect(valueText("Flat 12B, 88 Robinson Road")).toBe("Flat 12B, 88 Robinson Road");
  });
});
