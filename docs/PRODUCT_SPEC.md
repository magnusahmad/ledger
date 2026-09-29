# Product spec

Status: draft from the prototyping phase, September 2026. The prototype in `prototype/` implements most of the UX described here with fake data and simulated integrations.

## 1. Background

Ledger is the operating platform for the Hong Kong co-sec firms CRV acquires in a roll-up (see `DECISIONS.md` #20). Those firms typically run on CSA Expert (P&L Software, Hong Kong), a Windows desktop product on SQL Server with Word/Excel document generation and USB hardlock licensing. We are **not cloning** it. CSA is organised around records and "jobs" that end at document generation. Everything around a job (understanding the client's request, collecting details, chasing, invoicing, payment, confirming) happens outside it. That gap is the product.

CSA's own vocabulary, useful for migration mapping: Client Master File (the company), Entity (people and corporates), Capacity (a role someone holds in a company), Retainer Service and Invoice master files, Jobs, and "Mass Production of Job" for batch changes. Its Client Master File has tabs: Domicile, Overseas, B/R, Register, Date, Share Capital, Contact, Analysis. Visible fields on Domicile include client ID, jurisdiction, company type, English and Chinese names, company number, document output language, operating status, client group, subsidiary of a public company, user group, staff-in-charge, registered office (English and Chinese), business nature (English and Chinese), and Companies Registry e-Registry credentials (stored in plain text in CSA, which we must not replicate).

## 2. Users

- **Company secretarial staff** (primary): senior company secretary, officers, assistants. Each client has a staff member in charge; tasks default to them and can be reassigned.
- **Firm managers/partners**: team workload, overdue invoices, deadlines across all clients.
- **Clients** (via a portal, later): upload documents, complete KYC selfie checks, e-sign, see status.
- **CRV group** (holdco operators): cross-firm reporting on workload, deadlines, receivables and hours saved; owns the shared playbook library.
- **Design partner** (phase 1): one potential acquisition target running a pre-acquisition workflow trial on real work, in an isolated deployment (see `DECISIONS.md` #20).

## 3. Core concepts

- **Client**: a company the firm services (or one being incorporated).
- **Person**: an individual or corporate entity (director, shareholder, controller, contact). A person can relate to multiple clients.
- **Playbook**: a configurable definition of a request type: category, trilingual names, trigger keywords, required information items, steps, documents generated, statutory deadline rule, fee, compliance notes, who starts it (client request or firm deadline calendar).
- **Task** (called "matter" early on): one playbook instance for one client. Has a current step, a checklist of requirement items (on file / waiting / received), extracted data, generated documents, linked invoice, assignee, activity log.
- **Invoice**: one or more lines (one per playbook in a request), number, amount, terms (upfront or N days), status, reminders.
- **Deadline**: computed from client data (incorporation anniversary, year end, BR expiry, KYC risk rating) or from a task's effective date.

## 4. Key flows

### 4.1 Start the day (Today)
Home screen for the signed-in user, in order of precedence:
1. **Needs you**: the user's tasks where the next step is theirs.
2. **Deadlines in the next 30 days** for the user's clients that don't yet have a task, each with Start.
3. **Overdue invoices** for the user's clients (only shown when any exist), with Remind.
4. **Waiting on clients** and **Awaiting payment** side by side.
Plus a link to the team's other open tasks.

### 4.2 Handle a client request (New request)
Entered from the client page's "New request" button (or from a deadline's Start).
1. **Input**: client + paste box only. Next.
2. **Identify** (loading state): detect one or more request types from the text; detect named people already on file. Show identified requests as removable chips; staff can add others (multi-select). For director playbooks, pick the person (existing officer, existing contact, or someone new). If the person already has current KYC, their ID and address proof are marked "on file" and not requested again.
3. **Prepare** (loading state): produce
   - the reply in the client's language (tabs to switch EN / 繁 / 简), covering all selected requests, asking only for what's missing, with a secure upload link, invoice line, and deadline line;
   - the invoice: number and each price are **inline-editable** (click to edit; total and message update live; duplicate or blank numbers rejected; custom numbers don't consume the auto sequence); payment terms dropdown defaulting to the client's usual terms;
   - checklist per request (on file / to request);
   - secure upload link.
4. **Create task(s)**: one task per request, all linked to one invoice. Copy message puts it on the clipboard for WeChat or email. (WeChat integration beyond copy/paste: see `WECHAT_INTEGRATION.md`.)

### 4.3 Work a task
- Steps list with the current step's action inline. Step kinds: send, pay, collect, kyc, name check, company search, board check, generate, sign, file, register, confirm, generic task.
- **Payment step** (upfront terms only): shows amount and invoice, "Check bank now", "Mark paid manually". Bank feed matching advances every task linked to the invoice.
- **Collect step**: waits until all checklist items are received. Paste the client's reply, "Extract details" pulls field values and attachment names into editable fields; staff confirm. Items can also be ticked manually. "Draft a chase message" lists what's outstanding.
- **Generate**: documents drafted from registers + extracted data; each previewable.
- **Register**: applies the change to client records (e.g. add/remove director, change registered office).
- **Confirm**: drafts the completion message in the client's language.
- Assignee dropdown; every action is logged.

### 4.4 Credit terms
Payment is flexible per client (usual terms: upfront, 14, 30, 60 days) and per request. On credit terms the task skips the payment step entirely and the invoice is tracked separately: due date, days outstanding, overdue flag, reminders. Payment reminders go to the client's **billing contact** in that contact's language, and each reminder is logged on the invoice and its tasks.

### 4.5 Client page
Header: names, company number, operating status, company type, staff in charge, New request. Tabs:
- **Overview**: open tasks, items the client owes, deadlines (with "last done"), completed tasks, at-a-glance card, unpaid invoices.
- **Company**: registration (jurisdiction, type, number, incorporated, operating status, client group, listed-subsidiary flag, staff in charge), registered office EN/ZH, nature of business EN/ZH, banks and signatories, key dates (year end, accounts last made up to, last AGM, last and next annual return), business registration (number, 1/3-year term, expiry, branches), document and message languages, auditor, Companies Registry e-account (vault-held, never displayed).
- **Shares and members**: classes (currency, issued, paid up, voting), members with holdings and %, dated share movements.
- **Officers and controllers**: directors (appointed, KYC), secretary, designated representative, significant controllers (nature of control, registrable since).
- **Records and filings**: filing history (including forms filed via tasks), document library, register locations, charges.
- **Contacts**: multiple contacts with role, channel, language; one flagged for invoices and reminders.
- **Billing**: invoice history, usual payment terms, billing contact.

Dormant companies: AGM/audit deadlines suppressed with an explanatory note.

### 4.6 Other screens
- **Tasks**: Mine / Everyone; filters Needs action, Waiting on client, Awaiting payment, Done, All.
- **Invoices**: outstanding and overdue totals; filters Unpaid, Overdue, Paid, All; Check bank and Remind per invoice.
- **Clients**: list with staff in charge, status, open tasks, next deadline; collapsible client list in the sidebar.
- **Playbooks**: library view for company secretary review (see `docs/PLAYBOOKS.md`).

## 5. Data model (target)

Multi-firm, not SaaS (see `DECISIONS.md` #20). Every row carries `firm_id`, isolated at the database layer (Postgres row-level security). Each CRV-owned firm has its own clients, staff, invoice sequence, bank connections and templates. Pre-acquisition trial firms run in a separate isolated deployment.

- `firm` (legal name, TCSP licence number, letterhead, invoice prefix and sequence, default sign-off, bank connections), `user` (firm, role, title, initials; group roles for CRV), `audit_log` (append-only).
- `playbook_override` (firm-level fees, templates and sign-off on top of the CRV library).
- `step_timing` (who, which task step, minutes; drives hours-saved measurement).
- `client`: names (en, tc, sc), company number, jurisdiction, company type, lifecycle status (onboarding, active, ceased), operating status (operating, dormant, deregistering, struck off), client group, listed-subsidiary flag, staff in charge, message language, document language, risk rating, usual payment terms, registered office EN/ZH, business nature EN/ZH, incorporation date, financial year end, accounts last made up to, last AGM, last annual return, auditor, register locations, designated representative.
- `business_registration`: number, term, expiry, branches.
- `person`: individual or corporate; names, Chinese name, ID numbers (encrypted; full ID and residential address are protected information), addresses, KYC status and review dates.
- `appointment` (effective-dated): person × client × role (director, alternate, reserve director, secretary), from/to, source task.
- `share_class`, `holding` (effective-dated), `share_movement` (allotment, transfer, buyback, cancellation; with stamp duty and filing refs).
- `significant_controller` (effective-dated): nature of control, registrable since, ceased.
- `charge`, `bank_account` (+ signatories), `contact` (role, channel, language, billing flag).
- `filing`: form, description, filed date, reference, source task.
- `document`: type, file, version, source task, client.
- `playbook` (versioned JSON config), `requirement_item`, `message_template`.
- `task`: playbook + version, client, person(s), assignee, step index, effective date, credit flag, checklist state, extracted data, source message, secure-link code.
- `task_event` (activity log).
- `invoice`, `invoice_line`, `payment` (bank transaction, match method), `reminder`.
- `bank_connection` (provider, credentials in vault, last sync).
- `inbound_message` (pasted text, attachments, detected intents) and `outbound_message` (drafts, language, copied/sent).

## 6. Playbooks (seeded)

12 drafts across four categories; details in `docs/PLAYBOOKS.md`.
- **Directors**: appoint a director (ND2A), director resignation (ND2A, ND4 optional).
- **Changes in particulars**: officer's details (ND2B), company secretary (ND2A), registered office (NR1), company name (NNC2).
- **New client onboarding**: incorporation (NNC1 with BR application), take over an existing company (ND2A, NR1).
- **Annual cycle**: annual return (NAR1), AGM and accounts approval, business registration renewal, periodic KYC review.

Not yet written but needed soon: share allotment (NSC1), share transfer (instrument of transfer, stamp duty), significant controllers register update, deregistration (IRD no-objection letter, NDR1), change of financial year end, reserve director nomination.

## 7. Statutory rules used (all require verification by the firm's company secretary)

- ND2A (appointment/cessation of director or secretary) and ND2B (change in particulars): within 15 days of the change.
- NR1 (registered office): within 15 days of the change. Check whether it also updates the Business Registration Office record.
- NNC2 (change of name): within 15 days after the special resolution; effective on the certificate of change of name.
- NAR1 for a private company: within 42 days after each anniversary of incorporation; late fees escalate.
- AGM for a private company: within 9 months after the end of the accounting reference period; can be replaced by written resolution or dispensed with unanimously.
- A private company needs at least one individual director (18+). Secretary: HK-resident individual or company with registered office/place of business in HK; a sole director can't also be sole secretary.
- Significant controllers register required; designated representative required.
- CDD records kept at least 5 years after the relationship ends. KYC review frequency is firm policy (prototype: high 1 year, medium 2, low 3).
- Residential address and full ID number are protected information under the Companies Registry's inspection regime.

## 8. Integrations

- **LLM (Anthropic API)**: intent detection (multi-label), person matching, field extraction from pasted text and screenshots, message drafting. Prototype uses keyword matching and regex. Use zero-data-retention terms; clients' ID documents pass through.
- **Speech-to-text** (later): Cantonese/Mandarin/English with code-switching. Evaluate providers on real voice notes. Store original, transcript and translation.
- **Email** (phase 2): Microsoft 365 / Google Workspace mailbox connection for ingest and sending.
- **WeChat**: in scope through official Tencent channels only. See `WECHAT_INTEGRATION.md` for options, recommendation and phasing.
- **Banks**: Airwallex (developer API and webhooks, expected to support incoming-deposit notifications; verify) and HSBC (corporate API access via relationship manager; slower). Match on invoice number + amount; fallback daily statement import; manual mark-paid. Ask clients to quote the invoice number as payment reference.
- **Accounting** (later): Xero or QuickBooks sync for invoices and payments.
- **E-signature**: vendor TBD; consider iAM Smart relevance for Hong Kong filings.
- **Companies Registry e-filing**: no known public API for third-party software. v1 generates filing-ready data and forms; staff submit on the CR portal under their own sign-in. Ask the Registry what options exist for TCSP-licensed firms.
- **KYC/screening**: eKYC (document + liveness) and sanctions/PEP screening vendor (e.g. Refinitiv World-Check, Dow Jones, ComplyAdvantage). Ongoing re-screening.

## 9. Recommended stack (confirm before scaffolding)

- TypeScript, Next.js (App Router) or a React SPA + Node API.
- Postgres with row-level security for tenancy; Drizzle or Prisma.
- Background jobs for bank polling, deadline computation, reminders (e.g. pg-boss, Inngest or Temporal).
- Object storage in a Hong Kong region (AWS ap-east-1 or Azure East Asia), encrypted.
- Document generation from .docx templates (e.g. docxtemplater) with PDF export.
- Auth with 2FA/SSO; role-based permissions; full audit log.
- Secrets vault (AWS Secrets Manager or HashiCorp Vault).

## 10. Migration utility

Sources: CSA Expert (SQL Server database; firms own their data, but check CSA licence terms or request an export from P&L), other secretarial software, Excel. Steps: connector per source → map to our model → validate (share movements reconcile to holdings, every director has an appointment date, etc.) → reconciliation report for staff to fix → dry run → short parallel run → cutover. Optionally spot-check against Companies Registry company searches.

## 11. Compliance and privacy

- Hong Kong PDPO applies to client personal data. Mainland cross-border data questions (PIPL) arise if any data or processing touches mainland infrastructure; get a privacy lawyer's view early.
- TCSP licence obligations: CDD before acting, record-keeping, suspicious transaction reporting processes.
- Human approval on every outbound message, filing and register change.

## 12. Known gaps in the prototype (to build properly)

- Share movements don't update from tasks (no allotment/transfer playbooks yet).
- Document output language isn't applied to generated documents.
- Deadline logic rolls forward on its own; it should use last-done dates to decide whether the current period is satisfied.
- Details already present in the client's first message aren't pre-filled (the office-move example asks again for the address).
- No "Revise invoice" for invoices already sent (should be explicit and logged).
- No escalation policy for overdue invoices (e.g. second reminder at 14 days, partner flag at 30, switch to upfront terms at 60). Awaiting the firm's actual policy.
- Extraction, screening, e-signature, filing references and bank matching are simulated.
