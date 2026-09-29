# Time saved vs P&L's CSA Expert: feature stack rank

Status: first estimate, 25 September 2026; §3a base case revised the same day (clients unchanged except the upload link; e-signature in both). **Every number here is an assumption to be replaced with timings from the design partner** (see §5). The point is the *ranking* and *where the time goes*, not the totals.

## 1. What CSA already does (so no time is saved there)

From P&L's site and CSA Expert release notes:
- **Records:** registers and client/entity master files; multi-jurisdiction (HK, PRC, Taiwan, Macau, BVI, Cayman, Seychelles...); committees.
- **Documents:** "jobs" that generate statutory forms, minutes and resolutions in Word; e-form output for Companies Registry filing; share certificates.
- **Deadlines and batches:** filing-deadline tracking and compliance alerts; "Mass Production" for batch changes; batch filing.
- **Compliance data:** significant controllers; CDD inspection date and risk level.
- **Separate P&L products:** sanctions, PEP and SFC searches (AML), and timesheet, billing, job assignment and CRM (CPA suite).

CSA's gap is everything around a job: understanding what the client wants, asking for and chasing information, retyping it, invoicing, checking payment, and knowing what's waiting on whom. That's where Harbourline saves time.

## 2. Model assumptions (per 100 client companies a year)

| Driver | Assumption |
|---|---|
| Firm-started tasks (annual return, AGM/accounts, BR renewal, KYC review) | ~350 |
| Client-started tasks (director, secretary, particulars, office, name, share changes) | ~80 |
| **Total tasks** | **~430**, each with one invoice |
| Chases per task | ~1 on average |
| Overdue invoices | ~20% of invoices, ~3 reminders each |
| Periodic KYC reviews | ~50 |
| Staff | ~1 FTE per 100 clients |

## 3. Stack rank

| # | Capability | Today (CSA + WeChat + Word/Excel + bank portal) | With Harbourline | Est. hours saved / 100 clients / yr |
|---|---|---|---|---|
| 1 | **Today and task tracking**: my work, deadlines with no task yet, waiting on client, awaiting payment, handover by assignee | Diary in CSA, memory, spreadsheets; "where is this?" lookups; daily triage | One queue in order of priority; status visible to everyone | **70–90** (≈6 min/task on status and handover + ≈10 min/day triage) |
| 2 | **Invoice created with the request**: one invoice per request, lines per playbook, editable, terms per client | Separate invoice in accounting or CSA's CPA module, then attach to message | Invoice drafted with the reply; one click | **50–60** (≈7–8 min/task) |
| 3 | **Request message drafted in the client's language**, asking only for what's missing (KYC on file skipped), with upload link, invoice and deadline lines | Staff write each message, often translating EN/繁/简 by hand | Draft ready to copy | **45–60** (≈6–8 min/task) |
| 4 | **Payment matching and reminders**: bank feed match by invoice number and amount; reminders to the billing contact in their language | Check bank portal, match by hand, mark paid, write reminders | Automatic match; reminder drafted | **40–50** |
| 5 | **Chasing and "what's still missing"**: per-task checklist; chase message lists only outstanding items | Re-read the chat to work out what's missing; write chase | Checklist state + drafted chase | **35–45** |
| 6 | **Secure upload link**: documents land on the task and client | Save attachments from WeChat/email into folders, rename | Filed automatically | **25–30** |
| 7 | **Reply extraction**: client's reply → fields that fill forms and registers | Retype names, ID numbers and addresses into CSA | Review extracted fields | **20–30** (≈10 min per client-started task, less for annual tasks) |
| 8 | **Confirmation messages** in the client's language | Written by hand | Drafted | **10–20** |
| 9 | **KYC reuse and periodic reviews**: on-file items not re-requested; review requests only what's expired | Manual check of CDD dates and files | Automatic | **10–15** |
| 10 | **Intake identification (AI)**: paste → request types and people on file | Staff read and decide (fast for experienced staff) | Suggested | **5–10** |
| — | **Total** | | | **≈310–410 h** (≈0.2 FTE per 100 clients) |

*§3 is the first per-feature pass; §3a supersedes its totals.*

