# UHY-ASK pilot: gap to first deployment

Owner: Magnus Ahmad
Last reviewed: 2026-11-04
Status: gaps 1–7 built against fictional data on 4 November (decision #59); Windows steps untested until the first install. What remains needs the pilot machine: see "Still to do on the machine" at the end.
Related: [Pilot brief](UHY_AR_AGM_PILOT.md) (what the pilot does, acceptance tests), [Implementation plan](UHY_PILOT_PLAN.md), [Decisions](DECISIONS.md) #53–58.

## Where we stand

| Area | State | Reuse |
|---|---|---|
| Access, findings, data route | Done: server assessed, CSA read from its own SQL Server backups (licence confirmed), machine confirmed, NDA signed, Topone engaged | — |
| Setup scripts | Written (`scripts/uhy/`): assessment, CSA backup checks, mailbox certificate, mailbox scope, smoke test | Restore script and mapping queries still to write |
| Domain engine | Built: playbooks, deadlines, register tables (effective-dated), approval gate, chasing, NAR1 generator (spec 2/2025), generic resolution templates | Most of the annual-return loop sits on these |
| Mail room (#57, #58) | Built for CWCCPA: scan folder watcher, split, match in code, filing by firm rules with no overwrite, undo, Outlook `.eml` drafts, client list synced from Excel/Access/folders | Scanned post, F: filing rules, DN workbook sync |
| Running on Windows | **Not started** | — |
| Sign-in, users, HTTPS | **Not started** (single user, #24) | — |
| CSA connector | **Not started** | — |
| Microsoft 365 mail | **Not started** (only Gmail and AgentMail adapters) | Mail adapter interface |
| Email relevance gate | **Not started**; today's intake would turn every unknown sender into a triage card | — |
| Annual-return and AGM case flow for UHY | **Not started** as a UHY flow | Engine pieces above |
| Module switches (#56) | Decided, **not in code** | `src/lib/config.ts` |

So the remaining work is the shell around the existing engine: running on Windows, people signing in, reading CSA and Microsoft 365, keeping irrelevant mail out, and the UHY case flow.

## Gap 1: Running on Windows

- **Database: real PostgreSQL, not PGlite (decision needed; recommended).** The app relies on PostgreSQL features the embedded database may not support: advisory locks (`src/db/client.ts`), the pg-boss job queue and node-postgres. We are already installing SQL Server Express on the machine, so a second database service adds little. Install PostgreSQL 17 (Windows binaries) as a service, listening on localhost only. This revises #53's "no separate database service".
- **App runtime.** Node 22 LTS (portable), Next.js standalone build, and the worker. Each runs as a Windows service under the dedicated domain account, using WinSW (a single small executable, MIT licence). Both start automatically at boot with no one signed in.
- **Front door.** Caddy (single binary) on the office network only, terminating HTTPS with the pilot certificate and forwarding to the app on localhost. The Windows firewall allows the port from the office subnet only.
- **Config and secrets.** One config file outside the repo (paths, mailboxes, schedule). Secrets (OpenRouter key, Graph credential, database password) encrypted with Windows DPAPI for the service account. Never in the config file, logs or repo.
- **Operations.** A health page (CSA copy age, database, Graph, OpenRouter, share access, last backup); logs rotated on disk; daily `pg_dump` to an agreed folder on the share; install, upgrade and rollback scripts. Rollback stops and removes the services and leaves CSA and F: untouched.

## Gap 2: Sign-in, users and HTTPS

- Local accounts for each staff member (Coe, Ruby, Allan, Magnus): passwords hashed with scrypt, session cookies (HttpOnly, Secure, SameSite=Strict), lockout after repeated failures, accounts created by a command-line tool, no self-registration.
- Every approval, edit and draft records the user. Roles: preparer and approver, so a preparer can't approve their own CDD case (#54) when CDD is switched on.
- **Pilot certificate authority:** a script that creates a name-constrained CA (valid only for the pilot host's names) and the server certificate. The CA key stays offline. The root goes onto each staff PC once.

## Gap 3: Reading CSA

- **On the machine:** SQL Server 2022 Express. A scheduled task copies the newest `.csa` file from the "CSA Backup" share, restores it as `CSA_Copy` (`WITH MOVE, REPLACE`), sets it read-only, and records the backup time. If a restore fails, the last good copy stays in use and the health page says so.
- **Table mapping** on the restored copy during the first session (queries to write): companies, directors and secretaries, members and shareholdings, share capital, registered office, incorporation date, year end, presenter details.
- **Connector:** the `mssql` package, read-only login to `CSA_Copy`. It imports particulars into Clerk's register tables marked as coming from CSA, with the backup time (#56). Re-runs are idempotent. Every screen using CSA data shows its age.

## Gap 4: Microsoft 365 mail (Graph)

- **Credential (change needed):** Node can't use a certificate whose private key is non-exportable in the Windows store, which is what `new-app-cert.ps1` creates. Instead: create the key as a file readable only by the service account, with its password protected by DPAPI. Alternatively use a client secret (maximum 24 months), stored with DPAPI. Update the script before the session.
- **Reading:** delta queries per mailbox for Inbox and Sent Items only, checkpointed and resumable, with messages deduplicated on Internet message ID. Initial look-back limited to the current cycle (default 60 days).
- **Drafts:** create the draft in the preparer's mailbox with attachments (upload sessions for files over 3 MB). The app never calls send; the role used can't send.
- Then the relevance gate (Gap 5), before anything is stored.

## Gap 5: Keeping spam and unrelated email out (new requirement, 4 November)

The pilot reads three personal mailboxes that receive newsletters, spam, internal mail and correspondence on matters outside the pilot. None of it may create cards, tasks or drafts, or slow the queue. Today's intake would turn every unknown sender into a "new customer" or "which client?" card, so the pilot replaces that path with a gate. Order of checks:

1. **Scope, deterministic, nothing stored:**
   - only Inbox and Sent Items; never Junk, Deleted Items, Drafts or Archive;
   - skip what Exchange marks as spam (the spam verdict in the anti-spam header);
   - skip auto-replies and delivery failures (`Auto-Submitted`, out-of-office, NDR content types), bulk and newsletters (`List-Id`, `List-Unsubscribe`, `Precedence: bulk`), calendar invitations, and mail where every participant is a UHY address (internal).
2. **Link to a case, deterministic:** a message is kept only if
   - it is in the thread of an email the pilot drafted (matched on `conversationId`, `In-Reply-To` or `References`); or
   - its correspondent (sender of inbound mail, recipient of sent mail) is a contact of a company currently in the pilot's annual-return or AGM cycle, from DN, CSA or earlier linked mail, within that company's cycle window.

   A message matching contacts of more than one company in cycle is linked to none and asks staff which.
3. **Everything else is ignored:** no content stored, nothing shown. Only counts per reason are kept for the coverage report ("1,240 messages scanned: 6 linked, 1,180 outside scope, 54 spam or automated"). Unrelated client correspondence stays in Outlook for staff as today.
4. **Within a linked message, the model only proposes:** whether it answers the charges question, confirms or changes particulars, returns signed papers, or carries CDD documents. Everything is reviewed in shadow mode (#56). A linked message about something else entirely is shown as "not about this annual return", with no proposals. The model never decides relevance on its own, and nothing depends on its confidence.
5. **Manual link:** staff can attach an email the gate missed (for example from a new person at the client) from the case page, by searching the three mailboxes by sender or subject. The link is recorded as a defect of the gate, per #56.
6. **Switched off for this installation (#56):** new-customer intake, new-request planning, quotations, invoices and the general question answerer. A stray email therefore has no path to a task or a prospect.

Acceptance tests (red then green, against fixtures):
- "a newsletter from an unknown sender is not stored and creates nothing";
- "mail in Junk or Deleted Items is never read";
- "an out-of-office reply in a dispatch thread does not change the case";
- "email between UHY staff only is ignored";
- "a known client's email on an unrelated matter creates no proposal";
- "a reply in the dispatch thread is linked to its company";
- "a reply in a new thread from a contact of a company in cycle is linked";
- "an email from contacts of two companies in cycle asks staff and links to neither";
- "a manual link records a gate defect";
- "the coverage report counts skipped mail without storing its content";
- "with new-customer intake switched off, an unknown sender can never create a prospect".

## Gap 6: The annual-return and AGM case flow for UHY

- **Case list:** each company due in the next two months, from CSA dates cross-checked with DN, with stage, due date, red stamp within 30 days, CSA copy age and CDD flag. Staff can start a case at its current stage (not started, prepared, invoiced, sent, signed copy received, filed).
- **Steps:**
  1. assisted Registry check (staff record the result);
  2. NAR1 from CSA particulars with a side-by-side record against CSA's form (the NN3 company flagged to use CSA);
  3. payment gate (staff record "payment confirmed");
  4. dispatch email in UHY's wording, in English, Traditional or Simplified Chinese, with every date and fee from one record. Checks: return-by date after made-up date and before the deadline; late-fee bands from playbook data; sole or plural director and member wording;
  5. AR and AGM combined when their windows overlap;
  6. status to filed and registered (staff record).
- **AGM papers:** firm templates from UHY's 2025 wording, standing clauses confirmed once per company, audit-report facts extracted and confirmed (#56). This can follow go-live by a week; the first dispatches are annual-return only, or staff attach their own AGM PDF.
- **Writing back:** generated PDFs saved to the client folder on F: using the mail room's naming rules and no-overwrite filing; a status workbook and review log on the share (exceljs).

## Gap 7: Module switches (#56)

Implement the installation's module list in config: UHY gets annual returns, AGM, CDD (off until switched on) and mail room (scan inbox, off at first). Switched-off modules don't load their routes, workers or menu entries. A production installation refuses to start with a fake or demo adapter configured.

## Deferred past first deployment

Scanned post via the mail room, CDD switch-on, Xero payment status, the shadow-mode statistics view, and the confidence routing in the existing intake (`MIN_CONFIDENCE` in `src/domain/inbound.ts`). That code is switched off for UHY, but #56 means it must be removed before any installation uses it.

## On the machine tomorrow (no app needed)

1. Check Topone's setup: domain joined, service account, F: network path, local admin.
2. Install SQL Server 2022 Express, PostgreSQL 17 and Node 22.
3. Restore the latest CSA backup as `CSA_Copy` and run the mapping queries together.
4. Register the Graph app and run the mailbox-scope script (needs the three addresses), using the revised credential approach.
5. Note the client folder layout on F: and the scan folder path.

## Order of work and honest timing

1. **Days 1–2:** Gap 1 (runtime, PostgreSQL, services, Caddy, config, health) and Gap 7, tested on a Windows VM.
2. **Day 3:** Gap 2 (sign-in, users, certificates).
3. **Days 3–4:** Gap 3 (restore task and CSA connector), after tomorrow's mapping.
4. **Days 4–6:** Gaps 4 and 5 (Graph and relevance gate), tested against a test tenant and fixtures.
5. **Days 6–8:** Gap 6 (annual-return case flow and dispatch), then install, staff PCs and the first live company.

That puts first live use about **8 working days** from tomorrow's session (mid-November), assuming no major surprise in CSA's tables or Graph access. Annual returns for the five that fall due before then are done by hand and serve as the baseline; the pilot picks up the rest at their current stage.

## Built on 4 November (branch `uhy-cdd-pilot`)

| Gap | Where | Tests |
|---|---|---|
| 1 Running on Windows | `deploy/windows/` (install, services, secrets, Caddy, backups, guide), `src/worker/annual.ts`, `/api/health` | `annual-cycle` (4); Windows scripts untested |
| 2 Sign-in, users, HTTPS | `src/lib/auth.ts`, `/login`, `deploy/windows/pilot-ca.sh` | `pilot-auth` (8); CA script checked on macOS |
| 3 Reading CSA | `scripts/uhy/csa-restore.ps1`, `src/integrations/csa/` | `csa-import` (9) |
| 4 Microsoft 365 mail | `src/integrations/mail/graph.ts` | `graph-mail` (9) |
| 5 Relevance gate | `src/annual/mail-gate.ts`, `src/annual/mail-sync.ts` | `annual-mail-gate` (12), `annual-mail-sync` (9) |
| 6 Case flow | `src/annual/` (cases, dispatch, service, writeback, next-step), `/annual` screens | `annual-cases` (9), `annual-dispatch` (18), `annual-service` (5), `annual-writeback` (4), `annual-next-step` (4) |
| 7 Module switches | `src/lib/modules.ts`, `src/proxy.ts` | `pilot-modules` (13) |

Screens checked in the browser at 375, 768 and 1440 px with fictional data (`annual-demo` launch config).

## Still to do on the machine

1. Prerequisites and secrets (`deploy/windows/README.md` sections 2–3), then `install.ps1`.
2. First CSA restore, then write `csa-mapping.json` against the real tables and run an import.
3. Graph app registration, `new-app-cert.ps1`, `scripts/uhy/mailbox-rbac.ps1` with the three addresses, `mailbox-smoke.ps1`.
4. The F: share path and status folder in `.env.production`; confirm the client-folder pattern in `seed/uhy/filing-rules.json`.
5. Staff accounts, the CA certificate on staff PCs, and a first case end to end with Ruby.
6. Run the AI-free pilot first: nothing in this build calls the model yet. Reading client replies into proposed changes, AGM papers and CDD follow, in shadow mode (#56).
