# Area 9 edited playbook financial lifecycle — original reporter

Status **CLEAR for the bounded Area9 financial scope** on immutable final `08865f4d2a51d2091273e7dc129530ea5ea0c622`. Original reporter independently passed **91/91 tests across10files in210.18seconds**, including all13 frozen financial cases,3 quote guards,2 output/actual-PDF precision controls and7 relevant legacy suites. The **corrected fresh first-cost browser matrix passed4/4 in2.6minutes on final088**:12 actual EN/TC/SC flows at375/768/1280/1440, each starting with0 linked invoices and null original request.invoiceId. Source matches088 exactly; stopped-server isolationguard/typecheck/scopedlint/diff all0. Earlier task-reuse visual qualification is superseded by the fresh matrix below. Own DB/browser runners have stopped; no remaining defects within this corpus. Overall area/product clearance is coordinated by root.

Fake/scripted adapters, fictional companies and private real PostgreSQL only. Reporter imported immutable repairs for testing and committed only portable tests/report; private four harness files, source repairs, node_modules and generated outputs are excluded. The following RED findings/runs are **historical baseline evidence**, retained for the separate-fixer red→green loop.

## A9-F01 — medium: valid saved playbooks produce an inexact aggregate invoice

Public `savePlaybookVersion` saves hk.changeOffice fee `MAX_SAFE_INTEGER-1000` plus a fictional statutory charge201, and hk.changeName fee1000 plus charge3. Each playbook's own fee+charge is a safe integer. `startManualRequest(confirm:true)` selects both for upfront Silverstrand. Actual: call fulfills, creates request/tasks/message/proposal and consumes sequence; PostgreSQL raw `total_cents::text` is **9007199254741196**, while SQL `sum(invoice_line.amount_cents)::text` is **9007199254741195**. One cent is invented by JS reduction beyond the safe integer range.

Expected: an aggregate quote outside exact safe integer cents rejects with a usable business error before committing the request/tasks/invoice/lines/messages/jobs/payment/sequence/mail. Ordinary edited fees remain supported. No invented monetary cap or new legal fee rule is required; the existing invoice edit/recalc path already protects aggregate safe integer cents. Initial creation in `src/domain/invoices.ts:createInvoiceForRequest` does not. The public manual-request transaction can preserve atomicity once initial validation is added.

Reproducer: `tests/audit-playbook-costs.test.ts` named “individually valid saved fees cannot create an unsafe combined quote or consume its request and invoice number”. Exact raw PG sums avoid hiding the bug through another JS comparison. Expected named assertion stated before writing. Guard passed before `npx vitest run tests/audit-playbook-costs.test.ts`: **1/1 business red**, **1.69s**, actual fulfilled vs rejected and snapshot changed. Log `/private/tmp/harbourline-robustness-20261002/area9-financial-boundary-red.log`.

Remaining bounded scope: pinned/new saved fee versions, normal cents/statutory totals, primary draft costs, original/additional issue/pay histories, zero fee/credit/upfront states, holds/third-party waiting with financial side effects, and seeded invalid/additional cost sequences. Records reporter separately owns editor/engine/order/proof/third-party routing. A free-task Add cost UI omission is a source hypothesis pending actual browser reproduction. No CLEAR yet; no Area10 work. Four private DB/port harness files and node_modules excluded.

## Separate fixer initial quote checkpoint (independent replay pending)

Guarded real-PG replay independently reproduced **1 expected business red / 3 repair controls green in2.64s** (`area9-quote-red.log`): the original unsafe combined quote fulfilled and changed the full snapshot; normal371-cent quotes, inclusive `MAX_SAFE_INTEGER` totals verified with BigInt, and edit/recalc overflow rollback passed. Initial quote creation now validates nonnegative safe-integer line amounts and their aggregate before allocating the invoice number or inserting invoice/line rows. The existing manual-request transaction rolls back the entire unsafe request, tasks and all associated state. This introduces no fee policy or automatic financial adjustment.

