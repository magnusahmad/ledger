# Area 10 date and downtime audit

Status: **Original date/downtime reporter scope CLEAR on immutable `8f9da1c86859f4e99324565b07c73ffe10e66898`**. Final independent focused26/26 GREEN (41.93s) and affected legacy92/92 GREEN (96.65s); typecheck/scoped lint/diff checks exit0. All186 source/DECISIONS files match that candidate exactly, including untracked imports. Fresh invoice recovery browser4/4 GREEN (12 EN/TC/SC approvals across375/768/1280/1440) on6b carries forward only after confirming the nine relevant invoice/recovery/PDF/UI consumer files are byte-identical. The necessary D03 AGM/FYE downtime failure is now green. Original11 failures /4 controls and subsequent consumer reds below remain historical evidence. Root owns weekly-duty acceptance; the other original reporter owns load/list acceptance, so this is not whole-Area10 or whole-MVP clearance. Fictional PostgreSQL and deterministic fake providers only; private harness/source imports/artifacts are excluded from this report-only commit.

## A10-D01 — invoice issue/due dates disagree with accepted PDF (high)

Public `startManualRequest` → human `approveProposal` renders and actually sends the invoice PDF. FakeMail captures acceptance, then the fixture advances HK time over midnight before local completion. `pdftotext` verifies the printed issue date; the durable journal retains exactly the captured bytes and there is one send. Local `markInvoiceSent` instead reads the later clock date.

September case: PDF 29 September 2026, recorded issue 30 September, 30-day due 30 October rather than 29 October. Year-end lost-ack case: PDF 31 December 2026, staff recovery on 1 January 2027 records issue 1 January and due 31 January rather than 30 January. Recovery correctly reuses the PDF without sending again. Same-day control passes.

Repro: `npx vitest run tests/audit-temporal-invoices.test.ts`. Actual initial baseline run: **2 failed / 1 passed**, 7.65s, assertion failures in issue and due dates (no timeout/import/setup failure). Log: `/private/tmp/harbourline-robustness-20261002/area10-date-invoices-red.log`.

Likely consumer boundary: `src/documents/invoice-pdf.ts`, `src/domain/handlers.ts`, `src/domain/invoices.ts`; reporter does not implement repair. Financial dates must agree with the already accepted document and configured credit terms; exact accepted bytes and no-resend remain required.

Bounds: three deterministic clocks: ordinary same-day, HK midnight, HK New Year with accepted delivery/lost acknowledgement. No legal leap-anniversary assumption, no external provider.

## Separate fixer invoice-date checkpoint

Own guarded reproduction of the original three invoice cases matched **2 expected business reds / 1 same-day positive in7.53seconds**, `area10-fixer-invoice-red.log`. Before source edits, the added upfront-midnight and legacy accepted-journal controls produced **4 expected failed cases /1 positive in11.59seconds**, `area10-fixer-invoice-guards-red.log`; the legacy retry falsely completed without date provenance.

The exact rendered PDF now has its issue/due dates, invoice ID and PDF SHA pinned in the encrypted delivery journal before transport. The renderer receives the same captured issue day; local completion and positive provider reconciliation use those dates and verify the invoice terms instead of reading a new day. Private metadata is removed from the outbound provider payload. Existing explicit manual/outside invoice issuing retains its current-day rule.

Nonempty legacy approved invoice journals without verifiable captured dates block with an explicit invoice-review error, retaining the accepted bytes and avoiding a resend or guessed date. This repair cannot reconstruct unavailable prior date provenance; it does not parse or replace accepted PDFs to conceal a mismatch.

Final captured-date/upfront/legacy/same-day checks **5/5GREEN12.46seconds**, `area10-fixer-invoice-final-green.log`, exit0. Typecheck/scopedlint/diffchecks0. This is a focused immutable invoice checkpoint only; full relevant mail/billing/recovery checks and original reporter acceptance remain pending. Other Area10 frozen date/downtime/load reports are not yet repaired or cleared. Four private isolation harness files, node_modules and generated artifacts remain excluded.
## A10-D02/D03 — unresolved annual periods disappear after downtime (high)

