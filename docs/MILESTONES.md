# Milestones

Build plan for `docs/BUILD_SPEC.md`. Each milestone lists its acceptance tests. The tests are the definition of done: red first, then green (see `AGENTS.md`). Status: `[ ]` not started, `[~]` in progress, `[x]` done (with the commit).

## M0. Scaffold
- [ ] Next.js (App Router, TS strict), Drizzle, Postgres 17 (Homebrew), pg-boss, Vitest, Playwright, ESLint; `npm run dev` starts the web app and the worker.
- [ ] Config loader with typed env; each adapter picks real or fake by the presence of its keys.
- [ ] Interfaces and fakes: Clock, Ids, LLM, Mail, Bank, Accounting, Screening, Storage.
- Tests: config picks the fake mail provider when Gmail keys are absent; the test database migrates from empty.

## M1. Records core (effective-dated)
- [ ] Schema: firm, user, client, business_registration, person, appointment, share_class, holding, share_movement, significant_controller, charge, contact, filing, document, cdd_record, secret, audit_log. Every table has firm_id.
- [ ] Register queries as at any date; share movements reconcile to holdings.
- [ ] Seed loader maps `seed/demo-clients.json` onto the model; the showcase client gets the history, documents, filings and invoices; `DEMO_EXISTING_CLIENT_EMAIL` is attached.
- [ ] Client list and client page with all tabs.
- Tests: "a register queried as at 2025-03-01 excludes a director who resigned on 2025-02-28"; "a transfer moves shares between members and the members register as at the transfer date reflects it"; "holdings never go negative"; "secrets are stored encrypted and never returned by the client API".

## M2. Playbooks and the task engine
- [ ] Playbook schema v2 (whenToUse, conditions, entry checks, gates, register effects, documents, statutory fees, jurisdiction); migrate the 12 seeds.
- [ ] Task lifecycle, step progression, gates, checklist, task events, requests grouping tasks, assignee.
- [ ] Today intray, Tasks list, task view.
- Tests: "a task on credit terms skips the payment step"; "a task cannot enter generate while required items are outstanding"; "KYC items for a person with current CDD are marked on file and not requested"; "every step transition writes a task event".

## M3. Intake agent and drafting
- [ ] OpenRouter LLM client (JSON schema, zod validation, repair retry, llm_call log); fixture LLM for tests.
- [ ] Intake agent (actions against open tasks), extraction agent, requirement-review agent, drafting agent, custom-request planner.
- [ ] Apply engine: auto-apply internal changes, queue proposals for approval, conflict cards, triage cards on low confidence.
- [ ] New request (paste-in) flow on the same pipeline.
- [ ] Live eval suite `npm run eval:llm`.
- Tests: "an email asking to appoint a director opens one appointment task and drafts a reply in the sender's language"; "a message with two requests opens two tasks on one invoice"; "a change of appointee mid-task re-requests KYC for the new person and drops the old person's items"; "a cancellation proposes voiding the unpaid invoice and cancelling the task, and applies nothing until approved"; "details arriving for another open task update that task"; "low-confidence routing creates a triage card instead of acting"; "a draft missing the invoice number is regenerated".

## M4. Email channel
- [ ] Mail provider interface; Gmail adapter (OAuth on localhost, history polling, threaded send); AgentMail adapter; fake mailbox and Dev inbox page.
- [ ] Conversations, sender matching, attachments to storage, prospect creation for unknown senders (onboarding playbook added).
- [ ] Approval gate: outbound only from an approved draft; send via provider; sent message logged on conversation, client and tasks.
- Tests: "an email from an unknown address creates a prospect client and adds the onboarding task"; "an email from the demo test address is matched to the showcase client"; "no email is sent without an approval record"; "a reply is sent in the same thread with In-Reply-To set"; "polling twice does not ingest the same message twice".

## M5. Invoices, Airwallex, Xero
- [ ] Invoice numbering, lines, statutory disbursements, PDF, revise/credit, reminders with escalation.
- [ ] Airwallex adapter (auth, deposits list, sandbox simulate) and fake; payment matching; unmatched queue.
- [ ] Xero MCP client (create contact, invoice, payment) and fake; sync status on invoices.
- Tests: "a custom invoice number does not consume the auto sequence"; "a deposit quoting the invoice number with the exact amount advances every task on that invoice"; "an underpayment is flagged and does not open the gate"; "a deposit without a reference is proposed, not auto-matched"; "an approved invoice is created in Xero once, even if the job retries"; "a matched payment is recorded in Xero against the right invoice".

## M6. Documents and official forms
- [ ] Form manifest (URL, date, hash, revision); fillers for NAR1, ND2A, ND2B, ND4, NR1, NSC1, NNC1, NNC2, NDR1; field-existence test; form-version check job.
- [ ] Templates: resolutions (board and members, written), minutes, consent to act, share certificate, instrument of transfer, bought and sold notes, registers print. Language by document language (EN / TC / SC / bilingual).
- Tests: "every mapped ND2A field exists in the current official PDF"; "an ND2A for an appointment carries the appointee's name, correspondence address and effective date"; "a Chinese-language resolution renders Chinese names"; "a changed form hash is flagged".

## M7. E-signature
- [ ] Envelope, signers, token links, email OTP, sign page (type or draw), stamping, audit certificate, filing back to the task.
- Tests: "a signing link can't be used after signing"; "a wrong OTP doesn't unlock the document"; "the audit certificate records the document hash before and after signing"; "the sign step advances when all signers have signed".

## M8. Upload portal, CDD and screening
- [ ] Upload link page (trilingual), per-item uploads, typed fields, extraction on upload.
- [ ] CDD records with reuse and review dates; screening providers (OpenSanctions API, local dataset, fake); adjudicator agent; staff clearance.
- Tests: "an uploaded ID copy ticks the item for that person only"; "a person with current CDD on file for another client isn't asked again"; "a strong sanctions hit blocks the task until staff clear it"; "screening results record the dataset version".

## M9. CSA parity: coverage, batch, deadlines, mail
- [ ] New HK playbooks (§11.1 of the spec) with register effects and documents.
- [ ] Batch start (annual cycle), batch generate, batch officer change.
- [ ] Deadline engine with last-done dates; dormant suppression; seal stamps.
- [ ] Registered office mail log.
- Tests: "an allotment updates the members register and share capital as at the allotment date"; "stamp duty on a transfer is 0.2% of the higher of consideration and value, split between buyer and seller"; "a filed NAR1 for this year's anniversary clears the annual return deadline"; "a dormant company has no AGM deadline"; "batch start creates one task and one invoice per selected client".

## M10. Mainland China, Macau, Taiwan
- [ ] Jurisdiction-specific fields and registers; core playbooks per §11.2; deadline rules; documents in the right language.
- Tests: "a PRC company's annual report deadline is 30 June"; "a PRC legal representative change requires the new legal representative to be a director or manager"; "a Taiwan company's Article 22-1 change deadline is 15 days"; "a Macau quota transfer updates the quota holder register".

## M11. Demo mode and end-to-end
- [ ] Demo panel, simulate payment and reply, reset; `docs/DEMO_SCRIPT.md`; setup guide for credentials (`docs/SETUP_INTEGRATIONS.md`).
- [ ] Time-saved tracking and panel.
- [ ] Playwright end-to-end run of the full demo loop with fakes; screenshot pass at 375, 768, 1280 and 1440 px.
- Tests: the full demo loop reaches Done with every client-facing action gated; a new prospect's loop includes onboarding.

## M12. Review gate
- [ ] Independent reviewer agent verdict recorded in `docs/REVIEW_LOG.md`; fixes applied until it approves.
