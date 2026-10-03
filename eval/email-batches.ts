import { EMAIL_CASES, type EmailCase } from "./email-cases";
import { EMAIL_CASES_2 } from "./email-cases-2";
import { EMAIL_CASES_3 } from "./email-cases-3";
export type EmailBatch = { id: "1" | "2" | "3"; outputDir: string; cases: EmailCase[] };
export function emailBatch(id: string = "1"): EmailBatch {
  if (id === "1") return { id, outputDir: "eval/results/emails-eval", cases: EMAIL_CASES };
  if (id === "2") return { id, outputDir: "eval/results/emails-eval-2", cases: EMAIL_CASES_2 };
  if (id === "3") return { id, outputDir: "eval/results/emails-eval-3-gemini", cases: EMAIL_CASES_3 };
  throw new Error(`Unknown email evaluation batch: ${id}`);
}
