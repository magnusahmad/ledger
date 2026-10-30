// Mail room review screen: keyboard shortcuts and how the filing destination is shown.
// The approval gate itself is covered in mailroom.test.ts; these protect the screen's rules.
import { describe, it, expect } from "vitest";
import { filingLine, keyAction } from "@/mailroom/review";

const key = (k: string, o: Partial<Parameters<typeof keyAction>[0]> = {}) => keyAction({ key: k, typing: false, modifier: false, ...o });

describe("Keyboard shortcuts on the review screen", () => {
  it("Enter approves, C changes, J and K move between letters, [ shows or hides the list", () => {
    expect(key("Enter")).toBe("approve");
    expect(key("c")).toBe("change");
    expect(key("C")).toBe("change");
    expect(key("j")).toBe("next");
    expect(key("k")).toBe("prev");
    expect(key("[")).toBe("toggleList");
  });

  it("nothing is a shortcut while staff are typing in a field, so Enter in the email box never approves", () => {
    for (const k of ["Enter", "c", "j", "k", "["]) expect(key(k, { typing: true })).toBeNull();
  });

  it("keys held with Cmd, Ctrl or Alt are left to the browser", () => {
    expect(key("Enter", { modifier: true })).toBeNull();
    expect(key("c", { modifier: true })).toBeNull();
  });

  it("other keys do nothing", () => {
    expect(key("a")).toBeNull();
    expect(key(" ")).toBeNull();
  });
});

describe("Where the letter goes, as shown to staff", () => {
  it("shows every folder from the top of the server down, then the file name on its own", () => {
    expect(filingLine("Clients/ABC Trading Limited/Tax/2025-26", "2026-10-30 IRD demand note 2025-26.pdf"))
      .toEqual({ path: "Clients › ABC Trading Limited › Tax › 2025-26", file: "2026-10-30 IRD demand note 2025-26.pdf" });
  });

  it("a letter with no folder yet says so instead of showing an empty path", () => {
    expect(filingLine(null, "x.pdf")).toEqual({ path: "Not decided yet", file: "x.pdf" });
  });
});
