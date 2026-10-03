import { AirwallexBank } from "@/integrations/bank/airwallex";

export function officialDeposit(patch: Record<string, unknown> = {}) {
  return { id: "fictional-deposit-1", amount: 10.25, currency: "HKD", status: "SETTLED", created_at: "2026-10-01T00:00:00Z", settled_at: "2026-10-02T00:00:00Z", reference: "Fictional deposit", payer: { name: "Fictional payer" }, ...patch };
}
export function recordedBank(reply: (query: URLSearchParams) => { status?: number; body: unknown }) {
  const requests: URL[] = [];
  const f = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/authentication/login")) return Response.json({ token: "fictional-token" });
    requests.push(url); const response = reply(url.searchParams);
    return Response.json(response.body, { status: response.status ?? 200 });
  }) as typeof fetch;
  return { bank: new AirwallexBank({ clientId: "fictional-client", apiKey: "fictional-key", baseUrl: "https://fixture.invalid", fetch: f }), requests };
}
