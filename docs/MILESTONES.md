# Milestones

Status 29 September 2026: the independent review and fix-up loop is complete. M12 is approved for the supported demo workflows and Goal 3’s modelled administrative-coordination improvement; see `docs/REVIEW_LOG.md`. Final checks: 220 unit/integration tests, 10 browser tests, typecheck, lint and production build pass. Coverage and production limits remain explicit below; this is not measured whole-task productivity or unconditional CSA replacement.

Build plan for `docs/BUILD_SPEC.md`. Each milestone lists its acceptance tests. The tests are the definition of done: red first, then green (see `AGENTS.md`). Status: `[ ]` not started, `[~]` in progress, `[x]` done (with the commit).

## M0. Scaffold
- [x] Next.js (App Router, TS strict), Drizzle, Postgres 17 (Homebrew), pg-boss, Vitest, Playwright, ESLint; `npm run dev` starts the web app and the worker.
- [x] Config loader with typed env; each adapter picks real or fake by the presence of its keys.
- [x] Interfaces and fakes: Clock, Ids, LLM, Mail, Bank, Accounting, Screening, Storage.
- Tests: config picks the fake mail provider when Gmail keys are absent; the test database migrates from empty.

## M1. Records core (effective-dated)
- [x] Schema: firm, user, client, business_registration, person, appointment, share_class, holding, share_movement, significant_controller, charge, contact, filing, document, cdd_record, secret, audit_log. Every table has firm_id.
- [x] Register queries as at any date; share movements reconcile to holdings.
- [x] Seed loader maps `seed/demo-clients.json` onto the model; the showcase client gets the history, documents, filings and invoices; `DEMO_EXISTING_CLIENT_EMAIL` is attached.
- [x] Client list and client page with all tabs.
- Tests: "a register queried as at 2025-03-01 excludes a director who resigned on 2025-02-28"; "a transfer moves shares between members and the members register as at the transfer date reflects it"; "holdings never go negative"; "secrets are stored encrypted and never returned by the client API".

## M2. Playbooks and the task engine
- [x] Playbook schema v2 (whenToUse, conditions, entry checks, gates, register effects, documents, statutory fees, jurisdiction); migrate the 12 seeds. Staff can edit validated JSON and save immutable, firm-scoped versions; existing tasks retain their definition and stale editors cannot overwrite newer versions.
- [x] Task lifecycle, step progression, gates, checklist, task events, requests grouping tasks, assignee.
- [x] Today intray, Tasks list, task view.
- Tests: "a task on credit terms skips the payment step"; "a task cannot enter generate while required items are outstanding"; "KYC items for a person with current CDD are marked on file and not requested"; "every step transition writes a task event".

## M3. Intake agent and drafting
- [x] OpenRouter LLM client (JSON schema, zod validation, repair retry, llm_call log); fixture LLM for tests.
- [x] Intake agent (actions against open tasks), extraction agent, requirement-review agent, drafting agent, custom-request planner.
- [x] Apply engine: auto-apply internal changes, queue proposals for approval, conflict cards, triage cards on low confidence.
- [x] New request (paste-in) flow on the same pipeline.
- [x] Live eval suite `npm run eval:llm`.
- Tests: "an email asking to appoint a director opens one appointment task and drafts a reply in the sender's language"; "a message with two requests opens two tasks on one invoice"; "a change of appointee mid-task re-requests KYC for the new person and drops the old person's items"; "a cancellation proposes voiding the unpaid invoice and cancelling the task, and applies nothing until approved"; "details arriving for another open task update that task"; "low-confidence routing creates a triage card instead of acting"; "a draft missing the invoice number is regenerated".

## M4. Email channel
- [x] Mail provider interface; Gmail adapter (OAuth on localhost, history polling, threaded send); AgentMail adapter; fake mailbox and Dev inbox page.
- [x] Conversations, sender matching, attachments to storage, prospect creation for unknown senders (onboarding playbook added).
- [x] Approval gate: outbound only from an approved draft; send via provider; sent message logged on conversation, client and tasks.
- Tests: "an email from an unknown address creates a prospect client and adds the onboarding task"; "an email from the demo test address is matched to the showcase client"; "no email is sent without an approval record"; "a reply is sent in the same thread with In-Reply-To set"; "polling twice does not ingest the same message twice".