Parity with CSA (no saving, but must be as good):
- registers and effective-dated history;
- document generation from registers;
- deadline calculation;
- batch changes (Mass Production).

## 3a. Where a staff member's year goes: base case (assumed; 1 FTE ≈ 100 clients ≈ 1,750 h)

**Assumptions (owner, 25 September 2026).**
- Clients behave as they do today: chat, voice notes, status questions in chat.
- The one change: documents come through the upload link.
- E-signature is in use, and CSA offers it too, so signing itself is not a saving.
- Only differences from a CSA user count.

Volumes per 100 clients a year:

| Driver | Volume |
|---|---|
| Tasks | ~430: 350 firm-started, 80 client-started |
| Invoices | ~430 |
| Signing packs | ~250 |
| CR filings | ~150 |
| KYC reviews | ~50, plus ~15 new people |
| Registered office mail items | ~2,000 |

| Block | Est. h/yr | Est. saved |
|---|---|---|
| Client communication | 300 | 60–90 |
| Billing, payment checking, collections | 100 | 65–85 |
| Status tracking and handover | 120 | 60–80 |
| Collecting information and chasing | 120 | 45–60 |
| KYC/CDD | 150 | 35–55 |
| Registered office mail | 100 | 30–50 |
| Preparing documents and senior review | 250 | 30–60 |
| Records admin | 120 | 30–45 |
| Companies Registry filing | 120 | 25–40 |
| AGM and annual accounts cycle | 120 | 25–40 |
| Signatures (e-signature in both) | 100 | 10–30 |
| Incorporations and one-offs | 80 | 10–20 |
| Non-client work | 70 | 0 |
| **Total** | **≈1,750** | **≈425–655 h (≈24–37%)** |

### Where each saving comes from

**Client communication (60–90 h).**
- *Request messages* (430 × 4–6 min = 29–43 h). Today a staff member works out what's needed for this job and this client, and checks what's already on file. They write it, often translating into Traditional or Simplified Chinese, and add fee and deadline lines. Harbourline drafts it from the playbook, the client's language and what's on file. Staff check and copy.
- *Confirmations* (430 × 2–3 min = 14–21 h). A completion message is drafted in the client's language from the task.
- *Status questions* (≈300 × 2–3 min = 10–15 h). Staff still answer them, but from one task page instead of checking CSA, the chat, email and the bank.
- *Voice notes* (80 × ≈3 min = ≈4 h). Transcription instead of replaying and noting down. Small, because staff still have to get the audio or WeChat's text version into the tool.

**Billing, payment checking, collections (65–85 h).**
- *Invoice with the request* (430 × 5–7 min = 36–50 h). Today the invoice is made in a separate accounting system or CSA's CPA module, re-keying the client, service and amount, then attached to the message. Harbourline creates it from the playbook fee as part of the request.
- *Payment checking* (430 × 2–3 min = 14–21 h). Instead of logging in to the bank, matching deposits by eye and marking invoices paid, the bank feed matches on invoice number and amount. Staff handle only the exceptions.
- *Reminders* (≈86 overdue × 3 × ≈3 min = ≈13 h). Drafted to the billing contact in their language, logged on the invoice.

**Status tracking and handover (60–80 h).**
- *"Where is this?"* (430 × ≈5 min = ≈36 h). CSA records jobs, not the work around them: waiting on client, waiting on payment, who has it. Today that lives in memory, chat and spreadsheets. In Harbourline every task has a current step and an assignee.
- *Daily triage* (≈230 days × 6–10 min = 23–38 h). Today shows my next actions, deadlines with no task yet and overdue invoices, instead of assembling a to-do list each morning.

**Collecting information and chasing (45–60 h).**
- *Knowing what's missing* (430 × 2–3 min = 14–21 h). Documents uploaded through the link tick the checklist on their own. Nobody re-reads the chat to see what's still outstanding.
- *Chasing* (≈430 × ≈3 min = ≈21 h). The chase message is drafted listing only what's outstanding, in the client's language.
- *Details in chat* (80 × ≈5 min = ≈7 h). The client's typed reply is pasted and extracted into fields.