`upcomingDeadlines` ignores years before current year minus one. An explicit seeded `NAR1:2025` filing establishes 2026 as the next outstanding return; retained downtime years 2028/2031/2036/2040 replace it with later periods without any additional filing. Recorded last AGM for financial year ended 31 December 2024 similarly establishes unresolved 2025 year end, due 30 September 2026; at September 2032 it disappears. BUILD_SPEC §11.4 and PRODUCT_SPEC §12 explicitly prohibit automatic roll-forward. These fixtures anchor known last-done history, and do not infer missing pre-import history or prescribe how later gap filings should be reconciled.

## A10-D04 — CDD deadlines ignore current effective register periods (high)

Public record writers create a future director or controller with an older CDD deadline. Before its 2030 appointment/controller start, Today incorrectly gains a 2022 overdue review. A current controller with recorded future cessation in 2030 incorrectly disappears from CDD coverage today. Register date writers themselves accept and retain valid dates; the deadline consumer uses incomplete interval filters.

## A10-D05 — future CDD reviews replace current coverage (high)

Public `recordCdd` at a future controlled clock records review evidence. Returning to September 2026, `hasCurrentCdd` correctly excludes future verification, but deadline calculation selects the maximum review due date regardless of verification date. Today's review due 2 November 2026 becomes 1 January 2034. All already verified demo people receive future review fixtures, preventing an unchanged sibling from accidentally masking the incorrect maximum selection.

Actual second baseline command: `npx vitest run tests/audit-temporal-deadlines.test.ts`: **6 failed / 2 passed**, 2.28s. All six failures are intended business assertions; ordinary known last-done and civil HK/year/leap/month clamps pass. Log `/private/tmp/harbourline-robustness-20261002/area10-date-deadlines-red.log`. Total portable initial corpus now eleven cases (eight red, three controls), unchanged source `99e68ad`.

## A10-D06 — staff reply chase events use ingestion clock instead of provider date (medium)

Real public inbound request processing creates a linked task/thread, with a legitimately saved zero-fee playbook and actual human-approved FakeMail initial send. Public `recordMailboxReply` persists each provider reply; both fixtures explicitly assert that the task received a mailbox-reply event, avoiding false evidence from an unlinked conversation.

Recent receipt: staff replied 29 September; a still-open context is dated 20 September. Exact replay creates no extra event, and an out-of-order 21 September receipt follows. On 30 September the most recent real reply is one day old, but a chase is drafted prematurely. Delayed receipt: a 25 September reply ingested on 30 September postpones a chase that has genuinely waited five days. The later draft must remain pending, dedupe repeated runs, and never send automatically.

Actual final baseline command `npx vitest run tests/audit-temporal-chasing.test.ts`: **2 failed**, 1.84s. Both fail on intended chase counts. Log `/private/tmp/harbourline-robustness-20261002/area10-date-chasing-final-red.log`.

Qualification: an earlier exploratory variant used manual request creation, which does not wire `request.conversationId` to its confirmation conversation. That variant could not establish the intended clock assertion and is excluded from these counts. The published fixtures use genuine inbound linking and prove activity exists. The manual linkage observation is reported to the parent as a possible consumer gap, not an additional confirmed clock defect.

## A10-D07 — failed worker duty is marked complete and suppressed (medium)

The test imports actual `src/worker/main.ts`, injecting only an isolated runtime context, Fake providers, a stubbed CR-forms network duty, deterministic `Date.now`, worker sleep callbacks and safe stop handlers. Real polling/jobs/reminder/chase/lease code and PostgreSQL execute; a wrapper injects one transient chase-duty failure before normal domain execution resumes.

