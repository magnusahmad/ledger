# Build spec: Harbourline Desk, end-to-end demo and CSA parity

Status: 29 September 2026. Owner: Magnus. Companion file: `docs/MILESTONES.md` (the ordered build plan with acceptance tests). This spec narrows `PRODUCT_SPEC.md` for the first real build and records the decisions taken in the requirements session of 29 September 2026 (`DECISIONS.md` #21–#31).

## 1. Goals

**Goal 1, the investor demo.** At an investor meeting the founder says: "Send this address an email with anything you'd ask your co-sec to do." With Harbourline on screen:

1. The email arrives on its own (no paste). Harbourline shows who it is from: either a **new prospect** (unknown sender) or, when sent from the configured test address, an **existing client** with records, documents on file, past invoices and history.
2. An LLM agent reads it, works out the request(s), and Harbourline opens the right task(s) from playbooks. It checks what is already on file, drafts the reply in the sender's language asking only for what is missing, creates the invoice and puts everything in the founder's intray.
3. The founder reviews, edits if needed, and clicks **Approve and send**. The email goes out from the connected mailbox in the same thread, with the invoice PDF, payment instructions and a secure upload link. The invoice is created in Xero.
4. The founder triggers a sandbox deposit into the Airwallex Global Account quoting the invoice number. Harbourline matches it, records the payment in Xero and moves every linked task through the payment gate.
5. The investor (or the founder playing the client) replies with details and attachments, or uses the upload link. Harbourline attaches them to the task, extracts the fields, re-checks what is still needed, screens the new person against sanctions and PEP lists, generates the resolution and the **official Companies Registry form filled in**, and sends an e-signature request (after approval).
6. After signing, the founder files on e-Registry (the Companies Registry has no third-party filing API) and records the filing reference. Harbourline updates the statutory registers as at the effective date, drafts the completion email, and the founder approves it. The task is done.

Every step is visible on the task timeline. Every client-facing send, register change and filing record needs one click from a human.

**Goal 2, parity with CSA Expert.** Close the gaps in `TIME_SAVED_VS_CSA.md` §4 so a firm can switch without running CSA alongside:
- job coverage (the playbook library covers the common CSA jobs);
- Companies Registry form output (official fillable PDFs filled in);
- other jurisdictions (Mainland China, Macau, Taiwan);
- batch operations (Mass Production);
- AML screening;
- e-signature.

Also the parity items from §3: effective-dated registers, documents from registers, deadline calculation and share certificates.

**Goal 3, a genuine multiple-x improvement.** The build is only accepted once an independent reviewer agent judges it a multiple-x improvement over today's workflow (CSA plus chat plus Word plus bank portal) for the covered task set (§12).

## 2. Scope boundaries for this build

- **Single tenant, single user.** One firm (Caine Road Corporate Services Limited, fictional), one signed-in demo user. Every table still carries `firm_id` so nothing needs retrofitting. No RLS policies, login or roles yet (deferral recorded in `DECISIONS.md` #23). Data residency, PDPO and permissioning are out of scope for this build.
- **Runs on the founder's laptop.** Next.js plus a worker process plus local Postgres. Inbound email and Airwallex deposits are polled (every 5 s in demo mode), so no public URL is needed.
- **No paid services required.** Gmail API (free), AgentMail free tier (fallback), Airwallex sandbox, Xero developer app with the Demo Company, OpenSanctions (bulk data for non-commercial use, or API when a key is supplied), OpenRouter for product LLM calls.
- **Credentials arrive later.** Every external system has a fake adapter used in tests and in "offline demo" mode. Real adapters switch on when their `.env` keys are present. Missing credentials never block a milestone.

## 3. Architecture

```
apps: one Next.js app (App Router, TypeScript) + one worker process (tsx), same codebase
src/
  db/            Drizzle schema, migrations, seed loader
  domain/        pure business logic: effective dating, deadlines, invoices, matching, playbook engine
  agent/         LLM agents: intake, extraction, requirement review, drafting, screening adjudication
  integrations/  email (gmail, agentmail, fake), bank (airwallex, fake), accounting (xero-mcp, fake),
                 screening (opensanctions-api, opensanctions-local, fake), llm (openrouter, fixture)
  documents/     CR PDF form filling, resolution/minutes/certificate templates, register printing
  worker/        pollers (mail, bank), job queue (pg-boss), deadline scan
  app/           UI routes and server actions
```

- **Postgres 17** (Homebrew), **Drizzle ORM**, **pg-boss** for jobs (Postgres-backed, no Redis).
- **Vitest** for unit and integration tests against a real `harbourline_test` database; **Playwright** for the end-to-end demo run with fakes.
- **pdf-lib** for filling official PDF forms and generating PDFs; **@pdf-lib/fontkit** with Noto Sans TC/SC for Chinese text.
- **Clock, ID generator, LLM, mail, bank, accounting, screening and storage** are injected interfaces. Tests use deterministic fakes.
- **Files** go to local disk under `storage/` (gitignored) behind a storage interface.

## 4. The agent layer (how Harbourline understands clients)

Rule from the owner: **intent is never understood by keyword rules or classic NLP.** Every "what does the client mean" decision is an LLM call. The playbook engine that runs afterwards can be rule-based.

Model: `google/gemini-3.8-flash` via OpenRouter (`or_api_key` in `.env`), used only by the product at runtime. The build and the reviewer agents never use OpenRouter.

### 4.1 Agents

| Agent | Input | Output (JSON, schema-validated with zod) |
|---|---|---|
| **Intake** | New inbound message (email body with quoted history stripped, attachment names and extracted text); sender match candidates; client snapshot (company, officers, members, documents on file, open tasks with checklists and state, recent messages); playbook catalogue (ids, names, descriptions, when they apply) | Language; client identification (matched client, or a new prospect with the company name if given); list of **actions**: `start_request`, `provide_information`, `change_request`, `cancel_request`, `ask_question`, `general_correspondence`, `unsupported_request`; each with evidence quotes, confidence and extracted fields |
| **Requirement review** | Task, playbook, current checklist, all extracted data, the new information or change | Requirement items that still apply, are satisfied, are newly needed or no longer needed (with reasons); whether the playbook is still the right one or should be swapped or extended; whether the invoice should change; blocking questions to ask the client |
| **Extraction** | Message text and attachment contents (PDF text, images through the model's vision input) for a task's outstanding items | Field values per requirement item, with source quote and confidence; which attachments satisfy which document items |
| **Drafting** | Structured facts: recipient, language, what we are doing, items needed (per request), items on file, invoice, payment instructions, upload link, deadlines, questions to answer | Subject and body in the requested language (en / tc / sc), plain text plus simple HTML |
| **Custom-request planner** | An `unsupported_request` (something no playbook covers, e.g. "open a bank account") | Proposed checklist, steps and fee for a one-off task, which staff approve or edit before use |
| **Screening adjudicator** | A person's details plus candidate hits from the screening source | Per hit: likely match / possible / false positive, with reasons. Staff confirm |

### 4.2 Handling change and ambiguity

Clients change their minds and send information out of order. The design does not assume request, then information, then continue:

- **Every inbound message goes through Intake with the full state of open tasks**, not just "new request" detection. So "actually make it Mary instead of John", "we've decided not to go ahead", "our office move is now 1 November", or details for task A arriving inside a message about task B are all routed as `change_request`, `cancel_request` or `provide_information` against the right task.
- **Requirements are re-reviewed whenever task data changes** (new info, a change request, a person switched). The requirement-review agent can add or drop items, ask for a playbook swap (e.g. "resignation" turns into "resignation plus appoint replacement") or add a new task. Deterministic playbook conditions (e.g. "KYC on file and current, so skip ID copy") run first. The agent runs on top and its proposals are shown as a diff.
- **Proposals are applied at two levels.** Internal changes (checklist items, extracted fields, re-ordering what we are waiting for) apply automatically and are logged with a reason and an undo. Anything client-facing, register-affecting or invoice-affecting after the invoice has been sent (revise, credit note, cancel) goes to the intray as a proposal for approval.
- **Contradictions are surfaced, not guessed.** When new information conflicts with information on file (e.g. a different ID number for the same person) or with an earlier message, the task shows a conflict card: both values with sources, and a drafted clarifying question.
- **Steps have entry checks.** Before generate, sign, file and register steps, the engine re-runs the requirement review on the latest data. A task can't reach "generate" with a stale checklist.
- **Low confidence goes to a human.** A client match below threshold, a multi-intent message with confidence below 0.7, or an ambiguous task routing becomes a triage card in the intray ("Which task is this for?") instead of an automatic action.

### 4.3 Reliability

- Structured output through JSON-schema response format, validated with zod. One automatic repair retry on schema failure, then a triage card.
- Every LLM call is logged (`llm_call`: agent, model, prompt hash, input and output, latency, tokens, cost) and shown on the task timeline as "Harbourline suggested…".
- Tests use recorded fixtures. A live evaluation suite (`npm run eval:llm`, needs `or_api_key`) runs about 25 realistic multilingual scenarios (Cantonese-flavoured written Chinese, mixed English/Chinese, a change of mind, cancellation, information for the wrong task, a status question, unsupported requests) and reports accuracy. It is not part of `npm test`.
- Drafts are checked deterministically after generation: the invoice number, amount, upload link and every requested item must appear. If not, one regeneration, then a template fallback.

## 5. Channels

### 5.1 Email

`MailProvider` interface: `listNewMessages(since)`, `getMessage`, `getAttachment`, `send({to, cc, subject, text, html, attachments, inReplyTo, threadId})`.

- **Gmail** (primary): OAuth 2.0 desktop client with a refresh token stored in the local secrets table (encrypted with `APP_SECRET`, never displayed). Poll with `users.history.list` from the last `historyId`. Send with `users.messages.send` using `threadId`, `In-Reply-To` and `References`. A setup page at `/settings/integrations` runs the OAuth flow on localhost.
- **AgentMail** (fallback): API key, one inbox. Poll `inboxes.messages.list`, reply with `messages.reply`, and use `extracted_text` to strip quoted history.
- **Fake/dev mailbox**: an in-app "Dev inbox" page that simulates inbound email (used in tests and the offline demo) and captures sent mail.
- **Threading.** Inbound messages are grouped into `conversation` by provider thread id, then by `In-Reply-To`. A conversation links to a client and optionally to tasks.
- **Sender identification.** Deterministic lookup of the sender address among contacts and people gives candidates. The Intake agent confirms the match or flags a mismatch (e.g. a known director writing about a different company).
- **Test sender.** `DEMO_EXISTING_CLIENT_EMAIL` in `.env` is attached by the seed script as the instructing director and contact of the showcase client (Kowloon Bay Trading Limited), which has 7 years of history, KYC on file, documents, filings and past invoices.

### 5.2 Paste-in

The New request screen keeps the prototype's paste box for WeChat and voice-note text. It feeds the same Intake agent.

## 6. Playbook engine

Playbooks stay data (`seed/playbooks/*.json`, loaded into the `playbook` table, versioned). Schema additions over the prototype:

- `jurisdiction` (HK, CN, MO, TW), `category`, trilingual `name` and `description`, and `whenToUse` (a natural-language description the Intake agent sees; there are no keyword triggers).
- `requirements[]` with an optional `condition` (deterministic: `personHasCurrentKyc`, `clientIsNew`, `holdingOver25pct`...) and `appliesWhenNote` (natural language for the review agent).
- `steps[]` with kinds `send`, `pay`, `collect`, `kyc`, `screen`, `generate`, `sign`, `file`, `register`, `confirm`, `task`, `wait_until` (e.g. effective date), plus `entryChecks` and `gate` (e.g. `invoicePaid` unless on credit terms).
- `documents[]` referencing a template id (CR official form mapping or a docx/html template) and output language rules.
- `registerEffects[]`: declarative effects applied at the register step (e.g. `appoint_officer {role: director, person: $person, from: $effDate}`), previewed before approval.
- `deadline` rule (`event+15d`, `anniversary+42d`, `fye+9m`, ...), marked "verify with company secretary".
- `fee` (HKD, per firm override), and `statutoryFees` (e.g. NAR1 HK$105 on time), shown separately on the invoice as disbursements.

**Task lifecycle.** `open → (steps…) → done | cancelled`, with the step pointer, gate state, checklist state and `extracted` data stored on the task. Every transition writes a `task_event`. Steps advance automatically when their completion condition is met (checklist complete, payment matched, all signatures in, screening cleared by staff). Human-gated steps (send, file, register, confirm) wait in the intray.

**Requests and invoices.** One inbound request can open several tasks. All tasks from one request share one invoice (lines per playbook) and one outbound draft. Credit-terms clients skip the pay gate.

## 7. Billing, payments and accounting

- **Invoice numbering** per firm sequence (`CRCS-2026-0001`); a custom number doesn't consume the sequence. Draft, then approved and sent, then partially paid or paid, or void. **Revise invoice** after sending creates a new version (or a credit note), is logged and needs approval.
- **Invoice PDF** on the firm's letterhead, bilingual headings, with payment instructions: Airwallex Global Account details (account name, number, bank, FPS if available) and "please quote the invoice number".
- **Airwallex adapter**: login with client id and API key, then a token; `listDeposits(since)` (Global Account deposits or financial transactions); `simulateDeposit` (sandbox only; used by the demo panel and `npm run demo:pay <invoice>`).
- **Matching**: exact invoice number found in the reference and amount equal → auto-match. Invoice number found but amount different → partial or overpayment, flagged for review. No number but amount and payer name fit a single open invoice → proposed match needing approval. Otherwise the deposit sits in the unmatched queue. Deterministic, not LLM. Matching advances every task linked to the invoice.
- **Xero via MCP**: Harbourline runs `@xeroapi/xero-mcp-server` over stdio as an MCP client (`@modelcontextprotocol/sdk`). On invoice approval: `list-contacts`/`create-contact`, then `create-invoice` (ACCREC, AUTHORISED, line items with account code from settings). On payment match: `create-payment` against the Airwallex bank account in Xero. Xero ids are stored on the invoice and payment. Failures are retried by the job queue and shown on the invoice. The LLM never decides accounting writes.
- **Reminders**: overdue invoices get a drafted reminder to the billing contact in their language (approval to send). Escalation policy is configurable (default reminders at +7 and +14 days, partner flag at +30).

## 8. Documents and forms

- **Official Companies Registry forms**: the current fillable PDFs from cr.gov.hk (downloaded 29 September 2026; stored in `forms/hk-cr/` with a manifest recording the source URL, download date, SHA-256 and the form's revision label). The fillers covered are NAR1, ND2A, ND2B, ND4, NR1, NSC1, NNC1, NNC2 and NDR1, each a mapping from our data to the PDF's AcroForm field names. A test asserts every mapped field exists in the current PDF, so a form revision by the Registry breaks the build instead of silently producing a wrong form. A **form-version check** job (weekly, and `npm run forms:check`) re-downloads and compares hashes, flagging a changed form on the Playbooks page.
- **Resolutions, minutes, consents, share certificates, instruments of transfer, bought and sold notes, registers**: HTML templates rendered to PDF in the document language (English, Traditional Chinese, Simplified Chinese, or bilingual), from registers plus task data.
- **Registers** printable as at any date: directors, secretaries, members, significant controllers, allotments and transfers, charges.
- **Mainland, Macau and Taiwan documents**: shareholder and board resolutions in Simplified Chinese (CN), Traditional Chinese and Portuguese headings (MO) and Traditional Chinese (TW). There is no public e-filing API for SAMR, the Macau Commercial Registry or MOEA. Filing is done by staff on the portals and recorded with its reference.

## 9. E-signature (in-house)

- **A signing envelope** holds documents, signers (name, email, role) and signature fields. The signer receives an email with a single-use link (token hashed at rest), verifies with a 6-digit email OTP, reviews the PDF and signs by typing (rendered in a handwriting-style font) or drawing.
- **Output**: a stamped PDF plus an audit certificate page (signer, email, IP, user agent, OTP verification time, signing time, document SHA-256 before and after). Signed copies are filed on the task and the client.
- **Adapter interface** (`SignatureProvider`) so a vendor (DocuSign, Dropbox Sign) can be swapped in later.
- **Legal note**: the Electronic Transactions Ordinance (Cap. 553) supports electronic signatures for most board and member resolutions. Excluded or special documents (e.g. instruments needing a seal, some deeds, land-related documents) are flagged per template as wet-ink. To be verified by the company secretary.

## 10. KYC, screening and the client portal

- **Secure upload link** per request: `/u/<token>`. It shows the client in their language what is needed per task, accepts file uploads per item, and lets them type data fields. Uploads run through Extraction and tick the checklist.
- **CDD record per person**: ID document, address proof, screening result, risk rating, review due date (risk-based: high 1 year, medium 2, low 3; firm policy). On-file documents are reused across companies.
- **Screening**: `ScreeningProvider` with OpenSanctions API (`/match/default` with an API key) or the local OpenSanctions `sanctions` plus `peps` simplified dataset (downloaded by `npm run screening:update`, non-commercial licence), plus a fake. The adjudicator agent classifies hits; staff clear or escalate. Results are filed on the person with the dataset version.

## 11. CSA parity scope

### 11.1 Playbook library (HK)

Existing 12 plus: share allotment (NSC1), share transfer (instrument of transfer, bought and sold notes, stamp duty at 0.1% per side on the higher of consideration and value, stamping within 30 days, register update), significant controllers register update, deregistration (IRD notice of no objection, then NDR1), change of financial year end (accounting reference period, NAR1 note), reserve director nomination (ND5), resignation of secretary (ND4), change of auditor (resolution, auditor's consent), amendment of articles by special resolution (copy delivered to the Registry within 15 days; delivery form to verify), dormant company resolution, share buy-back (NSC2), bank signatory change (bank mandate resolution), registered office mail handling, custom one-off task.

### 11.2 Other jurisdictions (records plus core playbooks)

| | Mainland China (CN) | Macau (MO) | Taiwan (TW) |
|---|---|---|---|
| Entity types | Limited liability company (有限责任公司), WFOE, company limited by shares | Sociedade por quotas (有限公司), sociedade anónima | 有限公司, 股份有限公司, branch office |
| Extra fields | Unified social credit code, legal representative, supervisor(s) or audit committee, registered capital, subscribed vs paid-in capital and contribution deadlines (2024 Company Law: paid within 5 years of establishment; pre-July 2024 companies adjust by 30 June 2027), registration liaison, business scope, beneficial owner filing | Registration number (Conservatória do Registo Comercial), administrators (administradores/gerentes), quota holders and quotas, registered capital (minimum MOP 25,000 for quota companies) | Unified business number (統一編號), responsible person (代表人), supervisors, capital, MOEA Article 22-1 declarations (directors, supervisors, managers, shareholders over 10%, beneficial owners) |
| Deadlines | Annual report via National Enterprise Credit Information Publicity System, 1 January to 30 June; change registration within 30 days of the resolution or decision | Registration of changes: owner's policy (default 30 days, verify); annual profits tax return M/1 declaration | Article 22-1 annual declaration (March), changes within 15 days; change registration within 15 days of the change (verify) |
| Core playbooks | Change legal representative; change directors or supervisors; change registered address; change registered capital; equity transfer; annual report; beneficial owner filing | Change administrators; transfer of quotas; change of registered office; amend articles | Change directors or supervisors; change responsible person; Article 22-1 declaration; change address; capital increase |

Every jurisdiction rule is marked **verify with a qualified company secretary or local agent**, because none of these filings can be automated and the rules are summarised from secondary sources.

### 11.3 Batch operations (Mass Production)

"Start annual cycle" selects clients with a deadline in a window (e.g. NAR1 due in the next 60 days, AGMs for year end 31 March). It creates one task per client in one action, each with its drafted request message and invoice, all queued for one-by-one or bulk approval. Batch document generation (e.g. all NAR1s pre-filled) and batch register changes (e.g. a common director resigning from 12 companies) follow the same pattern.

### 11.4 Deadlines

Deadlines are computed from client data and **last-done dates** (a filed NAR1 for the 2026 anniversary satisfies the 2026 period; no automatic roll-forward). Dormant companies suppress AGM and audit. Red seal stamps (限/逾) appear within 30 days.

### 11.5 Registered office mail

Log an item (scan upload), where the LLM identifies the addressee company and summarises it. The notification to the client is drafted in their language and needs approval. Filed on the client.

## 12. Hours-saved measurement and the review gate

- `step_timing`: every human action on a task step records the time from when the card was shown to the approval, plus edits made to drafts (edit distance), so the demo can show "4 min of staff time on this task" against a CSA baseline from `TIME_SAVED_VS_CSA.md`.
- **A "Time saved" panel** on the task and a firm-level report compare the logged time with the modelled baseline per step.
- **Review gate.** When all milestones pass, an independent Claude reviewer agent reads this spec, `MILESTONES.md`, `TIME_SAVED_VS_CSA.md` and the running app (tests, e2e demo run, UI). It decides whether this is a multiple-x improvement over the status quo for the covered task set. If not, it lists what holds it back and fixes it directly, and the cycle repeats until it approves. Its verdicts are appended to `docs/REVIEW_LOG.md`.

## 13. Demo mode

- **Demo panel** (`/demo`, hidden from navigation): shows integration status (real or fake per adapter). Actions: **Simulate client payment** (Airwallex sandbox deposit, or a fake deposit offline), **Simulate client reply** (sends a scripted reply from the test sender for rehearsal), **Reset demo data**.
- **Rehearsal script** in `docs/DEMO_SCRIPT.md`: exact steps, fallbacks (AgentMail if Gmail OAuth fails, offline fakes if the venue Wi-Fi fails), and timings.
- **Latency target**: an inbound email appears in the intray, with draft and invoice, within 20 seconds of arrival.

## 14. UI

Matches the prototype's design language (`AGENTS.md`). Screens: Today (intray: Needs you, triage, deadlines, overdue invoices, waiting on client, awaiting payment), Inbox (conversations), Clients and the client page (all tabs from `PRODUCT_SPEC.md` §4.5 plus Correspondence and Documents), Task view (steps, checklist, conflicts, documents, signatures, timeline, time saved), Invoices, Payments (unmatched deposits), Batch, Playbooks (library plus form versions), Mail items, Settings (integrations, firm), the Demo panel, and the public pages (upload link, signing). Responsive at 375, 768, 1280 and 1440 px, with English and Chinese content checked.

## 15. Test strategy

- Business-rule tests named after the rule, e.g. "a register queried as at 2025-03-01 excludes a director who resigned on 2025-02-28", "a deposit quoting the invoice number with the exact amount advances every task on that invoice", "a client changing the appointee mid-task re-requests KYC for the new person and drops the old person's items", "a custom invoice number does not consume the auto sequence".
- Integration tests against real Postgres for effective dating, the approval gate (no outbound send without an approval row), credential handling (secrets encrypted, never returned by any API), and payment matching.
- Agent tests with recorded LLM fixtures; live evaluation separately.
- **End-to-end**: a Playwright run of the full demo loop with fake adapters (email in → approve → pay → reply → sign → file → register → confirm → done), plus a UI screenshot pass at the four breakpoints.
