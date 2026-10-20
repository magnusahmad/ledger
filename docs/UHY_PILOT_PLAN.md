# UHY-ASK pilot: implementation plan

Owner: Magnus Ahmad
Last reviewed: 2026-10-20
Status: working plan. Target dates are estimates and move with UHY's answers.
Related: [Pilot brief](UHY_AR_AGM_PILOT.md) (what the pilot does and its acceptance tests), [Decisions](DECISIONS.md) #53–55, [UHY-ASK KB page](../crv-kb/research/targets/uhy-ask.md).

This plan says who does what, in order, to get the [pilot brief](UHY_AR_AGM_PILOT.md) running at UHY. Each stage lists what Magnus does, what Claude builds or prepares, what UHY or Topone must do, and how we know the stage is done. Tick items off here as they happen.

## Timing reality

The five sample companies have annual returns due roughly between early November and early December 2026. UHY starts preparing a month before the due date, so the earliest are already in preparation, and the pilot won't be live in time for them.

- **This cycle (the five):** Coe and Ruby do them by hand as usual and time each step. That is the baseline. We also use their documents to test the NAR1 generator and AGM drafting against real outputs.
- **Pilot cycle:** companies due from mid-December 2026 to January 2027, run through the pilot side by side with the manual process.

Ask Allan to agree this switch (Stage 0).

## Stage 0: Accounts, agreements and asks (this week)

