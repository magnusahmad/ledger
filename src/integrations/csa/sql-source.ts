// Reads CSA's records from the restored, read-only copy of its own backup (never the live database).
// The SQL for each entity lives in the installation's mapping file, written once against CSA's real
// tables (the installation's CSA_MAPPING_FILE; each client keeps an example with its ops scripts); each query returns columns named as below.
import { z } from "zod";

const day = z.preprocess((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === "string" ? v.slice(0, 10) : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/));
const optDay = z.preprocess((v) => (v === null || v === undefined || v === "" ? null : v), day.nullable());
const str = z.preprocess((v) => (typeof v === "number" ? String(v) : typeof v === "string" ? v.trim() : v), z.string().min(1));
const optStr = z.preprocess((v) => (v === undefined || v === "" ? null : typeof v === "string" ? v.trim() || null : typeof v === "number" ? String(v) : v), z.string().nullable());
const num = z.preprocess((v) => (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)) ? Number(v) : v), z.number());

/** registeredOn: Hong Kong registration date of a registered non-Hong Kong company (its NN3 anniversary). */
export const CsaCompanyZ = z.object({
  csaId: str, code: optStr, nameEn: str, nameZh: optStr, brNumber: optStr, companyNumber: optStr,
  incorporatedOn: optDay, registeredOn: optDay, fyeMonth: num.nullable().default(null), fyeDay: num.nullable().default(null),
  registeredOffice: optStr, companyType: z.enum(["private", "public", "guarantee", "non_hk"]).default("private"),
});
export const CsaOfficerZ = z.object({
  csaId: str, companyCsaId: str, role: z.enum(["director", "alternate", "secretary"]), kind: z.enum(["individual", "corporate"]),
  nameEn: str, nameZh: optStr, correspondenceAddress: optStr, email: optStr, idNumber: optStr, brNumber: optStr.default(null),
  /** A corporate secretary's TCSP licence number, which the annual return must show. */
  tcspLicence: optStr.default(null),
  appointedOn: optDay, ceasedOn: optDay,
});
export const CsaMemberZ = z.object({
  csaId: str, companyCsaId: str, kind: z.enum(["individual", "corporate"]), nameEn: str, nameZh: optStr, address: optStr, className: str, shares: num,
});
export const CsaShareClassZ = z.object({
  csaId: str, companyCsaId: str, className: str, currency: str, issuedShares: num, totalAmount: num, paidUp: num,
});
export const CsaContactZ = z.object({
  csaId: str, companyCsaId: str, name: str, email: optStr, phone: optStr, language: z.preprocess((v) => (v === "tc" || v === "sc" ? v : "en"), z.enum(["en", "tc", "sc"])),
});

export type CsaCompany = z.infer<typeof CsaCompanyZ>;
export type CsaOfficer = z.infer<typeof CsaOfficerZ>;
export type CsaMember = z.infer<typeof CsaMemberZ>;
export type CsaShareClass = z.infer<typeof CsaShareClassZ>;
export type CsaContact = z.infer<typeof CsaContactZ>;

export type CsaMapping = { companies: string; officers: string; members: string; shareClasses: string; contacts: string };
export type CsaQuery = (sql: string) => Promise<Record<string, unknown>[]>;

export interface CsaSource {
  companies(): Promise<CsaCompany[]>; officers(): Promise<CsaOfficer[]>; members(): Promise<CsaMember[]>;
  shareClasses(): Promise<CsaShareClass[]>; contacts(): Promise<CsaContact[]>;
}

function parseAll<T>(name: string, rows: Record<string, unknown>[], schema: z.ZodType<T>): T[] {
  return rows.map((r, i) => {
    const p = schema.safeParse(r);
    if (!p.success) throw new Error(`CSA mapping "${name}" row ${i + 1}: ${p.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`);
    return p.data;
  });
}

export class SqlCsaSource implements CsaSource {
  constructor(private readonly query: CsaQuery, private readonly mapping: CsaMapping) {}
  private async read<T>(k: keyof CsaMapping, s: z.ZodType<T>) { return parseAll(k, await this.query(this.mapping[k]), s); }
  companies() { return this.read("companies", CsaCompanyZ); }
  officers() { return this.read("officers", CsaOfficerZ); }
  members() { return this.read("members", CsaMemberZ); }
  shareClasses() { return this.read("shareClasses", CsaShareClassZ); }
  contacts() { return this.read("contacts", CsaContactZ); }
}

/** A read-only SQL Server query function for the restored CSA copy (mssql loaded only when used). */
export async function mssqlQuery(connectionString: string): Promise<{ query: CsaQuery; close: () => Promise<void> }> {
  const mssql = (await import("mssql")).default;
  const pool = await new mssql.ConnectionPool(connectionString).connect();
  return {
    query: async (sql) => {
      if (!/^\s*(select|with)\b/i.test(sql)) throw new Error("CSA mapping queries must be SELECT statements");
      return (await pool.request().query(sql)).recordset as Record<string, unknown>[];
    },
    close: () => pool.close(),
  };
}
