# UHY-ASK

Pilot of the annual-return and AGM cycle on one machine in UHY's office (`docs/DECISIONS.md` #55, #56, #59 to #64). Company-level context is in the CRV knowledge base, `research/targets/uhy-ask.md`.

## What it runs

- **Modules:** `annual` only.
- **Profile:** `installation.ts` (firm id, email domain, the two data files below).
- **Records source:** a read-only copy of CSA, restored from its own backup (`src/integrations/csa/`). UHY intends to move off CSA (#64).
- **Mail:** team mailboxes through Microsoft Graph. Clerk drafts; staff send from Outlook.
- **Model:** reads client replies and only proposes (`AR_REPLY_READER`); staff review every point.
- **Hosting:** Windows, on UHY's premises. Installer and machine settings: `deploy/windows/`.

## What is bespoke

| Where | What |
|---|---|
| `data/filing-rules.json` | UHY's file and folder naming on its F: share |
| `data/dispatch-template.json` | UHY's own wording for the email sent with the annual return, in three languages |
| `data/dn-columns.json` | Column mapping for UHY's DN workbook |
| `src/dn.ts`, `src/access.ts` | Read-only readers for the DN workbook and the Access client database |
| `src/cross-check.ts` | Differences between CSA and the DN workbook, shown to staff |
| `ops/` | Server assessment, CSA restore, mailbox setup and source discovery scripts (`ops/README.md`) |

The readers and the cross-check are not used by the running app yet: they are run from `ops/sources.ts`.

## Documents

- `docs/UHY_AR_AGM_PILOT.md`: the pilot brief (what is built and why).
- `docs/UHY_PILOT_PLAN.md`: steps to deployment.
- `docs/UHY_DEPLOY_GAP.md`: what stands between the code and a working installation.
- `docs/UHY_CDD_FLOW_AND_TIMING.md`: UHY's CDD process and timings.

## Tests

`tests/` covers the installation, the readers (including that they never write to UHY's files) and the cross-check.
