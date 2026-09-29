# Independent review log

**Final verdict (29 September 2026): approved for the supported demo workflows and Goal 3’s modelled administrative-coordination improvement.** The independent reviewer loop is complete. This is a bounded software/demo acceptance, not measured whole-task productivity, unconditional CSA replacement or production authorisation. See the final verdict below for evidence and limits.

## 2026-09-29 — round 1: changes required

Reviewer: an independent Codex subagent, separate from the implementation agent. `BUILD_SPEC.md` §12 originally names Claude; the available reviewer is Codex, so this is not represented as a Claude review.

**Verdict: not approved against the full build specification.** The connected workflow is a credible improvement and the director-appointment demo is a useful demonstration. Complete CSA replacement across the advertised covered tasks is not established. A multiple-x judgment may use the spec's modelled baseline, but must name its task set and assumptions; observed whole-firm productivity is not established. An agent should not infer that verdict from the count of playbooks or passing tests.

### Evidence inspected

Read `AGENTS.md`, `PRODUCT_SPEC.md`, `BUILD_SPEC.md`, `MILESTONES.md`, `TIME_SAVED_VS_CSA.md`, relevant domain, form-generation, approval, measurement and test code. Independently opened the running app on localhost:3000 using headless Playwright. Inspected Today, the showcase company, Time saved, Playbooks and Batch at 375, 768, 1280 and 1440 px: no horizontal overflow or browser page errors. Visually inspected screenshots of the bilingual company page at 375 px and Today at 1440 px; both were legible, with deadline seals visible. This inspection was read-only and did not reset or mutate the shared demo database. The implementation agent reran the 112-test baseline against real Postgres successfully during this review; I inspected that report separately from my code/UI review. Historical live-evaluation and rehearsal results have not been rerun by this reviewer. After the parent refreshed the CRV knowledge-base checkout, I also read its index, co-sec workflow research and decisions index; that context confirms that senior review, complete statutory packs and recurring work matter to replacement parity.

### R1 — block stale or changed approvals before consequential actions (high)

`src/domain/engine.ts` reopens outstanding requirements only at KYC, screening, generation and signing. Filing and register steps are excluded. `src/domain/step-hooks.ts` approval handlers record a filing or apply register changes without checking task cancellation, current step, missing requirements or unresolved conflicts. Register approval recomputes its effects from live task data rather than checking the displayed preview. A client can change the person or date after the card is shown, leaving the human approving a different action from the one applied. A cancelled task can retain actionable proposals.

Acceptance: real-database tests show that late changes at filing/register, cancelled-task proposals, unresolved conflicts and preview drift cannot produce a filing or register write. Changes must invalidate affected document/signature state and proposals, with a clear path to fresh review. The unchanged approved path must still finish.

### R2 — generated output must represent the covered transaction (high)

At review start, `src/documents/generate.ts` passed `increase: 0`, empty `cashRows` and empty `allottees` to NSC1; NNC1 received empty capital and no proposed parties; ND2B passed only correspondence address and ID changes. NAR1 chose the clock's current year and loaded today's register snapshot rather than the task's return period. `shareCertificate` used existing register holdings before the task's transaction was applied. The field-existence tests protect PDF compatibility, but do not establish that these outputs are complete or correct for the task.

Acceptance: transaction-level fixtures assert filled NSC1 quantities, parties and capital; certificates match the proposed post-transaction holdings; ND2B carries the requested changed fields; NAR1 respects a prior-year task and its as-at snapshot. NNC1 must include required incorporation parties/capital before it can be described as filing-ready. An explicitly blocked unsupported case is safer than an apparently completed blank form, but remains a coverage limitation and cannot establish full parity.

### R3 — time reporting must distinguish observation from assumptions (high for the improvement claim)

`src/domain/time-saved.ts` silently capped each observed timing at 900 seconds. Request-level approvals with no `taskId` were absent from per-task totals, including drafting/invoice review. Several baseline activities were parity or assumed work, and automatic/scripted completion could show zero actual time. In the running app, the historical seeded annual return displayed 8 minutes typical versus 0 minutes actual with zero logged approvals. The report labelled the denominator as staff time and offered a multiple despite incomplete capture. `TIME_SAVED_VS_CSA.md` itself correctly says its figures are assumptions; its whole-year estimate of 24–37% savings does not imply 2× whole-firm productivity.

Acceptance: measured durations are not silently truncated; request-level time is allocated exactly once; unmeasured work is labelled unmeasured; the UI does not turn partial approval timing into an observed productivity multiplier. Explain what the comparison excludes (manual filing, senior review, unlogged edits/actions, waiting and client work as appropriate). A multiple-x claim must be tied to an explicit covered workflow and a defensible baseline, with modelled versus measured evidence clearly separated. A partner timing study is not a prerequisite for a clearly labelled modelled reviewer judgment under this build spec.

