// Where a company's current particulars come from (DECISIONS.md #64, #65). The annual module asks a
// RecordsSource and never a named system: today the installation provides a read-only copy of CSA
// (src/integrations/csa/records.ts); later it can be Clerk's own registers. Nothing here may depend
// on one system staying.
import type { Ctx } from "@/lib/ctx";
import type { NAR1Input, Presentor } from "@/documents/cr-forms";

/** Names, roles, holdings and the registered office, for reading a client's reply. No ID numbers or
 *  home addresses: the model doesn't need them to spot a change. */
export type Particulars = {
  registeredOffice: string | null; asAt: string;
  officers: { role: "director" | "alternate" | "secretary"; name: string; nameZh: string | null }[];
  members: { name: string; nameZh: string | null; className: string; shares: number }[];
};

/** What the dispatch email needs: who signs, and the counts the AGM papers are built from. */
export type DispatchFacts = { signer: string | null; directors: number; members: number; corporateMembers: number; asAt: string };

export type Nar1Request = { madeUpTo: string; presentor: Presentor; signDate: string; email: string; charges?: string };

export interface RecordsSource {
  /** What staff call the records system, used in the reasons shown to them: "CSA". */
  readonly label: string;
  /** When the records in use were taken; null before the first copy. */
  asAt(ctx: Ctx): Promise<Date | null>;
  /** Brings in a newer copy if there is one. Returns its as-at time, or null when nothing is newer.
   *  Throws when the copy failed, leaving the last good one in use. */
  refresh(ctx: Ctx): Promise<{ asAt: string } | null>;
  /** The annual return's input, or the reason this company needs the form prepared by hand. */
  nar1Input(ctx: Ctx, clientId: string, o: Nar1Request): Promise<{ ok: true; input: NAR1Input; asAt: string } | { ok: false; reason: string }>;
  dispatchFacts(ctx: Ctx, clientId: string): Promise<DispatchFacts | null>;
  particulars(ctx: Ctx, clientId: string): Promise<Particulars | null>;
}
