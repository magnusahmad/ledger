import { describe, it, expect } from "vitest";
import { AirwallexBank, mapDeposit } from "@/integrations/bank/airwallex";
import { XeroMcpAccounting, parseBlocks, parseField } from "@/integrations/accounting/xero-mcp";

function fakeFetch(routes: Record<string, (init?: RequestInit) => unknown>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(routes[key](init)), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe("Airwallex adapter (recorded API shapes)", () => {
  it.each(["acct_wrongAccountId", "ga_1", "not-a-uuid"])("payment instructions reject an invalid Global Account ID (%s) before calling Airwallex", async (globalAccountId) => {
    const { f, calls } = fakeFetch({ "/authentication/login": () => ({ token: "t" }), "/global_accounts/": () => ({ account_name: "Demo firm", account_number: "12345678" }) });
    const bank = new AirwallexBank({ clientId: "c", apiKey: "k", baseUrl: "https://x", globalAccountId, fetch: f });
    await expect(bank.accountDetails()).rejects.toThrow(/AIRWALLEX_GLOBAL_ACCOUNT_ID.*UUID.*GET \/api\/v1\/global_accounts/);
    expect(calls).toHaveLength(0);
  });

  it("sandbox deposit simulation rejects an invalid Global Account ID before calling Airwallex", async () => {
    const { f, calls } = fakeFetch({ "/authentication/login": () => ({ token: "t" }), "/simulation/deposit/create": () => ({ id: "dep_9", amount: 1500 }) });
    const bank = new AirwallexBank({ clientId: "c", apiKey: "k", baseUrl: "https://x", globalAccountId: "acct_wrongAccountId", fetch: f });
    await expect(bank.simulateDeposit({ amountCents: 150000, currency: "HKD", reference: "CRCS-2026-0007", payerName: "Investor" })).rejects.toThrow(/AIRWALLEX_GLOBAL_ACCOUNT_ID.*UUID/);
    expect(calls).toHaveLength(0);
  });

  it("payment instructions retrieve the configured Global Account UUID and preserve bank routing details", async () => {
    const id = "7f687fe6-dcf4-4462-92fa-80335301d9d2";
    const { f, calls } = fakeFetch({ "/authentication/login": () => ({ token: "t" }), [`/global_accounts/${id}`]: () => ({ account_name: "Demo firm", account_number: "12345678", institution: { name: "DBS Bank" }, swift_code: "DHBKHKHH", routing_codes: [{ type: "bank_code", value: "016" }, { type: "branch_code", value: "478" }] }) });
    const bank = new AirwallexBank({ clientId: "c", apiKey: "k", baseUrl: "https://x", globalAccountId: id, fetch: f });
    expect(await bank.accountDetails()).toEqual({ "Account name": "Demo firm", Bank: "DBS Bank", "Account number": "12345678", SWIFT: "DHBKHKHH", "bank code": "016", "branch code": "478" });
    expect(calls.at(-1)?.url).toBe(`https://x/api/v1/global_accounts/${id}`);
  });

  it("logs in once, reuses the token, and maps settled deposits to cents", async () => {
    const { f, calls } = fakeFetch({
      "/authentication/login": () => ({ token: "tok-1", expires_at: new Date(Date.now() + 1800_000).toISOString() }),
      // Retrieval uses created_at/settled_at; create_time belongs to the
      // distinct sandbox simulation response documented below.
      "/deposits": () => ({ has_more: false, items: [
        { id: "dep_1", amount: 1800.5, currency: "HKD", reference: "CRCS-2026-0001", payer: { name: "SILVERSTRAND" }, status: "SETTLED", created_at: "2026-09-29T02:00:00Z", settled_at: "2026-09-29T02:05:00Z" },
        { id: "dep_2", amount: 99, currency: "HKD", reference: "x", payer: { name: "y" }, status: "PENDING", created_at: "2026-09-29T02:00:00Z" },
      ] }),
    });
    const bank = new AirwallexBank({ clientId: "cid", apiKey: "key", baseUrl: "https://api-demo.airwallex.com", fetch: f });
    const d1 = await bank.listDeposits(null);
    await bank.listDeposits(new Date("2026-09-29T00:00:00Z"));
    expect(d1).toEqual([expect.objectContaining({ providerTxId: "dep_1", amountCents: 180050, reference: "CRCS-2026-0001", payerName: "SILVERSTRAND" })]);
    expect(calls.filter((c) => c.url.includes("login"))).toHaveLength(1);
    expect(calls[0].init?.headers).toMatchObject({ "x-client-id": "cid", "x-api-key": "key" });
    expect(calls[2].url).toContain("from_created_at=2026-09-29T00%3A00%3A00.000Z");
  });

  it("a simulated sandbox deposit sends the invoice number as the reference to the configured Global Account", async () => {
    // Official POST simulation/deposit/create response has create_time and
    // status, not settled_at; keep this supported variant distinct from GET.
    const { f, calls } = fakeFetch({ "/authentication/login": () => ({ token: "t" }), "/simulation/deposit/create": (init) => ({ id: "dep_9", ...JSON.parse(String(init!.body)), create_time: "2026-09-29T03:00:00Z" }) });
    const bank = new AirwallexBank({ clientId: "c", apiKey: "k", baseUrl: "https://x", globalAccountId: "7f687fe6-dcf4-4462-92fa-80335301d9d2", fetch: f });
    const d = await bank.simulateDeposit({ amountCents: 150000, currency: "HKD", reference: "CRCS-2026-0007", payerName: "Investor" });
    const body = JSON.parse(String(calls[1].init!.body));
    expect(body).toMatchObject({ global_account_id: "7f687fe6-dcf4-4462-92fa-80335301d9d2", amount: 1500, reference: "CRCS-2026-0007", payer_name: "Investor" });
    expect(d).toMatchObject({ amountCents: 150000, providerTxId: "dep_9" });
  });

  it("mapDeposit tolerates the alternative payer shape", () => {
    expect(mapDeposit({ id: "a", amount: 10, currency: "HKD", payer: { name: "P" }, status: "SETTLED", created_at: "2026-01-01T00:00:00Z", settled_at: "2026-01-01T00:01:00Z" })).toMatchObject({ amountCents: 1000, payerName: "P" });
  });
});

describe("Xero MCP adapter (recorded tool output)", () => {
  const listContacts = "Found 1 contacts:\nContact: Kowloon Bay Trading Limited\nID: c-123\nStatus: ACTIVE\n";
  it("reuses an existing Xero contact by exact name, otherwise creates one", async () => {
    const calls: string[] = [];
    const x = new XeroMcpAccounting({ env: {}, salesAccountCode: "200", bankAccountCode: "090", authorise: async () => {}, callTool: async (name) => {
      calls.push(name);
      if (name === "list-contacts") return listContacts;
      if (name === "create-contact") return "Contact created: New Co (ID: c-999)\nLink to view: https://go.xero.com/x";
      return "";
    } });
    expect(await x.upsertContact("Kowloon Bay Trading Limited")).toBe("c-123");
    expect(await x.upsertContact("New Co")).toBe("c-999");
    expect(calls).toEqual(["list-contacts", "list-contacts", "create-contact"]);
  });

  it("creates the invoice with our number as the reference, one line per fee in dollars, then authorises it", async () => {
    let args: Record<string, unknown> = {};
    const authorised: string[] = [];
    const x = new XeroMcpAccounting({ env: {}, salesAccountCode: "200", bankAccountCode: "090", authorise: async (id) => { authorised.push(id); }, callTool: async (name, a) => {
      if (name === "create-invoice") { args = a; return "Invoice created successfully:\nID: inv-555\nContact: K\nType: ACCREC\nStatus: DRAFT"; }
      return "";
    } });
    const id = await x.createInvoice({ contactName: "K", number: "CRCS-2026-0001", issuedOn: "2026-09-29", dueOn: "2026-10-29", currency: "HKD", lines: [{ description: "Appoint a director", amountCents: 180000 }] }, "c-1");
    expect(id).toBe("inv-555");
    expect(args).toMatchObject({ contactId: "c-1", type: "ACCREC", reference: "CRCS-2026-0001", lineItems: [{ description: "Appoint a director", quantity: 1, unitAmount: 1800, accountCode: "200" }] });
    expect(authorised).toEqual(["inv-555"]);
  });

  it("finds an invoice by number and records a payment against the bank account with the configured code", async () => {
    const x = new XeroMcpAccounting({ env: {}, salesAccountCode: "200", bankAccountCode: "090", authorise: async () => {}, callTool: async (name, a) => {
      if (name === "list-invoices") return "Found 1 invoices:\nInvoice ID: inv-555\nInvoice: CRCS-2026-0001\nStatus: AUTHORISED\n";
      if (name === "list-accounts") return "Found 2 accounts:\nAccount: Sales\nCode: 200\nID: acc-sales\n\nAccount: Airwallex HKD\nCode: 090\nID: acc-bank\n";
      if (name === "create-payment") { expect(a).toMatchObject({ invoiceId: "inv-555", accountId: "acc-bank", amount: 1800, reference: "CRCS-2026-0001" }); return "Invoice created successfully:\nID: pay-1\n"; }
      return "";
    } });
    expect(await x.findInvoiceByNumber("CRCS-2026-0001")).toBe("inv-555");
    expect(await x.findInvoiceByNumber("CRCS-2026-9999")).toBeNull();
    expect(await x.createPayment({ invoiceId: "inv-555", amountCents: 180000, date: "2026-09-30", reference: "CRCS-2026-0001" })).toBe("pay-1");
  });

  it("parses multi-record tool output into blocks", () => {
    const b = parseBlocks("Found 2:\nAccount: A\nID: 1\nAccount: B\nID: 2", "Account");
    expect(b.map((x) => parseField(x, "ID"))).toEqual(["1", "2"]);
  });
});
