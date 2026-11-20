// CWCCPA: the mail room for its inbound post (DECISIONS.md #57, #58). Non-secret settings only.
// The firm's sender address (MAILROOM_FROM), the scan and server folders and secrets are set on its
// machine. The anonymised demo for outside audiences is separate: seed/mailroom ("XYZ CPA").
import type { Installation } from "../../src/lib/installation";

const cwccpa: Installation = {
  id: "cwccpa",
  name: "CWCCPA",
  product: "clerk",
  aliases: ["cwc"],
  modules: ["mailroom"],
  settings: {
    FIRM_ID: "firm_cwc",
    MAILROOM_FIRM_NAME: "CWC CPA",
    MAILROOM_RULES: "clients/cwccpa/data/rules.json",
    MAILROOM_CLIENT_SOURCES: "clients/cwccpa/data/client-sources.json",
  },
};

export default cwccpa;