**KYC/CDD (35–55 h).**
- *Periodic reviews* (50 × 15–25 min = 13–21 h). Harbourline knows what's on file and when it expires. It requests only what's missing, documents arrive by link, and the review record is filed on the person.
- *Reuse across companies* (≈20 × ≈15 min = ≈5 h). A director of several clients isn't asked for the same documents again.
- *Screening* (≈65 × ≈10 min = ≈11 h). Sanctions/PEP checks run from the task, with results filed. **If the firm already uses P&L's AML module, this part is parity.**
- *Onboarding* (≈15 × 20–30 min = 5–8 h). Checklist and upload link instead of collecting by chat.

**Registered office mail (30–50 h).** ≈2,000 items × 1–1.5 min. Scan once; the item is logged against the client; the notification is drafted in the client's language and sent the usual way. Today that's scan, find the client, write a message and file the copy. CSA doesn't do mail. *New feature, not in the spec yet.*

**Preparing documents and senior review (30–60 h).**
- *Retyping* (80 × ≈10 min + 350 × 2–3 min = 25–31 h). Client-started changes: details extracted from the client's reply instead of retyped into CSA. Annual tasks: fewer fields to re-check.
- *Rework* (5–30 h). A per-playbook review checklist catches missing items before the senior reviews.
- Generating documents is **parity**: CSA already does it.

**Records admin (30–45 h).** 430 tasks × ≈3 documents × 1–1.5 min = 21–32 h. Uploads land on the task and client, named and dated, instead of being saved from WeChat into folders. The filing history, last-done dates and next deadlines update from the completed task. Registers updating from a completed job is **parity**: CSA does it.

**Companies Registry filing (25–40 h).** ≈150 filings × 10–15 min. The filing record, receipt, register update and next deadline all come from the task. Producing CR e-forms is **parity** with CSA. It's only a saving if we match it, and a loss if we don't (§4).

**AGM and annual accounts cycle (25–40 h).**
- *Batch start* (100 × ≈10 min = ≈17 h). One action starts a year's AGM/written-resolution tasks, each with its message and invoice. CSA's Mass Production covers the documents but not the client messages, invoices and tracking.
- *Tracking* (100 × 5–10 min = 8–17 h). Accounts and auditor status tracked per client.

**Signatures (10–30 h).** E-signature exists in both, so signing itself is parity. Harbourline saves on:
- the signing pack built from the task with the right signers (≈250 × 2–3 min);
- signature status in the same queue as everything else;
- signed copies filed back to the task automatically.

**Incorporations and one-offs (10–20 h).** Playbooks give these the same checklist, message and invoice treatment once written.

### Sensitivities

- **If clients keep sending documents over WeChat** instead of the link: collecting, KYC and records fall by 40–60 h.
- **If the firm already has P&L AML screening:** KYC falls by ≈11 h.
- **Clients per staff member:** at 200–300 clients per person, most rows scale with task count.

Take-aways:
- **The largest savings are staff-side plumbing:** communication drafting, invoicing and payment matching, status and handover. None of it depends on clients changing.
- **Several items that sounded like savings are parity with CSA:** document generation, register updates, e-forms and e-signature. They're table stakes for switching, not reasons to switch.
- **Senior review and advisory work** (≈350 h) stay human.

## 3b. Channel mix: 50% of client comms on WhatsApp or email instead of WeChat

The base case (§3a) assumes all client chat is on personal WeChat, so every message reaches the tool by paste. Two other channels can be captured automatically and officially:
- **Email:** mailbox connection (Microsoft 365 / Google), roadmap phase 2.
- **WhatsApp:** Business app with Cloud API coexistence (`WECHAT_INTEGRATION.md` §4.6), and only on firm-issued WhatsApp Business numbers, not staff members' personal WhatsApp.

The §3a base case also didn't subtract the time staff spend pasting WeChat messages into the tool (≈10–20 h a year). Automatic channels remove that for their share.

If half of client communication moves to captured channels:

| Block | Extra saving | Why |
|---|---|---|
| Client communication | +15–25 h | No pasting; voice notes arrive as audio and are transcribed; email replies approved and sent from the tool and logged without copying |
| Collecting and chasing | +10–20 h | Typed details extracted without pasting; attachments picked up even when clients ignore the upload link |
| Records admin | +10–15 h | Email and WhatsApp attachments filed to the client automatically |
| Status tracking and handover | +5–10 h | Full conversation history on the client page for whoever picks the task up |
| Billing and collections | +5–10 h | Invoices and reminders sent by email from the tool |
| Registered office mail | +3–10 h | Notifications emailed directly |
| KYC | +2–5 h | ID documents sent by email or WhatsApp filed to the person |
| **Total** | **+50–95 h** | |