After the failure, `worker.lastChasers` is written despite no successful chase sweep. A tick one minute later does not retry; the eligible task has no draft. Expected: failed work remains eligible to retry and produces a human-review draft once the failure clears. The positive control proves repeated ticks suppress duplicate successful sweeps, an eight-day downtime runs due duties once, the pending chase remains unique, no automatic mail is sent, and a 60-day demo offset cannot steal an operational lease.

Actual baseline command `npx vitest run tests/audit-temporal-worker.test.ts`: **1 failed / 1 passed**, 2.52s. The red asserts the wrongly written checkpoint and missing second invocation. Log `/private/tmp/harbourline-robustness-20261002/area10-date-worker-red.log`. No worker/server process remains active; every test stops its actual loop and restores timing mocks.

## Frozen bounds and verification

Fifteen named cases in four portable files. Retained downtime sample seed label `0xA10DA7`, explicit years 2028/2031/2036/2040; three invoice boundary clocks; deterministic provider receipt/replay order; five civil month-clamp samples plus HK New Year and leap-day arithmetic; two controlled actual worker sequences. No load expansion, no statutory leap-anniversary rule invented, no guessed pre-import backlog, no live mail/bank/LLM/screening/forms network, no UI source change. Forms success is safely stubbed; forms failure retry policy is not claimed tested. Other-jurisdiction missed-period reconciliation is outside this bounded HK corpus.

All runs followed the private isolation guard for `harbourline_robust_verify`. `npx tsc --noEmit`, scoped ESLint on all four reporter test files, and `git diff --check` exit 0. Only tests/report are committed. Four private harness files and `node_modules` remain local and excluded. Separate fixer owns implementation; original reporter must independently replay its immutable candidate and relevant date, billing, chase, recovery, demo-clock and worker controls before terminal clearance.

## Independent invoice checkpoint 461fc182 and necessary D01 consumer closure

Exact source-only `99e68ad` → `461fc182` imported; `git diff --exit-code 461fc182 -- src docs/DECISIONS.md` succeeds. Original three invoice cases plus fixer's portable upfront-midnight and legacy-journal-without-provenance controls: **5/5 GREEN**, 11.51s. Log `/private/tmp/harbourline-robustness-20261002/area10-invoice-461-independent.log`. Captured issue/due/PDF hash now works through normal recovery. Missing legacy provenance safely blocks normal recovery without resending. This is partial checkpoint acceptance, not remaining deadline/worker acceptance.

Necessary public consumer closure uses actual accepted Dec31 PDF/lost acknowledgement → `resolveInterruptedProposal` after checking mailbox → fresh pending review → `approveProposal(... completedOutside: on)`. This is the review page's existing “Handled elsewhere? Mark done” flow. Supplying new outside options directly to old recovery is not this path: original approved inputs correctly remain pinned.

On checkpoint461, staff completion calls `completeSending` → `markInvoiceSent` without captured dates. Known-provenance PDF gets Jan1 issue/Jan31 due rather than Dec31/Jan30. An accepted legacy journal with dates absent also gets invented current-day dates from a generic mailbox note. Both retain original bytes and one send, so these are local financial-history defects. Existing UI exposes only an optional note for this action; normal legacy recovery refuses but offers no structured date-review completion input. Parent requests a usable explicit human review path; reporter does not prescribe date inference or automatic resend.

`tests/audit-temporal-invoice-completion.test.ts`: **2 intended business RED / 1 integrity control GREEN**, 11.23s on immutable461. Log `/private/tmp/harbourline-robustness-20261002/area10-invoice-closure-461-red.log`. Control tries wrong invoice ID, impossible ISO date, wrong PDF hash and inconsistent credit due date against a real accepted journal; each requires review with null issue date/no resend, then restoring valid provenance recovers correctly. This is a bounded D01 closure extension, no new category. Typecheck/scoped lint/diff pass after this extension. Five imported candidate tests and source remain local; only the new portable closure file and this report are committed.

## Separate fixer D01 staff recovery and completion checkpoint

