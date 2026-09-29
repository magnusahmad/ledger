import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { loadConfig } from "@/lib/config";
import { makeCtx } from "./helpers";

describe("M0 scaffold", () => {
  it("config picks the fake mail provider when neither Gmail nor AgentMail keys are present", () => {
    expect(loadConfig({}).mailProvider).toBe("fake");
  });

  it("config picks Gmail when OAuth client keys are present, and AgentMail as the fallback", () => {
    expect(loadConfig({ GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b", AGENTMAIL_API_KEY: "c" }).mailProvider).toBe("gmail");
    expect(loadConfig({ AGENTMAIL_API_KEY: "c", AGENTMAIL_INBOX: "desk@agentmail.to" }).mailProvider).toBe("agentmail");
  });

  it("bank and accounting stay fake until their credentials are supplied", () => {
    const c = loadConfig({});
    expect(c.bankProvider).toBe("fake");
    expect(c.accountingProvider).toBe("fake");
    expect(loadConfig({ AIRWALLEX_CLIENT_ID: "x", AIRWALLEX_API_KEY: "y" }).bankProvider).toBe("airwallex");
  });

  it("the product LLM defaults to google/gemini-3.8-flash on OpenRouter", () => {
    const c = loadConfig({ or_api_key: "k" });
    expect(c.LLM_MODEL).toBe("google/gemini-3.8-flash");
    expect(c.llmMode).toBe("live");
  });

  it("the test database migrates from empty and every table except firm itself carries firm_id", async () => {
    const ctx = makeCtx();
    const res = await ctx.db.execute(sql`
      select table_name from information_schema.tables t
      where table_schema = 'public' and table_name <> 'firm' and not exists (
        select 1 from information_schema.columns c
        where c.table_name = t.table_name and c.column_name = 'firm_id')`);
    expect(res.rows).toEqual([]);
    const count = await ctx.db.execute(sql`select count(*)::int as n from information_schema.tables where table_schema='public'`);
    expect((count.rows[0] as { n: number }).n).toBeGreaterThan(30);
  });
});
