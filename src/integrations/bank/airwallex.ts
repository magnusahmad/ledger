// Airwallex adapter (DECISIONS.md #27): Global Account deposits, matched by the app.
// Sandbox base URL defaults to api-demo.airwallex.com; set AIRWALLEX_BASE_URL if Airwallex
// has moved the sandbox host (their newer docs mention api.sandbox.airwallex.com).
import type { BankDeposit, BankProvider } from "../types";

type Fetch = typeof fetch;

export class AirwallexBank implements BankProvider {
  readonly name = "airwallex";
  private token: { value: string; expires: number } | null = null;
  constructor(private o: { clientId: string; apiKey: string; baseUrl: string; globalAccountId?: string | null; fetch?: Fetch }) {}
  private f(): Fetch { return this.o.fetch ?? fetch; }

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
    const j = await this.call<{ items: Record<string, unknown>[] }>("GET", `/api/v1/deposits?${q}`);
    return (j.items ?? []).filter((d) => !d.status || d.status === "SETTLED").map(mapDeposit);
  }

  async simulateDeposit(d: { amountCents: number; currency: string; reference: string; payerName: string }): Promise<BankDeposit | null> {
    if (!this.o.globalAccountId) throw new Error("Set AIRWALLEX_GLOBAL_ACCOUNT_ID to simulate deposits");
    const j = await this.call<Record<string, unknown>>("POST", "/api/v1/simulation/deposit/create", {
      global_account_id: this.o.globalAccountId, amount: d.amountCents / 100, currency: d.currency, reference: d.reference,
      payer_name: d.payerName, payer_bankname: "HSBC Hong Kong", payer_country: "HK", status: "SETTLED",
    });
    return mapDeposit(j);
  }

  async accountDetails(): Promise<Record<string, string>> {
    if (!this.o.globalAccountId) return { "Account name": "Caine Road Corporate Services Limited", Note: "Airwallex Global Account not configured" };
    const a = await this.call<Record<string, unknown>>("GET", `/api/v1/global_accounts/${this.o.globalAccountId}`);
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
  const amount = Number(d.amount ?? 0);
  return {
    providerTxId: String(d.id),
    amountCents: Math.round(amount * 100),
    currency: String(d.currency ?? "HKD"),
    reference: (d.reference as string) ?? null,
    payerName: (d.payer_name as string) ?? ((d.payer as Record<string, string> | undefined)?.name ?? null),
    receivedAt: new Date(String(d.create_time ?? d.created_at ?? new Date().toISOString())),
    raw: d,
  };
}