The original completed-outside consumer was reproduced on the fixes database together with actual legacy-review assertions through the existing public `resumeApprovedProposal` entrypoint: **4 failed / 1 integrity control passed in 18.98 seconds**, `area10-fixer-completion-review-red.log`. The proposed structured date-review argument was ignored by the baseline API, reaching its real missing-provenance refusal; these two absent-capability cases are distinguished from the two original completed-outside financial-history bugs. There was no absent export/import failure.

Before the corresponding source edits, two necessary consumer guards produced **2 failed / 2 passed in 15.41 seconds**, `area10-fixer-review-preflight-red.log`: inconsistent captured credit dates crossed the provider boundary before local rejection, and a mailbox-closed replacement card discarded its recoverable legacy review state. They now block before transport and retain the explicit recovery form respectively.

Staff can open **the exact captured original PDF** from the recovery page, enter its printed issue date and the due date calculated from the original printed terms, check the original-PDF confirmation and provide a verification note. The review verifies the same-firm proposal/message/invoice association, original journal ID, encrypted payload digest, exact original invoice attachment SHA, current approval facts and unchanged credit terms. Positive journal/provider acceptance is required; an unknown or changed-provider lookup cannot authorize another send or manufacture a success identifier. Supplemental dates are encrypted and audited with the staff actor, note and old/new journal digest. The original approval then resumes without replacing the PDF or sending again. A fresh handled-elsewhere card can recover the same original invoice journal after a missing-date rejection. Generic mailbox closure alone cannot supply financial dates.

Limitations are explicit: missing historical dates are **human reviewed, not automatically inferred**; multiple conflicting delivered invoice PDFs require separate financial review. The date action cannot turn unknown acceptance into provider proof. Existing already-issued history is preserved; unrelated genuine manual/offline issuance retains its existing current-day behavior.

Final focused invoice/recovery/closure corpus: **12/12 passed across three files in 36.93 seconds**, `area10-fixer-invoice-review-green.log`. This includes same-day and upfront terms, midnight/year-end, exact bytes/correlation, zero extra transport calls or generated documents, legacy review audit, unchecked/invalid/stale/foreign/unknown-acceptance refusals, restored valid recovery, and credit-integrity rejection before acceptance. Type/scoped lint/diff checks are recorded separately. Original reporter UI/relevant-suite acceptance and the remaining Area10 date/load corpus are still pending; this is not terminal Area10 clearance.

## Separate fixer D02–D07 temporal checkpoint

Guarded original deadlines, mailbox timing, actual worker retry and manual-thread consumer reproduced **10 intended business failures / 3 controls across four files in 6.04 seconds**, `area10-fixer-temporal-red.log`, before their source edits. The repair keeps the successor of explicitly known last-done annual/AGM periods after downtime while retaining the existing bounded assumption when no historical evidence exists. It does not reconstruct unknown pre-import gaps or change statutory day/month offsets. Current CDD uses effective officer/controller intervals and excludes future verifications, with firm-scoped evidence reads.

Mailbox task events now retain the actual provider receipt time, so delayed/reordered ingestion cannot replace real activity with the context clock. Confirmed manual requests persist their confirmation conversation association, allowing genuine later mailbox replies to reach the task. Hourly chase/reminder checkpoints are written only after successful execution; failed duties remain retryable. Weekly forms failure policy is unchanged and not claimed repaired by these tests.

Focused **13/13 GREEN in 5.79 seconds**, `area10-fixer-temporal-green.log`; relevant manual, chasing, demo-clock and Today **20/20 GREEN in 12.18 seconds**, `area10-fixer-temporal-relevant-green.log`. Type/scoped lint/diff checks exit 0. Broader historical/financial-period and mail suites, original final replay/browser acceptance, load/pagination/reminder concurrency repairs and the truthful legacy-form wording consumer remain pending. This checkpoint is not terminal Area10 acceptance.

## Independent dd37b431 domain acceptance and actual recovery-form consumer