### R4 — reconcile milestone completion with actual coverage (medium)

At review start M12 was checked even though this file did not exist. M9 checked batch generation and batch officer changes, while the inspected batch implementation/UI supported batch start only. The broad document/register-print and jurisdiction checkmarks exceed the integration and end-to-end evidence inspected. One complete director appointment and 42 configured playbooks do not demonstrate every playbook's filing-ready outputs, register effects and closure path. This is an acceptance-record defect as well as a coverage limitation.

Acceptance: correct the checklist and record which workflows have actually run end to end, which only have configuration/unit coverage, and which remain incomplete. Do not silently narrow the original full-parity acceptance gate or mark M12 approved merely because the demo loop passes.

### Boundaries and next review

No real Gmail, AgentMail, Airwallex, Xero or OpenSanctions account smoke test was established in this review. Missing credentials are an allowed demo limitation under `BUILD_SPEC.md` §2, but real adapters must remain labelled unverified. RLS/login, production deployment and data residency were explicitly deferred in decision #24 and are not new demo blockers. Company-secretary/legal validation remains separate from software tests.

The next round will inspect fixes and their actual red/green tests, then rerun representative UI and full-demo checks. It may approve a clearly scoped demo implementation if warranted; approval of the original multiple-x/full-coverage goal requires corrected covered-task behavior and a reasoned modelled comparison. It does not require inventing a new empirical acceptance condition.


### Round 1 clarification and concrete remaining coverage checks

The parent correctly clarified that §12 allows a reviewer judgment against a **modelled** baseline. I do not require a live design-partner time study to approve such a qualified judgment. The corrected partial timing panel should not claim an empirical multiplier, but the review can separately estimate a multiplier from explicit baseline and staff-work assumptions.

For the remaining parity work, concrete code findings are more useful than an unbounded demand for every conceivable test: `hk.changeParticulars` declares `update_person_particulars` and `hk.changeFye` declares `change_fye`, but both effects fall through to an empty structured plan; `hk.buyback` references `cr:NSC2`, which has no form mapping; `hk.dormant` declares no register effect to change the company's operating status. The `record_cdd_review` effect similarly has no handler, although the KYC clearance hook may perform the necessary record write and must be checked before treating that as a distinct bug. These join the explicit batch/print gaps in R4. The remedy is to implement the advertised behavior or obtain an explicit scope change; silent no-ops cannot count as parity.

### Modelled comparison the reviewer can assess

The original acceptance language permits a reasoned model. For a detailed client-request workflow, the assumptions in `TIME_SAVED_VS_CSA.md` §3a imply approximately 24–31 minutes of administrative coordination: request drafting plus invoice preparation 9–13 minutes, checking payment 2–3, reading/entering details about 5, filing an uploaded document 1–1.5, confirmation 2–3 and status/handover about 5. This is a selected-workflow model, not an annual average or an observed CSA timing.

If reviewing the corresponding Harbourline cards and handling exceptions takes 5–10 staff minutes, the same coordination work models roughly 2.4–6.2× faster. The 5–10 minute denominator is an explicit scenario assumption to validate, not a measurement from the current timing panel or the 45-second automated rehearsal. Document preparation already automated by CSA, senior review, statutory filing and client waiting must not be presented as eliminated. Shared human work must be added to both sides for a whole-task comparison, which can reduce that ratio below 2×. Accordingly, the review can potentially approve a **modelled multiple-x improvement in administrative coordination for tested workflows** after the correctness blockers close. It cannot extend that conclusion to complete tasks, all configured playbooks, or the firm's whole working year without further evidence.

## 2026-09-29 — round 2: correctness fixes reviewed; full acceptance remains open

Reviewer: the same independent Codex subagent.

**Positive design judgment:** the demonstrated director-request workflow and shared request/invoice/payment/collection plumbing support the qualified modelled multiple-x administrative-coordination case described above. This is a reasonable workflow-design judgment with explicit assumptions, not measured productivity, and does not assert a 2× improvement in the whole firm's working year.

**Full build/M12 verdict: still pending.** The spec requires all milestones to pass before final acceptance. Incomplete filing packs and parity operations remain independent blockers even where the coordination model is promising.