The original regression and controls plus prior billing overflow/editor checks passed **19/19 across4files in9.39s**, `area9-quote-green.log`. Typecheck, scoped lint and diff-check exit0 after correcting only the test's BigInt literal syntax for the existing TypeScript target. The final test uses `BigInt(0)` with unchanged exact-cent assertion. A separate relevant manual-request/billing/batch/later-cost run is in progress and not claimed green here. Source, remaining original corpora and overall Area9 acceptance remain pending; private harness files and node_modules are excluded.

That unchanged immutable-source relevant run completed **33/33 across5files in41.87s**, `area9-quote-relevant.log`: exact quote controls, manual requests, m5 billing, batch and later costs. The controls' final BigInt syntax was executed in this run. Runs were sequential on the isolated fixes database; the existing pg implicit-query deprecation remained. This closes the fixer's first quote checkpoint validation, while both original reporters' remaining bounded Area9 corpora and independent acceptance are still pending.

## A9-F02 — medium: free tasks have no staff action for supported later costs

Save a real hk.changeOffice version with fee0/statutoryFees[], start a manual request, and human-approve the initial reply through FakeMail. The request genuinely has no original invoice, and its task is open at collect. Public `addCost` is supported: F07 creates a separate 19-cent cost invoice and covering email for staff approval, payment uses that invoice's own number, and the task stays at collect. But the task page puts its existing “Add a cost” control inside `reqInvoices.length > 0`, so staff cannot initiate it on the free task. Decision39 describes Add a cost on a task; this is an unreachable existing capability.

Actual browser reproduction: the control is visible on a billed task first (positive selector control), then absent on the genuine no-invoice task. Guard passed before `npx playwright test e2e/audit-playbook-financials.spec.ts --grep '375px'`: **1/1 business red**, **13.1s test time**, missing-control assertion line17. Log `/private/tmp/harbourline-robustness-20261002/area9-free-cost-browser-red-corrected.log`. Screenshot `storage/robust-billing-e2e/shots/free-cost-entry-en-375.png` visually inspected: open collect task, no invoice and no cost entry. No horizontal overflow at375. TC/SC and the remaining widths have portable acceptance paths but were not reached on this baseline red.

Expected: staff can add the existing supported cost on an open free task; it creates an additional draft and human-reviewed covering reply, sends only after approval, attaches an actual PDF, retains its own invoice/payment, and does not block the original task. Wording must describe this genuine no-invoice case truthfully. No new billing policy or automatic charge is requested.

## Frozen corpus and valid baseline runs

`tests/audit-playbook-costs.test.ts` has13 cases: F01 plus F03–F14. Corrected full baseline guard+`npx vitest run tests/audit-playbook-costs.test.ts`: **1 confirmed business red / 12 green**, **110.60s**, at04:58:22 HKT. Log `/private/tmp/harbourline-robustness-20261002/area9-financial-corpus-red-corrected.log`. All financial sequences use saved actual versions, public manual requests, actual human fake-mail approvals with PDF bytes, and real bank receipt matching/approval.

| Cases | Protected business rule |
| --- | --- |
| F03 | Old running version fees/statutory lines remain pinned; newly saved version prices only new tasks. |
| F04 | One-cent draft cost stays on primary quote and the actual approved PDF has the exact109-cent total. |
| F05 | Paying an additional invoice cannot satisfy partially unpaid primary upfront gate. |
| F06 | Original and successive additional invoices retain distinct numbers, their own receipts and immutable accepted PDFs, including part-payment of an earlier extra. |
| F07/F08/F09 | Genuine no-invoice free service supports later reviewed costs; credit work can proceed unpaid; zero service fee plus positive statutory charge still requires upfront payment. |
| F10/F11 | Billing approvals/payment during hold or third-party wait do not release independent movement/proof gates; explicit release/proof then advances work. |
| F12 | Accepted optional collect-before-pay definition retains original priced payment gate; later-cost debt adds no task gate. |
| F13 | Later-cost aggregate overflow already rejects atomically without consuming rows or numbering (positive existing guard). |
| F14 | Four retained xorshift32 sequences, **seed0xA9C05A**, alternate upfront/credit and optional/reordered collection; draft cost, hold, actual issued PDFs, partial primary pay, late extra issue/pay, remaining primary pay, explicit release. Every receipt sum equals its own quote; issued financial fields/PDF hashes remain pinned. |

