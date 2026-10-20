# UHY-ASK pilot: annual returns and AGMs, with CDD folded in

Owner: Magnus Ahmad
Last reviewed: 2026-10-20
Status: implementation brief; nothing built or verified on UHY's systems yet. Open questions below gate live data, not development against fictional data.
Sources: [5 October meeting](../crv-kb/meetings/2026-10-05-uhy-ask-first-in-person.md); [6 October meeting](../crv-kb/meetings/2026-10-06-uhy-ask-data-mapping-ctc-pilot.md); Allan's email answers, 7 and 9 October; Magnus's direction (6 Oct: lighter footprint, CDD as a Harbourline module, scanned post in scope, several users, external AI processing acceptable; 7 Oct: annual returns and AGMs first, CDD folded in); [CR monitoring research](CR_MONITORING.md); [TCSP CDD requirements](../crv-kb/research/tcsp-cdd-requirements.md).
Related: [Implementation plan](UHY_PILOT_PLAN.md), [Decisions](DECISIONS.md) #53–55, [CDD flow and timing](UHY_CDD_FLOW_AND_TIMING.md), [Product spec](PRODUCT_SPEC.md), [Playbooks](PLAYBOOKS.md).

## Why annual returns and AGMs first

The pilot started as CTC/CDD (6 October). On 7 October Allan said UHY is refreshing all CDD by hand and expects it finished before the pilot runs, which removes the backlog the CDD pilot was meant to clear. He sees CDD as mainly an engagement-time task and annual returns, AGMs and Registry filings as the routine work, with Registry work the most valuable long term. Annual returns and AGMs are UHY's most frequent and time-consuming activities (5 October), spread through the year by incorporation date and year end. Magnus switched the pilot on 7 October (#55).

CDD stays a first-class Harbourline module (#54). It runs inside the annual-return cycle: the annual return is when staff contact every client anyway, so outstanding CDD is collected in the same request (see "CDD inside the annual cycle").

## Outcome and scope

For each client company coming up for its annual return or AGM, Harbourline:

1. shows what is due and when;
2. prepares the NAR1 and the AGM written resolutions a month ahead;
3. once payment is confirmed, drafts the email that sends them to the client for signature, including the charges question and any outstanding CDD items;
4. reads the client's reply and the returned signed papers, and proposes any changes for staff to approve;
5. tracks each company from "due" to "filed", and files the documents into the client's folder on F:.

Measure staff minutes per company against UHY's current process. Start with the five companies UHY named on 9 October, whose annual returns fall due in the next four to eight weeks. Their names and codes are client data and are kept out of this repo and the KB; they go in the installation config.

**Out of scope for the pilot:**
- writing to CSA (staff keep updating CSA as today);
- electronic filing and e-signature (ink signatures and physical delivery stay as today);
- invoicing and payment chasing in Xero;
- replacing CSA. That is a possible later phase.

## Today's process (as UHY reported, 5–9 October)

**Annual returns**
- Staff start preparing about one month before the due date. They assume the particulars are unchanged unless the client says otherwise, and update the year.
- They check the Registry's free document index by hand for changes the client made without telling them. Document downloads cost money, so they ask clients for updated documents instead. Allan says few clients file on their own.
- CSA fills the NAR1. Staff sometimes edit the PDF by hand to get exact formatting, down to the alignment of a NIL entry.
- Before sending anything, staff check internally that the client has paid. Accounting holds payment status (Xero, fed by HSBC); service staff have to ask them.
- After payment, staff email the client the annual return with:
  - the made-up date;
  - instructions to print two single-sided A4 copies and have a named director sign on a named page;
  - the return address and a return-by date;
  - a warning about the higher filing fee if it's late (UHY's example quotes HK$105 standard, up to HK$3,480);
  - a request to confirm whether the company has any mortgages or charges as at the made-up date (Part 9 of the NAR1), with details such as a bank statement if it has.
- The client returns the ink-signed copies. Staff scan them for records and deliver the stamped originals to the Registry; approval takes roughly three to five days.
- UHY's example email gave one made-up date in its heading and a different one in the charges paragraph. Dates computed once from the record and reused through the email avoid that.

