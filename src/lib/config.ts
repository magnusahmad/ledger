// Typed environment. Each integration is "real" only when its keys are present;
// otherwise the fake adapter is used (BUILD_SPEC.md §2: credentials never block).
import { z } from "zod";
import { installationProfile, type Installation } from "./installation";

const Env = z.object({
  DATABASE_URL: z.string().default("postgres://localhost/clerk"),
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
  /** Where the firm keeps client records, master first ({server} = the server root). */
  MAILROOM_CLIENT_SOURCES: z.string().default("seed/mailroom/client-sources.json"),
  MAILROOM_FIRM_NAME: z.string().default("XYZ CPA"),
  MAILROOM_FROM: z.string().default("mail@xyzcpa.example"),
  /** 1: save live model answers for the mail room as replayable fixtures (fictional letters only). */
  MAILROOM_RECORD: z.enum(["0", "1"]).default("0"),
  /** 0: never answer from recordings, so every scan goes to the live model (live demos). */
  MAILROOM_REPLAY: z.enum(["0", "1"]).default("1"),
  /** "production" for a firm installation: refuses demo and fixture parts (DECISIONS.md #56). */
  INSTALLATION: z.enum(["dev", "production"]).default("dev"),
  /** The client this installation is for: a folder under clients/ (DECISIONS.md #65). Its profile
   *  supplies the modules and the client's own data files; anything set here overrides it. */
  INSTALLATION_PROFILE: z.string().optional(),
  /** Comma-separated modules this installation loads (src/lib/modules.ts); empty = all. */
  MODULES: z.string().optional(),
  /** Staff sign-in. Defaults on in production, off for the single-user development build. */
  AUTH: z.enum(["0", "1"]).optional(),
  /** Annual module. Team mailboxes read through Microsoft Graph, comma-separated. */
  PILOT_MAILBOXES: z.string().default(""),
  FIRM_EMAIL_DOMAINS: z.string().default(""),
  MAIL_LOOKBACK_DAYS: z.coerce.number().default(60),
  GRAPH_TENANT_ID: z.string().optional(),
  GRAPH_CLIENT_ID: z.string().optional(),
  GRAPH_CLIENT_SECRET: z.string().optional(),
  GRAPH_PRIVATE_KEY_FILE: z.string().optional(),
  /** The same key as PEM text, set by deploy/windows/run-service.ps1 from the DPAPI-protected secrets. */
  GRAPH_PRIVATE_KEY_PEM: z.string().optional(),
  GRAPH_CERT_THUMBPRINT: z.string().optional(),
  /** Read-only connection to the restored CSA copy, its mapping file and the restore status file. */
  CSA_SQL_CONNECTION: z.string().optional(),
  CSA_MAPPING_FILE: z.string().optional(),
  CSA_RESTORE_STATUS_FILE: z.string().optional(),
  /** UNC path of the share mapped as F:, and the share folder for the status workbook and log. */
  FILING_ROOT: z.string().optional(),
  /** The firm's own naming on its share and its own email wording: set by the installation
   *  profile, with no default, so one firm's files are never used for another. */
  FILING_RULES: z.string().optional(),
  STATUS_DIR: z.string().optional(),
  DISPATCH_TEMPLATE: z.string().optional(),
  ANNUAL_WINDOW_DAYS: z.coerce.number().default(60),
  ANNUAL_POLL_MS: z.coerce.number().default(300_000),
  /** 1: the model reads client replies on annual-return cases and proposes; staff review everything. */
  AR_REPLY_READER: z.enum(["0", "1"]).default("0"),
});

export type Config = z.infer<typeof Env> & {
  llmMode: "live" | "fixture" | "e2e";
  mailProvider: "gmail" | "agentmail" | "fake";
  bankProvider: "airwallex" | "fake";
  accountingProvider: "xero" | "fake";
  screeningProvider: "opensanctions-api" | "opensanctions-local" | "fake";
  demoTools: boolean;
  authRequired: boolean;
};

export function loadConfig(env: Record<string, string | undefined> = process.env, registry?: Record<string, Installation>): Config {
  const profile = env.INSTALLATION_PROFILE ? installationProfile(env.INSTALLATION_PROFILE, registry) : null;
  const set = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined));
  const e = Env.parse(profile ? { MODULES: profile.modules.join(","), ...profile.settings, ...set } : set);
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
    demoTools: e.DEMO_TOOLS ? e.DEMO_TOOLS === "1" : env.NODE_ENV !== "production" && e.INSTALLATION !== "production",
    authRequired: e.AUTH ? e.AUTH === "1" : e.INSTALLATION === "production",
  };
}