`e2e/audit-playbook-financials.spec.ts` retains F02 acceptance at375/768/1280/1440 and EN/TC/SC: free task cost action → review language attribute and actual PDF → staff approval → task plus additional invoice screenshots/overflow checks. Viewport reset in finally. Initial baseline only375 EN reached red. Full visual matrix remains required after immutable repair.

Excluded setup failures: first expanded unit run used a nonexistent third-party helper name (corrected to exported addThirdParty/linkThirdParty); first browser fixture lacked email on a fictional contact (explicit fictional email added). They are test setup errors, not product defects, and are excluded from valid results above. Portable new fixtures typecheck and scoped lint both exited0. Source remains exact738 baseline in reporter; no implementation edits.

Records reporter separately owns editor/engine/order/proof/third-party routing; those are not claimed clear here. **Financial status remains RED** pending original-reporter independent acceptance of separate immutable fixes. No Area10 work. Four private DB/port harness files, node_modules and generated outputs excluded.

## Separate fixer final financial corpus and cost-entry checkpoint

After importing the frozen13 original financial cases, the joint final workflow/financial/quote controls passed **32/32 in130.66s**, `area9-joint-green.log`; this executes all13 financial cases,16 original workflow cases and3 exact-cent repair controls. Own genuine free-task browser independently reproduced the missing Add-cost control after its billed-task positive, **1 business red in9.8s**, `area9-free-cost-red.log`.

After reading installed Next layout/page guidance, the task page exposes the same existing Add-cost action when no invoice exists, with truthful separate-reviewed-invoice wording. It changes no cost/receipt/approval policy. The first four-width candidate browser attempt reaches actual approved invoices and the Approved page, then stops at its short Today-redirect expectation; the reporter is adding hydration/finished-action waits. Those incomplete cases are not claimed browser green or accepted. Typecheck/scoped source lint/diff-check exit0. Root's necessary exact-cents display consumer test is pending publication; accepted ledger arithmetic at the safe-integer boundary does not yet certify its formatted PDF text. All private harness files remain excluded.

## Historical interim candidate replay — 0694a94

Original reporter imported only the source/Decision delta from738990a to immutable0694a94916bd0bcb3c110b7e24757e163fed51b2; `git diff --exit-code 0694a94 -- src docs/DECISIONS.md` passed. Private harness preserved; isolation guard passed before each run. Final status remains pending until full replay and the parent's separate exact-cent output guard/repair are accepted.

Browser fixture now waits for the relevant form's React action hydration before opening its details or submitting, and awaits the next-action POST's completion. It checks pending/draft/no delivery before approval, approved/sent exact1cent/one new delivery after approval, and unchanged free task step state with request.primaryInvoice=null. Actual PDF download and language attributes remain required. Successful review has two source-supported branches: decidedAt within15seconds auto-redirects; a long PDF approval can show Approved plus a working Back to Today link. The fixture supports that link instead of treating auto-redirect as a new financial rule. This is not a navigation defect.

Excluded replay attempts: simultaneous unit/browser/root/fixer PDF workload timed out only the four-sequence F14 fixture at120seconds; that runner was stopped to prevent any timed-out continuation reaching a later reset. The bounded four-sequence deadline is240seconds for sequential replay, with no changed assertions/seed/samples. First hydrated browser attempt still opened details before hydration and caused a fixture-induced details.open mismatch; that attempt was stopped. Second attempt completed approval but demanded auto-redirect despite the supported older Approved/Back to Today branch. These attempts do not count as new product defects or final acceptance. Concurrent Next regeneration also raced a typecheck's generated-type includes; it will be rerun after browser shutdown. Source repair is unchanged.

