# Filing with the Companies Registry through TPSI (scope, draft)

Status: scoping, 1 October 2026. Nothing is built. The TPSI specification itself has not been read yet (see "Before we can build").

## Why

After signing, staff key each form (ND2A, NR1 and the rest) into e-Registry by hand and type the submission reference back into Clerk. CSA Expert users don't: CSA submits ND2A, NR1, NNC1, NNC2 and NSC1 electronically. That puts Clerk behind CSA on filing (`TIME_SAVED_VS_CSA.md` §4, item 2): about 5 minutes per filing, roughly 12 hours per 100 clients a year. For a director appointment it's most of the staff time left after Clerk.

## What TPSI is (from the Companies Registry's public pages)

- A **system-to-system interface** at the e-Services Portal. Software, whether in-house or from a vendor, uploads completed and signed specified forms in the Registry's file format (XML data files), with or without attachments.
- **Access:** registered e-Filing users can use it after a short, free TPSI registration. There's no fee for the interface itself; filing fees come out of a deposit account at the e-Services Portal (ND2A, ND2B, ND4 and NR1 have no fee when filed on time; NNC2, NAR1 and others do).
- **No vendor approval.** Developers test compatibility in the Registry's TPSI testing environment before going live.
- **Forms:** the Registry's 2014 presentation lists NNC1, NNC1G, NNC3 (incorporation), NNC2, ND2A, ND2B, ND4, ND5, ND7, ND8, NSC1, NR1 and NAR1 (individually or in bulk) as available electronically, with TPSI named for submission. **The current list needs confirming from the specification**, since forms were revised in 2023–24 and the e-Services Portal was replaced.
- CSA Expert's release history lists electronic submission of NNC1, NNC2, NR1, NSC1 and ND2A.

Sources: [TPSI](https://www.cr.gov.hk/en/electronic/e-servicesportal/tpsi.htm), [TPSI FAQs](https://www.cr.gov.hk/en/electronic/e-servicesportal/faq/tpsi.htm), [TPSI specification page](https://www.cr.gov.hk/en/electronic/e-servicesportal/tpsi_spec.htm), [testing environment](https://www.cr.gov.hk/en/electronic/e-servicesportal/tpsi_testing_environment.htm), [CR presentation, January 2014](https://www.cr.gov.hk/en/publications/docs/speech20140114_5.pdf), [CSA Expert release history](http://www.plsoft.com/csa-expert-release-history/).

## Fit with what Clerk already has

Clerk already fills the official PDFs for NAR1, ND2A, ND2B, ND4, ND5, NDR1, NNC1, NNC2, NR1, NSC1 and NSC2 (`forms/hk-cr/`) from the registers and the task. TPSI would take the same data as XML instead of a PDF, so the data mapping mostly exists.

## Proposed design

- **A `FilingProvider` interface** like the bank and mail adapters: a TPSI adapter, and a fake for tests and demos. Without TPSI credentials, Clerk behaves as now (staff file on e-Registry and enter the reference).
- **Human approval stays.** The "File with the Companies Registry" card gets a "Submit to the Companies Registry" button next to "Record filing". Nothing is filed without that click (non-negotiable in `AGENTS.md`).
- **The reference comes back automatically.** The submission number and acknowledgement are stored on the task and the filing record, and the task moves to the register step. A rejection comes back as a card with the Registry's reason.
- **Credentials in the secrets vault** with access logging: the e-Filing account and whatever signing credential TPSI requires. Never in plain text or in the database.
- **Per firm.** Each CRV firm (and the pre-acquisition trial deployment) uses its own e-Filing account.
- **Fees.** Filings with a fee draw on that firm's deposit account; the disbursement line already on the invoice covers it.
- **Tests:** a recorded-response fake of the TPSI adapter; tests that nothing is submitted without approval, that a rejected filing leaves the task at the filing step, and that one firm's credentials can never file for another firm's client.

## Before we can build (owner actions)

1. Register an e-Filing account for the firm (or the design partner) at the e-Services Portal, then register for TPSI.
2. Download the TPSI API specification and get access to the testing environment.
3. Confirm with the company secretary: who signs electronic submissions (and how: digital certificate or iAM Smart+), and which forms the firm files most.

Then: read the specification; confirm the form list, transport, signing and acknowledgement flow; start with ND2A and NR1 (highest volume, no fee), then NAR1 in bulk for the annual cycle.

## Open questions

- Signing: what credential the specification requires for the presenter and for each form.
- Whether one e-Filing account can present for all of a firm's client companies (expected, as a TCSP presenter), and any per-company authorisation.
- How acknowledgements are returned (synchronous response or polling) and how long processing takes.
- Whether e-Registry's own drafts or iAM Smart+ routes would be simpler for low volumes.
