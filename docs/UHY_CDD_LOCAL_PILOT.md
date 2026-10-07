# UHY-ASK local CDD pilot

Owner: Magnus Ahmad
Last reviewed: 2026-10-06
Status: implementation brief; package not built or verified on Windows yet. Open questions below gate live data, not development against fictional data.
Sources: [6 October meeting](../crv-kb/meetings/2026-10-06-uhy-ask-data-mapping-ctc-pilot.md); [5 October meeting](../crv-kb/meetings/2026-10-05-uhy-ask-first-in-person.md); Magnus's direction (6 Oct: lighter footprint, CDD as a Harbourline module, scanned courier post in scope, several users, external AI processing acceptable).
Related: [Decisions](DECISIONS.md) #53 and #54, [Product spec](PRODUCT_SPEC.md), [Build spec](BUILD_SPEC.md).

## Outcome and scope

Help Ruby establish who still needs CTC/CDD evidence, see the evidence already available across files, emails and scanned post, and prepare the correct follow-up. CTC/KYC is first; annual returns follow once this proves useful. Measure time spent assembling and checking a case and preparing a chaser against Ruby's current manual process. Start with a small staff-selected cohort: a complete case, a fragmented submission, an ambiguous case, a person linked to several companies and a case whose evidence arrived by courier.

