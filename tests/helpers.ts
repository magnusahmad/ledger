import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { loadConfig } from "@/lib/config";
import { FixedClock } from "@/lib/clock";
import { SeqIds } from "@/lib/ids";
import { Crypto } from "@/lib/crypto";
import type { Ctx } from "@/lib/ctx";
import { FakeMail } from "@/integrations/mail/fake";
import { FakeBank } from "@/integrations/bank/fake";
import { FakeAccounting } from "@/integrations/accounting/fake";
import { FakeScreening } from "@/integrations/screening/fake";
import { ScriptedLlm } from "@/integrations/llm/scripted";
import { MemoryStorage } from "@/integrations/storage";
import * as schema from "@/db/schema";

export const TEST_DB = "postgres://localhost/harbourline_test";

export type TestCtx = Ctx & {
  clock: FixedClock; llm: ScriptedLlm; mail: FakeMail; bank: FakeBank; accounting: FakeAccounting;
  screening: FakeScreening; storage: MemoryStorage;
};

export async function resetDb() {
  const db = getDb(TEST_DB);
  const tables = Object.values(schema)
    .filter((t): t is typeof schema.firm => typeof t === "object" && t !== null && Symbol.for("drizzle:Name") in t)
    .map((t) => `"${(t as unknown as Record<symbol, string>)[Symbol.for("drizzle:Name")]}"`);
  await db.execute(sql.raw(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
}

export function makeCtx(opts: { now?: string } = {}): TestCtx {
  const config = loadConfig({ DATABASE_URL: TEST_DB, LLM_MODE: "fixture", MAIL_PROVIDER: "fake" });
  const clock = new FixedClock(new Date(opts.now ?? "2026-09-29T02:00:00Z"));
  return {
    db: getDb(TEST_DB),
    firmId: "firm_crcs",
    config: { ...config, screeningProvider: "fake", bankProvider: "fake", accountingProvider: "fake" },
    clock,
    ids: new SeqIds(),
    crypto: new Crypto(config.APP_SECRET),
    llm: new ScriptedLlm(),
    mail: new FakeMail(),
    bank: new FakeBank(undefined, () => clock.now()),
    accounting: new FakeAccounting(),
    screening: new FakeScreening(),
    storage: new MemoryStorage(),
    userId: "user_ky",
  };
}