## M5. Invoices, Airwallex, Xero
- [x] Invoice numbering, lines, statutory disbursements, PDF, revise/credit, reminders with escalation.
- [x] Airwallex adapter (auth, deposits list, sandbox simulate) and fake; payment matching; unmatched queue.
- [x] Xero MCP client (create contact, invoice, payment) and fake; sync status on invoices.
- Tests: "a custom invoice number does not consume the auto sequence"; "a deposit quoting the invoice number with the exact amount advances every task on that invoice"; "an underpayment is flagged and does not open the gate"; "a deposit without a reference is proposed, not auto-matched"; "an approved invoice is created in Xero once, even if the job retries"; "a matched payment is recorded in Xero against the right invoice".

## M6. Documents and official forms
- [x] Form manifest (URL, date, hash, revision), mapping functions for ten CR forms (including NSC2 added in review), field-existence tests and form-version check job.
- [x] Corrected supported task output for NSC1, NNC1, ND2B and NAR1, plus NSC2 buybacks and ND4 secretary resignation. Official NAR1 continuations cover natural directors and member schedules. Supported transaction shapes and explicit rejections are recorded in `REVIEW_LOG.md`; practitioner sign-off remains required.
- [x] Templates for board/member written resolutions, consent, share certificates, transfer instruments and contract notes; director/member register template functions. Language selection exists.
- [x] Downloadable PDF extracts for directors, secretaries, members, controllers, movements and charges at a selected date; domain and browser tests cover date selection, invalid dates, CJK and firm isolation. Names/contact particulars remain current-record values, explicitly disclosed in each extract.
- [x] Board/member meeting-minutes templates require actual meeting facts and a manually verified chair signature; ancillary certificates, transfers, contract notes, engagement letters, SCR notices and register templates follow EN/TC/SC/bilingual output selection. User-supplied names/proceedings remain verbatim. Language/minutes regressions and rendered-output review are recorded in `REVIEW_LOG.md`.
- Tests: "every mapped ND2A field exists in the current official PDF"; "an ND2A for an appointment carries the appointee's name, correspondence address and effective date"; "a Chinese-language resolution renders Chinese names"; "a changed form hash is flagged".

## M7. E-signature
- [x] Envelope, signers, token links, email OTP, sign page (type or draw), stamping, audit certificate, filing back to the task.
- Tests: "a signing link can't be used after signing"; "a wrong OTP doesn't unlock the document"; "the audit certificate records the document hash before and after signing"; "the sign step advances when all signers have signed".

## M8. Upload portal, CDD and screening
- [x] Upload link page (trilingual), per-item uploads, typed fields, extraction on upload.
- [x] CDD records with reuse and review dates; screening providers (OpenSanctions API, local dataset, fake); adjudicator agent; staff clearance.
- Tests: "an uploaded ID copy ticks the item for that person only"; "a person with current CDD on file for another client isn't asked again"; "a strong sanctions hit blocks the task until staff clear it"; "screening results record the dataset version".

## M9. CSA parity: coverage, batch, deadlines, mail
- [x] New HK playbook configurations (§11.1 of the spec).
- [~] Every covered HK playbook has complete documents, register effects and a verified closure path; only representative workflows have integration coverage (matrix below).
- [x] Batch start for recurring work, with a request, invoice and approval draft per selected client.
- [x] Batch document preparation for eligible tasks, with per-task failures; batch director resignation across selected companies, retaining separate invoices, drafts and human approvals. `review-batch.test.ts` covers prerequisites, duplicates, conflicts and firm boundaries.
- [x] Batch request conversation linkage corrected and tested. Controls inspected at all four breakpoints; populated batch-generation control exercised in the isolated browser demo.
- [x] Deadline engine with last-done dates; dormant suppression; seal stamps.
- [x] Registered office mail log.
- Tests: "an allotment updates the members register and share capital as at the allotment date"; "stamp duty on a transfer is 0.2% of the higher of consideration and value, split between buyer and seller"; "a filed NAR1 for this year's anniversary clears the annual return deadline"; "a dormant company has no AGM deadline"; "batch start creates one task and one invoice per selected client".

## M10. Mainland China, Macau, Taiwan
- [x] Jurisdiction-specific fields, core playbook configurations, deadline rules and CN/MO/TW resolution templates; representative integration tests below.
- [~] Complete end-to-end coverage of every CN/MO/TW workflow and local-agent validation of rules and filing packs. Configured playbooks do not establish complete jurisdiction parity.
- Tests: "a PRC company's annual report deadline is 30 June"; "a PRC legal representative change requires the new legal representative to be a director or manager"; "a Taiwan company's Article 22-1 change deadline is 15 days"; "a Macau quota transfer updates the quota holder register".

