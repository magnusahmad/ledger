# Area 6 payment lifecycle — original reporter

Status: **CLEAR for the frozen payment scope** on combined immutable `1f4110c62e09f23c024a88e6119d68f4eeea7b7d` (receipt repair `bb3cb167c93d8c5dcdea249fc28786f839d96afe`). Original reporter independently replayed all 13 cases plus necessary legacy controls: **33/33 green**, **139.41 s**. The earlier broader receipt-source replay was **59/59 green**, **136.68 s**. Browser acceptance was **4/4 width tests**, twelve actual staff approvals in EN/TC/SC at 375/768/1280/1440; combined-source mobile replay was **1/1 width test**, three actual EN/TC/SC approvals. Repeated polls preserve explicit HK$123.45 excess, accepted invoice PDFs remain unchanged, duplicate approval/replay leaves one receipt. Source comparison against the combined candidate is empty; typecheck and scoped lint pass. Bank adapter/pagination/migration acceptance is separately owned by the bank reporter. No new payment defects; await root’s overall Area 6 acceptance before advancing.

## Baseline findings — historical red evidence

Status at filing: **RED**, baseline `f5e1067f1815503f1a87cc9e8a1fc59f168fc0f4`. No product source changes. Frozen corpus: 13 business cases, two confirmed defects (three failing variants), ten positive controls. Full first 12-case run: 3 expected business failures / 9 passing controls; final bounded P13 control separately green alongside repeated P06 business red. Independent repair acceptance remains pending. Investigation uses real isolated PostgreSQL with fictional seed companies, human-approved actual FakeMail PDF delivery and fake accounting only.

## A6-P01 — high: one deposit funds two invoices concurrently

`tests/audit-payment-lifecycle.test.ts`: “one bank deposit cannot fund two different invoices through concurrent receipt calls”. Start and approve two separate requests for Silverstrand registered-office work. Each issued invoice is HK$600 with an actually accepted PDF. Ingest one HK$600 deposit without a reference; equal outstanding invoices leave it safely unmatched. Concurrent `recordPayment` calls assign this same bank transaction to the two invoices. A transaction/savepoint proxy pauses both real empty receipt reads before inserts; its 400 ms fallback releases correct future serialized code.

Actual: both calls fulfilled; two HK$600 receipts, HK$1,200 allocated from HK$600. Expected: at most one receipt and one successful assignment, preserving monetary conservation. Invoice locking serializes each invoice but does not serialize the shared bank row; no unique bank receipt constraint backs the check. Relevant code: `src/domain/payments.ts` `recordPayment` / `recordPaymentAtomic`, `src/db/schema.ts` payment. Fix must retain consistent bank→invoice lock order with automatic matching, not introduce an inverse-order deadlock.

## A6-P02 — high: approved excess disappears from actionable payment status

“approved overpayment retains an explicit actionable excess instead of labelling all money matched”. Human-approve a HK$600 invoice with actual FakeMail PDF, ingest HK$723.45 quoting its number, then approve the proposed partial allocation. Actual: HK$600 receipt, bank row `matched`, note “Quotes CRCS-2026-0001 but amount differs”; HK$123.45 remains unallocated. Current Payments table displays only received amount/status/generic note/invoice, not allocated amount or an explicit remaining balance. It therefore presents the full received transaction as matched without an actionable excess.

Expected: excess remains explicit and actionable. A safe unsupported split may stay unresolved for staff; no automatic refund, credit note, split allocation or offset is required. Assertion accepts a nonterminal bank status or an explicit unallocated/residual/overpayment/excess/remaining note. Relevant code: `matchStoredDeposit` caps proposal amount to outstanding balance; `onApprove(match_payment)` marks whole bank row matched; `src/app/(desk)/payments/page.tsx`.

## Actual red run

Isolation guard passed before running `npx vitest run tests/audit-payment-lifecycle.test.ts`. **2/2 failed**, expected business assertions, 13.08 s. A6-P01: 120000 allocated versus 60000 received, two receipts/two fulfilled calls. A6-P02: remaining 12345 cents, status matched with no explicit excess note. Log `/private/tmp/harbourline-robustness-20261002/area6-payment-red.log`.

Earlier first run stopped P02 on an overly broad assertion that included two unrelated seed receipts; corrected to this deposit's bankTransactionId. That harness failure is not bug evidence. P01 monetary assertion was already reproduced in that first run.

No credentials, live providers, actual client or bank writes. Private DB/port harness and node_modules remain excluded. API ingestion pagination/cursors/replayed provider identity is owned by the separate bank reporter. Those scopes are exercised by the frozen corpus below. UI acceptance of any new excess display remains for the immutable repair retest; no terminal CLEAR yet.


## Frozen corpus and public approval reproduction