- **R1: core safety fix accepted on code review and targeted regression evidence.** File, register and signing approvals recheck current step, open state, outstanding information, conflicts and a digest of the task/company/register facts. Changed facts supersede the old card, invalidate prepared documents/signature state and restart preparation. Cancellation supersedes task proposals and voids signing envelopes. Register writes execute the checked plan, with unsupported effects held for staff attention. The implementation agent reported 19 passing R1 cases after actual red runs, including stale signing recovery; final combined-suite and browser reruns are recorded below when available.
- **R2: supported-output corrections accepted; coverage still incomplete.** NSC1 now uses an explicit cash-allotment plan and post-transaction capital; share certificates project the pending movements; ND2B maps actual changed particulars including protected data; annual-return context uses its reporting anniversary. Generation preflights its outputs and fails closed for unsupported forms/continuations rather than silently publishing omissions. New tests include actual `changeDetail` intake and a real-database prior-year register snapshot. NNC1, NAR1 continuation cases and other unsupported forms are still completion limitations until implemented, not parity achieved by blocking them.
- **R3: reporting fix accepted.** Inspected uncapped/shared allocations and the regression excluding adapter-processing time after approval. Independently opened the corrected firm report and historical task page in the running app at all four breakpoints, visually inspected both mobile screenshots, and reset viewport to 1280 px. No horizontal overflow occurred. Historical unmeasured work now says `Not measured`; the report labels approval timing partial and offers no empirical multiplier.
- **R4: status-record correction accepted; missing functionality remains work.** `MILESTONES.md` now records representative exercised paths and separates configured playbooks from implemented parity. Missing batch operations and complete register printing remain unchecked pending implementation. The corrected record is not itself completion of those features.


## 2026-09-29 — round 3: parity follow-ups in review

Read the new batch operations, particulars/FYE cache, fulfilled CDD guard and six-register export code and their regression tests. The particulars cache is keyed to its source instruction and stores protected extracted values encrypted; generation and register preview reuse it. FYE proposals validate calendar dates and do not change the client until applied. CDD closure validates current records and this task's cleared screening rather than inserting duplicate records. Batch operations validate the selected firm, person, date, state and conflicts, skip duplicates, and retain individual client-facing approvals.

The implementation agents reported red/green evidence for 3 register-export domain tests, 2 browser register-download tests, 4 initial batch regressions and 3 effect regressions, plus the existing relevant suites; a later batch isolation test was added and will be counted in the final suite. The parent also reported 5 browser tests passing after the R1 changes. These reports are distinct from this reviewer's independent code/UI inspection.

Independently opened `/batch` and the dated company register page on localhost:3000 at all four breakpoints, then reset to 1280 px. No page overflow or browser errors. The new batch controls and historical-date download link were present. Visual inspection found mobile officer names and roles wrapping almost letter-by-letter despite the overflow check passing; requested adequate table width within its scroll container.

Two functional follow-ups were sent to the implementation agent: batch-created requests did not retain the newly created conversation ID (so completion could lose its email thread), and the FYE effect stored `firstChangedPeriodEnd` while the deadline calculator did not use it (so the first transition period was not respected). Both need focused regression evidence before that behavior is accepted.

Full parity still has concrete unimplemented forms/workflows: NNC1 incorporation, NSC2 for the configured buyback and the separate secretary-resignation playbook specified in §11.1. Official NAR1 continuation support is actively being implemented and is deliberately not judged on an unfinished diff. No empirical timing-study prerequisite is added.


## 2026-09-29 — round 4: transaction and parity corrections accepted in the supported demo scope

The reviewer's independent source and rendered-output inspection now accepts the previously identified concrete fixes. Final combined test evidence and the acceptance verdict follow below when available; this paragraph does not claim an unrun check.

- **Approval consistency:** current-task gates, prepared-state invalidation and snapshot checks cover filing, registers and signing; unsupported register effects hold for staff attention. A changed or cancelled instruction cannot silently reuse the earlier approval.
- **Official forms and planned records:** NNC1 has a shared encrypted plan for its founder, first director, corporate secretary and capital. Founder uploads are associated with that same person before screening, and later replacement uploads remain accepted. Certificate number/date are required at filing; initial appointments, holdings and company activation need a separate human register approval. NSC1 and share certificates use the planned allotment/transfer. ND2B handles the changed particulars and protected sheet. NAR1 uses the reporting anniversary and effective-dated records, with official natural-director and member continuations. NSC2 uses one shared calculation for the official form and register: a profits-funded cancellation does not invent a proportional capital reduction.
- **Visual output:** independently viewed the generated NNC1 founder, director and protected-information pages, NAR1 official Sheet C, and both NSC2 pages. English and Chinese data are legible; partial public identifiers and full protected identifiers are separated; director consent and the selected signing capacity are present. A PDF-font regression now checks drawable outlines, because extractable text alone did not reveal the earlier corrupt glyphs.
- **Parity behavior:** particulars, financial-year-end, fulfilled CDD and dormant status now have concrete effects. The transition FYE preserves earlier periods and starts the first changed period at its specified end. Secretary self-notification has an ND4 playbook and a dated effect limited to the selected secretary. Batch work retains the new conversation ID. Six statutory register PDF extracts are downloadable by date. The mobile register uses a sufficiently wide internal scrolling table; the reviewer independently confirmed readable names after the initial visual failure.
- **Measurement:** the corrected panel reports partial observed approval duration, with shared request time counted once. It does not relabel the automated rehearsal or absent observations as measured staff productivity.

