// How the frozen reply test set is scored (UHY pilot brief, "Test sets before shipping"). A change
// the model fails to report is the most serious error, because staff review is the only thing that
// would catch it, so it fails the case and is counted apart from extras and wrong values. The set
// itself must cover the three languages and the traps the brief names. No live model is called here.
import { describe, it, expect } from "vitest";
import { scoreReply, summarise } from "../eval/ar-reply-score";
import { AR_REPLY_CASES } from "../eval/ar-reply-cases";
import { ReplyReadingZ, type ReplyReading } from "@/annual/reply-types";

const reading = (o: Partial<ReplyReading> = {}): ReplyReading => ReplyReadingZ.parse({ about: "this_return", summary: "s", charges: { answer: "none", details: null, quote: null }, changes: [], signedPapers: [], documents: [], ...o });
const lee = { changeType: "director_ceased" as const, subject: "LEE Siu Ming", detail: "Resigned as director", effectiveDate: "2026-10-31", quote: null, source: "email" };
const want = { about: "this_return" as const, charges: "none" as const, changes: [{ types: ["director_ceased" as const], subject: "lee", effectiveDate: "2026-10-31" }], signedPapers: [] };

describe("scoring a reading against the expected answer", () => {
  it("a reading that matches passes", () => {
    expect(scoreReply(want, reading({ changes: [lee] }))).toEqual({ pass: true, problems: [] });
  });

  it("a missed change fails the case even when everything else matches", () => {
    const s = scoreReply(want, reading());
    expect(s.pass).toBe(false);
    expect(s.problems).toEqual([expect.objectContaining({ kind: "missed", what: expect.stringMatching(/director_ceased/) })]);
  });

  it("an extra proposal is counted separately from a missed one", () => {
    const s = scoreReply({ ...want, changes: [] }, reading({ changes: [lee] }));
    expect(s.problems.map((p) => p.kind)).toEqual(["extra"]);
  });

  it("the right kind of change about the wrong person is a miss and an extra, not a match", () => {
    const s = scoreReply(want, reading({ changes: [{ ...lee, subject: "CHAN Tai Man" }] }));
    expect(s.problems.map((p) => p.kind).sort()).toEqual(["extra", "missed"]);
  });

  it("a wrong date on a matched change is 'wrong', and an invented date where none was given is too", () => {
    expect(scoreReply(want, reading({ changes: [{ ...lee, effectiveDate: "2026-10-30" }] })).problems.map((p) => p.kind)).toEqual(["wrong"]);
    expect(scoreReply({ ...want, changes: [{ types: ["director_ceased"], subject: "lee", effectiveDate: null }] }, reading({ changes: [lee] })).problems.map((p) => p.kind)).toEqual(["wrong"]);
  });

  it("a charges answer the model didn't find is a miss; a different answer is wrong", () => {
    expect(scoreReply({ ...want, changes: [] }, reading({ charges: { answer: "not_answered", details: null, quote: null } })).problems.map((p) => p.kind)).toEqual(["missed"]);
    expect(scoreReply({ ...want, changes: [], charges: "not_answered" }, reading()).problems.map((p) => p.kind)).toEqual(["wrong"]);
  });

  it("a reply about something else must be read as such, with nothing proposed", () => {
    const other = { about: "other" as const, charges: "not_answered" as const, changes: [], signedPapers: [] };
    expect(scoreReply(other, reading({ about: "other", charges: { answer: "not_answered", details: null, quote: null } })).pass).toBe(true);
    expect(scoreReply(other, reading({ changes: [lee] })).problems.map((p) => p.kind)).toContain("wrong");
  });

  it("signed papers are matched by document, missing and extra counted apart", () => {
    const w = { ...want, changes: [], signedPapers: ["annual_return" as const] };
    expect(scoreReply(w, reading({ signedPapers: [{ document: "annual_return", filename: "a.pdf", quote: null }] })).pass).toBe(true);
    expect(scoreReply(w, reading()).problems.map((p) => p.kind)).toEqual(["missed"]);
    expect(scoreReply({ ...w, signedPapers: [] }, reading({ signedPapers: [{ document: "annual_return", filename: "a.pdf", quote: null }] })).problems.map((p) => p.kind)).toEqual(["extra"]);
  });

  it("the summary counts cases and each kind of problem", () => {
    const s = summarise([{ id: "a", score: scoreReply(want, reading({ changes: [lee] })) }, { id: "b", score: scoreReply(want, reading()) }, { id: "c", score: null }]);
    expect(s).toMatchObject({ cases: 3, passed: 1, failedToRead: 1, missed: 1, extra: 0, wrong: 0 });
  });
});

describe("the frozen set", () => {
  it("has at least 30 cases with unique ids across English, Traditional and Simplified Chinese", () => {
    expect(AR_REPLY_CASES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(AR_REPLY_CASES.map((c) => c.id)).size).toBe(AR_REPLY_CASES.length);
    for (const lang of ["en", "tc", "sc"] as const) expect(AR_REPLY_CASES.filter((c) => c.lang === lang).length).toBeGreaterThanOrEqual(8);
  });

  it("covers the traps the brief names", () => {
    const has = (f: (c: (typeof AR_REPLY_CASES)[number]) => boolean) => AR_REPLY_CASES.some(f);
    expect(has((c) => c.expect.about === "other")).toBe(true);
    expect(has((c) => c.expect.charges === "not_answered" && c.expect.about === "this_return" && c.expect.changes.length === 0)).toBe(true); // "all correct" without the charges answer
    expect(has((c) => !!c.attachments?.length && c.expect.changes.length > 0 && /no change/i.test(c.text))).toBe(true); // "no changes" with an attachment that shows one
    expect(has((c) => (c.earlier ?? []).some((e) => e.direction === "in"))).toBe(true); // a reply in two messages
    expect(has((c) => c.expect.signedPapers.length > 0)).toBe(true);
    expect(has((c) => !!c.attachments?.some((a) => a.kind === "unreadable"))).toBe(true);
  });

  it("an address change for someone who is both director and member is expected once per register", () => {
    const c = AR_REPLY_CASES.find((x) => x.id === "en-director-address")!;
    expect(c.expect.changes.map((x) => x.types.join()).sort()).toEqual(["member_particulars", "officer_particulars"]);
  });

  it("every case names only fictional example addresses", () => {
    for (const c of AR_REPLY_CASES) expect(c.from).toMatch(/\.example$/);
  });
});
