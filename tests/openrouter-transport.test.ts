import { afterEach, expect, it, vi } from "vitest";
import { getDefaultAutoSelectFamilyAttemptTimeout, setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";
import { OpenRouterLlm } from "@/integrations/llm/openrouter";
import type { LlmRequest } from "@/integrations/types";

const originalTimeout = getDefaultAutoSelectFamilyAttemptTimeout();
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); setDefaultAutoSelectFamilyAttemptTimeout(originalTimeout); });
const request: LlmRequest = { agent: "test", schemaName: "test", schema: { type: "object" }, messages: [{ role: "user", content: "Fictional test" }] };
const key = "fixture-secret-not-for-logs";

it("OpenRouter allows slow connections more than Node's 250ms address-attempt window", () => {
  setDefaultAutoSelectFamilyAttemptTimeout(250);
  new OpenRouterLlm(key, "test-model");
  expect(getDefaultAutoSelectFamilyAttemptTimeout()).toBeGreaterThanOrEqual(2000);
});
it("OpenRouter preserves an already longer connection-attempt setting", () => {
  setDefaultAutoSelectFamilyAttemptTimeout(5000);
  new OpenRouterLlm(key, "test-model");
  expect(getDefaultAutoSelectFamilyAttemptTimeout()).toBe(5000);
});
it("exhausted connection retries report nested network codes without exposing credentials", async () => {
  vi.useFakeTimers();
  const failure = new TypeError("fetch failed", { cause: new AggregateError([
    Object.assign(new Error(`connect ${key}`), { code: "ETIMEDOUT" }),
    Object.assign(new Error("unreachable"), { code: "EHOSTUNREACH" }),
  ]) });
  const fetcher = vi.fn().mockRejectedValue(failure); vi.stubGlobal("fetch", fetcher);
  const result = new OpenRouterLlm(key, "test-model").complete(request).catch(e => e as Error);
  await vi.runAllTimersAsync();
  const error = await result as Error;
  expect(error.message).toContain("ETIMEDOUT");
  expect(error.message).toContain("EHOSTUNREACH");
  expect(error.message).toContain("OpenRouter");
  expect(error.message).not.toContain(key);
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it("a transient connection failure retries and returns the validated transport payload", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed", { cause: { code: "ECONNRESET" } })).mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] })));
  vi.stubGlobal("fetch", fetcher);
  const result = new OpenRouterLlm(key, "test-model").complete(request);
  await vi.runAllTimersAsync();
  expect((await result).json).toEqual({ ok: true });
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("HTTP access rejections remain distinct from network errors and do not echo the API key", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(`This model is not available in your region. ${key}`, { status: 403 })); vi.stubGlobal("fetch", fetcher);
  const error = await new OpenRouterLlm(key, "test-model").complete(request).catch(e => e as Error) as Error;
  expect(error.message).toContain("OpenRouter 403");
  expect(error.message).toContain("not available in your region");
  expect(error.message).not.toContain(key);
  expect(fetcher).toHaveBeenCalledOnce();
});