Original invoice five cases, necessary completion three cases, and fixer's explicit legacy-review four cases: **12/12 GREEN**, 35.92s. Actual command: `npx vitest run tests/audit-temporal-invoices.test.ts tests/audit-temporal-invoice-completion.test.ts tests/audit-invoice-date-review.test.ts`. Log `/private/tmp/harbourline-robustness-20261002/area10-invoice-dd37-independent.log`. Explicit reviewed dates preserve original PDF/journal identity and no resend; unchecked, invalid, stale, foreign and unknown-acceptance requests reject atomically. Missing metadata can be reviewed after fresh handled-elsewhere rejection rather than permanently stranded. This supersedes the two historical completion reds on461.

All **185 source/DECISIONS files byte-identical** to dd37, including newly imported untracked files. Git diff alone initially reported new files as deleted and stopped preflight before any tests; a complete tree byte comparison corrected the preflight. That stopped attempt is not red test evidence.

Bounded D01 UI consumer: browser downloads `/api/review/{id}/invoice`, asserts200/PDF type/exact accepted SHA, then extracts real PDF text. The legacy renderer prints issue date “29 September 2026” and “30 days” terms, with no due date. Live form nevertheless labels the required input “Due date on the delivered invoice” and says “Enter the dates printed on that PDF.” Staff cannot copy a field that is absent; the due date must be based on the original issue date and terms, without altering historical bytes or inventing a printed field.

`npx playwright test e2e/audit-temporal-invoice-review.spec.ts --grep '375px'` on exact dd37: **one actual browser RED**, 23.0s test time. The failure is the truthful-instruction assertion after real PDF hash/date/terms assertions passed. Log `/private/tmp/harbourline-robustness-20261002/area10-invoice-review-dd37-browser-red.log`. Inspected screenshot `/private/tmp/harbourline-robustness-20261002/area10-invoice-dd37-browser-red-shots/date-review-entry-en-375.png`; mobile form otherwise fits without clipped labels or buttons.

Portable browser fixtures reset/seed **before each width**, create three genuinely fresh accepted/lost-ack legacy PDFs in EN/TC/SC, close then attempt existing staff Mark done and assert fresh recovery. Matrix retains pending/null financial dates before click; actual original PDF download/hash; hydrated action POST; final printed issue/date+30-day terms; one original FakeMail send per invoice; unchanged documents/filings/invoice sequence/journal count; one human audit entry and normal credit collection gate. Viewport resets in `finally`. Whole matrix awaits immutable truthful wording repair; no full visual acceptance is claimed from this first red. Browser/Next server stopped, generated Next files restored, private harness preserved. Type/scoped browser-fixture lint pass.

## Fixer: truthful original-PDF review instructions

Original portable80f9721 independently reproduced on the fixes E2E database: the 375px case failed in19.5s after the exact accepted PDF hash, printed29September issue date and30-day terms checks passed. The PDF has no due-date field; the previous label incorrectly told staff to copy one. The form now asks for its printed issue date and a due date calculated using the original terms, with a checkbox confirming both facts. The date validation, original-PDF download, reviewed approval and no-resend path are unchanged.

Final own browser matrix:4/4passed,1.4m, all12EN/TC/SC language/width journeys at375/768/1280/1440. Exact PDF/delivery identity, one original send, reviewed-date audit, invoice/task state, no sequence/document/filing changes and overflow/pageerror controls pass. All12 completed form screenshots were individually viewed; text wraps and the labels/required note remain readable. Viewport reset by the test. Typecheck/scoped lint/diff checks exit0. Evidence:area10-fixer-invoice-copy-{red,green}.log; fixes/storage/e2e/shots/date-review-form-*.png. This is a source checkpoint, not Area10 clearance.

## Independent6b replay and necessary last-AGM consumer

