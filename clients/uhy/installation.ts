// UHY-ASK: the annual-return and AGM pilot (DECISIONS.md #55, #56). Non-secret settings only.
// Machine paths (the F: share, the CSA copy, storage) and secrets are set on the pilot machine:
// deploy/windows/env.production.example and secrets.ps1.
import type { Installation } from "../../src/lib/installation";

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
  },
};

export default uhy;
