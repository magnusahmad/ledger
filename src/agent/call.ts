// Every product LLM call goes through here: structured output, zod validation,
// one repair retry, and a row in llm_call for the task timeline and audit.
import { z } from "zod";
import type { Ctx } from "@/lib/ctx";
import { llmCall } from "@/db/schema";
import type { LlmMessage } from "@/integrations/types";

export class AgentError extends Error {
  constructor(message: string, readonly agent: string, readonly raw?: unknown) { super(message); }
}

export function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  const js = z.toJSONSchema(schema, { target: "draft-7", unrepresentable: "any" }) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

export async function callAgent<T extends z.ZodType>(ctx: Ctx, opts: {
  agent: string;
  system: string;
  user: string | LlmMessage["content"];
  schema: T;
  taskId?: string | null;
  messageId?: string | null;
  temperature?: number;
}): Promise<z.infer<T>> {
  const messages: LlmMessage[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user } as LlmMessage,
  ];
  const jsonSchema = jsonSchemaOf(opts.schema);
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    let raw: unknown = null;
    try {
      const res = await ctx.llm.complete({ agent: opts.agent, messages, schema: jsonSchema, schemaName: opts.agent.replace(/\W/g, "_"), temperature: opts.temperature });
      raw = res.json;
      const parsed = opts.schema.safeParse(res.json);
      await ctx.db.insert(llmCall).values({
        id: ctx.ids.next("llm"), firmId: ctx.firmId, agent: opts.agent, model: res.model,
        input: { messages: messages.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content.slice(0, 20000) : "[multimodal]" })) },
        output: res.json as object, error: parsed.success ? null : parsed.error.message.slice(0, 2000),
        latencyMs: Date.now() - started, tokensIn: res.tokensIn ?? null, tokensOut: res.tokensOut ?? null,
        taskId: opts.taskId ?? null, messageId: opts.messageId ?? null, at: ctx.clock.now(),
      });
      if (parsed.success) return parsed.data;
      lastError = parsed.error.message;
      messages.push({ role: "assistant", content: res.raw || JSON.stringify(res.json) });
      messages.push({ role: "user", content: `Your JSON did not match the required schema. Errors:\n${lastError.slice(0, 3000)}\nReturn corrected JSON only.` });
    } catch (e) {
      lastError = (e as Error).message;
      await ctx.db.insert(llmCall).values({
        id: ctx.ids.next("llm"), firmId: ctx.firmId, agent: opts.agent, model: ctx.config.LLM_MODEL, input: null, output: raw as object,
        error: lastError.slice(0, 2000), latencyMs: Date.now() - started, taskId: opts.taskId ?? null, messageId: opts.messageId ?? null, at: ctx.clock.now(),
      });
      if (attempt === 1) break;
    }
  }
  throw new AgentError(`Agent ${opts.agent} failed: ${lastError.slice(0, 500)}`, opts.agent);
}
