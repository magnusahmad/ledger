# UHY-ASK pilot: annual returns and AGMs, with CDD folded in

Owner: Magnus Ahmad
Last reviewed: 2026-10-07
Status: implementation brief; nothing built or verified on UHY's systems yet. Open questions below gate live data, not development against fictional data.
Sources: [5 October meeting](../crv-kb/meetings/2026-10-05-uhy-ask-first-in-person.md); [6 October meeting](../crv-kb/meetings/2026-10-06-uhy-ask-data-mapping-ctc-pilot.md); Allan's email answers, 7 October; Magnus's direction (6 Oct: lighter footprint, CDD as a Harbourline module, scanned post in scope, several users, external AI processing acceptable; 7 Oct: annual returns and AGMs first, CDD folded in); [CR monitoring research](CR_MONITORING.md); [TCSP CDD requirements](../crv-kb/research/tcsp-cdd-requirements.md).
Related: [Decisions](DECISIONS.md) #53–55, [CDD flow and timing](UHY_CDD_FLOW_AND_TIMING.md), [Product spec](PRODUCT_SPEC.md), [Playbooks](PLAYBOOKS.md).

## Why annual returns and AGMs first

The pilot started as CTC/CDD (6 October). On 7 October Allan said UHY is refreshing all CDD by hand and expects it finished before the pilot runs, which removes the backlog the CDD pilot was meant to clear. He sees CDD as mainly an engagement-time task and annual returns, AGMs and Registry filings as the routine work, with Registry work the most valuable long term. Annual returns and AGMs are UHY's most frequent and time-consuming activities (5 October), spread through the year by incorporation date and year end. Magnus switched the pilot on 7 October (#55).

