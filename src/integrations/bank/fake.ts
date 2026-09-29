import type { BankDeposit, BankProvider } from "../types";
import { MemoryList, type ListStore } from "../json-store";

type Stored = Omit<BankDeposit, "receivedAt"> & { receivedAt: string };

export class FakeBank implements BankProvider {
  readonly name = "fake";
  constructor(private deposits: ListStore<Stored> = new MemoryList(), private clockNow: () => Date = () => new Date()) {}
  async listDeposits(since: Date | null) {
    return this.deposits.all()
      .map((d) => ({ ...d, receivedAt: new Date(d.receivedAt) }))
      .filter((d) => !since || d.receivedAt >= since);
  }
  async simulateDeposit(d: { amountCents: number; currency: string; reference: string; payerName: string }) {
    const dep: BankDeposit = {
      providerTxId: `fake-dep-${this.deposits.all().length + 1}-${Date.now()}`,
      amountCents: d.amountCents, currency: d.currency, reference: d.reference, payerName: d.payerName,
      receivedAt: this.clockNow(),
    };
    this.deposits.push({ ...dep, receivedAt: dep.receivedAt.toISOString() });
    return dep;
  }
  async accountDetails() {
    return {
      "Account name": "Caine Road Corporate Services Limited",
      Bank: "Airwallex (Hong Kong) Limited (via DBS Bank (Hong Kong) Limited)",
      "Bank code": "016",
      "Account number": "7950 1234 5678",
      "FPS ID": "1234567",
      "SWIFT": "DHBKHKHH",
    };
  }
}