Clean corrected browser matrix is active. First375px EN/TC/SC case passed51.6seconds with actual invoices/PDFs/approvals/database guards; remaining widths and final unit replay are pending. No final CLEAR claimed.

## Separate fixer final financial and UI evidence

On immutable `08865f4`, the sequential exact-cent/quote/financial/generated-output/billing run passed **44/44 across five files in 146.16 seconds**, with all 13 frozen financial cases included. Earlier 30-second rendering timeouts under concurrent runners are excluded; those processes exited before replay. Final typecheck/scoped source and fixture lint/diff checks exited 0.

The original financial tester's corrected browser passed **4/4 in 3.0 minutes**, covering all 12 EN/TC/SC cost approvals across 375/768/1280/1440, with actual one-cent invoice PDFs, approval journal/receipt guards and the supported Approved/Back-to-Today branch. The fixer individually inspected 12 representative entry/review/issued/invoice images covering all languages and breakpoints in `/private/tmp/harbourline-robustness-20261002/area9-financial-069-shots`; the original reporter retains all 48 final images. UI source is unchanged from `0694a94` to `08865f4`; only integer-cent formatting changed, and ordinary one-cent output is independently guarded. This is attributed original-reporter browser evidence, not an invented own rerun. Final original financial replay remains pending.

## Completed independent visual acceptance — 0694a94, qualified for final08865f4

Guard+`npx playwright test e2e/audit-playbook-financials.spec.ts` passed **4/4**, **3.0minutes**, log `/private/tmp/harbourline-robustness-20261002/area9-financial-browser069-supported-nav.log`. Cases375/768/1280/1440 took51.6/32.1/30.5/30.0seconds. Each covers EN/TC/SC, hence **12 actual staff Add cost → draft review → PDF download → human approval → sent invoice outcomes**. DB assertions verify the new exact1-cent invoice stays draft/pending with no delivery before click, then approved/sent with exactly one new sent journal; original free request retains null primary invoice and task step/state stays unchanged. Real downloaded PDF begins%PDF; review language attrs en/zh-Hant/zh-Hans required. Viewport reset1440×900 in finally. No page errors or document horizontal overflow; clean run has no hydration mismatch.

All48 captures preserved at `/private/tmp/harbourline-robustness-20261002/area9-financial-069-shots`: entry/review/issued-task/invoice for each language/width. Representative task/review/invoice captures visually inspected at every width with EN and both Chinese scripts: readable cards/buttons/totals and wrapped descriptions, no clipped navigation or unreadable tables. Scripted E2E message fixtures contain English body with language-specific fictional salutation/signature; this checks layout and chosen reply language, not live-model translation quality. No live model used. Browser stopped and3225 released.

Original reporter imported final immutable08865f4d2a51d2091273e7dc129530ea5ea0c622 source delta. `git diff --exit-code 08865f4 -- src docs/DECISIONS.md` passed; private harness still preserved. The only source change069→088 is labels.money using exact integer quotient/remainder for safe cents; task/review/invoice layout and cost behavior are unchanged, so this48-capture matrix carries forward with that qualification. Latest parent's actual-PDF precision test and fixer's3 quote controls loaded for final replay; no duplicated foreign tests committed. Guard+typecheck/scopedlint/diff all0 after Next server stopped. Heavy final unit/PDF acceptance is queued until fixer's exclusive run finishes. Final terminal status remains pending; no CLEAR yet.


## Previous acceptance — final08865f4 units valid, initial visual attribution corrected below

After the separate fixer's exclusive heavy run ended, original reporter executed sequentially with no browser or other ownDB reset overlap:

