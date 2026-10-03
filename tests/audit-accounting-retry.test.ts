import { describe, expect, it } from "vitest";
import { XeroMcpAccounting } from "@/integrations/accounting/xero-mcp";

describe("Durable Xero receipt retry", () => {
  it("reconciles a receipt by local payment reference before retrying beyond Xero's six minute key cache", async () => {
    const requests: { method: string; body?: string; key?: string }[] = [];
    let stored: { PaymentID: string; Reference: string } | null = null;
    let lose = true;
    const fetcher = (async (url: string, init?: RequestInit) => {
      requests.push({ method: init?.method ?? "GET", body: String(init?.body ?? ""), key: (init?.headers as Record<string, string>)?.["Idempotency-Key"] });
      if ((init?.method ?? "GET") === "GET") return Response.json({ Payments: stored ? [stored] : [] });
      stored = { PaymentID: "pay-provider-1", Reference: JSON.parse(String(init?.body)).Payments[0].Reference };
      if (lose) { lose = false; throw new Error("lost response after commit"); }
      return Response.json({ Payments: [stored] });
    }) as typeof fetch;
    const x = new XeroMcpAccounting({ env: {}, salesAccountCode: "200", bankAccountCode: "090", paymentFetch: fetcher, paymentAuth: async () => ({ token: "fixture-token", tenant: "fixture-tenant" }), callTool: async () => "Account: Bank\nCode: 090\nID: bank-1\n" });
    const p = { invoiceId: "inv-1", amountCents: 1200, date: "2026-10-02", reference: "INV-1", idempotencyKey: "local-payment-1" };
    await expect(x.createPayment(p)).rejects.toThrow(/lost response/);
    expect(await x.createPayment(p)).toBe("pay-provider-1");
    expect(requests.filter(r => r.method === "POST")).toHaveLength(1);
    expect(requests.find(r => r.method === "POST")?.key).toBe(p.idempotencyKey);
  });
});