**AGMs**
- Most clients pass written resolutions in lieu of an AGM.
- CSA supplies a basic version. Staff start from the previous year's Word document, cross-check the audit report and amend for client-specific changes.
- When audited accounts are late, the written resolution (or notice and minutes) states that the accounts are not yet available, and their consideration and adoption is deferred to an adjourned meeting or a later written resolution.

## UHY's current email wording (Ruby, 20 October)

Ruby supplied one real annual-return and AGM email. The client's and director's names are left out here. The pilot reproduces this structure and wording in the client's language, with every bracketed field filled from one computed record.

**Annual return section**
- "We enclose herewith the followings for your attention: [year] Annual Return ("AR") - made up to [made-up date]".
- Examine the AR; print TWO copies (A4, one-sided); [signing director] signs on page [signature page] "as the director of the Company"; return to UHY's office address by [return-by date] "to avoid an increased filing fee of up to HK$[maximum late fee] (standard fee is HK$[standard fee])".
- Part 9 (page 2): confirm whether the company has any mortgages or charges as at the made-up date ([made-up date]); if so, send details (e.g. a bank statement as at [statement date]) by email.

**AGM section**
- "We have prepared and enclosed herewith the following documents of the captioned company for your signatures arrangement." Examine them; print ONE copy (A4, one-sided); return the signed documents to UHY's office as soon as possible.
- Numbered list of enclosures, each with "Please sign on the signature line":
  1. Written Resolutions of the [Sole Director | Directors];
  2. Written Resolutions of the [Sole Member | Members] in lieu of an Annual General Meeting for the Year [year];
  3. Authorization letter.
- Closing note: by signing and returning the written resolutions, the member agrees the company need not send the notice under section 559(1)(a) of the Companies Ordinance that the resolutions have been passed (company-secretary verification needed).

**What the sample shows**
- The example gives three different dates for the same made-up date (17/10/2026 in the heading, 11 September 2026 in Part 9), and a return-by date (10 September 2026) earlier than either. It also numbers two enclosures "2". This looks like last year's or another client's email edited by hand. Generating every date and number from one record, and checking that the return-by date falls after the made-up date and before the filing deadline (a rule for company-secretary verification), removes this class of error.
- "Sole Director" and "Sole Member" wording must follow the company's actual numbers of directors and members from CSA.
- Filing fees (HK$105 standard, up to HK$3,480 late, as quoted) belong in playbook data with the late-fee bands, not in the template.

## Principles