```
python3 /private/tmp/harbourline-robustness-20261002/assert-local-harness.py /private/tmp/harbourline-robustness-20261002/area9-billing harbourline_robust_verify
# Passed; exact source comparison to088 passed before and after this run.
npx vitest run tests/audit-playbook-costs.test.ts tests/audit-quote-cent-guards.test.ts tests/audit-quote-output-precision.test.ts tests/later-costs.test.ts tests/m5-billing.test.ts tests/audit-billing-fuzz.test.ts tests/audit-billing-round2.test.ts tests/audit-accounting-retry.test.ts tests/audit-lifecycle-billing.test.ts tests/audit-lifecycle-invoice-delivery.test.ts --testTimeout=60000
```

Actual **10/10 files,91/91 tests GREEN**, **210.18seconds**, start05:31:37HKT, exit0. Log `/private/tmp/harbourline-robustness-20261002/area9-financial-final088-independent.log`. General test allowance60seconds and four-sequence F14 allowance240seconds are bounded fixture timing changes; all original assertions, seed0xA9C05A and4samples are retained. Timed-out/interrupted earlier attempts are not included in this91 green result.

F01 now rejects unsafe aggregate pricing atomically before consuming request/invoice sequence; normal371-cent multi-playbook and exact inclusiveMAX_SAFE quote controls pass. The parent's added actual-output boundary independently passes: supported maximum-safe stored cents display and actual PDF both preserve **HK$90,071,992,547,409.91**, rather than historical erroneous.90. Nine ordinary HKD/USD/CNY whole/fractional/negative output assertions pass in the other precision case. Later-cost recalculation rejects overflow with original lines retained. Every existing pinned-version/free/credit/upfront/hold/third-party/draft/additional/partial-payment/immutable accepted-PDF control passes.

F02 has actual accepted browser evidence as detailed above, with source-qualified carry-forward069→088 solely for the integer formatter. Final import's `git diff --exit-code 08865f4 -- src docs/DECISIONS.md` and post-run isolation guard passed; stopped-server `npx tsc --noEmit`, scoped ESLint and `git diff --check` exited0. No product source was edited by the reporter. Imported fixer's/parent's quote tests are not recommitted as duplicates.

Terminal outcome **CLEAR within the frozen financial corpus**. Records/editor/engine/proof/routing clearance belongs to the separate original records reporter. Live translation/provider behavior, deployment/auth/RLS and real customer data remain outside this fictional fake-provider audit. Area10 remains root-gated. Own harbourline_robust_verify unitDB, verify_e2e browserDB and port3225 are idle; four private harness changes remain preserved.

## Required first-cost visual fixture qualification

Root's final screenshot inspection found the shared beforeAll fixture reused the same three tasks across widths. The original 375px entry showed no linked invoice, but 768/1280/1440 entries retained additional invoices from earlier cycles (the 1280 English entry visibly shows two). The 12 actual one-cent PDF/approval outcomes and null primary invoice assertions remain valid, but the earlier 4/4 matrix is not full evidence for initial no-linked-invoice cost entry at every breakpoint. The fixer retracts that specific broader implication from its representative visual summary. This is a fixture coverage gap, not a new product defect.

Original reporter is preparing fresh per-width fixtures with an explicit initial no-linked-invoice assertion, retaining all existing language/PDF/human-approval/journal/task-state checks. Area 9 category acceptance remains open until that exact corrected matrix and its individual views are accepted. Source remains `08865f4`; no extra financial rules or corpus samples are introduced.

## Acceptance attribution correction — fresh no-invoice tasks required at every width

Root visual review correctly identified that the original four-width browser fixture seeded once in beforeAll and reused the same three task IDs. The375 case established first cost entry on genuinely no-invoice tasks. Subsequent768/1280/1440 entry captures already contained earlier additional invoices; their original request.primaryInvoice remained null, so existing payment-gate assertions were valid, but they did not independently certify the initial reqInvoices-empty UI branch at those widths. Earlier4/4 matrix and48 captures are retained with this narrower attribution, and do not close the all-width first-cost requirement.

