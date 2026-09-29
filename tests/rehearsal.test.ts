import { expect, it, vi } from "vitest";
import { requireRehearsalRequest, assertRehearsalComplete, runRehearsal, approveCurrentRehearsalProposal } from "../scripts/rehearsal-checks";

const denied = { kind: "triage", title: "Couldn't read a message", payload: { reason: 'Agent intake failed: OpenRouter 403: {"error":{"message":"This model is not available in your region."}}' } };
it("a superseded approval is left for a fresh preparation pass instead of aborting or bypassing the safety gate", async () => {
  const approve = vi.fn(async () => { throw new Error("Facts changed; preparation restarted"); });
  expect(await approveCurrentRehearsalProposal(approve, async () => true)).toBe(false);
  expect(approve).toHaveBeenCalledOnce();
});
it("an approval failure that has not superseded the card still fails the rehearsal", async () => {
  await expect(approveCurrentRehearsalProposal(async () => { throw new Error("Mail delivery failed"); }, async () => false)).rejects.toThrow("Mail delivery failed");
  expect(await approveCurrentRehearsalProposal(async () => {}, async () => false)).toBe(true);
});
it("a regional model rejection explains the provider failure and model setting instead of crashing on requestId", () => {
  expect(() => requireRehearsalRequest([denied], "google/gemini-3.8-flash")).toThrow(/not available in your region/);
  expect(() => requireRehearsalRequest([denied], "google/gemini-3.8-flash")).toThrow(/LLM_MODEL/);
});
it("a successful intake selects its request even when a triage card precedes it", () => {
  expect(requireRehearsalRequest([denied, { kind: "send_message", title: "Approve", requestId: "req_ok", payload: {} }], "test")).toBe("req_ok");
});
it("missing or incomplete intake output fails with an actionable stage message", () => {
  expect(() => requireRehearsalRequest([], "test")).toThrow(/intake/i);
  expect(() => requireRehearsalRequest([{kind:"send_message",title:"No request",payload:{}}], "test")).toThrow(/request/i);
});
it("open tasks, no tasks, or outstanding approvals cannot be reported as a successful rehearsal", () => {
  expect(() => assertRehearsalComplete([{title:"Director appointment",status:"open"}], [])).toThrow(/Director appointment/);
  expect(() => assertRehearsalComplete([], [])).toThrow(/no tasks/i);
  expect(() => assertRehearsalComplete([{title:"Director appointment",status:"done"}], [{title:"Approve reply"}])).toThrow(/Approve reply/);
  expect(() => assertRehearsalComplete([{title:"Director appointment",status:"done"}], [])).not.toThrow();
});
it("a rehearsal failure reports the real error, exits unsuccessfully and closes database pools", async () => {
  const close=vi.fn(async()=>{}), report=vi.fn();
  const code=await runRehearsal(async()=>{throw new Error("OpenRouter 403: region unavailable");},close,report);
  expect(code).toBe(1); expect(close).toHaveBeenCalledOnce(); expect(report).toHaveBeenCalledWith(expect.stringContaining("OpenRouter 403"));
});
it("a completed rehearsal closes database pools and exits successfully", async () => {
  const close=vi.fn(async()=>{}), report=vi.fn();
  expect(await runRehearsal(async()=>{},close,report)).toBe(0);
  expect(close).toHaveBeenCalledOnce(); expect(report).not.toHaveBeenCalled();
});