| Scenario | Saved / staff member / yr | Share of 1,750 h |
|---|---|---|
| Base case: all WeChat | 425–655 h | 24–37% |
| 50% on email + firm WhatsApp Business numbers | **475–750 h** | **27–43%** |
| 50% on email + staff personal WhatsApp (only email captured) | 450–705 h | 26–40% |

It also shrinks the downside. If clients ignore the upload link, the loss drops from 40–60 h to about 20–30 h, because half the attachments still arrive in captured channels.

## 3c. Bookkeeping (for clients who buy it)

Neither CSA nor Harbourline's current spec covers bookkeeping. P&L's separate CPA suite has an accounting module, and many firms use Xero, QuickBooks or MYOB. **Harbourline shouldn't build a ledger.** It should run bookkeeping as playbooks: monthly or quarterly collection, period close, audit support, and tax deadlines. It should push extracted documents into the firm's accounting software through an integration.

Assumed year for one small-SME bookkeeping client (≈30 h):

| Block | h/yr per client | What removes time | Est. saved |
|---|---|---|---|
| Collecting statements, receipts and invoices; chasing each period | 6 | Per-period checklist, upload link, drafted chases, status on Today | 3–4 |
| Data entry and coding | 12 | Receipt and invoice extraction pushed into the ledger. **Parity if the firm already uses Dext or Hubdoc** | 0–5 |
| Bank reconciliation | 5 | Bank feeds and rules. **Parity with Xero/QuickBooks** | 0–1 |
| Period close, management accounts | 3 | Close checklist and tracking | 0.5–1 |
| Year-end and audit support (auditor's request list) | 3 | Audit request-list playbook: checklist, uploads, chases | 1–1.5 |
| Tax filings support (profits tax, employer's return) | 1 | Deadlines and checklists | 0.3–0.5 |
| **Total** | **≈30** | | **≈5–13 h (≈17–43%)** |

For example, 30 bookkeeping clients per 100 clients ≈ 900 h of bookkeeping work (≈0.5 FTE). Saving ≈150–390 h a year. The wide range is almost entirely about whether receipt capture is already automated.

Open questions: does the design partner do bookkeeping, for how many clients, in which software, and do they already use a receipt-capture tool?

## 4. Where Harbourline is currently *behind* CSA (time lost if not fixed)

1. **Job coverage.** 12 playbooks vs CSA's much larger job library (share allotments and transfers, share certificates, SCR updates, deregistration, auditor changes, capital reduction...). Anything uncovered means running CSA alongside, which wipes out savings. **Biggest risk.**
2. **E-filing output.** CSA produces Companies Registry e-forms. Harbourline v1 plans filing-ready data only, with staff typing into the CR portal. That's a loss of maybe 5 min per filing (~150 filings, ≈12 h). Add CR e-form output early.
3. **Jurisdictions.** CSA covers BVI, Cayman, PRC, Macau, Taiwan and others. Harbourline is Hong Kong only.
4. **Batch operations.** CSA's Mass Production and batch filing. The annual cycle for hundreds of clients needs a batch start (messages and invoices) in Harbourline.
5. **AML screening.** P&L has sanctions/PEP/SFC search. Harbourline defers screening to a vendor in phase 3.

## 5. What this means for the roadmap

- **The biggest savings are plumbing, not AI.** Invoicing, payment matching, chasing and the work queue (#1, #2, #4, #5) are over half the total. They're also deterministic and low-risk to build. The AI intake feature saves the least on its own. Its value is in speeding up #3 and #7.
- **Coverage and e-forms are prerequisites.** Without them the design partner runs two systems and the savings don't show.
- **Measure before building further.** Time 2 weeks of real work at the design partner. For each step (understand, draft, invoice, chase, retype, file, check payment, confirm, look up status), log minutes per task. Replace §2–§3 with those numbers and re-rank.
