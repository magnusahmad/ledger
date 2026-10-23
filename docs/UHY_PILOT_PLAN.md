# UHY-ASK pilot: implementation plan

Owner: Magnus Ahmad
Last reviewed: 2026-10-20
Status: working plan, fast track. Target dates are estimates and move with UHY's and Topone's response times.
Related: [Pilot brief](UHY_AR_AGM_PILOT.md) (what the pilot does and its acceptance tests), [Decisions](DECISIONS.md) #53–55, [UHY-ASK KB page](../crv-kb/research/targets/uhy-ask.md).

This plan says who does what, in order, to get the [pilot brief](UHY_AR_AGM_PILOT.md) running at UHY. Each stage lists what Magnus does, what Claude builds or prepares, what UHY or Topone must do, and how we know the stage is done. Tick items off here as they happen.

## Fast track: live for the five (decided 20 October)

The five sample companies have annual returns due roughly between early November and early December 2026, and UHY starts preparing a month ahead. Magnus decided on 20 October to have the pilot live for them, not a later cycle. Building isn't the constraint; UHY-side access is: the CSA table mapping, the mailbox addresses, the service account and the staff PCs. Every date below assumes UHY and Topone respond within a day.

| Target | Milestone | Gate |
|---|---|---|
| Thu 22 Oct | Server assessment done; CSA mapped for NAR1 fields | Allan agrees a session time |
| Fri 23 Oct | Mailbox access live and tested | Three addresses from Magnus or Topone |
| Wed 28 Oct | Fast-track build passes its tests on the Windows test VM | CSA mapping from Stage 1 |
| Thu 29 Oct | Installed on UHY's server | Dedicated service account from Topone |
| Fri 30 Oct | Staff PCs done; day-one session with Coe and Ruby | Staff available for TeamViewer |
| Mon 2 Nov onward | All five run through the pilot | — |

**Fast-track scope (live 30 October):** calendar; particulars from CSA; NAR1 generation with a side-by-side check against CSA's; the assisted Registry check; the payment gate; the dispatch email drafted in the preparer's mailbox; reading replies into proposed changes; status from due to registered; filing the generated papers to F:; the status workbook and review log.

