// The context every service receives: database, firm, clock and integrations.
import type { Db } from "@/db/client";
import type { Config } from "./config";
import type { Clock } from "./clock";
import type { Ids } from "./ids";
import { Crypto } from "./crypto";
import type { AccountingProvider, BankProvider, LlmProvider, MailProvider, ScreeningProvider, Storage } from "@/integrations/types";

export type Ctx = {
  db: Db;
  firmId: string;
  config: Config;
  clock: Clock;
  ids: Ids;
  crypto: Crypto;
  llm: LlmProvider;
  mail: MailProvider;
  bank: BankProvider;
  accounting: AccountingProvider;
  screening: ScreeningProvider;
  storage: Storage;
  /** The signed-in user (single demo user in this build). */
  userId: string;
};
