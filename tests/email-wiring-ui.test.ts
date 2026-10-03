import { expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/server/actions", () => ({ redraftAction: vi.fn() }));
import { ReviewForm } from "@/app/(desk)/review/[id]/client";
it("a quote awaiting custom-plan approval cannot be submitted from the review form", () => {
  const html = renderToStaticMarkup(createElement(ReviewForm, { action: async () => ({ ok: true }), submit: "Approve and send", disabled: true }));
  expect(html).toMatch(/<button[^>]*disabled=""/);
});
