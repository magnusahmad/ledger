// UHY-ASK: the annual-return and AGM pilot (DECISIONS.md #55, #56). Non-secret settings only.
// Machine paths (the F: share, the CSA copy, storage) and secrets are set on the pilot machine:
// deploy/windows/env.production.example and secrets.ps1.
import type { Installation } from "../../src/lib/installation";
import { workbookCode } from "./src/codes";

const uhy: Installation = {
  id: "uhy",
  name: "UHY-ASK",
  product: "clerk",
  aliases: ["uhyask", "uhy-ask"],
  modules: ["annual"],
  settings: {
    FIRM_ID: "firm_uhy",
    FIRM_EMAIL_DOMAINS: "uhy-ask.com",
    FILING_RULES: "clients/uhy/data/filing-rules.json",
    DISPATCH_TEMPLATE: "clients/uhy/data/dispatch-template.json",
    CSA_MAPPING_FILE: "clients/uhy/data/csa-mapping.json",
  },
  // The DN workbook and the AGM workbook, read as one client list (src/dn-source.ts). The reader is
  // loaded only when the list is read, so nothing else pays for it.
  clientList: (s) => (s.CLIENT_LIST_FILE ? {
    label: "the DN workbook",
    codeKey: workbookCode,
    read: async (since) => (await import("./src/dn-source")).dnClientList({ dnFile: s.CLIENT_LIST_FILE!, agmFile: s.AGM_TRACKER_FILE ?? null }).read(since),
  } : null),
};

export default uhy;