A6-P01 is two concurrent **exported `recordPayment(method: bank_approved)` calls**, after two actually human-approved initial request/PDF sends. It does not simulate two UI match clicks. A6-P06 separately constructs two staff allocation review cards with public `createProposal(kind: match_payment)` and invokes **two actual `approveProposal` calls** against the same bank row and different invoices. It applies the same bounded real-database receipt barrier recursively through transactions/savepoints. Both actual human approvals fulfilled and wrote two HK$600 receipts from one HK$600 transfer. This is the same A6-P01 defect with approval-gate evidence, not a third distinct bug. These competing cards are an adversarial review fixture; no claim that current UI exposes an allocation editor or supported split is made.

| Case | Business assertion | Baseline evidence |
| --- | --- | --- |
| P01 | One bank row, different invoice receipt calls; conserve received amount | RED: 2 receipts / 120000 cents from 60000 |
| P02 | Excess remains actionable after staff approval; safe split can be deferred | RED: 12345 cents remaining, bank matched without explicit excess |
| P03 | Partial followed by exact remainder; all two-request task gates open only when paid | GREEN; immutable invoice numbers/lines/dates and accepted PDF hash |
| P04 | Net-of-fee transfer leaves actual shortfall; no implied fee writeoff | GREEN; 257-cent shortfall retained until separate deposit |
| P05 | Transfer quotes two open invoice numbers; no inferred split | GREEN; unmatched, no proposal/receipt/job or invoice mutation |
| P06 | Actual concurrent human approvals cannot double-consume bank row | RED: same P01 conservation failure through actual approval execution |
| P07 | Two deposits compete for one invoice; losing money stays unresolved | GREEN; one receipt, losing bank row not matched |
| P08 | Approved payment plus concurrent deposit replay, repeated approval/replay | GREEN; one receipt, both concurrent calls complete, repeated approval rejected |
| P09 | Two partial receipts in fake Xero despite accepted-payment lost acknowledgement | GREEN; exactly two provider receipts, correct invoice/number/sum, one job per receipt |
| P10 | Real two-company batch sends retain credit/upfront behavior and per-company receipts | GREEN; two actual FakeMail sends, c1 credit collect, c2 upfront pay until deposit |
| P11 | Invalid money/date rejects preserve partly-paid invoice, receipts, jobs and number sequence | GREEN; 38 attempts, unchanged snapshot per rejection |
| P12 | Foreign firm/unknown invoice pointers and post-proposal changed currency reject atomically | GREEN; no receipt or consumption, original PDF unchanged |
| P13 | Noisy references and unknown payers do not cause automatic payment or task advancement | GREEN; 12 text variants, reviewable amount-only proposals permitted |

Seed P11 `0xA6C0FFEE`, xorshift32: 24 fractional candidates, eight named amount edges (NaN/±Infinity/negative/zero/fraction/unsafe integer/more than partly-paid remaining balance), six malformed dates. Seed P13 `0xA6B0A7`, xorshift32: eight Unicode/punctuation/no-reference variants plus four named empty/whitespace/Chinese/SQL-like/control-text edges. Invalid **bank provider schema/pagination/cursor** behavior is separately owned by bank ingestion reporter; P11 validates domain payment rejection, not provider parsing. P13 preserves the existing amount-only human-review path rather than inventing a payer-matching heuristic.

## Fixer payment checkpoint

Own isolated PostgreSQL first reproduced P01/P02: **2 expected business failures, 12.96 s** (`fixer-area6-payment-red.log`). Receipts now lock the firm-scoped bank source before the invoice; the match-approval execution fence uses the same order as automatic bank matching. Allocation and the bank status/note commit together. Excess stays explicit in the existing Payments note: allocated amount, invoice number, unallocated balance and staff review required. This adds no automatic split, refund, credit or offset.

After importing the reporter's corrected immutable invoice snapshot, the frozen **13/13 cases passed in 70.73 s** (`fixer-area6-payment-final-green.log`), including the two actual competing human approvals and concurrent automatic replay. Typecheck, scoped ESLint and diff whitespace checks passed. The earlier post-repair fixture-only undefined-versus-empty-lines failures are not a product finding or a green claim. This is an immutable implementation checkpoint for original-reporter replay; overall Area 6 remains open for bank ingestion and independent payment/UI acceptance.

`npx vitest run tests/audit-payment-lifecycle.test.ts` corrected snapshot run: **3 failed / 9 passed (12)**, **67.44 s**. Log `/private/tmp/harbourline-robustness-20261002/area6-payment-corpus-verified-red.log`. Focused final typed proxy + P13 run: `npx vitest run tests/audit-payment-lifecycle.test.ts -t 'A6-P13|A6-P06'`: **P06 red / P13 green / 11 skipped**, **13.74 s**. Typecheck and scoped test-file ESLint pass. Isolation guard passed before each run.

One intermediate expanded run reached invoice immutability assertions with a fixture holding an invoice-only row rather than its lines, yielding `lines: undefined` versus actual unchanged rows. The fixture now captures `invoiceWithLines` before payments; all actual immutable financial/PDF assertions remain. Those false failures are excluded from findings, as are initial proxy TypeScript typing errors, corrected before portable publication. No product source changed. Corpus frozen pending separate fixer and original-reporter immutable replay.


