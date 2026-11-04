// Builds the pilot's integrations from the installation config: Graph mail, the read-only CSA copy,
// filing rules and the dispatch template. Missing settings leave that part switched off and visible
// on the health page rather than falling back to a fake.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Config } from "@/lib/config";
import { GraphMail } from "@/integrations/mail/graph";
import { SqlCsaSource, mssqlQuery, type CsaMapping } from "@/integrations/csa/sql-source";
import type { AnnualDeps } from "./service";
import type { CycleDeps } from "./cycle";
import type { UhyFilingRules } from "./writeback";

const list = (s: string) => s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
const json = <T>(file: string): T => JSON.parse(readFileSync(path.resolve(file), "utf8")) as T;

export function graphFromConfig(c: Config): GraphMail | null {
  if (!c.GRAPH_TENANT_ID || !c.GRAPH_CLIENT_ID) return null;
  if (c.GRAPH_PRIVATE_KEY_FILE && c.GRAPH_CERT_THUMBPRINT)
    return new GraphMail({ tenantId: c.GRAPH_TENANT_ID, clientId: c.GRAPH_CLIENT_ID, privateKeyPem: readFileSync(c.GRAPH_PRIVATE_KEY_FILE, "utf8"), thumbprintHex: c.GRAPH_CERT_THUMBPRINT });
  if (c.GRAPH_CLIENT_SECRET) return new GraphMail({ tenantId: c.GRAPH_TENANT_ID, clientId: c.GRAPH_CLIENT_ID, clientSecret: c.GRAPH_CLIENT_SECRET });
  return null;
}

/** Preparing papers needs only filing settings; drafting also needs Microsoft 365 (mail is null without it). */
export function annualDeps(c: Config): AnnualDeps {
  return { mail: graphFromConfig(c), mailboxes: list(c.PILOT_MAILBOXES), filingRoot: c.FILING_ROOT ?? null, filingRules: json<UhyFilingRules>(c.FILING_RULES), template: json(c.DISPATCH_TEMPLATE) };
}

export function cycleDeps(c: Config): CycleDeps {
  const mapping = c.CSA_MAPPING_FILE ? json<CsaMapping>(c.CSA_MAPPING_FILE) : null;
  return {
    restoreStatusFile: c.CSA_RESTORE_STATUS_FILE ?? null,
    openCsa: c.CSA_SQL_CONNECTION && mapping ? async () => { const q = await mssqlQuery(c.CSA_SQL_CONNECTION!); return { source: new SqlCsaSource(q.query, mapping), close: q.close }; } : null,
    mail: graphFromConfig(c), sync: { mailboxes: list(c.PILOT_MAILBOXES), firmDomains: list(c.FIRM_EMAIL_DOMAINS), lookbackDays: c.MAIL_LOOKBACK_DAYS },
    statusDir: c.STATUS_DIR ?? null, withinDays: c.ANNUAL_WINDOW_DAYS,
  };
}
