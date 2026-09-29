// Xero via the official Xero MCP server (DECISIONS.md #28). Harbourline is the MCP client.
// The MCP server creates invoices as DRAFT and has no tool to approve them, while Xero only
// accepts payments on AUTHORISED invoices, so approval uses one direct Xero API call
// (DECISIONS.md #32).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { AccountingInvoice, AccountingProvider } from "../types";

export const XERO_MCP_PACKAGE = "@xeroapi/xero-mcp-server@0.0.17";

export type ToolCaller = (name: string, args: Record<string, unknown>) => Promise<string>;

export function parseField(text: string, label: string): string | null {
  const m = text.match(new RegExp(`${label}:\\s*([^\\n]+)`));
  return m ? m[1].trim() : null;
}

/** Splits list-* tool output into records (one per "Contact:"/"Invoice ID:"/"Account:" block). */
export function parseBlocks(text: string, startLabel: string): string[] {
  return text.split(new RegExp(`(?=^${startLabel}:)`, "m")).filter((b) => b.startsWith(`${startLabel}:`));
}

export class XeroMcpAccounting implements AccountingProvider {
  readonly name = "xero";
  private client: Client | null = null;
  private bankAccountId: string | null = null;
  constructor(private o: {
    env: Record<string, string>;
    salesAccountCode: string;
    bankAccountCode: string;
    taxType?: string;
    callTool?: ToolCaller;               // injected in tests
    authorise?: (invoiceId: string) => Promise<void>; // injected in tests
  }) {}

  private async call(name: string, args: Record<string, unknown>): Promise<string> {
    if (this.o.callTool) return this.o.callTool(name, args);
    if (!this.client) {
      const transport = new StdioClientTransport({ command: "npx", args: ["-y", XERO_MCP_PACKAGE], env: { ...process.env as Record<string, string>, ...this.o.env } });
      const c = new Client({ name: "harbourline-desk", version: "1.0.0" });
      await c.connect(transport);
      this.client = c;
    }
    const r = await this.client.callTool({ name, arguments: args });
    const text = ((r.content as { type: string; text?: string }[]) ?? []).map((x) => x.text ?? "").join("\n");
    if (r.isError || /^Error /m.test(text)) throw new Error(`Xero ${name}: ${text.slice(0, 400)}`);
    return text;
  }

  async upsertContact(name: string, email?: string | null): Promise<string> {
    const found = await this.call("list-contacts", { searchTerm: name });
    for (const b of parseBlocks(found, "Contact")) if (parseField(b, "Contact")?.toLowerCase() === name.toLowerCase()) return parseField(b, "ID")!;
    const created = await this.call("create-contact", { name, ...(email ? { email } : {}) });
    const id = created.match(/\(ID: ([^)]+)\)/)?.[1];
    if (!id) throw new Error(`Xero create-contact returned no id: ${created.slice(0, 200)}`);
    return id;
  }

  async createInvoice(inv: AccountingInvoice, contactId: string): Promise<string> {
    const text = await this.call("create-invoice", {
      contactId, type: "ACCREC", reference: inv.number, date: inv.issuedOn,
      lineItems: inv.lines.map((l) => ({ description: l.description, quantity: 1, unitAmount: l.amountCents / 100, accountCode: l.accountCode ?? this.o.salesAccountCode, taxType: this.o.taxType ?? "NONE" })),
    });
    const id = parseField(text, "ID");
    if (!id) throw new Error(`Xero create-invoice returned no id: ${text.slice(0, 200)}`);
    await this.authorise(id);
    return id;
  }

  async findInvoiceByNumber(number: string): Promise<string | null> {
    const text = await this.call("list-invoices", { page: 1, invoiceNumbers: [number] });
    for (const b of parseBlocks(text, "Invoice ID")) if (parseField(b, "Invoice") === number) return parseField(b, "Invoice ID");
    return null;
  }

  async createPayment(p: { invoiceId: string; amountCents: number; date: string; reference: string }): Promise<string> {
    if (!this.bankAccountId) {
      const text = await this.call("list-accounts", {});
      const block = parseBlocks(text, "Account").find((b) => parseField(b, "Code") === this.o.bankAccountCode);
      this.bankAccountId = block ? parseField(block, "ID") : null;
      if (!this.bankAccountId) throw new Error(`No Xero account with code ${this.o.bankAccountCode}; set XERO_BANK_ACCOUNT_CODE`);
    }
    const text = await this.call("create-payment", { invoiceId: p.invoiceId, accountId: this.bankAccountId, amount: p.amountCents / 100, date: p.date, reference: p.reference });
    const id = parseField(text, "ID");
    if (!id) throw new Error(`Xero create-payment returned no id: ${text.slice(0, 200)}`);
    return id;
  }

  private async authorise(invoiceId: string) {
    if (this.o.authorise) return this.o.authorise(invoiceId);
    const token = await xeroToken(this.o.env);
    const tenant = await xeroTenant(token);
    const r = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${invoiceId}`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Xero-tenant-id": tenant, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ Invoices: [{ InvoiceID: invoiceId, Status: "AUTHORISED" }] }),
    });
    if (!r.ok) throw new Error(`Xero authorise failed: ${r.status} ${(await r.text()).slice(0, 300)}`);
  }

  async close() { await this.client?.close(); this.client = null; }
}

async function xeroToken(env: Record<string, string>): Promise<string> {
  if (env.XERO_CLIENT_BEARER_TOKEN) return env.XERO_CLIENT_BEARER_TOKEN;
  const r = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${env.XERO_CLIENT_ID}:${env.XERO_CLIENT_SECRET}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: env.XERO_SCOPES ?? "accounting.transactions accounting.contacts accounting.settings" }),
  });
  if (!r.ok) throw new Error(`Xero token failed: ${r.status}`);
  return ((await r.json()) as { access_token: string }).access_token;
}

async function xeroTenant(token: string): Promise<string> {
  const r = await fetch("https://api.xero.com/connections", { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json() as { tenantId: string }[];
  if (!j[0]) throw new Error("No Xero organisation connected");
  return j[0].tenantId;
}