185 source/DECISIONS files byte-identical to immutable6b, including untracked source imports. Original frozen15 plus fixer's two invoice controls, necessary three completion controls, four explicit legacy-review controls and root's manual-thread activity consumer: **25/25 GREEN**,39.34s across7files. Relevant m2-engine,m5-billing,chasing,mailbox-replies,demo-clock,m9-parity,m8-kyc: **82/82 GREEN**,58.33s across7files. Logs `area10-6b-focused-independent.log` and `area10-6b-legacy-independent.log` in the parent audit directory. Root original weekly-worker duty cases remain pending separately; wholeArea10 clearance is not claimed.

The existing m9 AGM positive control explicitly establishes ordinary seeded Silverstrand `AGM:2025`, due30September2026, because its last AGM26September2025 precedes financial year end31December2025. New repair starts downtime scan at `lastAgm.year+1`. Advancing this unchanged client to2032 drops the already-established unresolved2025 period. This is the same D03 last-done/FYE consumer, with no new legal policy, inferred lost history or changed registers. Necessary bounded extension appended to `audit-temporal-deadlines.test.ts`.

Actual `npx vitest run tests/audit-temporal-deadlines.test.ts -t 'last AGM before'` on immutable6b: **one intended business RED**,1.28s. Current explicit2025/deadline assertion passes; downtime lookup is undefined. Log `/private/tmp/harbourline-robustness-20261002/area10-6b-agm-consumer-red.log`. Fixer owns the source repair; browser wording repair itself is ready for independent fresh matrix acceptance.

## Fixer: last-AGM before financial year-end consumer

Portable fcec64d independently reproduces one genuine business failure in1.30s: Silverstrand's previously established AGM:2025 due30September2026 vanishes after advancing the unchanged client to2032. A meeting earlier in its own FYE year cannot satisfy that later year-end. Minimum scan repair starts from the recorded meeting's year and lets the existing exact meeting-versus-FYE comparison exclude satisfied periods; no statutory offsets or financial-calendar rules change. Guarded original temporal deadlines plus m9 parity:20/20green across2files12.78s. The requested nonexistent fye-periods.test.ts filename matched no file and carries no coverage claim. Typecheck/scoped lint/diff exit0. Logsarea10-fixer-agm-consumer-{red,green}.log. Original reacceptance remains pending.

## Fresh D01 visual and functional acceptance on immutable6b

Actual `npx playwright test e2e/audit-temporal-invoice-review.spec.ts`: **4/4 GREEN (12 fresh approvals)**,1.5m overall. Width37525.6s,76817.0s,128017.1s,144016.5s. Fresh reset/seed before every width provides three separately accepted legacy PDFs in EN/TC/SC; no previously completed recovery card is reused. Log `/private/tmp/harbourline-robustness-20261002/area10-6b-invoice-review-matrix.log`.

Every case verifies original PDF200/type/exact accepted SHA and actual extracted issue date/30-day terms, truthful derived-due wording, null draft dates before click, hydrated successful Next Action POST, final issue29September2026/due29October2026, one human dates-review audit, normal credit collection gate. Original outbox remains byte-for-byte unchanged (one send per invoice), three journals/correlation IDs retained, no document rerender, invoice-sequence increment or statutory filing. Client and verification-note CJK content exercised. Original PDFs are also retained as inspection artifacts.

Individually viewed all12filled recovery form screenshots across languages/widths plus completed invoice representatives at all4widths. Labels, original-document link, date fields, checkbox, note and approval button remain readable; no clipped controls, horizontal overflow or page errors. Full-page mobile/tablet captures position the fixed navigation at the current viewport scroll offset; this is a capture artifact, with the actionable form clear. Viewport reset1440×900 in every test finally block. Next server stopped (3225 listener absent) before generated Next-file restoration/type checks.

Preserved **36PNG +12originalPDF** artifacts: `/private/tmp/harbourline-robustness-20261002/area10-invoice-6b-accepted-shots`. Typecheck, scoped reporter tests/browser-fixture lint, isolation guard and diff-check exit0. Source-only imports/fixer control copies/private harness/artifacts remain local; new browser PDF preservation and this qualification are test/report-only changes. This completes independent D01 acceptance while D03 fiscal-period consumer and root weekly-duty acceptance remain pending.


