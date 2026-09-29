// Product LLM via OpenRouter (DECISIONS.md #22). Only the running product uses this.
import type { LlmProvider, LlmRequest, LlmResponse } from "../types";

export class OpenRouterLlm implements LlmProvider {
  readonly name = "openrouter";
  constructor(private apiKey: string, private model: string, private appUrl = "http://localhost:3000") {}

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const body = {
      model: this.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.2,
      response_format: {
        type: "json_schema",
        json_schema: { name: req.schemaName, strict: true, schema: req.schema },
      },
    };
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": this.appUrl,
            "X-Title": "Harbourline Desk",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(90_000),
        });
        if (res.status === 429 || res.status >= 500) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
        if (!res.ok) throw Object.assign(new Error(`OpenRouter ${res.status}: ${await res.text()}`), { fatal: true });
        const data = await res.json() as {
          choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number }; model?: string; error?: { message: string };
        };
        if (data.error) throw new Error(`OpenRouter error: ${data.error.message}`);
        const raw = data.choices?.[0]?.message?.content ?? "";
        return {
          json: parseJsonLoose(raw),
          raw,
          tokensIn: data.usage?.prompt_tokens,
          tokensOut: data.usage?.completion_tokens,
          model: data.model ?? this.model,
        };
      } catch (e) {
        lastErr = e;
        if ((e as { fatal?: boolean }).fatal) break;
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
    throw lastErr;
  }
}

/** Accepts plain JSON or JSON wrapped in a markdown fence. */
export function parseJsonLoose(raw: string): unknown {
  const t = raw.trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch { /* fall through */ } }
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if (i >= 0 && j > i) { try { return JSON.parse(t.slice(i, j + 1)); } catch { /* fall through */ } }
  return null;
}