- **The firm's systems stay the record.** CSA, DN, Access, Xero, the shared drive and the mailbox remain sources. The pilot writes results back into them: documents filed into the client folders on F:, Outlook drafts, and a status workbook plus an append-only review log on the share. If the pilot is switched off, staff keep everything without our app.
- **Light footprint.** No separate database service, job queue, installer framework or self-managed backup system. Source files are referenced by path and fingerprint, not copied. CRV maintains the installation remotely through UHY's IT company.
- **The AI suggests; staff approve.** Proposed changes to particulars, generated forms, AGM drafts, filing of scanned post, CDD completion and every outbound message need a staff click. Nothing is sent automatically.
- **Records stay on the firm's server; processing can happen anywhere.** UHY's requirement is that the client-records database lives on their server. Sending documents and email content to the product model (currently Gemini via OpenRouter, #22) is acceptable (Magnus, 6 October).
- **Statutory rules come from playbook data.** Annual-return and AGM deadlines, forms and notes come from the existing `annualReturn` and `agm` playbooks (`seed/playbooks.json`), marked for company-secretary verification. No deadline is hard-coded in pilot code.

## Package and local state

Several staff use the app, so it runs as **one backend process on UHY's Windows Server** (the server behind F:, confirmed 7 October), set up with UHY's outsourced IT company. Staff open it in a browser from their PCs. Program files and state stay on that server. The database file must not be opened by several copies of the app over the share: embedded databases are not safe with several writers on a network drive.

The server runs a portable bundle (Node runtime and the backend) as a Windows service under an agreed account. That account has read access to the approved share folders and CSA data, and write access to the agreed output folders. It accepts connections from the office network only, never from the internet, over HTTPS. Staff PCs trust it through a small private certificate authority created for the pilot and limited by X.509 name constraints to the server's own hostname, so it can't vouch for any other site. Its root certificate is installed once on each staff PC (by CRV over TeamViewer, as Topone asked); server certificates can then be renewed without touching the PCs again. The CA's private key is kept offline, never on the server. It makes outbound HTTPS connections to Microsoft 365 (Graph) and to the AI model provider's API, which receives document and email content for processing; UHY's IT company must allow both through the firewall, and we will give them the exact hosts to allow. Each staff member signs in, and every approval is recorded against the person who made it. A single-instance guard prevents two backends running against the same state.

State lives in an embedded database file owned by that one process. PGlite is the first choice because the existing schema and migrations are Postgres; the spike must confirm that the migrations, the NAR1 generator and the CDD module's queries run on it (`src/db/client.ts` currently assumes node-postgres and advisory locks). Fall back to SQLite for pilot tables only if PGlite fails. Every row carries the installation's `firm_id`. A single-firm installation on the firm's own server provides firm separation (#53); RLS remains required for any shared deployment.

Protected fields stored locally (ID numbers, residential addresses, dates of birth) are encrypted with a key held by Windows DPAPI for the service account. Mail credentials are held the same way.

Backup: the state file is copied daily to an agreed folder on the share, and the review log is mirrored there as it is written. UHY's existing backups, run by the IT company, cover both. Restore is a documented copy-back, tested with fictional data.

One gitignored installation config holds the approved share root (UNC path), CSA data location, authoritative DN workbook, optional Access export, mailbox, scan inbox folder and output folders. No source-mapping administration screens. Real paths, exports, emails and attachments never enter git. Source files are never edited, moved or renamed, except that approved scans move from the scan inbox into client folders.

## Connectors

1. **CSA (read-only).** CSA holds directors, secretaries, shareholders, significant controllers, share capital and the details the NAR1 needs. Topone reports (13 October) that CSA is installed on UHY's Windows Server with a Microsoft SQL Server database; they don't know its internal structure. Plan:
   - a SQL login with read-only rights (`db_datareader`) on the CSA database only, created by whoever administers that SQL Server instance;
   - map the tables during the assessment by reading the schema and comparing it with what CSA shows on screen for one company;
   - read with short queries outside busy hours so CSA is never slowed or locked;
   - never write to the database.

   UHY should first confirm that its CSA licence doesn't restrict reading its own database. **CRV does not contact CSA's vendor, P & L, about this:** P & L declined CRV's approach on 6 October and the KB records no approach through its customers. If a vendor export turns out to be necessary, that is UHY's own support request to P & L, made without CRV. Keep the source values next to every derived fact so staff can see where a particular came from.
2. **Shared files.** Read only approved directories: last year's annual return and AGM documents, audit reports and CDD evidence in each client folder. Read DN rows (financial year end, AGM month, registration anniversary, auditor, contact email, DD form, risk assessment) using a small installation-specific column mapping. Never open the `.laccdb` lock file as a database. Confirm which DN workbook is authoritative.
3. **Mail (Microsoft Graph).** UHY uses Microsoft 365. Graph works from the server with no one signed in. Access uses Exchange Online's RBAC for Applications, which scopes the app to named mailboxes:
   - the app registration (Topone offers a Cloud Application Administrator account for this);
   - **no tenant-wide Mail permission granted in Entra ID**, because that grant would cover every mailbox and override the scope;
   - an Exchange Administrator creates a management scope for the team mailbox(es) and assigns the `Application Mail.ReadWrite` role to the app within it. That role can read and create drafts but cannot send;
   - `Test-ServicePrincipalAuthorization` confirms the app is in scope for the team mailboxes and out of scope for another.

   UHY's client team uses three personal mailboxes, one per staff member, and each can open the others' (Magnus, 20 October). The scope is a mail-enabled security group containing exactly those three, so adding or replacing a team member is a group change, not a script change. The pilot reads all three, because a client's history can sit in any of them. The same message appearing in several mailboxes (copies, forwards) is recorded once, matched on its Internet message ID. Clients have no assigned staff member; anyone in the team may contact any client. A draft therefore goes into the mailbox of the staff member who prepares it in the app (they are signed in), and the other two can see it through their existing access. Because these are personal mailboxes, the pilot reads only messages exchanged with known client contacts or addresses, not the rest of the mailbox, and Allan tells the three staff in advance that the pilot reads their client email.

   The pilot reads client replies (attachments included, across separate threads) and creates drafts in the mailbox staff send from. Record scan coverage and errors, persist checkpoints and deduplicate reruns.
4. **Scanned post.** Ruby scans incoming post on the office Fujifilm Apeos C3570 into one scan inbox folder on the share (scan-to-folder settings to be set up with the IT company; PDF at 300 dpi). Harbourline watches that folder. For each scan it:
   - splits a batch into documents;
   - reads each with the model and identifies the document type (signed annual return, AGM papers, audit report, ID, address proof, Registry letter), the client company and, for CDD documents, the person;
   - works out the client folder on F: and a file name in the firm's convention;
   - moves it there, records it against the company's annual-return or CDD record, and stores extracted facts (for example ID expiry) as proposed facts;
   - keeps a filing log so any filing can be undone in one click.

   A document is filed automatically only when it matches exactly one client and its type is recognised; anything else goes to a review queue. For the first two weeks every filing waits for a one-click confirmation to measure accuracy. Nothing is overwritten. This is the same pipeline as CWCCPA's government-mail flow and is built once.
5. **Registry changes.** The Registry portal blocks automated browsers and must not be scripted (`CR_MONITORING.md`). Two routes:
   - **Version 0, assisted:** each company in the cycle has a "check the Registry" step showing what CSA holds. Staff check the free document index as today and record the result in one click.
   - **e-Monitor (Other Companies)** at HK$17 per company per year was offered and **declined by UHY on 9 October**: few clients file on their own. If that changes, use its email mode read through Graph (the webhook needs an internet-facing endpoint with a Hong Kong CA certificate). The assisted check stays for the pilot.

## The annual cycle

**Calendar.** Compute each company's annual-return due date (private company: within 42 days after the anniversary of incorporation) and AGM due date (private company: within nine months after the end of the accounting reference period) from the `annualReturn` and `agm` playbook rules, using incorporation date and year end from CSA, cross-checked against DN's registration anniversary, year end and AGM month. Disagreements between CSA and DN are shown to staff, never silently resolved. Deadlines within 30 days get the red stamp.

**Preparation, one month ahead.** For each company due, Harbourline assembles the particulars from CSA (directors, secretary, members, share capital, registered office), shows the assisted Registry check, and prepares the NAR1 and the AGM written resolutions (below). Staff review them.

**Payment gate.** Nothing goes to the client until payment is recorded as confirmed. In version 0 a staff member records "payment confirmed" after checking with accounting. Reading invoice status from Xero is a later improvement; it needs accounting's agreement and a Xero connection.

**Dispatch email.** After payment, Harbourline drafts the email in the contact's language, following UHY's current wording. Every date and amount comes from one computed source:
- made-up date;
- return-by date, leaving time to deliver before the filing deadline;
- the signing director's name and the page to sign, from CSA;
- the standard and late filing fees, from playbook data rather than pilot code;
- the Part 9 mortgages and charges question as at the made-up date;
- "tell us if anything has changed since last year";
- any outstanding CDD items (next section).

The NAR1 and resolutions are attached. Staff review and send it in Outlook. Proposed chase dates follow the two-week default and track the return-by date; staff decide each chaser.

**Reply.** Graph picks up email replies and attachments. Signed papers returned by post come through the scan inbox and are recorded as "signed copy received". The model proposes:
- the charges answer for Part 9;
- any changes to particulars, as a checklist delta citing the source message or document.

Staff accept or reject each one. A change to particulars means the NAR1 is regenerated and re-sent for signature. A change that needs its own filing (for example a director change) is flagged as a separate matter, as the `annualReturn` playbook notes. Staff update CSA themselves.

**NAR1.** Generate the NAR1 from the confirmed particulars with Harbourline's existing generator (`src/documents/cr-forms.ts`). It refuses continuation sheets and currency totals it can't fill; those companies fall back to CSA's form, and the card says so. For the first cycle, staff compare each generated NAR1 with CSA's output, and the pilot records differences: this measures whether it removes CSA's manual PDF fixes. The approved PDF is saved to the client folder for ink signing.

**AGM documents.** Default to written resolutions in lieu of an AGM, which most UHY clients use; a meeting (notice and minutes) is the alternative per client. Draft this year's papers from the previous year's Word document in the client folder and this year's audit report, carrying over standing items and updating dates, figures and changed particulars. Changes are tracked so staff see exactly what moved. Where audited accounts are late, use UHY's deferral wording: the accounts are not yet available, and their consideration and adoption is deferred to an adjourned meeting or a later written resolution. A follow-up item then waits for the accounts. The draft is saved as a Word file in the client folder for staff to edit.

**Status.** Each company moves through: due -> prepared -> payment confirmed -> sent for signature -> signed copy received -> filed -> registered. Staff record "filed" and "registered"; a scanned signed copy can propose "signed copy received". Status is mirrored to the workbook on the share.

## CDD inside the annual cycle

**Which companies enter the CDD flow.** UHY has no CDD tracker. The pilot never infers completion from files on F:; absent evidence is not proof of anything. Instead:

1. **Cleanup record:** UHY records each company it completes in the current refresh, with the date and Allan's sign-off. Preferably this goes in DN's existing DD form column, or in a simple list on the share. Any company in the annual cycle without a completed entry enters the CDD flow.
2. **New people:** a director, shareholder above the firm's threshold, controller or authorised person added through a client reply or a Registry change gets CDD for that person.
3. **Expiring documents:** an ID that has expired or expires before the next annual return reopens that person's CDD (UHY policy, 6 October).
4. **Periodic review:** due under the firm's risk-rating policy, once that is defined.

**What CDD adds to the request.** Missing items for the flagged people and company are added to the same dispatch email: passport or HKID and proof of address within three months for individuals; the annual return and an organisation chart for companies (Allan, 7 October). Evidence arrives by email or scan and is recorded as received.

**Who does what.** Coe or Ruby assess the evidence and prepare the case; Allan signs off completion. The pilot enforces the two steps: the preparer can't sign off their own case. Completion is written to the status workbook and the cleanup record.

**Whether CDD blocks the annual return.** By default the annual return and AGM go ahead while CDD is outstanding: the annual return has a statutory deadline and late fees. The company card shows CDD as outstanding until Allan signs off. Whether UHY wants a firm rule that stops other new work until CDD is done is for Allan to decide.

**Effort.** Most of what CDD needs is already built for the annual cycle: the CSA roster of people, company contacts, the dispatch email and chasers, the mail and scan intake, filing into F: and staff approvals. CDD adds:
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

**CSA data (UHY's IT company, Topone; most blocking)**
Topone answered on 13 October: CSA uses Microsoft SQL Server on UHY's server; they offered a temporary domain administrator account for the assessment, a dedicated service account once requirements are known, a Cloud Application Administrator account for the app registration, and AnyDesk for remote access.

On 20 October Topone gave CRV an administrator account with the Exchange Administrator role added (for the RBAC for Applications setup), AnyDesk access to the Windows Server, and an unlicensed Microsoft 365 account. They confirmed outbound HTTPS from the server is unrestricted, and offered a quotation if the server needs more hardware. They asked CRV to install the HTTPS certificate on each staff PC remotely, arranging TeamViewer access with each user. Credentials are held in a password manager only, never in this repo, the KB or chat. Still open:
- Who administers the CSA SQL Server instance and can create a read-only login; whether UHY's CSA licence restricts reading the database.
- The three personal mailbox addresses (Magnus to supply).
- Whether the administrator account is a domain administrator; if so, use it only for the setup steps that need it, and ask Topone to change its password once setup is done and the dedicated service account exists.
- Whether AnyDesk sessions on the server are approved by someone at UHY each time or left unattended.
- Windows Server version and spare capacity (measured during the assessment), and scan-to-folder on the Apeos C3570.
- Certificate approach for staff PCs: installed per PC over TeamViewer, so it must be long-lived and must not let the pilot impersonate other sites (see "Package and local state").

**Sample companies (Coe, Ruby)**
- UHY will send last year's annual returns and related documents in one batch once we confirm what we need. Financial statements are client-confidential: UHY wants an NDA signed before sharing them. Until then, AGM drafting is built and tested against a fictional audit report.
- Magnus can also collect the documents on his next office visit.
- Last year's AGM written resolutions and the email exchange from last year's cycle for each company.
- Where signed and filed papers are saved on F:, with three or four example file names.

**Annual returns (Coe, Ruby, accounting)**
- Are the annual return and AGM sent in one email or two? Does the AGM section only appear when the AGM falls in the same window?
- What is the authorisation letter enclosed with the AGM papers, and who is it addressed to?
- How the bank-statement date in the Part 9 request is chosen (the sample uses the month end before the made-up date).
- How staff learn a client has paid today, and whether accounting would later let the pilot read invoice status from Xero.
- How the return-by date is chosen (UHY's example asked for signed papers back well before the 42-day deadline).

**CDD (Allan)**
- Whether the cleanup can be recorded per company with date and sign-off, and where (DN's DD form column or a separate list).
- Whether outstanding CDD should ever block an annual return, AGM or other work.
- Whether Ruby's earlier chase checklist (A01/A02 forms, certification, engagement letter, authorisation letters) still applies alongside the 7 October list.
- What record of a Zoom call is kept; whether "within three months" for proof of address runs to receipt or to review; risk rating and review frequency; how often Sentroweb screening is re-run.

**Scanned post (Ruby)**
- Whether an incoming-post log exists, and whether one envelope often holds documents for several clients.
- Whether paper originals are returned, kept or destroyed after scanning.

**Access**
- Which staff need the app.

## Work order and red/green acceptance

1. **Spike on fictional data:** PGlite running the migrations and the NAR1 generator; a fictional CSA data sample in the confirmed format; a fictional share; a test Microsoft 365 mailbox through Graph; a fictional scan folder.
2. **The annual-return loop for one company:** calendar, NAR1, payment gate, dispatch draft, reply and signed-copy intake, status, filing into F:.
3. **AGM written resolutions** from last year's Word document and the audit report, including the deferral case (fictional audit report until an NDA is in place).
4. **Scanned post and the assisted Registry check.**
5. **CDD folded into the request,** with two-step sign-off.
6. **Run on UHY's server, PCs and mailbox** with the five real companies before calling it usable.

Before implementation, write and run failing business tests, then report the actual red and green runs. Minimum acceptance tests:

**Annual cycle**
- "an annual return is due 42 days after the incorporation anniversary for a private company, from playbook data".
- "an AGM is due nine months after the accounting reference period ends for a private company, from playbook data".
- "a difference between CSA and DN on year end or incorporation date is shown to staff, not resolved silently".
- "no dispatch email is drafted before payment is recorded as confirmed".
- "the made-up date, return-by date and charges date in a dispatch email all come from the same computed record".
- "filing fees in the dispatch email come from playbook data".
- "the dispatch email includes outstanding CDD items only for flagged companies".
- "a change to particulars after dispatch regenerates the NAR1 and requires a fresh signature".
- "a change proposed from a client reply does not alter particulars until staff accept it".
- "an accepted director change is flagged as a separate matter".
- "a NAR1 the generator cannot fill completely falls back to CSA and says so".
- "the AGM draft shows every change from last year's document".
- "late audited accounts produce the deferral wording and a follow-up item, never last year's figures".
- "a company is not marked filed or registered without a staff action".

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
