// CSA as the annual module's records source (src/annual/records.ts): the read-only snapshot imported
// from CSA's restored backup. A newer copy is imported when the restore status file says one exists;
// a failed restore is reported and the last good snapshot stays in use.
import { readFile } from "node:fs/promises";
import type { RecordsSource } from "@/annual/records";
import { importCsa, latestImport } from "./import";
import { dispatchFactsFromCsa, nar1InputFromCsa, particularsFromCsa } from "./nar1";
import type { CsaSource } from "./sql-source";

export type CsaRecordsOptions = {
  /** Written by the restore job: whether the last restore worked and the backup's own time. */
  restoreStatusFile?: string | null;
  /** Opens the restored copy. Null when this installation has no connection to it yet. */
  open?: (() => Promise<{ source: CsaSource; close: () => Promise<void> }>) | null;
};

export function csaRecords(o: CsaRecordsOptions = {}): RecordsSource {
  return {
    label: "CSA",
    asAt: async (ctx) => (await latestImport(ctx))?.backupTakenAt ?? null,
    async refresh(ctx) {
      if (!o.restoreStatusFile || !o.open) return null;
      const s = JSON.parse(await readFile(o.restoreStatusFile, "utf8")) as { ok: boolean; backupTakenAt: string | null; error?: string };
      if (!s.ok) throw new Error(`The last CSA restore failed: ${s.error ?? "unknown error"}. The previous copy is still in use.`);
      const last = await latestImport(ctx);
      if (!s.backupTakenAt || (last && last.backupTakenAt.toISOString() >= new Date(s.backupTakenAt).toISOString())) return null;
      const { source, close } = await o.open();
      try { await importCsa(ctx, source, { backupTakenAt: new Date(s.backupTakenAt) }); } finally { await close(); }
      return { asAt: new Date(s.backupTakenAt).toISOString() };
    },
    nar1Input: nar1InputFromCsa,
    dispatchFacts: dispatchFactsFromCsa,
    particulars: particularsFromCsa,
  };
}
