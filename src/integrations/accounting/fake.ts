import type { AccountingInvoice, AccountingProvider } from "../types";

export class FakeAccounting implements AccountingProvider {
  readonly name = "fake";
  contacts = new Map<string, string>();
  invoices = new Map<string, AccountingInvoice & { id: string; contactId: string }>();
  payments: { id: string; invoiceId: string; amountCents: number; date: string; reference: string }[] = [];
  calls: string[] = [];
  failNext = 0;
  private n = 0;
  private maybeFail(op: string) {
    this.calls.push(op);
    if (this.failNext > 0) { this.failNext--; throw new Error(`Fake accounting failure on ${op}`); }
  }
  async upsertContact(name: string) {
    this.maybeFail("upsertContact");
    let id = this.contacts.get(name);
    if (!id) { id = `xc-${++this.n}`; this.contacts.set(name, id); }
    return id;
  }
  async createInvoice(inv: AccountingInvoice, contactId: string) {
    this.maybeFail("createInvoice");
    const id = `xi-${++this.n}`;
    this.invoices.set(id, { ...inv, id, contactId });
    return id;
  }
  async findInvoiceByNumber(number: string) {
    this.calls.push("findInvoiceByNumber");
    for (const inv of this.invoices.values()) if (inv.number === number) return inv.id;
    return null;
  }
  async createPayment(p: { invoiceId: string; amountCents: number; date: string; reference: string }) {
    this.maybeFail("createPayment");
    const id = `xp-${++this.n}`;
    this.payments.push({ id, ...p });
    return id;
  }
}