## Original reporter independent repair acceptance

Two source-only local integration commits preserve this reporter’s tests/private harness: `c73b8ad` imports bb3’s two source files; `20906d6` imports the combined banking source/migration delta. **Do not cherry-pick these into canonical fixes**: they duplicate immutable implementation source already present there. `git diff 1f4110c -- src` returns no changes, including schema, migrations/journal, receipt source, approval fencing and provider validation.

Actual independent runs, with the exact private harness guard passing first each time:

- Receipt candidate bb3: `npx vitest run tests/audit-payment-lifecycle.test.ts tests/m5-billing.test.ts tests/audit-billing-fuzz.test.ts tests/audit-billing-round2.test.ts tests/audit-billing-revalidation.test.ts tests/audit-accounting-retry.test.ts tests/later-costs.test.ts` — **59/59 green in six actual files**, **136.68 s**. The revalidation filename was an unmatched filter, not an executed seventh file. Log `/private/tmp/harbourline-robustness-20261002/area6-payment-candidate-green.log`.
- Receipt candidate bb3: `npx playwright test e2e/audit-payment-lifecycle.spec.ts` — **4/4 green**, **2.5 min**. EN/TC/SC at each required width: 12 actual “Record payment” UI clicks after public human-approved initial FakeMail/PDF sends. Log `/private/tmp/harbourline-robustness-20261002/area6-payment-browser-final.log`.
- Combined candidate 1f: `npx vitest run tests/audit-payment-lifecycle.test.ts tests/m5-billing.test.ts tests/audit-accounting-retry.test.ts tests/later-costs.test.ts` — **33/33 green**, **139.41 s**, including every original P01…P13. Log `/private/tmp/harbourline-robustness-20261002/area6-payment-combined-green.log`.
- Combined candidate 1f: `npx playwright test e2e/audit-payment-lifecycle.spec.ts --grep '375px'` — **1/1 green**, **1.4 min**, three actual staff approvals plus fake-bank repeated polling in EN/TC/SC. Log `/private/tmp/harbourline-robustness-20261002/area6-payment-combined-browser.log`.
- `npx tsc --noEmit` and scoped ESLint across original payment test, both portable browser files, payment/fence sources and changed bank validation/adapter pass. Typecheck repeated after removing only generated Next dist-path edits from next-env/tsconfig; four private harness files were never restored.

Browser fixtures are portable in commit `6a9b3d4`: `e2e/audit-payment-lifecycle.spec.ts` and `e2e/scripts/seed-payment-lifecycle.ts`. They obtain isolated E2E settings from the existing audit fixture helper, require local fake-provider E2E settings and never embed a database name/port/secret. Initial invoices and PDF deliveries are created through `startManualRequest(confirm: true)` and `approveProposal`; overpayments are genuine persisted FakeBank deposits, then actual browser staff approvals. After every click the verifier calls `pollBank` twice and `matchDeposit` once, asserts the exact excess note is unchanged, duplicate approval is rejected, exactly one receipt exists, invoice paidCents stays 60000 and the accepted PDF SHA-256 is identical. No task state was rewritten to bypass boundaries.

The bb3 matrix captured 42 screenshots; copied before the combined restart to `/private/tmp/harbourline-robustness-20261002/area6-payment-bb3-shots/`. Inspected all 12 changed Payments outcomes (three languages × four widths), plus eight representative review/invoice screens at all four widths via `view_image`. Mobile has an internally scrollable table and narrow wrapped status note; staff can vertically locate a row and horizontally expose the complete allocation/excess text. No document horizontal overflow, clipped money/excess text or pageerrors. Viewport resets to 1440×900 after every case. Existing mobile review header whitespace/sticky topbar appearance is unchanged by this receipt-source repair. Combined mobile outcome screenshots for all three languages were also individually inspected; exact same monetary visibility. They remain under this worktree’s `storage/robust-billing-e2e/shots/` (12 captures), excluded from git.

Browser harness-only false starts: whole-money display was initially expected as “HK$600.00”, whereas the established formatter returns “HK$600”; corrected without weakening excess amount checks. The oldest deposit row initially remained below the fold when only horizontal scrolling was attempted; added actual vertical row navigation before asserting status is in viewport. A restart attempted before the previous owned server fully stopped was rejected as port in use; waited for termination and reran. These are excluded from product findings. The complete final bb3 and combined runs above passed with no raw lock-order deadlock or client pageerror.

Remaining limits: unsupported split/refund/credit-note procedures were not invented; the reviewable residual is explicitly displayed, and the same bank transaction cannot fund a second invoice. Live Airwallex/Xero, production authentication/RLS and actual customer or registry sends remain deferred MVP scope. Ingestion contract/pagination/cursor and firm-index migration acceptance belongs to the other original reporter. Payment corpus stays frozen at 13; no Area 7 work.
