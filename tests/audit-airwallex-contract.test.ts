// Area 6: fictional recorded shapes from the official Airwallex Deposits API.
// https://www.airwallex.com/docs/api/core_resources/deposits/list
import { describe, expect, it } from "vitest";
import { officialDeposit, recordedBank } from "./airwallex-recorded-fixtures";


describe("Airwallex deposit ingestion contract", () => {
  it("AIR01 every has_more page is read before returning settled deposits", async () => {
    const { bank, requests } = recordedBank(q => Number(q.get("page_num")) === 0
      ? { body: { has_more: true, items: [officialDeposit({ id: "page-one", provider_transaction_id: "same-bank-reference" })] } }
      : { body: { has_more: false, items: [officialDeposit({ id: "page-two", provider_transaction_id: "same-bank-reference" })] } });
    const result = await bank.listDeposits(new Date("2026-10-01T00:00:00Z"));
    expect(result.map(d => d.providerTxId)).toEqual(["page-one", "page-two"]);
    expect(requests.map(url => url.searchParams.get("page_num"))).toEqual(["0", "1"]);
    expect(requests.every(url => url.searchParams.get("from_created_at") === "2026-10-01T00:00:00.000Z")).toBe(true);
  });
  it("AIR02 a failed later page rejects the incomplete deposit batch", async () => {
    const { bank } = recordedBank(q => Number(q.get("page_num")) === 0
      ? { body: { has_more: true, items: [officialDeposit()] } }
      : { status: 500, body: { code: "service_unavailable" } });
    await expect(bank.listDeposits(null)).rejects.toThrow();
  });
  it("AIR03 only explicitly SETTLED entries can become spendable bank deposits", async () => {
    const rows = ["SETTLED", "PENDING", "REJECTED", "REVERSED", undefined, "FUTURE_STATUS"].map((status, i) => officialDeposit({ id: `status-${i}`, status }));
    const { bank } = recordedBank(() => ({ body: { has_more: false, items: rows } }));
    expect((await bank.listDeposits(null)).map(d => d.providerTxId)).toEqual(["status-0"]);
  });
  it("AIR04 the received payment date is actual settlement rather than its earlier creation date", async () => {
    const { bank } = recordedBank(() => ({ body: { has_more: false, items: [officialDeposit()] } }));
    const [deposit] = await bank.listDeposits(null);
    expect(deposit.receivedAt.toISOString()).toBe("2026-10-02T00:00:00.000Z");
    expect(deposit).toMatchObject({ amountCents: 1025, payerName: "Fictional payer" });
  });
  it("AIR05 malformed amounts cannot be rounded or coerced into a bank receipt", async () => {
    const values = [undefined, null, "", "ten", -1, 0, 0.001, 1e20, "Infinity"];
    for (const amount of values) {
      const { bank } = recordedBank(() => ({ body: { has_more: false, items: [officialDeposit({ amount })] } }));
      await expect.soft(bank.listDeposits(null), `amount=${String(amount)}`).rejects.toThrow();
    }
  });
  it("AIR06 missing or nonstring deposit identities are rejected before canonical persistence", async () => {
    for (const id of [undefined, null, "", "  ", 42, { arbitrary: "object" }]) {
      const { bank } = recordedBank(() => ({ body: { has_more: false, items: [officialDeposit({ id })] } }));
      await expect.soft(bank.listDeposits(null), `id shape=${typeof id}`).rejects.toThrow();
    }
  });
  it("AIR07 an absent or invalid currency cannot default silently to HKD", async () => {
    for (const currency of [undefined, null, "", "ZZZ", "HKDD", 42]) {
      const { bank } = recordedBank(() => ({ body: { has_more: false, items: [officialDeposit({ currency })] } }));
      await expect.soft(bank.listDeposits(null), `currency=${String(currency)}`).rejects.toThrow();
    }
  });
  it("AIR08 malformed settlement dates cannot become invented current dates or normalized impossible dates", async () => {
    for (const settled_at of [undefined, null, "", "not-a-date", "2026-02-30T00:00:00Z", "2026-13-01T00:00:00Z"]) {
      const { bank } = recordedBank(() => ({ body: { has_more: false, items: [officialDeposit({ settled_at })] } }));
      await expect.soft(bank.listDeposits(null), `settlement=${String(settled_at)}`).rejects.toThrow();
    }
  });
});