## M11. Demo mode and end-to-end
- [x] Demo panel, simulate payment and reply, reset; `docs/DEMO_SCRIPT.md`; setup guide for credentials (`docs/SETUP_INTEGRATIONS.md`).
- [x] Corrected approval timing and comparison panels: uncapped review duration stops at approval, shared request time counted once, absent measurements labelled and no empirical multiplier.
- [x] Qualified modelled coordination comparison and reviewer design judgment, with explicit assumptions in `REVIEW_LOG.md`. This is not an empirical whole-task or whole-firm productivity claim.
- [x] Playwright end-to-end run of the full demo loop with fakes; screenshot pass at 375, 768, 1280 and 1440 px.
- Tests: the full demo loop reaches Done with every client-facing action gated; a new prospect's loop includes onboarding.

## M12. Review gate
- [x] Independent Codex reviewer verdict recorded in `docs/REVIEW_LOG.md` (the spec originally names Claude). Approved for supported demo workflows and the modelled multiple-x coordination judgment after fixes and re-review. The quantified assumptions, transaction bounds, unexercised configurations and live/production limits are part of that verdict.


## Verified scope versus configured coverage

This records the evidence inspected through the final independent review, rather than inferring complete coverage from playbook counts. Tests use fake integrations and fixture/scripted model responses unless explicitly described otherwise. The broader unchecked coverage items do not become verified merely because the supported demo was accepted.

| Workflow/capability | Evidence present | What it does not establish |
|---|---|---|
| HK director appointment for an unknown sender | `e2e/demo.spec.ts`: browser path from inbound email through invoice, deposit, details/upload, screening, signatures, filing, effective-dated register and completion | Real mailbox/bank/accounting delivery or complete execution of every prospect-onboarding obligation |
| HK director appointment on existing records | `m6-documents.test.ts`: integration path through document generation, filing, register and confirmation; ND2A field content assertions | Legal acceptance by CR or practitioner review |
| HK allotment and share transfer | `m9-parity.test.ts` and `review-forms.test.ts`: structured fixtures through effects/balances, actual NSC1 transaction/capital and post-transaction certificates | Full browser journey, all allotment shapes or real stamping |
| HK incorporation | `review-forms.test.ts` and `review-incorporation-filing.test.ts`: encrypted shared plan, filled NNC1/PI, founder upload and screening association, replacement uploads, certificate facts and initial register effects | Full browser journey, multiple founders/directors or other incorporation shapes |
| HK buyback | `review-nsc2.test.ts`: actual official NSC2 fields, capital- versus profits-funded arithmetic, missing-fact rejection | Listed/multiple-class cases or legal validity of the buyback procedure |
| Particulars, financial year end, CDD, dormancy and secretary resignation | `review-effects.test.ts` and `review-secretary.test.ts`: human-applied effects, prior/transition periods, current CDD, effective-dated secretary cessation | Complete browser journey for each task or practitioner approval of each pack |
| Historical register extracts | `review-registers.test.ts` and `e2e/registers.spec.ts`: six register types, both dates, firm isolation, Chinese text and browser download | Historical versions of company/person name and address particulars |
| CN legal representative and Macau quota transfer | `m10-jurisdictions.test.ts`: representative register effects; CN prerequisite rejection | All jurisdiction jobs, real portal filing or local-agent validation |
| CN/TW deadlines and CN Chinese resolution | `m10-jurisdictions.test.ts`: deadline calculations and resolution content | All local rules or all translated output |
| Batch work | `m9-parity.test.ts` and `review-batch.test.ts`: separate task/invoice/draft, duplicate protection, eligible document generation and shared-director resignations | Real batch filing on authority portals |
| Other configured playbooks | Data definitions, shared engine and selected unit/integration coverage | A complete tested client-to-completion workflow for each playbook |
| Live model evaluation and rehearsal | Historical handoff reports 25 scenarios and one rehearsal; current attempt failed on network transport | A successful current live-model rerun or real-account smoke testing |
| Official form versions | All 11 tracked assets downloaded via system curl and matched manifest hashes in this session; failed Node-fetch checks now report incomplete | Reliable default Node-fetch/worker transport in this environment |
| Gmail, AgentMail, Airwallex, Xero, OpenSanctions | Adapters; fake-backed tests and selected API-shape tests | Live-account smoke tests; credentials are still required |

Production RLS/authentication and real-client deployment remain deferred by decision #24, separate from this demo acceptance review.
