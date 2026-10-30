// Typed environment. Each integration is "real" only when its keys are present;
// otherwise the fake adapter is used (BUILD_SPEC.md §2: credentials never block).
import { z } from "zod";

const Env = z.object({
  DATABASE_URL: z.string().default("postgres://localhost/harbourline"),
  APP_SECRET: z.string().min(32).default("dev-only-secret-change-me-dev-only-secret"),
  APP_URL: z.string().default("http://localhost:3000"),
  FIRM_ID: z.string().default("firm_crcs"),
  or_api_key: z.string().optional(),
  LLM_MODEL: z.string().default("google/gemini-3.8-flash"),
  LLM_MODE: z.enum(["live", "fixture", "e2e"]).optional(),
  STORAGE_DIR: z.string().optional(),
  SCREENING_PROVIDER: z.enum(["opensanctions-api", "opensanctions-local", "fake"]).optional(),
  LLM_REASONING: z.enum(["none", "low", "medium", "high"]).default("low"),
  MAIL_PROVIDER: z.enum(["gmail", "agentmail", "fake"]).optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GMAIL_ADDRESS: z.string().optional(),
  AGENTMAIL_API_KEY: z.string().optional(),
  AGENTMAIL_INBOX: z.string().optional(),
  AIRWALLEX_CLIENT_ID: z.string().optional(),
  AIRWALLEX_API_KEY: z.string().optional(),
  AIRWALLEX_BASE_URL: z.string().default("https://api-demo.airwallex.com"),
  AIRWALLEX_GLOBAL_ACCOUNT_ID: z.string().optional(),
  XERO_CLIENT_ID: z.string().optional(),
  XERO_CLIENT_SECRET: z.string().optional(),
  XERO_CLIENT_BEARER_TOKEN: z.string().optional(),
  XERO_SALES_ACCOUNT_CODE: z.string().default("200"),
  XERO_BANK_ACCOUNT_CODE: z.string().default("090"),
  OPENSANCTIONS_API_KEY: z.string().optional(),
  DEMO_EXISTING_CLIENT_EMAIL: z.string().optional(),
  POLL_INTERVAL_MS: z.coerce.number().default(5000),
  /** Demo tools (demo panel actions such as the clock). Default: on except in production builds. */
  DEMO_TOOLS: z.enum(["0", "1"]).optional(),
  /** Mail room (inbound post). Folders default under storage/mailroom for the demo. */
  MAILROOM_SCAN_DIR: z.string().optional(),
  MAILROOM_SERVER_DIR: z.string().optional(),
  MAILROOM_DRAFTS: z.enum(["eml", "gmail"]).default("eml"),
  MAILROOM_DRAFTS_DIR: z.string().optional(),
  MAILROOM_RULES: z.string().default("seed/mailroom/rules.json"),
  MAILROOM_FIRM_NAME: z.string().default("CWC CPA"),
  MAILROOM_FROM: z.string().default("mail@cwccpa.example"),
  /** 1: save live model answers for the mail room as replayable fixtures (fictional letters only). */
  MAILROOM_RECORD: z.enum(["0", "1"]).default("0"),
});

export type Config = z.infer<typeof Env> & {
  llmMode: "live" | "fixture" | "e2e";
  mailProvider: "gmail" | "agentmail" | "fake";
  bankProvider: "airwallex" | "fake";
  accountingProvider: "xero" | "fake";
  screeningProvider: "opensanctions-api" | "opensanctions-local" | "fake";
  demoTools: boolean;
};

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const e = Env.parse(env);
  const gmailReady = !!(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
  const agentmailReady = !!(e.AGENTMAIL_API_KEY && e.AGENTMAIL_INBOX);
  const mailProvider =
    e.MAIL_PROVIDER ?? (gmailReady ? "gmail" : agentmailReady ? "agentmail" : "fake");
  return {
    ...e,
    llmMode: e.LLM_MODE ?? (e.or_api_key ? "live" : "fixture"),
    mailProvider,
    bankProvider: e.AIRWALLEX_CLIENT_ID && e.AIRWALLEX_API_KEY ? "airwallex" : "fake",
    accountingProvider:
      (e.XERO_CLIENT_ID && e.XERO_CLIENT_SECRET) || e.XERO_CLIENT_BEARER_TOKEN ? "xero" : "fake",
    screeningProvider: e.SCREENING_PROVIDER ?? (e.OPENSANCTIONS_API_KEY ? "opensanctions-api" : "opensanctions-local"),
    demoTools: e.DEMO_TOOLS ? e.DEMO_TOOLS === "1" : env.NODE_ENV !== "production",
  };
}
