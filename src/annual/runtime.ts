// Builds the annual module's integrations from the installation config: Graph mail, the records
// source (today the read-only CSA copy), the firm's filing rules and its dispatch template. Missing
// settings leave that part switched off and visible on the health page rather than falling back to
// a fake. This is the one file in the module that names a records system.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Config } from "@/lib/config";
import { GraphMail } from "@/integrations/mail/graph";
import { SqlCsaSource, mssqlQuery, type CsaMapping } from "@/integrations/csa/sql-source";
import { csaRecords } from "@/integrations/csa/records";
import type { RecordsSource } from "./records";
import type { ClientListSource } from "./client-list";
import { installationProfile } from "@/lib/installation";
import type { AnnualDeps } from "./service";
import type { CycleDeps } from "./cycle";
import type { FilingRules } from "./writeback";
import type { DispatchTemplate } from "./dispatch";

const list = (s: string) => s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
// A file edited on Windows may start with a byte-order mark, which JSON.parse rejects.
const json = <T>(file: string | undefined): T | null => (file ? (JSON.parse(readFileSync(path.resolve(file), "utf8").replace(/^\uFEFF/, "")) as T) : null);

export function graphFromConfig(c: Config): GraphMail | null {
  if (!c.GRAPH_TENANT_ID || !c.GRAPH_CLIENT_ID) return null;
  const pem = c.GRAPH_PRIVATE_KEY_PEM ?? (c.GRAPH_PRIVATE_KEY_FILE ? readFileSync(c.GRAPH_PRIVATE_KEY_FILE, "utf8") : null);
  if (pem && c.GRAPH_CERT_THUMBPRINT) return new GraphMail({ tenantId: c.GRAPH_TENANT_ID, clientId: c.GRAPH_CLIENT_ID, privateKeyPem: pem, thumbprintHex: c.GRAPH_CERT_THUMBPRINT });
  if (c.GRAPH_CLIENT_SECRET) return new GraphMail({ tenantId: c.GRAPH_TENANT_ID, clientId: c.GRAPH_CLIENT_ID, clientSecret: c.GRAPH_CLIENT_SECRET });
  return null;
}

/** Preparing papers needs only filing settings; drafting also needs Microsoft 365 (mail is null without it). */
export function annualDeps(c: Config): AnnualDeps {
  return { records: recordsFromConfig(c), mail: graphFromConfig(c), mailboxes: list(c.PILOT_MAILBOXES), filingRoot: c.FILING_ROOT ?? null, filingRules: json<FilingRules>(c.FILING_RULES), template: json<DispatchTemplate>(c.DISPATCH_TEMPLATE) };
}

/** The installation's records source. CSA's copy is the only one so far; its connection is optional,
 *  so papers can be prepared from the last copy even while the link to it is down. */
export function recordsFromConfig(c: Config): RecordsSource {
  return csaRecords({ restoreStatusFile: c.CSA_RESTORE_STATUS_FILE ?? null, open: csaOpener(c) });
}

/** Opens the records copy, or null when this installation has no connection to it. The mapping file
 *  is read when a copy is opened, not when the worker starts: a file that is not there fails that
 *  one refresh by name and leaves the last good copy, and the rest of the worker, running. */
export function csaOpener(c: Config) {
  const { CSA_SQL_CONNECTION: connection, CSA_MAPPING_FILE: file } = c;
  if (!connection || !file) return null;
  return async () => {
    if (!existsSync(path.resolve(file))) throw new Error(`The records mapping file ${file} does not exist. Copy it to this machine, or correct CSA_MAPPING_FILE.`);
    const mapping = json<CsaMapping>(file)!;
    const q = await mssqlQuery(connection);
    return { source: new SqlCsaSource(q.query, mapping), close: q.close };
  };
}

/** Whether this installation can bring in newer records (shown when the worker starts). */
export const recordsLinked = (c: Config) => !!(c.CSA_SQL_CONNECTION && c.CSA_MAPPING_FILE && c.CSA_RESTORE_STATUS_FILE);

/** The firm's own client list, where the installation's profile supplies one and this machine has its path. */
export function clientListFromConfig(c: Config): ClientListSource | null {
  return c.INSTALLATION_PROFILE ? installationProfile(c.INSTALLATION_PROFILE).clientList?.(c as unknown as Record<string, string | undefined>) ?? null : null;
}

export function cycleDeps(c: Config): CycleDeps {
  return {
    records: recordsFromConfig(c), clientList: clientListFromConfig(c),
    mail: graphFromConfig(c), sync: { mailboxes: list(c.PILOT_MAILBOXES), firmDomains: list(c.FIRM_EMAIL_DOMAINS), lookbackDays: c.MAIL_LOOKBACK_DAYS },
    statusDir: c.STATUS_DIR ?? null, withinDays: c.ANNUAL_WINDOW_DAYS, readReplies: c.AR_REPLY_READER === "1",
  };
}
