import { emailBatch } from "./email-batches";
type Defaults = { model: string; reasoning: "none" | "low" | "medium" | "high" };
export function emailRun(args: string[], defaults: Defaults) {
  const value = (name: string) => {
    const index = args.indexOf(name);
    if (index < 0) return undefined;
    if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`Missing ${name} value`);
    return args[index + 1];
  };
  const batch = emailBatch(value("--batch") ?? "1");
  const model = value("--model") ?? defaults.model;
  const checkerEnabled = !args.includes("--no-jev");
  const outputDir = value("--output-dir") ?? batch.outputDir;
  const custom = args.includes("--model") || !checkerEnabled;
  if (!/^eval\/results\/[a-z0-9-]+$/.test(outputDir) || (custom && ["eval/results/emails-eval", "eval/results/emails-eval-2"].includes(outputDir))) throw new Error("Changed evaluations require a separate directory under eval/results");
  return { ...defaults, batch, model, checkerEnabled, outputDir };
}
export async function optionalEvidenceCheck<T>(enabled: boolean, check: () => Promise<T>): Promise<T | undefined> { return enabled ? check() : undefined; }
export function permitsEvalEndpoint(url: URL, checkerEnabled: boolean) {
  return url.origin === "https://openrouter.ai" && (url.pathname === "/api/v1/chat/completions" || (checkerEnabled && url.pathname === "/api/alpha/decisions"));
}
