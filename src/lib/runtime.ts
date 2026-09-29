// Builds a real runtime context (web app, worker, scripts) from the environment.
import path from "node:path";
import { getDb } from "@/db/client";
import { loadConfig, type Config } from "./config";
import { systemClock } from "./clock";
import { randomIds } from "./ids";
import { Crypto } from "./crypto";
import type { Ctx } from "./ctx";
import { OpenRouterLlm } from "@/integrations/llm/openrouter";
import { ScriptedLlm } from "@/integrations/llm/scripted";
import { E2eLlm } from "@/integrations/llm/e2e";
import { DiskStorage } from "@/integrations/storage";
import { FakeMail } from "@/integrations/mail/fake";
import { FakeBank } from "@/integrations/bank/fake";
import { FakeAccounting } from "@/integrations/accounting/fake";
import { FakeScreening } from "@/integrations/screening/fake";
import { FileList } from "@/integrations/json-store";
import { AirwallexBank } from "@/integrations/bank/airwallex";
import { XeroMcpAccounting } from "@/integrations/accounting/xero-mcp";
import { OpenSanctionsApi } from "@/integrations/screening/opensanctions-api";
import { LocalOpenSanctions } from "@/integrations/screening/opensanctions-local";
import { LazyMail } from "@/integrations/mail/lazy";
import { GmailMail, gmailOAuthClient } from "@/integrations/mail/gmail";
import { AgentMailMail } from "@/integrations/mail/agentmail";
import { getSecret } from "@/domain/secrets";
import { kvGet } from "@/domain/kv";
import type { AccountingProvider, BankProvider, MailProvider, ScreeningProvider } from "@/integrations/types";

const g = globalThis as unknown as { __hlAdapters?: Record<string, unknown> };

export const STORAGE_ROOT = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : path.join(process.cwd(), "storage");

export function makeRuntimeCtx(overrides: Partial<Config> = {}): Ctx {
  const config = { ...loadConfig(), ...overrides };
  g.__hlAdapters ??= {};
  const cache = g.__hlAdapters;
  const once = <T>(k: string, f: () => T): T => (cache[k] ??= f()) as T;
  const storage = new DiskStorage(STORAGE_ROOT);
  const llm = config.llmMode === "e2e" ? new E2eLlm() : config.llmMode === "live" && config.or_api_key ? new OpenRouterLlm(config.or_api_key, config.LLM_MODEL, config.APP_URL, config.LLM_REASONING) : new ScriptedLlm();
  return {
    db: getDb(config.DATABASE_URL),
    firmId: config.FIRM_ID,
    config,
    clock: systemClock,
    ids: randomIds,
    crypto: new Crypto(config.APP_SECRET),
    llm,
    mail: once<MailProvider>(`mail:${config.mailProvider}`, () => makeMail(config)),
    bank: once<BankProvider>(`bank:${config.bankProvider}`, () => makeBank(config)),
    accounting: once<AccountingProvider>(`acct:${config.accountingProvider}`, () => makeAccounting(config)),
    screening: once<ScreeningProvider>(`scr:${config.screeningProvider}`, () => makeScreening(config)),
    storage,
    userId: "user_ky",
  };
}

// Real adapters are wired in as their milestones land; until then the fakes persist to disk
// so the web app and worker share state in offline demo mode.
function makeMail(config: Config): MailProvider {
  if (config.mailProvider === "gmail") {
    return new LazyMail("gmail", config.GMAIL_ADDRESS ?? "", async () => {
      const ctx = makeRuntimeCtx();
      const token = await getSecret(ctx, "gmail.refresh_token", "poll and send mail");
      if (!token) throw new Error("Gmail is not connected yet. Open Settings, Integrations, and connect the mailbox.");
      const auth = gmailOAuthClient(config.GOOGLE_CLIENT_ID!, config.GOOGLE_CLIENT_SECRET!, `${config.APP_URL}/api/integrations/gmail/callback`);
      auth.setCredentials({ refresh_token: token });
      const address = config.GMAIL_ADDRESS ?? (await kvGet<string>(ctx, "gmail.address")) ?? "";
      return new GmailMail(address, auth);
    });
  }
  if (config.mailProvider === "agentmail") return new AgentMailMail(config.AGENTMAIL_API_KEY!, config.AGENTMAIL_INBOX!);
  return new FakeMail("desk@caineroad.example", new FileList(path.join(STORAGE_ROOT, "fake/inbox.json")), new FileList(path.join(STORAGE_ROOT, "fake/outbox.json")));
}
function makeBank(config: Config): BankProvider {
  if (config.bankProvider === "airwallex") return new AirwallexBank({ clientId: config.AIRWALLEX_CLIENT_ID!, apiKey: config.AIRWALLEX_API_KEY!, baseUrl: config.AIRWALLEX_BASE_URL, globalAccountId: config.AIRWALLEX_GLOBAL_ACCOUNT_ID });
  return new FakeBank(new FileList(path.join(STORAGE_ROOT, "fake/deposits.json")));
}
function makeAccounting(config: Config): AccountingProvider {
  if (config.accountingProvider === "xero") {
    const env: Record<string, string> = {};
    for (const k of ["XERO_CLIENT_ID", "XERO_CLIENT_SECRET", "XERO_CLIENT_BEARER_TOKEN", "XERO_SCOPES"] as const) { const v = (config as Record<string, unknown>)[k] ?? process.env[k]; if (v) env[k] = String(v); }
    return new XeroMcpAccounting({ env, salesAccountCode: config.XERO_SALES_ACCOUNT_CODE, bankAccountCode: config.XERO_BANK_ACCOUNT_CODE });
  }
  return new FakeAccounting();
}
function makeScreening(config: Config): ScreeningProvider {
  if (config.screeningProvider === "opensanctions-api") return new OpenSanctionsApi(config.OPENSANCTIONS_API_KEY!);
  if (config.screeningProvider === "opensanctions-local") return new LocalOpenSanctions(path.join(STORAGE_ROOT, "opensanctions/targets.simple.csv"));
  return new FakeScreening();
}