**Magnus**
- [ ] Put every credential Topone sent (server admin account, AnyDesk IDs, Microsoft 365 account) in a password manager vault. Delete them from email and notes. Never paste them into chat, the repo or the KB.
- [ ] Ask Leon two things: is `uhyadmin` a domain administrator? Are AnyDesk sessions on the server approved by someone at UHY each time, or unattended?
- [ ] Send Allan:
  - the three personal mailbox addresses (or ask Topone);
  - confirmation that UHY's CSA licence allows reading its own SQL database;
  - a request that he tell Coe and Ruby the pilot will read client email in their mailboxes;
  - where the CDD cleanup will be recorded (DN's DD form column or a list);
  - whether outstanding CDD should ever block an annual return;
  - the switch above: time the five by hand now, pilot the companies due from mid-December;
  - for the five: last year's annual returns, AGM written resolutions and annual-return emails, in one batch or collected on your next visit.
- [ ] Review the revised NDA (Claude), fill in the parties and send it to Allan, so the financial statements can follow.
- [ ] Create a separate OpenRouter API key for the UHY installation, with a monthly spend limit.
- [ ] Set up a Windows test machine for us: a Windows Server or Windows 11 VM (on the Mac, or a cloud VM). Everything is tested there before it touches UHY's server.
- [ ] Set up a test Microsoft 365 tenant with two or three test mailboxes, so the mail connector is built without UHY's mail.

**Claude**
- [ ] Rewrite NDA clauses 5.3 and 5.4: client records stay on UHY's server; AI processing allowed through named providers, with no training on UHY data and no location restriction.
- [ ] Write the server assessment checklist and read-only scripts (Stage 1).
- [ ] Write the mailbox-access PowerShell script (Stage 2).
- [ ] Draft the emails above.

**Done when:** mailbox addresses received, CSA licence confirmed, NDA sent, assessment session booked.

## Stage 1: Server assessment (one AnyDesk session, 1–2 hours)

Look only. No installs, no changes, and no client data leaves the server.

**Before**
- [ ] Magnus books a time with Allan, so UHY knows when CRV is connected.
- [ ] Claude prepares:
  - a PowerShell script for server facts (Windows version, CPU, memory, free disk, .NET and PowerShell versions, outbound HTTPS test to Microsoft 365 and OpenRouter);
  - a SQL script that exports CSA's schema only (tables, columns, types, keys, row counts; no values);
  - a mapping worksheet listing the fields the NAR1 and AGM papers need, to fill in against CSA's tables.

**Magnus, during the session**
- [ ] Connect over AnyDesk with the server account.
- [ ] Run the server-facts script; save its output.
- [ ] Find the SQL Server instance CSA uses and the CSA database name. Check whether the account can connect to it (domain administrators are often not SQL administrators).
  - If it can: create a SQL login with `db_datareader` on the CSA database only, store its password in the vault, and confirm it can read but not write.
  - If it can't: note who can, and ask Topone or UHY for the login.
- [ ] Run the schema export. Copy only that file off the server.
- [ ] Open CSA on one company. For each field on the mapping worksheet (directors, secretary, members and shares, registered office, incorporation date, year end, NAR1 particulars), find the matching table and column with a lookup query. Record table and column names only, never the values. If CSA has a demo or test company, use that.
- [ ] On F:, note the folder structure, where the DN workbook is (and which of the two similar ones is current), and the naming pattern for annual return and AGM files. Record patterns, not client names.
- [ ] Confirm the server can reach `graph.microsoft.com` and `openrouter.ai` over HTTPS.
- [ ] Disconnect. Tell Allan you're done.

**After**
- [ ] Claude writes the CSA mapping into the brief and generates a fictional CSA dataset with the same structure.
- [ ] Magnus decides whether the server has capacity (the pilot needs roughly 2 GB of memory and a few GB of disk). If not, ask Topone for a quote.

**Done when:** we can say which tables and columns hold every NAR1 field; read-only SQL access exists or is requested; server capacity is known.

## Stage 2: Mailbox access (30–60 minutes, after the addresses arrive)

**Magnus**
- [ ] Ask Topone to create a mail-enabled security group containing exactly the three team mailboxes. You can do it yourself with the admin account if Leon prefers.
- [ ] In Microsoft Entra (portal.azure.com), signed in with the account Topone provided:
  - register an app named "UHY Harbourline pilot";
  - add a certificate credential. Generate it on UHY's server so the private key never leaves it; Claude provides the command;
  - **do not add or consent to any Microsoft Graph mail permission in Entra.** That would open every mailbox at UHY;
  - from **Enterprise applications** (not App registrations), copy the Application ID and Object ID.
- [ ] Run Claude's PowerShell script with the Exchange Administrator account. It:
  1. connects to Exchange Online;
  2. registers the app's service principal in Exchange;
  3. creates a management scope matching that security group;
  4. assigns `Application Mail.ReadWrite` (read and draft, cannot send) within that scope;
  5. tests that the app is in scope for each of the three mailboxes and out of scope for one other mailbox.
- [ ] Wait up to two hours for Microsoft's permission cache, then run Claude's smoke test from the server. It lists folder names and message counts only, no content.
- [ ] Save the IDs (not the certificate) to the vault, and the test output to the pilot notes.

**Done when:** the test shows access to the three team mailboxes and no access to any other mailbox.

## Stage 3: Build on fictional data (CRV side, about 3–4 weeks)

Claude builds test-first, following the brief's work order and acceptance tests, on the `uhy-cdd-pilot` branch or a successor. Real red and green test runs are reported at each step.

| Step | Claude builds | Magnus checks |
|---|---|---|
| 3a Spike | PGlite running existing migrations and the NAR1 generator; packaged as a Windows service; a fictional CSA database in SQL Server; Graph against the test tenant | Install and run it on the Windows test VM; service starts, survives a reboot, health page loads |
| 3b Annual-return loop | Calendar from CSA and DN, NAR1 from CSA particulars, assisted Registry check, payment gate, dispatch draft in the preparer's mailbox, reply intake and proposed changes, status, filing to a fake F: | Walk through one fictional company end to end. Compare the generated NAR1 with a real NAR1 from the five (public documents) |
| 3c AGM | Written resolutions from last year's Word document and the audit report, with tracked changes and the deferral case | Compare with UHY's real resolutions from the five; fictional audit report until the NDA is signed |
| 3d Scanned post | Scan inbox watcher, split, classify, match, file with undo, confirmation mode | Drop test scans into the fake scan folder; check matching and undo |
| 3e CDD | Cleanup record, triggers, CDD items in the dispatch email, two-step sign-off, ID expiry | Check that the preparer can't sign off their own case |
| 3f Pilot CA and HTTPS | Script to create the name-constrained pilot CA offline and issue the server certificate | Create the CA on your machine; keep its private key offline (encrypted USB or the password manager), never on the server |

**Magnus, throughout**
- [ ] Review each checkpoint in the browser in English and Chinese.
- [ ] Send Topone the dedicated service account's exact permissions once 3a is done (Claude drafts them): log on as a service; read-only on the approved F: folders; write to the client folders and the pilot's state folder; the CSA read-only SQL login.
- [ ] Ask Coe or Ruby how the return-by date is chosen today, so the dispatch email matches.

**Done when:** every acceptance test in the brief passes, and the packaged build runs cleanly on the Windows test VM.

## Stage 4: Install on UHY's server (one AnyDesk session, about 2 hours)

**Before**
- [ ] Topone has created the dedicated service account.
- [ ] Book the time with Allan, ideally outside office hours.
- [ ] Claude prepares the release bundle, an install script and a rollback script (stop and remove the service; F: and CSA are untouched by design).

**Magnus**
- [ ] Copy the bundle to the server with AnyDesk's file transfer.
- [ ] Fill in the installation config on the server only: share paths, DN workbook, CSA connection, scan folder, the three mailboxes, OpenRouter key (stored with DPAPI, not in the file).
- [ ] Install the service under the dedicated service account; install the server certificate.
- [ ] Run the health check: CSA read, F: read, Graph read, OpenRouter call, daily backup to the share.
- [ ] Confirm the app answers only on the office network.
- [ ] Ask Topone to retire or re-password the temporary admin account if it's no longer needed.

**Done when:** the health check is green and the app loads in a browser on the server.

## Stage 5: Staff PCs (about 15 minutes per PC over TeamViewer)

**Before**
- [ ] Allan has told Coe and Ruby the pilot reads client email in their mailboxes.
- [ ] Agree with Allan who gets access (Coe, Ruby, Allan, anyone else).

**Magnus, per PC**
- [ ] Arrange a time with the user and get their TeamViewer ID and password at that moment. Don't store them.
- [ ] Install the pilot CA root certificate into the PC's Trusted Root store, using `uhyask\uhyadmin` (Topone's instruction).
- [ ] Open the app, check there is no certificate warning, create the user's account, bookmark it.