Corrected same F02 case now reset/seeds via beforeEach for each width, preserving own E2E isolation and fake actual human sends. Before opening each free task control it asserts0 linked invoices and original request.invoiceId=null. It preserves the billed-task positive selector, actual PDF download, language attributes, pending/no-send-before-click, staff approval/one-journal/1cent invoice, unchanged free-task gate and supported navigation. It additionally verifies the existing truthful separate-invoice paragraph and captures the expanded form. No product source, named-case or input-corpus expansion. Original375 baseline business red remains valid. Source/91-green unit acceptance is unchanged; no repeat unit suite requested.

Fresh first-cost4width×EN/TC/SC browser replay is queued until root's heavy unit replay finishes. **Terminal status is pending this corrected browser matrix**, overriding previous CLEAR's all-width visual qualification. Four private harness files remain preserved.


## Final corrected first-cost visual acceptance — exact08865f4

Original reporter ran the same F02 cases with portable fixture correctiond2365e3 after root's heavy replay exited, with own isolated E2E database/port3225 and fake providers. Guard and exact-source comparison passed before:

```
npx playwright test e2e/audit-playbook-financials.spec.ts
```

Actual **4/4 GREEN,2.6minutes**, cases375/768/1280/1440 took **42.5/37.3/35.3/35.5seconds**, exit0. Log `/private/tmp/harbourline-robustness-20261002/area9-financial-browser088-fresh-first-cost.log`. Each width reset/seeded fresh EN/TC/SC requests through saved fee0/no-statutory playbook and actual approved initial replies. **All12 first-cost entries had0 linked primary/additional invoices before opening the control**, with null original request.invoiceId. The billed-task positive selector, truthful separate-invoice paragraph, real one-cent PDF download, selected language, no delivery before click, actual approval/sent invoice/one journal, unchanged original task gate and supported navigation all passed.

**60 fresh captures** preserved at `/private/tmp/harbourline-robustness-20261002/area9-financial-088-fresh-shots`: entry, expanded form, review, issued task and invoice for every language/width. Individually visually inspected all12 expanded form captures and representative fresh entry/review/invoice captures at each width with Chinese content; forms, labels, controls and totals readable with no horizontal overflow/page errors or hydration mismatch. Full-page expanded-form captures at375/768 show the fixed mobile header at the current scrolled viewport position (capture behavior), while the actual form controls remain visible and usable. Viewport reset1440×900 in finally. Own server stopped and3225 released.

After shutdown only Next-generated next-env/tsconfig files were restored; private four harness files remained preserved. Final exact088 source comparison, isolationguard, `npx tsc --noEmit`, scoped ESLint and diff check all exited0. There was **no product/source change and no repeated91-unit run** for this test-only correction; the prior exact08891/91domain/PDF result carries forward unchanged.

This corrected exact-source fresh matrix supersedes the earlier reused-task matrix for all-width first-cost coverage. Original375 business RED remains valid historical evidence. Terminal result **CLEAR within the bounded financial corpus**, with no implementation/harness/generated/duplicate foreign tests committed and no live external services used. Own audit DBs/browser port are idle. Area10 stays root-gated.

## Final separate fixer consolidation

The fixer imported the original fresh-per-width correction and terminal acceptance report without product changes, and individually inspected all **12 fresh expanded first-cost forms** (EN/TC/SC at375/768/1280/1440). Each shows Additional costs with the separate-reviewed-invoice explanation and no linked invoice on initial entry; inputs/buttons and prose fit. These fresh images supersede the prior reused-task implication, whose qualified historical evidence is retained above.

Both original reporter roles are now CLEAR on exact `08865f4` source. Final source/Decision comparison is empty, portable financial browser fixture matches the original corrected blob, and final typecheck/scoped fixture lint/diff checks exit0. The fixer has no active unit/browser process and retains only the four private isolation harness changes plus node_modules symlink unstaged. Root independently reported34jointchecks,5precision/normalguards,3proofbrowsercases,type/full-lint/production-build green; its earlier interrupted PDF attempt is excluded. Integration and Area10 dispatch remain root-owned.