### Supported transaction bounds

These are software coverage limits, not statements that other legal shapes are prohibited:

| Output | Reviewed supported shape |
|---|---|
| NNC1 | One individual founder who is also the first natural-person director, one fully paid HKD class, the firm's corporate secretary, explicit identity/address/adult/consent/secretary particulars, and official incorporation number/date before initial register application |
| NSC1 | Cash, fully paid allotment into one existing class, at most two allottees, with explicit consideration, address, entity type, currency and unpaid-capital facts |
| NAR1 | Natural directors via repeated official Sheet C; member/class schedules via repeated official Schedule 1; up to four capital rows in one currency; unsupported corporate-director cases rejected |
| ND2B | Individual officer changes including protected identity/residential details on the protected sheet |
| NSC2 | Supported private-company, one-class buyback with explicit funding and verified capital arithmetic; listed/multiple-class/unknown-funding cases rejected |
| ND4 | Secretary self-notification with explicit notice declaration, authorised signatory and selected secretary/date |

The supported forms are staff-reviewable drafts. Practitioner review and manual authority filing remain part of the workflow. Names and addresses in historical extracts are current particulars; appointment/holding dates are historical. The reviewed evidence does not turn configured playbooks into a fully exercised client-to-completion path for every jurisdiction. Written resolutions exist; a separate meeting-minutes generator and complete language parity for every ancillary template remain distinct specification items unless subsequently implemented. Missing live-account credentials remain the permitted demo limitation in §2.


### Round 4 combined verification

The implementation agent ran the complete real-Postgres suite: **176/176 tests passed** (201 seconds), plus successful typecheck, lint and production build. Lint retains eight pre-existing warnings. The first browser rerun passed 7/8; its failure was a fixed 800 ms reload racing the now slower full-font PDF generation, so the test is being corrected to wait for the actual request/working state. That browser pass is not claimed until rerun. Minutes and ancillary-template language parity are now being implemented as the remaining explicit document-scope items; they will receive their own red/green and visual review before the final verdict.


## 2026-09-29 — round 5: final authoring and document follow-ups

The corrected browser rerun passed **8/8** (reported by the implementation agent), including the full director demo and dated register export checks. The test now waits for generation's actual response instead of a fixed delay. A final source pass also extended the approval digest to linked officers/members/controllers' person particulars and firm presentor fields. Two regressions failed on the earlier digest, then the focused 21-case suite passed. Unrelated people and invoice-sequence changes are controls which leave the digest stable.

The remaining explicit document-template gaps are closed in the supported scope. Board and member minutes require supplied date, time, place, chair, attendees and decisions; invalid dates/times or missing facts stop generation. They do not infer a meeting, unanimity, attendance or a translation of supplied proceedings. English, Traditional Chinese, Simplified Chinese and bilingual boilerplate now covers the seven ancillary templates. The form agent reported **22 expected red failures, then 34 passing new tests**, followed by **68/68 relevant document/parity tests**, with typecheck and lint passing. Independently viewed the rendered English, Simplified and bilingual minutes plus Traditional engagement letter; text and chair signature line are readable and unclipped. The agent additionally checked all eight rendered language samples. This supersedes the earlier missing-minutes/language limitation.

Playbooks now have an editable, validated JSON version route. The reviewer inspected immutable version creation, firm-scoped advisory locking, stale-save rejection, preserved existing-task version pins and template/requirement/gate validation. Meeting-minute edits require all six facts and a human step to obtain and verify the actual chair's wet-ink signature, rather than guessing an electronic signer. Final editor tests/UI evidence are recorded below once available.


The reviewer independently opened the expanded playbook editor on the running app at 375, 768, 1280 and 1440 px, inspected its mobile English/Chinese labels and editable JSON, observed no page overflow or browser errors, and reset to 1280 px. This was read-only; the implementation agent's isolated browser test verifies saving.

