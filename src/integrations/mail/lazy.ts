// Defers building a mailbox adapter until first use (e.g. the Gmail refresh token is
// read from the encrypted secrets table).
import type { InboundMail, MailProvider, OutboundMail, SentMail } from "../types";

export class LazyMail implements MailProvider {
  private inner: Promise<MailProvider> | null = null;
  constructor(readonly name: string, readonly address: string, private factory: () => Promise<MailProvider>) {}
  private get() { return (this.inner ??= this.factory().catch((e) => { this.inner = null; throw e; })); }
  async fetchNew(cursor: string | null): Promise<{ messages: InboundMail[]; cursor: string | null }> { return (await this.get()).fetchNew(cursor); }
  async reconcileDelivery(correlationId: string) { const p = await this.get(); return p.reconcileDelivery ? p.reconcileDelivery(correlationId) : { status: "unknown" as const }; }
  async createDraft(m: OutboundMail): Promise<string> { const p = await this.get(); if (!p.createDraft) throw new Error(`${this.name} cannot save drafts`); return p.createDraft(m); }
  async deleteDraft(id: string): Promise<void> { const p = await this.get(); if (!p.deleteDraft) throw new Error(`${this.name} cannot remove drafts`); return p.deleteDraft(id); }
  async send(m: OutboundMail): Promise<SentMail> { return (await this.get()).send(m); }
}