CDD is a first-class Harbourline module (#54). The domain code (people, evidence, checklist, review states, chasers) lives in the main codebase and is built to merge into Harbourline later. Only the connectors and the local packaging are pilot-specific.

## Principles

- **The firm's systems stay the record.** Access, DN, CSA, Xero, the shared drive and the mailbox remain sources. The pilot writes results back into them: approved scans filed into existing client folders, Outlook drafts, and a CDD status workbook plus an append-only review log on the firm's share. If the pilot is switched off, staff keep everything they need without our app.
- **Light footprint.** No separate database service, job queue, installer framework or self-managed backup system. Evidence files are referenced by path and fingerprint, not copied. CRV maintains the installation remotely with the firm's agreement.
- **The AI suggests; staff approve.** Findings, identity links, filing of scanned post, CDD completion and every outbound message need a staff click. The adapter never sends mail.
- **Records stay on the firm's server; processing can happen anywhere.** UHY's requirement is that the client-records database lives on their local server. Sending documents to the product model (currently Gemini via OpenRouter, #22) for reading and classification is acceptable to them, as confirmed by Magnus on 6 October.

## Package and local state

Several staff need the app, so it runs as **one backend process on one always-on machine in the office**, and staff open it in a browser from their own PCs. Preferred host: the Windows Server behind the F: drive (confirmed 7 October), set up with UHY's outsourced IT company; otherwise an always-on office PC. Program files and state stay on that host. The database file must not sit on F: and be opened by several copies of the app at once: embedded databases are not safe with several writers over a network share.

The host runs a portable bundle (Node runtime and the backend) as a Windows service under an agreed account with read access to the approved share folders and write access to the agreed output folders. It listens on the office network only, never the internet, over HTTPS with a certificate installed on the staff PCs. Each staff member signs in; reviews, approvals and drafts are recorded against the person who made them. A single-instance guard prevents two backends running against the same state.

State lives in an embedded database file on the host, owned by that one process. PGlite is the first choice because the existing schema and migrations are Postgres; the connector spike must confirm that the migrations and the CDD module's queries run on it (`src/db/client.ts` currently assumes node-postgres and advisory locks). Fall back to SQLite for the CDD tables only if PGlite fails. Every row carries the installation's `firm_id`. A single-firm installation on the firm's own machine provides firm separation (#53); RLS remains required for any shared deployment.

The few protected fields stored locally (ID numbers, residential addresses, date of birth) are encrypted with a key held by Windows DPAPI for the service account. Mail credentials are held the same way.

Backup: the state file is copied daily to an agreed folder on the firm's share, and the review log is mirrored there as it is written. The firm's existing share backups cover both. Restore is a documented copy-back, tested with fictional data.

One gitignored installation config holds the approved share root (UNC path), authoritative DN workbook, optional Access export, mailbox, scan inbox folder and output folders. Fixed paths are acceptable; no source-mapping administration screens. Real paths, exports, emails and attachments never enter git. Source files are never edited, moved or renamed, except that approved scanned post is copied into the client folder as described below.

## Connectors

1. **Shared files.** Read only approved directories. Show matching evidence with source path, date and file fingerprint. Read relevant DN rows using a small installation-specific column mapping; keep the source rows for review. An Access export is optional input, not a prerequisite for the first selected cases. Never open the `.laccdb` lock file as the database. Confirm which of the two similar DN workbooks is authoritative.
2. **Mail.** Microsoft Graph: UHY uses Microsoft 365 (confirmed 7 October). This matters now that the backend runs as a shared service: Graph works from a service with no one signed in, and drafts can be created in the mailbox Ruby or a colleague sends from. Classic Outlook COM only works inside a signed-in user's desktop session, so with on-premises or other mail each user's PC would need a small helper for drafts, and history scanning would depend on one user's profile. The COM route is kept only as a fallback. Either way: inspect only selected stores/folders, include sent and received messages and attachments across separate threads, record scan coverage and errors so an absent match never reads as "not supplied", persist checkpoints and deduplicate reruns. Initial history search must not rely on a received-date cursor alone. Confirm access to shared mailboxes and archives (PST files) in the actual office setup.
3. **Scanned post.** CTCs and other evidence can arrive by courier; Ruby opens the post and scans it on the office Fujifilm Apeos C3570 into **one scan inbox folder** on the share (the model supports scan to a network folder; settings to confirm on the device; PDF at 300 dpi). Harbourline watches that folder. For each scan it:
   - splits a batch into separate documents;
   - reads each with the model and identifies the document type, the client company, the person and the checklist item it answers, matching on client code, company or CR/BR number and names against the DN workbook and existing records;
   - works out the client folder on F: and a file name in the firm's naming convention (client code, document type, date);
   - moves the document there, records it as evidence for the case, and stores extracted facts such as ID expiry or address-proof date as proposed facts;
   - keeps a filing log (original file name, fingerprint, destination, reasons) so any filing can be undone in one click.

   A document is filed automatically only when it matches exactly one client and its type is recognised. Anything ambiguous or unreadable goes to a review queue for staff. For the first two weeks, every filing waits for a one-click staff confirmation so we can measure match accuracy; automatic filing is switched on afterwards. Filing records evidence as received; assessing it and completing CDD remain staff decisions. Nothing is overwritten: a name clash gets a suffix. This is the same pipeline as CWCCPA's government-mail flow and should be built once.
4. **Chasers.** Generate reviewable EN/TC/SC wording from outstanding approved checklist items. Create a mail draft with the proposed recipient, subject and body; Ruby reviews and sends it in Outlook. Distinguish prepared, sent and manually confirmed states, and prevent duplicate drafts for an unchanged case.
5. **Extraction and screening.** Provider interfaces with fixture and local modes. The model reads documents, emails and scans through the existing provider interface; tests use fixtures, never live calls. Didit remains a candidate, not a selected provider or an accepted evidence route.

## Processing

The client-records database and evidence files stay on the firm's server. Documents and email content may be sent to the product model for reading, classification, extraction and drafting (Gemini via OpenRouter, #22); UHY has no requirement that processing happens in Hong Kong. The residential-address check sends only the address to a model with web search, no names or identifiers. Identity-verification providers (for example Didit) are a separate decision, not part of this pilot.

## First screen and workflow

A CDD case list showing company, person, unresolved items, last client contact, coverage gaps and whether staff review is needed. Opening a case shows the checklist beside its file, email and scan evidence, the facts staff have confirmed and a draft follow-up. People stay separate from companies; staff explicitly confirm cross-company identity links and whether existing evidence is current and applicable.

The first demonstrable loop: select a case -> read its approved files, mail history and scanned post -> consolidate candidate evidence -> Ruby confirms links and findings -> prepare only the missing-item chaser -> create a draft -> refresh after a reply or a new scan -> review new evidence without losing earlier submissions. Completion requires staff approval and supporting evidence, and is written to the status workbook and review log.

Ruby's A01/A02, engagement letter, identity/address, SCR, organisation-chart and PPTA checklist is reviewable configuration, not code. Keep evidence received, evidence assessed and CDD complete distinct. A filename, attachment or email claim is not proof of valid certification or completion. Never merge people by name alone.

Policy confirmed by Magnus on 6 October (company-secretary verification still needed before go-live):

- **Zoom call** is accepted both for certified copies and as the identity check. What record of the call is kept is still open.
- **Expired ID reopens CDD.** Track expiry dates per document and propose a replacement request ahead of expiry; until the expiry date is confirmed from the document, show it as unknown, not valid.
- **Residential address** has no strict definition. A model, with web search, proposes whether the address looks residential or commercial, with its reasons and sources; staff accept or override it. The proposal never decides on its own. Send only the address, never the person's name or other identifiers.
- **Scope is every client**: a firm project to bring all clients into compliance, not an inspection deadline. The case list needs ordering (suggested default: by next annual-return date, since staff contact the client then anyway).
- **Non-response:** the pilot proposes a next chase date and prepares the chaser; Ruby or a teammate decides whether to send it. Default interval two weeks, configurable.
- **Chasers go to the company contact recorded in the DN workbook.**
- **A TCSP compliance officer can certify a copy** (confirmed). Whether the A01 form's narrower list (CPA, lawyer, notary) also needs updating is for UHY.
- **Sanctions screening** is done today with Sentroweb KYC/AML (as UHY reports). Moving to a more modern provider such as Didit is being considered, not decided; the pilot does not integrate screening.
- **The F: drive is the record for CDD documents, and nothing is deleted from it.** No retention or deletion handling is needed in the pilot.

## Answers from Allan, 7 October

By email, in reply to the 6 October question list. Firm-reported; policy items still need company-secretary verification.

- **Mail:** Microsoft 365 with Outlook, so the mail connector is Microsoft Graph.
- **F: drive:** a Windows Server, which becomes the preferred host for the backend.
- **IT:** an outsourced IT company manages UHY's PCs, scanner, server, software, antivirus and backup. All setup on the server, PCs and scanner is coordinated with them.
- **People per company:** directors, shareholders and significant controllers are held in CSA, not the DN workbook. Reading CSA's data is a prerequisite for the case list.
- **Existing CDD tracker:** none. UHY is updating all CDD manually now and expects it to be complete before the pilot runs, so backlog reconstruction may no longer be needed.
- **Documents required:** for individuals, passport or HKID and proof of address issued within the last three months; for companies, the annual return and an organisation chart.
- **Sign-off:** Coe and Ruby carry out CDD with the client; Allan signs off completion. This is a two-step approval (prepared by staff, approved by Allan).
- **Sample cases:** Coe and Ruby will supply five; UHY asked what data we need for them.
- **Priority:** Allan sees CDD as mainly an engagement-time task with occasional updates, while annual returns, AGMs and Companies Registry filings are routine. He expects Companies Registry work to be the most valuable long term and has left the order to CRV.

## Open questions

Each item says who answers it. Policy items need company-secretary verification before they become validation rules.

**CSA data (UHY's IT company)**
- Where and in what format CSA stores its data (local database file, SQL Server or other), and whether we can read it or get a regular export without changing CSA.

**CDD policy (Allan)**
- Which of UHY's requirements beyond the regulator's minimum are deliberate ([TCSP CDD requirements](../crv-kb/research/tcsp-cdd-requirements.md)): ID and address proof for every director regardless of ownership, and whether an expired ID reopens CDD. Allan's 7 October list does not mention certification, A01/A02 forms, engagement letters or authorisation letters; confirm whether Ruby's chase checklist still applies.
- What record of a Zoom call is kept.
- Whether "within three months" for proof of address runs to receipt or to review.
- Risk rating: who sets it, review frequency by rating, enhanced steps for high-risk or PEP cases; how often Sentroweb screening is re-run and where its results are kept.

**Scanned post (Ruby)**
- Whether an incoming-post log exists, and whether one envelope often holds documents for several clients.
- The folder and file-naming convention for CDD documents, with examples.
- Whether paper originals are returned, kept or destroyed after scanning.

**Data sources and access (Ruby, IT company)**
- The authoritative DN workbook, active-client definition and returning-client code handling.
- Shared mailboxes in use, and how far back mail history goes.
- Who needs access to the app, and the agreed method for CRV remote access.

## Work order and red/green acceptance

1. Connector spike on fictional data: PGlite running the migrations, a fictional share, a test mailbox through Graph or COM, and a fictional scan folder.
2. The selected-case evidence and review loop.
3. Scanned-post filing, incremental refresh and chaser drafts.
4. Run the packaged result on the actual office host, staff PCs and mailbox before calling it usable.

Whole-archive indexing, installer polish and unrelated connectors are not prerequisites.

Before implementation, write and run failing business tests, then report the actual red and green runs. Minimum acceptance tests:

- "documents supplied in separate emails remain available together for one person's review": consolidate across threads without overwriting earlier evidence.
- "a scan that matches more than one client, or none, is never filed automatically": it waits in the review queue.
- "while confirmation mode is on, no scan is filed without a staff click".
- "an automatic filing can be undone from the filing log, restoring the scan and removing its evidence record".
- "an approved scan is filed under the firm's naming convention without overwriting an existing file".
- "a same-name person at another company is not linked without staff confirmation": ambiguous evidence stays unresolved.
- "a source-file, scan or email claim alone cannot complete CDD": completion is a recorded human approval backed by reviewed evidence.
- "a repeated scan of the share, mailbox or scan folder does not duplicate evidence or chaser drafts": source identity and checkpoints survive restart.
- "a missing share or partial mailbox scan cannot make a case appear complete": status is preserved and incomplete coverage is reported.
- "creating a mail draft does not send it or record it as sent".
- "the residential-address check sends only the address to the model": tested at the adapter boundary with fixtures.
- "every approved finding and completion appears in the status workbook and review log on the share": the firm keeps the record without our app.
- "a request without a signed-in staff session cannot access evidence": exercises the office-network HTTP boundary.
- "an approval records the staff member who made it".
- "an expired identity document reopens that person's CDD".
- "a residential-address suggestion cannot mark the address check passed without staff acceptance".
- "restoring the state file from the share recovers approved findings and their evidence references": tested with fictional data.

UI work needs browser checks at 375, 768, 1280 and 1440+ pixels in English and Chinese. The mail connector, the Windows service and access from staff browsers also need a smoke test on the actual office host and PCs; fixture tests can't establish those.

## Connector references

- [Microsoft Graph mail API](https://learn.microsoft.com/en-us/graph/api/resources/mail-api-overview).
- [Microsoft: automating classic Outlook](https://learn.microsoft.com/en-us/office/vba/outlook/concepts/getting-started/automating-outlook-from-other-office-applications).
- [Microsoft: classic and new Outlook add-in compatibility](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/one-outlook).
- [PGlite](https://pglite.dev/).