### Live verification boundary in this session

The implementation agent attempted the live-model rehearsal again; intake stopped with `fetch failed`. Public OpenRouter and Companies Registry probes timed out. The form-version check also encountered fetch failures, so this session **does not verify current official form versions** and **does not repeat the historical successful live rehearsal**. Three red/green regressions corrected misleading failure reporting: transport errors cannot be reported as “all current”, and the CLI exits unsuccessfully when checks fail. Historical handoff results remain historical; fixture-backed regression success is separate. No real Gmail, AgentMail, Airwallex, Xero or OpenSanctions account smoke test was possible without credentials.


The editor implementation agent reported four expected failing domain tests before implementation, then four passing, followed by an expanded **39/39 editor/engine/approval suite** including an actual minute-generation task using the saved version. Its **2/2 browser tests** passed: malformed JSON retained with an error, bilingual edits saved as a new version, and the failed form check displayed `Not verified` rather than current. Each browser case checked all four required widths and its screenshots were inspected. Targeted lint and full typecheck passed. The independent reviewer accepts the authoring behavior on this evidence and source/UI inspection.


## 2026-09-29 — final verdict: approved for the supported demo workflows

Reviewer: independent Codex subagent; the available reviewer identity remains explicit rather than being described as the Claude reviewer named in the original specification.

**Goal 3 is approved as a modelled multiple-x improvement in administrative coordination for the supported, tested request workflows. M12's independent review loop is complete.** The connected workflow removes repeated request drafting, invoicing, payment checks, re-entry, document handling and completion/status coordination while retaining human approval. The corrected forms, effective-dated effects, batch operations, register extracts and editable playbooks now support a meaningful demonstration of that workflow. The concrete defects identified during this review have been corrected and re-reviewed; there is no remaining identified code blocker in the supported demo scope.

The quantitative judgment is the explicit model above: approximately **24–31 manual coordination minutes versus an assumed 5–10 review/exception minutes, or 2.4–6.2×**. The denominator is a scenario assumption. It is not the 45-second machine rehearsal, a measured staff result, a guaranteed ratio for every configured playbook, or a claim that entire tasks or the whole firm are at least twice as productive. Senior review and manual filing remain; adding those shared costs can make a whole-task ratio less than 2×. This qualification is part of the approval, not an omitted caveat.

### Final verification evidence

The implementation agent ran these after the final implementation changes; this reviewer independently inspected the code, regression assertions, running UI and rendered PDFs described in the preceding rounds:

| Check | Final result |
|---|---|
| Complete unit/integration suite against real Postgres | **220/220 passed**, 25 test files, 194.32 seconds |
| Complete Playwright suite | **10/10 passed**, approximately 1.1 minutes: full investor demo, breakpoints, editor/form-check failure handling and dated register exports |
| Typecheck | Passed |
| Lint | No errors; eight pre-existing warnings |
| Production build (`NEXT_DIST_DIR=.next-build npm run build`) | Passed |
| Diff whitespace check | Passed |

The browser rerun kept console-error assertions enabled. Its screenshot helper was corrected to avoid Playwright temporarily injecting caret styles into textareas while React hydrated them. The generation wait uses completion state rather than a fixed 800 ms sleep. These were test-harness corrections, not suppressed application failures.

### Integrations and remaining boundaries

A later Companies Registry check using system curl as the transport **successfully downloaded all 11 tracked form assets and matched every manifest hash**, superseding the earlier timeout-only result. Default Node fetch still timed out in this environment. The ordinary checker now reports failed verification and exits unsuccessfully rather than claiming “all current”; worker/network transport still needs resolution before relying on scheduled live checks. The current live-model rehearsal failed at transport (`fetch failed`), so no new successful live-model accuracy/latency result is claimed. The earlier 25-scenario evaluation and rehearsal remain historical handoff evidence.

Real Gmail, AgentMail, Airwallex, Xero and OpenSanctions account smoke tests remain unavailable without credentials. That is allowed for this demo by `BUILD_SPEC.md` §2. Production authentication/RLS/residency remain outside the deferred demo scope, and statutory/local-jurisdiction rules and packs require practitioner verification.

The supported form shapes above, current-particulars disclosure on historical extracts, and the evidence matrix in `MILESTONES.md` remain binding limits. Not every configured CN/MO/TW or HK playbook has been exercised from client email to completion in a browser. No claim of unconditional replacement of every CSA variant, legal filing acceptance, or measured whole-firm multiple-x productivity follows from this approval. The known document-template and playbook-authoring implementation gaps have been closed; these remaining items describe verification and deployment limits rather than an unfinished independent review loop.
