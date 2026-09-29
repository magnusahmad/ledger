// Scripted LLM for tests: each agent gets a responder that returns recorded JSON.
// Tests never depend on a live model call (AGENTS.md).
import type { LlmProvider, LlmRequest, LlmResponse } from "../types";

export type Responder = (req: LlmRequest, call: number) => unknown;

export class ScriptedLlm implements LlmProvider {
  readonly name = "scripted";
  private responders = new Map<string, Responder[]>();
  calls: LlmRequest[] = [];
  on(agent: string, r: Responder | unknown) {
    const fn: Responder = typeof r === "function" ? (r as Responder) : () => r;
    const list = this.responders.get(agent) ?? [];
    list.push(fn);
    this.responders.set(agent, list);
    return this;
  }
  /** Replace all responders for an agent. */
  set(agent: string, r: Responder | unknown) { this.responders.delete(agent); return this.on(agent, r); }
  async complete(req: LlmRequest): Promise<LlmResponse> {
    this.calls.push(req);
    const list = this.responders.get(req.agent);
    if (!list || list.length === 0) throw new Error(`ScriptedLlm: no responder for agent "${req.agent}"`);
    const n = this.calls.filter((c) => c.agent === req.agent).length;
    // Use responders in order; the last one repeats.
    const fn = list[Math.min(n - 1, list.length - 1)];
    const json = fn(req, n);
    return { json, raw: JSON.stringify(json), model: "scripted" };
  }
  callsFor(agent: string) { return this.calls.filter((c) => c.agent === agent); }
}
