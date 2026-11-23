// UHY's CSA mapping: the five read-only queries that tell Clerk where companies, officers, members,
// share classes and contacts live in CSA Expert's tables. CSA also keeps Companies Registry e-filing
// logins and passwords in its database; the mapping must never read them (AGENTS.md: credentials are
// never stored or displayed in plain text).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { installations } from "../..";

const root = path.resolve(__dirname, "../../..");
const file = installations.uhy.settings.CSA_MAPPING_FILE;
const mapping = () => JSON.parse(readFileSync(path.join(root, file), "utf8")) as Record<string, string>;
const ENTITIES = ["companies", "officers", "members", "shareClasses", "contacts"];

describe("UHY's CSA mapping", () => {
  it("is part of UHY's profile, so it ships with the build and is not written by hand on the machine", () => {
    expect(file).toBe("clients/uhy/data/csa-mapping.json");
  });

  it("has one read-only query for each of the five entities the importer reads", () => {
    const m = mapping();
    for (const e of ENTITIES) expect(m[e], e).toMatch(/^\s*(select|with)\b/i);
    for (const e of ENTITIES) expect(m[e], e).not.toMatch(/\b(insert|update|delete|merge|drop|alter|exec|execute|truncate|into)\b/i);
  });

  it("never reads the columns where CSA keeps e-filing logins and passwords, or its user and password tables", () => {
    const all = ENTITIES.map((e) => mapping()[e]).join("\n");
    expect(all).not.toMatch(/EREGPW|EWEBPW|ESIGNPW|EREGID|EREGCODE|EPAYAC|EREGSIGN|\bPWMAN\b|\bUSERS\b/i);
    expect(all).not.toMatch(/SELECT\s+\*|\.\*/i);
  });

  it("each query returns exactly the columns the importer expects, by name", () => {
    const want: Record<string, string[]> = {
      companies: ["csaId", "code", "nameEn", "nameZh", "brNumber", "companyNumber", "incorporatedOn", "registeredOn", "fyeMonth", "fyeDay", "registeredOffice", "companyType"],
      officers: ["csaId", "companyCsaId", "role", "kind", "nameEn", "nameZh", "correspondenceAddress", "email", "idNumber", "brNumber", "tcspLicence", "appointedOn", "ceasedOn"],
      members: ["csaId", "companyCsaId", "kind", "nameEn", "nameZh", "address", "className", "shares"],
      shareClasses: ["csaId", "companyCsaId", "className", "currency", "issuedShares", "totalAmount", "paidUp"],
      contacts: ["csaId", "companyCsaId", "name", "email", "phone", "language"],
    };
    for (const e of ENTITIES) {
      const aliases = [...mapping()[e].matchAll(/\bAS ([a-z][A-Za-z]+)\b(?=\s*(,|FROM\b))/g)].map((x) => x[1]);
      expect(aliases, e).toEqual(want[e]);
    }
  });

  it("a person or company with no English name in CSA still gets a name, so one record can't stop the whole import", () => {
    // Found on 23 November: 8 current officers and 11 members have no English name in CSA.
    for (const e of ["officers", "members"]) {
      expect(mapping()[e], e).toMatch(/COALESCE\(.*e\.FORMNAME.*e\.NAME_1C.*'Name not recorded in CSA'\) AS nameEn/);
    }
  });

  it("a corporate secretary's registration number comes from its own client record in CSA, and its TCSP licence is read", () => {
    // Found on 23 November: the secretary of 168 of UHY's companies has no number on its entity record,
    // but it is itself a client in CSA with a business registration number.
    const q = mapping().officers;
    expect(q).toMatch(/CASE WHEN e\.TYPE = 'C' THEN COALESCE\(sb\.BUSREGNO, .*e\.IDNUM.*\) END AS brNumber/);
    expect(q).toMatch(/CASE WHEN e\.TYPE = 'C' THEN .*e\.TCSPNO.* END AS tcspLicence/);
  });

  it("only current private Hong Kong companies are imported: the case list has no rule yet for other kinds", () => {
    for (const e of ENTITIES) expect(mapping()[e], e).toMatch(/c\.JURISD = 'HKG' AND c\.COMTYP = 'PVT' AND c\.ISACTIVE = 1 AND c\.COMSTA IN \('OPE', 'DOR'\)/);
  });
});
