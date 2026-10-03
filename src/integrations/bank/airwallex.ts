// Airwallex adapter (DECISIONS.md #27): Global Account deposits, matched by the app.
// Sandbox base URL defaults to api-demo.airwallex.com; set AIRWALLEX_BASE_URL if Airwallex
// has moved the sandbox host (their newer docs mention api.sandbox.airwallex.com).
import type { BankDeposit, BankProvider } from "../types";
import { bankAmountCents, bankTimestamp, validateBankDeposit } from "./validation";

type Fetch = typeof fetch;

export class AirwallexBank implements BankProvider {
  readonly name = "airwallex";
  readonly reconciliationWindowMs = 30 * 86400_000;
  private token: { value: string; expires: number } | null = null;
  constructor(private o: { clientId: string; apiKey: string; baseUrl: string; globalAccountId?: string | null; fetch?: Fetch }) {}
  private f(): Fetch { return this.o.fetch ?? fetch; }

  private globalAccountId(): string {
    const id = this.o.globalAccountId;
    if (!id || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error("AIRWALLEX_GLOBAL_ACCOUNT_ID must be a Global Account UUID. Use the id returned by GET /api/v1/global_accounts, not an acct_ account ID or bank account number.");
    }
    return id;
  }

  private async auth(): Promise<string> {
    if (this.token && this.token.expires > Date.now() + 60_000) return this.token.value;
    const r = await this.f()(`${this.o.baseUrl}/api/v1/authentication/login`, { method: "POST", headers: { "x-client-id": this.o.clientId, "x-api-key": this.o.apiKey, "Content-Type": "application/json" } });
    if (!r.ok) throw new Error(`Airwallex login failed: ${r.status} ${await r.text()}`);
    const j = await r.json() as { token: string; expires_at?: string };
    this.token = { value: j.token, expires: j.expires_at ? new Date(j.expires_at).getTime() : Date.now() + 25 * 60_000 };
    return j.token;
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const r = await this.f()(`${this.o.baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${await this.auth()}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error(`Airwallex ${method} ${path} failed: ${r.status} ${await r.text()}`);
    return r.json() as Promise<T>;
  }

  async listDeposits(since: Date | null): Promise<BankDeposit[]> {
    const q = new URLSearchParams({ page_num: "0", page_size: "100" });
    if (since) q.set("from_created_at", since.toISOString());
    const deposits: BankDeposit[] = [];
    const seen = new Set<string>();
    for (let page = 0; page < 10_000; page++) {
      q.set("page_num", String(page));
      const j = await this.call<{ items: Record<string, unknown>[]; has_more: boolean }>("GET", `/api/v1/deposits?${q}`);
      if (!Array.isArray(j.items) || typeof j.has_more !== "boolean") throw new Error("Airwallex deposit pagination is invalid");
      let progress = false;
      for (const d of j.items) {
        if (typeof d?.id !== "string" || !d.id) throw new Error("Airwallex deposit pagination contains an invalid provider identity");
        if (!seen.has(d.id)) progress = true;
        seen.add(d.id);
        if (d.status === "SETTLED") deposits.push(mapDeposit(d));
      }
      if (j.has_more && !progress) throw new Error("Airwallex deposit pagination made no progress (empty or repeated page); retry the feed, cursor retained");
      if (!j.has_more) return deposits;
    }
    throw new Error("Airwallex deposit pagination did not finish; cursor retained");
  }

  async simulateDeposit(d: { amountCents: number; currency: string; reference: string; payerName: string }): Promise<BankDeposit | null> {
    if (!this.o.globalAccountId) throw new Error("Set AIRWALLEX_GLOBAL_ACCOUNT_ID to simulate deposits");
    const globalAccountId = this.globalAccountId();
    const j = await this.call<Record<string, unknown>>("POST", "/api/v1/simulation/deposit/create", {
      global_account_id: globalAccountId, amount: d.amountCents / 100, currency: d.currency, reference: d.reference,
      payer_name: d.payerName, payer_bankname: "HSBC Hong Kong", payer_country: "HK", status: "SETTLED",
    });
    // The documented simulation response has create_time, not settled_at.
    // A pending simulation is not spendable and will be retrieved after settlement.
    return j.status === "SETTLED" ? depositFacts(j, bankTimestamp(j.create_time), bankTimestamp(j.create_time)) : null;
  }

  async accountDetails(): Promise<Record<string, string>> {
    if (!this.o.globalAccountId) return { "Account name": "Caine Road Corporate Services Limited", Note: "Airwallex Global Account not configured" };
    const a = await this.call<Record<string, unknown>>("GET", `/api/v1/global_accounts/${this.globalAccountId()}`);
    const inst = (a.institution ?? {}) as Record<string, string>;
    const out: Record<string, string> = {
      "Account name": String(a.account_name ?? ""),
      Bank: String(inst.name ?? "Airwallex"),
      "Account number": String(a.account_number ?? ""),
    };
    if (a.swift_code) out.SWIFT = String(a.swift_code);
    for (const rc of (a.account_routing_type ? [{ type: a.account_routing_type, value: a.account_routing_value }] : (a.routing_codes as { type: string; value: string }[] | undefined) ?? [])) out[String(rc.type).replace(/_/g, " ")] = String(rc.value);
    return out;
  }
}

export function mapDeposit(d: Record<string, unknown>): BankDeposit {
  if (d.status !== "SETTLED") throw new Error("Bank deposit is not settled");
  return depositFacts(d, bankTimestamp(d.settled_at), bankTimestamp(d.created_at));
}

function depositFacts(d: Record<string, unknown>, receivedAt: Date, createdAt: Date): BankDeposit {
  const deposit: BankDeposit = {
    providerTxId: d.id as string,
    amountCents: bankAmountCents(d.amount),
    currency: d.currency as string,
    reference: (d.reference ?? null) as string | null,
    payerName: (d.payer_name ?? (d.payer as Record<string, unknown> | undefined)?.name ?? null) as string | null,
    receivedAt, createdAt,
    raw: d,
  };
  validateBankDeposit(deposit);
  return deposit;
}