**Follows in the next fortnight:** AGM written resolutions (AGM deadlines run from year end, so they won't always coincide with these annual returns); scanned-post filing (staff save signed copies to F: by hand meanwhile); CDD in the dispatch email.

**Companies already part-way through.** Some of the five will already have been prepared, invoiced or sent by 30 October. The pilot picks each one up at its current stage (staff set it once) and runs the remaining steps; it doesn't redo finished work.

**Fallback if CSA's tables are hard to read.** Last year's NAR1 for each company is on F: and is a public document. The model reads the particulars from it and staff confirm them, so the five aren't blocked while the CSA mapping is finished.

**Baseline.** The five run through the pilot, so Coe and Ruby time three to five other annual returns done by hand this month, step by step. Those timings are the comparison.

**AI checks before live.** The AI steps in this pilot (reading last year's NAR1, reading client replies into proposed changes, drafting the dispatch email) haven't been evaluated on documents like UHY's yet. Before 30 October, run them against the five companies' real annual returns and emails and review the results; drafting for live use is switched on only for steps that pass.

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
  - the fast track: the five run through the pilot from 30 October; Coe and Ruby time three to five other annual returns by hand as the baseline, and tell us each of the five's due date and current stage;
  - for the five: last year's annual returns, AGM written resolutions and annual-return emails, in one batch or collected on your next visit.
- [ ] Review the revised NDA (Claude), fill in the parties and send it to Allan, so the financial statements can follow.
- [ ] Create a separate OpenRouter API key for the UHY installation, with a monthly spend limit.
- [ ] Set up a Windows test machine for us: a Windows Server or Windows 11 VM (on the Mac, or a cloud VM). Everything is tested there before it touches UHY's server.
- [ ] Set up a test Microsoft 365 tenant with two or three test mailboxes, so the mail connector is built without UHY's mail.

**Claude**
- [x] Write the server assessment and mailbox scripts: `scripts/uhy/` (not yet run on Windows; check them on the test VM first).
- [ ] Rewrite NDA clauses 5.3 and 5.4: client records stay on UHY's server; AI processing allowed through named providers, with no training on UHY data and no location restriction.
- [ ] Draft the emails above.

**Done when:** mailbox addresses received, CSA licence confirmed, NDA sent, assessment session booked. Target: Wed 21 October.

## Stage 1: Server assessment (one AnyDesk session, 1–2 hours)

Look only. No installs, no changes, and no client data leaves the server.

**Before**
- [ ] Magnus books a time with Allan, so UHY knows when CRV is connected.
- [ ] Copy `scripts/uhy/` to the server (AnyDesk file transfer) into `C:\uhy-pilot\`.
- Scripts ready: `assess-server.ps1` (server facts and outbound HTTPS test), `csa-schema.sql` (tables, columns, types, keys, row counts; no values), `csa-find-value.sql` (which table holds a value you see on CSA's screen, printing names and counts only), `csa-readonly-login.sql`.

**Magnus, during the session**
- [ ] Connect over AnyDesk with the server account.
- [ ] Run `assess-server.ps1`; it writes `C:\uhy-pilot\out\server-facts.txt`.
- [ ] Find the SQL Server instance CSA uses and the CSA database name. Check whether the account can connect to it (domain administrators are often not SQL administrators).
  - If it can: run `csa-readonly-login.sql` for the account the pilot will use (read-only, with writes explicitly denied). Until the dedicated service account exists, use your own admin session for the schema export only.
  - If it can't: note who can, and ask Topone or UHY for the login.
- [ ] Run `csa-schema.sql` with sqlcmd (command in the file header). Copy only `csa-schema.csv` and `server-facts.txt` off the server.
- [ ] Open CSA on one company. For each field on the mapping worksheet (directors, secretary, members and shares, registered office, incorporation date, year end, NAR1 particulars), run `csa-find-value.sql` with a distinctive value from the screen to find its table and column. Record table and column names only, never the values. If CSA has a demo or test company, use that.
- [ ] On F:, note the folder structure, where the DN workbook is (and which of the two similar ones is current), and the naming pattern for annual return and AGM files. Record patterns, not client names.
- [ ] Confirm the server can reach `graph.microsoft.com` and `openrouter.ai` over HTTPS.
- [ ] Disconnect. Tell Allan you're done.

**After**
- [ ] Claude writes the CSA mapping into the brief and generates a fictional CSA dataset with the same structure.
- [ ] Magnus decides whether the server has capacity (the pilot needs roughly 2 GB of memory and a few GB of disk). If not, ask Topone for a quote.

**Done when:** we can say which tables and columns hold every NAR1 field; read-only SQL access exists or is requested; server capacity is known.

## Stage 2: Mailbox access (30–60 minutes, after the addresses arrive)

**Magnus**
- [ ] On the server, run `new-app-cert.ps1` (as administrator). It creates a non-exportable certificate and writes the public `.cer` file.
- [ ] In Microsoft Entra (entra.microsoft.com), signed in with the account Topone provided:
  - register an app named "UHY Harbourline pilot" (single tenant, no redirect URI);
  - upload the `.cer` under Certificates & secrets;
  - **do not add or consent to any Microsoft Graph mail permission in Entra.** That would open every mailbox at UHY;
  - from **Enterprise applications** (not App registrations), copy the Application ID and Object ID.
- [ ] Run `mailbox-rbac.ps1` with the Exchange Administrator account (parameters in its header). It:
  1. creates the mail-enabled security group with the three mailboxes, if Topone hasn't;
  2. registers the app's service principal in Exchange;
  3. creates a management scope matching that security group;
  4. assigns `Application Mail.ReadWrite` (read and draft, cannot send) within that scope;
  5. tests that the app is in scope for each of the three mailboxes and out of scope for one other mailbox.
- [ ] Wait up to two hours for Microsoft's permission cache, then run `mailbox-smoke.ps1` on the server. It lists folder names and counts only, and checks that the other mailbox is refused.
- [ ] Save the IDs (not the certificate) to the vault, and the test output to the pilot notes.

**Done when:** the test shows access to the three team mailboxes and no access to any other mailbox.

## Stage 3: Build on fictional data (fast-track scope by 28 October; the rest over the following fortnight)

Claude builds test-first, following the brief's work order and acceptance tests, on the `uhy-cdd-pilot` branch or a successor. Real red and green test runs are reported at each step.

| Step | Claude builds | Magnus checks |
|---|---|---|
| 3a Spike | PGlite running existing migrations and the NAR1 generator; packaged as a Windows service; a fictional CSA database in SQL Server; Graph against the test tenant | Install and run it on the Windows test VM; service starts, survives a reboot, health page loads |
| 3b Annual-return loop | Calendar from CSA and DN, NAR1 from CSA particulars, assisted Registry check, payment gate, dispatch draft in the preparer's mailbox, reply intake and proposed changes, status, filing to a fake F: | Walk through one fictional company end to end. Compare the generated NAR1 with a real NAR1 from the five (public documents) |
| 3c AGM | Firm templates from UHY's 2025 wording; per-company standing clauses read from last year's PDF and confirmed once; audit-report facts extracted and confirmed; the deferral case | Ask Coe or Ruby to review the template wording once. Compare generated papers with UHY's real 2025 resolutions; fictional audit report until the NDA is signed |
| 3d Scanned post | Scan inbox watcher, split, classify, client match in code on identifiers, file with undo, shadow mode | Drop test scans into the fake scan folder; check matching and undo |
| 3e CDD | Cleanup record, triggers, CDD items in the dispatch email, two-step sign-off, ID expiry | Check that the preparer can't sign off their own case |
| 3g Module switches | Installation module list; switched-off modules not loaded; no fake fallbacks; demo tools off; read-only register copy from CSA | Check the UHY build shows only the pilot's screens, and refuses to start with a setting missing |
| 3h Defect log | Every edit, rejection and addition to an AI output recorded as a defect; weekly defect report; shadow-mode switch per AI task | Edit a proposal in the test build and see the defect appear |
| 3i AI test sets | Frozen fictional test sets (about 30 cases each, EN/TC/SC) for reply reading, scan reading, audit-report facts and standing clauses; results reported under `eval/results/` | Agree the expected answers before the first run; read the report |
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

## Stage 6: Live run with the five, then the next month's companies (6–8 weeks)

**Magnus**
- [ ] Day-one session in person with Coe and Ruby: run the first company together.
- [ ] Every AI task starts in shadow mode: staff review every AI output before use, nothing is accepted in bulk. Never rely on the model's own confidence.
- [ ] Brief Coe and Ruby: correct anything wrong and add anything missed in the app (not outside it), because each change is recorded as a defect.
- [ ] Weekly 20-minute check-in: what was slow, wrong or missing. Claude fixes test-first between check-ins.
- [ ] Weekly: review the defect log (edited, rejected, missed) with Claude, plus the error log and OpenRouter spend. Each defect becomes a fictional test case and is fixed test-first.
- [ ] Record per company:
  - minutes at each step against the baseline from the five;
  - differences between the generated NAR1 and CSA's;
  - defects per AI task, by kind (edited, rejected, missed).

**Coe and Ruby**
- Use the pilot for the five and then the next month's companies: record payment confirmation, review and send drafts, compare NAR1s with CSA's, file as usual.

**Done when:** the five are filed through the pilot, with measured time per company against the baseline.

## Stage 7: Turn on the rest

- [ ] Move an AI task out of shadow mode only on its defect record. Proposed bar: at least 30 real items, no missed defects in the last 30, edits or rejections on fewer than 1 in 10. Staff still click to approve every client-facing or statutory output, and a missed defect puts the task back into shadow mode.
- [ ] Switch scanned post to automatic filing only when its defect record meets the bar; staff keep a daily list of filings they can undo.
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