## Terminal original-reporter acceptance on immutable8f9da1c

Imported only source/DECISIONS delta from accepted6b to immutable `8f9da1c86859f4e99324565b07c73ffe10e66898`. Exact tree comparison covers all186 files, including the new `chase-state.ts`, original-PDF route and invoice-date review helper. No reporter product fixes. The fiscal source now starts from the recorded last-AGM calendar year; the existing meeting-versus-financial-year-end check excludes genuinely satisfied periods. Ordinary demo Silverstrand AGM2025 remains due30September2026 and remains outstanding after advancing to2032. The prior necessary consumer red was one intended failure in1.28s, not1.40s.

Final actual focused command:

```sh
npx vitest run tests/audit-temporal-invoices.test.ts tests/audit-temporal-deadlines.test.ts tests/audit-temporal-chasing.test.ts tests/audit-temporal-worker.test.ts tests/audit-temporal-invoice-completion.test.ts tests/audit-invoice-date-review.test.ts tests/audit-temporal-manual-mailbox.test.ts
```

**7files /26cases GREEN**,41.93s, runnerexit0. This replays every original frozen15 case, necessary fiscal consumer, two portable invoice controls, three staff-completion integrity controls, four explicit legacy-date review controls and root's manual-thread activity consumer. Actual recorded FakeMail acceptance/PDF text/hash, no resend, human-only recovery, credit/upfront dates, CDD effective periods, known annual backlog, provider receipt order and actual worker retry/downtime/lease sequences all pass. Log `/private/tmp/harbourline-robustness-20261002/area10-8f-focused-independent.log`.

Final actual affected legacy command:

```sh
npx vitest run tests/m2-engine.test.ts tests/m5-billing.test.ts tests/chasing.test.ts tests/mailbox-replies.test.ts tests/demo-clock.test.ts tests/m9-parity.test.ts tests/m8-kyc.test.ts tests/m7-signing.test.ts tests/review-timing.test.ts
```

**9files /92cases GREEN**,96.65s, runnerexit0. Signing and review-timing controls supplement the previous82 checks because the combined candidate changes chase invitation and publication/approval fences. Log `/private/tmp/harbourline-robustness-20261002/area10-8f-legacy-independent.log`. These two runs are sequential;118 cases are not described as one combined runner result. Existing pg client-query deprecation warnings occur without assertion/setup failures.

The only6b→8f source changes are deadlines, worker weekly single-flight/checkpoint handling, chasing/publication fences, chase-state invitation helper and approval execution. Nine invoice/recovery consumer files are unchanged: review page, original-PDF API route, invoice renderer, date-review helper, invoices, mail-delivery, handlers, sending and server actions. Therefore the actual fresh6b four-width/three-language recovery matrix and individually inspected12 forms carry forward; no new browser run is claimed on8f. Retained artifacts remain `/private/tmp/harbourline-robustness-20261002/area10-invoice-6b-accepted-shots` (36PNG/12originalPDF). The earlier matrix's exact PDF/date/no-resend/audit/task-gate assertions and viewport reset remain the evidence for this unchanged UI.

Isolation guard passed before each actual runner/check. `npx tsc --noEmit`, scoped ESLint covering reporter fixtures and changed date/chase/worker source, and `git diff --check` exit0; logs `area10-8f-type.log` and `area10-8f-lint.log` are empty. Heavy replay window released after both runner exits; no own browser/Next server or worker loop remains. Private four-file harness, node_modules link, generated build artifacts, source imports and imported candidate control copies remain excluded. This terminal commit changes this report only. Whole-Area10 acceptance still requires the separately assigned original load/list reporter and parent-owned weekly-duty checks; no Area11 advancement is claimed.