CDD stays a first-class Harbourline module (#54). It runs inside the annual-return cycle: the annual return is when staff contact every client anyway, so outstanding CDD is collected in the same request (see "CDD inside the annual cycle").

## Outcome and scope

For each client company coming up for its annual return or AGM, Harbourline:

1. shows what is due and when;
2. prepares the client confirmation request with current particulars, any Registry changes found and any outstanding CDD items;
3. reads the reply and proposes changes for staff to approve;
4. prepares the NAR1 and the AGM documents;
5. tracks each company from "due" to "filed", and files the documents into the client's folder on F:.

Measure staff minutes per company against UHY's current process. Start with five companies whose annual returns fall due in the next four to eight weeks, chosen by Coe and Ruby.

**Out of scope for the pilot:**
- writing to CSA (staff keep updating CSA as today);
- electronic filing and e-signature (ink signatures and physical delivery stay as today);
- invoicing and payment chasing in Xero;
- replacing CSA. That is a possible later phase.

## Today's process (as UHY reported, 5–6 October)

- Staff assume annual-return information is unchanged unless the client says otherwise, and update the year.
- They check the Registry's free document index by hand for changes the client made without telling them. Document downloads cost money, so they ask clients by email for updated documents instead.
- New documents go into the client's records and staff update the corresponding CSA forms.
- CSA fills basic forms. Staff sometimes edit the PDF by hand to get exact formatting, down to the alignment of a NIL entry.
- For AGMs, CSA supplies a basic version. Staff start from the previous year's Word document, cross-check the audit report and amend for client-specific changes. When audited accounts are deferred to the next year, they may use CSA's basic version.
- Papers are ink-signed, scanned for records, and the stamped originals are delivered to the Registry. Approval takes roughly three to five days.

## Principles

- **The firm's systems stay the record.** CSA, DN, Access, Xero, the shared drive and the mailbox remain sources. The pilot writes results back into them: documents filed into the client folders on F:, Outlook drafts, and a status workbook plus an append-only review log on the share. If the pilot is switched off, staff keep everything without our app.
- **Light footprint.** No separate database service, job queue, installer framework or self-managed backup system. Source files are referenced by path and fingerprint, not copied. CRV maintains the installation remotely through UHY's IT company.
- **The AI suggests; staff approve.** Proposed changes to particulars, generated forms, AGM drafts, filing of scanned post, CDD completion and every outbound message need a staff click. Nothing is sent automatically.
- **Records stay on the firm's server; processing can happen anywhere.** UHY's requirement is that the client-records database lives on their server. Sending documents and email content to the product model (currently Gemini via OpenRouter, #22) is acceptable (Magnus, 6 October).
- **Statutory rules come from playbook data.** Annual-return and AGM deadlines, forms and notes come from the existing `annualReturn` and `agm` playbooks (`seed/playbooks.json`), marked for company-secretary verification. No deadline is hard-coded in pilot code.

## Package and local state

Several staff use the app, so it runs as **one backend process on UHY's Windows Server** (the server behind F:, confirmed 7 October), set up with UHY's outsourced IT company. Staff open it in a browser from their PCs. Program files and state stay on that server. The database file must not be opened by several copies of the app over the share: embedded databases are not safe with several writers on a network drive.

The server runs a portable bundle (Node runtime and the backend) as a Windows service under an agreed account. That account has read access to the approved share folders and CSA data, and write access to the agreed output folders. It listens on the office network only, never the internet, over HTTPS with a certificate installed on the staff PCs. Each staff member signs in, and every approval is recorded against the person who made it. A single-instance guard prevents two backends running against the same state.

State lives in an embedded database file owned by that one process. PGlite is the first choice because the existing schema and migrations are Postgres; the spike must confirm that the migrations, the NAR1 generator and the CDD module's queries run on it (`src/db/client.ts` currently assumes node-postgres and advisory locks). Fall back to SQLite for pilot tables only if PGlite fails. Every row carries the installation's `firm_id`. A single-firm installation on the firm's own server provides firm separation (#53); RLS remains required for any shared deployment.

Protected fields stored locally (ID numbers, residential addresses, dates of birth) are encrypted with a key held by Windows DPAPI for the service account. Mail credentials are held the same way.

Backup: the state file is copied daily to an agreed folder on the share, and the review log is mirrored there as it is written. UHY's existing backups, run by the IT company, cover both. Restore is a documented copy-back, tested with fictional data.

One gitignored installation config holds the approved share root (UNC path), CSA data location, authoritative DN workbook, optional Access export, mailbox, scan inbox folder and output folders. No source-mapping administration screens. Real paths, exports, emails and attachments never enter git. Source files are never edited, moved or renamed, except that approved scans move from the scan inbox into client folders.

## Connectors

1. **CSA (read-only).** CSA holds directors, secretaries, shareholders, significant controllers, share capital and the details the NAR1 needs. Read it without changing CSA: direct read-only access to its data files or database, or a scheduled export, depending on the format (to be found out with the IT company). Keep the source values next to every derived fact so staff can see where a particular came from. This is the most blocking unknown.
2. **Shared files.** Read only approved directories: last year's annual return and AGM documents, audit reports and CDD evidence in each client folder. Read DN rows (financial year end, AGM month, registration anniversary, auditor, contact email, DD form, risk assessment) using a small installation-specific column mapping. Never open the `.laccdb` lock file as a database. Confirm which DN workbook is authoritative.
3. **Mail (Microsoft Graph).** UHY uses Microsoft 365. Graph works from the server with no one signed in. It reads replies to confirmation requests (attachments included, across separate threads), creates drafts in the mailbox staff send from, and receives Registry notification emails if e-Monitor is used. Record scan coverage and errors, persist checkpoints and deduplicate reruns.
4. **Scanned post.** Ruby scans incoming post on the office Fujifilm Apeos C3570 into one scan inbox folder on the share (scan-to-folder settings to be set up with the IT company; PDF at 300 dpi). Harbourline watches that folder. For each scan it:
   - splits a batch into documents;
   - reads each with the model and identifies the document type (signed annual return, AGM papers, audit report, ID, address proof, Registry letter), the client company and, for CDD documents, the person;
   - works out the client folder on F: and a file name in the firm's convention;
   - moves it there, records it against the company's annual-return or CDD record, and stores extracted facts (for example ID expiry) as proposed facts;
   - keeps a filing log so any filing can be undone in one click.

   A document is filed automatically only when it matches exactly one client and its type is recognised; anything else goes to a review queue. For the first two weeks every filing waits for a one-click confirmation to measure accuracy. Nothing is overwritten. This is the same pipeline as CWCCPA's government-mail flow and is built once.
5. **Registry changes.** The Registry portal blocks automated browsers and must not be scripted (`CR_MONITORING.md`). Two routes:
   - **Version 0, assisted:** each company in the cycle has a "check the Registry" step showing what CSA holds. Staff check the free document index as today and record the result in one click.
   - **e-Monitor (Other Companies)**, if UHY opts in: HK$17 per company per year (roughly HK$3,400–5,100 for 200–300 companies). It notifies on every document registered for a monitored company. Use its email mode, read through Graph, because the webhook mode needs an internet-facing endpoint with a Hong Kong CA certificate, which this office-only setup doesn't have. A notification moves the company to "changes to review" and also counts as a CDD trigger.

## The annual cycle

**Calendar.** Compute each company's annual-return due date (private company: within 42 days after the anniversary of incorporation) and AGM due date (private company: within nine months after the end of the accounting reference period) from the `annualReturn` and `agm` playbook rules, using incorporation date and year end from CSA, cross-checked against DN's registration anniversary, year end and AGM month. Disagreements between CSA and DN are shown to staff, never silently resolved. Deadlines within 30 days get the red stamp.

**Confirmation request.** For each company due, prepare a trilingual draft to the company contact in DN. It carries:
- the particulars on file (directors, secretary, shareholders, registered office, share capital) with "please confirm or tell us what has changed";
- any Registry changes found;
- the AGM items needed (audited accounts or approval route, auditor);
- any outstanding CDD items (next section).

Staff review and send it in Outlook. Proposed chase dates follow the two-week default; staff decide each chaser.

**Reply.** Graph picks up the reply and any attachments; scanned replies come through the scan inbox. The model proposes changes to particulars as a checklist delta, citing the source message or document. Staff accept or reject each one. An accepted change that needs its own filing (for example a director change) is flagged as a separate matter, as the `annualReturn` playbook notes; staff update CSA themselves.

**NAR1.** Generate the NAR1 from the confirmed particulars with Harbourline's existing generator (`src/documents/cr-forms.ts`). It refuses continuation sheets and currency totals it can't fill; those companies fall back to CSA's form, and the card says so. For the first cycle, staff compare each generated NAR1 with CSA's output, and the pilot records differences: this measures whether it removes CSA's manual PDF fixes. The approved PDF is saved to the client folder for ink signing.

**AGM documents.** Draft this year's AGM papers from the previous year's Word document in the client folder and this year's audit report, carrying over standing items and updating dates, figures and changed particulars. Changes are tracked so staff see exactly what moved. Where audited accounts are deferred, the card says so and offers the basic version, as staff do today. The draft is saved as a Word file in the client folder for staff to edit.

**Status.** Each company moves through: due -> request sent -> reply received -> changes approved -> forms ready -> signed -> filed. "Signed" and "filed" are recorded by staff, or from a scanned signed copy and the Registry notification when e-Monitor is on. Status is mirrored to the workbook on the share.

## CDD inside the annual cycle

**Which companies enter the CDD flow.** UHY has no CDD tracker. The pilot never infers completion from files on F:; absent evidence is not proof of anything. Instead:

1. **Cleanup record:** UHY records each company it completes in the current refresh, with the date and Allan's sign-off. Preferably this goes in DN's existing DD form column, or in a simple list on the share. Any company in the annual cycle without a completed entry enters the CDD flow.
2. **New people:** a director, shareholder above the firm's threshold, controller or authorised person added through a client reply or a Registry change gets CDD for that person.
3. **Expiring documents:** an ID that has expired or expires before the next annual return reopens that person's CDD (UHY policy, 6 October).
4. **Periodic review:** due under the firm's risk-rating policy, once that is defined.

**What CDD adds to the request.** Missing items for the flagged people and company are appended to the same confirmation request: passport or HKID and proof of address within three months for individuals; the annual return and an organisation chart for companies (Allan, 7 October). Evidence arrives by email or scan and is recorded as received.

**Who does what.** Coe or Ruby assess the evidence and prepare the case; Allan signs off completion. The pilot enforces the two steps: the preparer can't sign off their own case. Completion is written to the status workbook and the cleanup record.

**Whether CDD blocks the annual return.** By default the annual return and AGM go ahead while CDD is outstanding: the annual return has a statutory deadline and late fees. The company card shows CDD as outstanding until Allan signs off. Whether UHY wants a firm rule that stops other new work until CDD is done is for Allan to decide.

**Effort.** Most of what CDD needs is already built for the annual cycle: the CSA roster of people, company contacts, the confirmation request and chasers, the mail and scan intake, filing into F: and staff approvals. CDD adds:
- person-level evidence with received, assessed and complete states;
- the role checklist as firm-configurable policy data;
- the two-step sign-off;
- ID-expiry tracking;
- staff-confirmed links for one person across several companies.

The expensive part of the original CDD plan, reconstructing status from years of email history, is no longer needed. CDD is therefore a modest addition: built after the annual-return loop works for the first five companies, and switched on before the first full monthly cycle.

## Policy recorded so far

Firm-reported or confirmed by Magnus; company-secretary verification still needed before go-live.

- Annual returns and AGMs follow the `annualReturn` and `agm` playbooks; their deadline rules are marked for verification.
- CDD documents: passport or HKID and proof of address within three months for individuals; annual return and organisation chart for companies (Allan, 7 October). UHY's rules go beyond the regulator's minimum in places ([TCSP CDD requirements](../crv-kb/research/tcsp-cdd-requirements.md)); all are firm-configurable policy data.
- An expired ID reopens CDD. A Zoom call counts both for certified copies and as the identity check. A TCSP compliance officer can certify a copy.
- Residential address: no strict definition; a model with web search proposes residential or commercial with reasons, sending only the address, and staff decide.
- Coe and Ruby carry out CDD; Allan signs off.
- Sanctions screening is done today in Sentroweb KYC/AML; the pilot does not integrate screening. Didit is a candidate for later, not decided.
- Non-responders: the pilot proposes a chase every two weeks by default; staff decide each send. Requests go to the company contact in DN.
- The F: drive is the record for documents and nothing is deleted from it.

## Open questions

**CSA data (UHY's IT company; most blocking)**
- Where and in what format CSA stores its data (local database files, SQL Server or other), and whether we can read it, or get a scheduled export, without changing CSA.

**Annual returns and AGMs (Coe, Ruby)**
- Five companies with annual returns due in the next four to eight weeks, and for each: client code, its CSA record, its folder on F:, last year's annual return and AGM documents, this year's audit report if available, and the email threads from last year's cycle.
- How long before the due date they start, and what the request to clients says today (an example email).
- Which AGM route each client usually uses (meeting, written resolution or dispensed), and how deferred audits are handled.
- Whether UHY wants e-Monitor at HK$17 per company per year, or keeps checking the Registry by hand.
- Where signed and filed papers are saved on F:, with three or four example file names.

**CDD (Allan)**
- Whether the cleanup can be recorded per company with date and sign-off, and where (DN's DD form column or a separate list).
- Whether outstanding CDD should ever block an annual return, AGM or other work.
- Whether Ruby's earlier chase checklist (A01/A02 forms, certification, engagement letter, authorisation letters) still applies alongside the 7 October list.
- What record of a Zoom call is kept; whether "within three months" for proof of address runs to receipt or to review; risk rating and review frequency; how often Sentroweb screening is re-run.

**Scanned post (Ruby)**
- Whether an incoming-post log exists, and whether one envelope often holds documents for several clients.
- Whether paper originals are returned, kept or destroyed after scanning.

**Access (IT company)**
- Which staff need the app; shared mailboxes in use; the agreed method for CRV remote access.

## Work order and red/green acceptance

1. **Spike on fictional data:** PGlite running the migrations and the NAR1 generator; a fictional CSA data sample in the confirmed format; a fictional share; a test Microsoft 365 mailbox through Graph; a fictional scan folder.
2. **The annual-return loop for one company:** calendar, confirmation draft, reply to proposed changes, NAR1, status, filing into F:.
3. **AGM drafting** from last year's Word document and the audit report.
4. **Scanned post and Registry-change handling.**
5. **CDD folded into the request,** with two-step sign-off.
6. **Run on UHY's server, PCs and mailbox** with the five real companies before calling it usable.

Before implementation, write and run failing business tests, then report the actual red and green runs. Minimum acceptance tests:

**Annual cycle**
- "an annual return is due 42 days after the incorporation anniversary for a private company, from playbook data".
- "an AGM is due nine months after the accounting reference period ends for a private company, from playbook data".
- "a difference between CSA and DN on year end or incorporation date is shown to staff, not resolved silently".
- "the confirmation request lists the particulars on file and includes outstanding CDD items only for flagged companies".
- "a change proposed from a client reply does not alter particulars until staff accept it".
- "an accepted director change is flagged as a separate matter".
- "a NAR1 the generator cannot fill completely falls back to CSA and says so".
- "the AGM draft shows every change from last year's document".
- "a deferred audit is flagged rather than filled with old figures".
- "a company is not marked filed without a staff action or a matching Registry notification".

**Intake and filing**
- "a scan that matches more than one client, or none, is never filed automatically".
- "while confirmation mode is on, no scan is filed without a staff click".
- "an automatic filing can be undone from the filing log".
- "an approved scan is filed under the firm's naming convention without overwriting an existing file".
- "documents supplied in separate emails remain available together for review".
- "a repeated read of CSA, the share, the mailbox or the scan folder does not duplicate records or drafts".
- "a missing share, CSA read failure or partial mailbox read is reported and never makes a company look complete".

**CDD**
- "a company without a completed cleanup entry enters the CDD flow at its annual return".
- "a new director from a client reply or Registry change opens CDD for that person".
- "an ID that expires before the next annual return reopens that person's CDD".
- "the person who prepared a CDD case cannot sign it off".
- "outstanding CDD does not block the annual return unless the firm's policy says so".
- "a same-name person at another company is not linked without staff confirmation".
- "a residential-address suggestion cannot pass the address check without staff acceptance, and sends only the address to the model".

**Platform**
- "creating a mail draft does not send it or record it as sent".
- "the pilot never writes to CSA".
- "every approval appears in the status workbook and review log on the share".
- "a request without a signed-in staff session cannot access client data".
- "an approval records the staff member who made it".
- "restoring the state file from the share recovers approvals and their source references".

UI work needs browser checks at 375, 768, 1280 and 1440+ pixels in English and Chinese. The CSA read, the mail connector, the Windows service and access from staff browsers also need a smoke test on UHY's actual server and PCs; fixture tests can't establish those.

## References

- [Microsoft Graph mail API](https://learn.microsoft.com/en-us/graph/api/resources/mail-api-overview).
- [PGlite](https://pglite.dev/).
- [Registry monitoring research](CR_MONITORING.md): e-Monitor, open data, why the portal is not automated.
- [Companies Registry, AML/CFT Guideline for TCSP Licensees, March 2025](https://tcsp.cr.gov.hk/tcspls/portal/guide/931/eng).
