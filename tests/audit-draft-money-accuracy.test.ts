import { beforeEach, describe, expect, it } from "vitest";
import { seedDemo } from "@/db/seed-demo";
import { draftEmail, draftProblems, type ReplyFacts } from "@/agent/draft";
import { makeCtx, resetDb, type TestCtx } from "./helpers";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx);
});

const facts: ReplyFacts = {
  language: "en", recipientName: "Fictional Client", clientName: "Fictional Company",
  signOff: "Karen Yip", newRequests: [], updates: [], changes: [], cancellations: [],
  questions: [], clarifications: [], uploadUrl: null,
  invoice: {
    number: "CRCS-2026-4321", totalFormatted: "HK$123.45", lines: [],
    terms: "Pay before work starts", paymentInstructions: null,
  },
};

describe("Model drafts retain the complete reviewed invoice amount", () => {
  for (const amount of ["HK$123.99", "US$123.45", "HK$1123.45"]) {
    it(`a plausible draft total ${amount} cannot satisfy the reviewed HK$123.45 total`, () => {
      expect(draftProblems(facts, `Invoice ${facts.invoice!.number} for ${amount} is attached.`))
        .toEqual(expect.arrayContaining([expect.stringMatching(/total|amount/i)]));
    });
  }

  it("the correct exact amount passes in English, Traditional Chinese and Simplified Chinese prose", () => {
    for (const prefix of ["Invoice attached", "隨函附上發票", "随函附上发票"])
      expect(draftProblems(facts, `${prefix}: ${facts.invoice!.number}, HK$123.45.`)).toEqual([]);
  });

  it("equivalent currency spacing, grouping and trailing zeros retain the same reviewed cents", () => {
    const grouped: ReplyFacts = { ...facts, invoice: { ...facts.invoice!, totalFormatted: "HK$1,234.50" } };
    for (const amount of ["HK$1,234.50", "HK$ 1234.50", "HKD 1234.5"]) expect(draftProblems(grouped, `${grouped.invoice!.number}: ${amount}.`)).toEqual([]);
    const whole: ReplyFacts = { ...facts, invoice: { ...facts.invoice!, totalFormatted: "USD 600" } };
    expect(draftProblems(whole, `${whole.invoice!.number}: USD 600.00.`)).toEqual([]);
  });

  it("two schema-valid drafts with altered cents fall back to the correct template without sending", async () => {
    ctx.llm.on("draft", { subject: "Invoice", body: `Invoice ${facts.invoice!.number} for HK$123.99 is attached.` });
    const draft = await draftEmail(ctx, facts);
    expect(draft.source).toBe("template");
    expect(draft.body).toContain("HK$123.45");
    expect(draft.body).not.toContain("HK$123.99");
    expect(ctx.mail.sent()).toHaveLength(0);
  });
});