**Done when:** every user signs in with no browser warnings.

## Stage 6: Live run with the pilot cycle (6–8 weeks, side by side)

**Magnus**
- [ ] Day-one session in person with Coe and Ruby: run the first company together.
- [ ] Scanned post runs in confirmation mode for the first two weeks.
- [ ] Weekly 20-minute check-in: what was slow, wrong or missing. Claude fixes test-first between check-ins.
- [ ] Weekly: review the pilot's error log and OpenRouter spend.
- [ ] Record per company:
  - minutes at each step against the baseline from the five;
  - differences between the generated NAR1 and CSA's;
  - proposals accepted and rejected;
  - scans misfiled.

**Coe and Ruby**
- Use the pilot for the pilot-cycle companies: record payment confirmation, review and send drafts, compare NAR1s with CSA's, file as usual.

**Done when:** the pilot-cycle companies are filed through the pilot, with measured time per company.

## Stage 7: Turn on the rest

- [ ] Switch scanned post from confirmation mode to automatic filing if accuracy over the two weeks supports it.
- [ ] Switch on CDD in the dispatch email for companies without a cleanup entry.
- [ ] Run a full monthly cycle.

## Stage 8: Wrap-up and next decision

- [ ] Write up measured hours saved (KB: UHY-ASK page and the thesis validation register). This is fundraise evidence.
- [ ] Review with Allan: keep running, extend (Xero payment status, more of the AGM work), or stop. If stopping, uninstall and leave UHY's systems as they were.
- [ ] Ask Topone to rotate any remaining admin passwords CRV used.
- [ ] Revisit the conditional HK$17k CSA-replacement offer only if the pilot results justify it.

## What Magnus needs to obtain

| Item | For | When |
|---|---|---|
| Password manager vault | All UHY credentials | Now |
| Windows test VM | Testing the package before UHY's server | Stage 0 |
| Test Microsoft 365 tenant with 2–3 mailboxes | Building the mail connector | Stage 0 |
| OpenRouter key with a spend limit | The UHY installation | Stage 0 |
| Encrypted offline storage | The pilot CA's private key | Stage 3f |
| SQL Server Developer Edition (free) on the test VM | The fictional CSA database | Stage 3a |
