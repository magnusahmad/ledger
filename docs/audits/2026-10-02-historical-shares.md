# Area 4: historical share ledger

Status: **CLEAR for the secondary Area 4 share-ledger scope**, independently verified by the original reporter against final combined immutable candidate `83196d79d7c2c08590d0d2e4bf4c275728a4973c`. All four filed share defects and the two additional S-02 currency boundaries pass, including final actor-lock/digest and refreshed-approval changes. Overall Area 4 advancement still depends on the records reporter's acceptance; this report does not claim officers/controllers/shared-person clearance.

## Current independent acceptance

Latest final-source replay: **32/32 real-PostgreSQL cases across eight files**, 18.36 seconds, `npx vitest run tests/audit-historical-shares.test.ts tests/audit-share-migration.test.ts tests/audit-person-history-migration.test.ts tests/audit-share-controller-history.test.ts tests/m1-registers.test.ts tests/review-nsc2.test.ts tests/review-registers.test.ts tests/audit-register-race.test.ts`. This reruns all thirteen original share cases, both sequence and company/person-history migration guards, the public backdated allotment's automatic-SCR period guard, and relevant legacy share/NSC2/register approval controls. No failures or new share defects. Log: `/private/tmp/harbourline-robustness-20261002/area4-shares-final-source-green.log`. Typecheck and scoped lint pass again on the final source (`area4-shares-final-source-typecheck.log`, `area4-shares-final-source-lint.log` in the same evidence directory).

The final actor-lock/digest and fresh-gate source was imported exactly as local `9b4e466`; `git diff 83196d79d7c2c08590d0d2e4bf4c275728a4973c -- src` is empty. No reporter source adaptations or new tests were needed. The prior combined `39f4221` replay of the same 32 cases also passed in 16.29 seconds (`/private/tmp/harbourline-robustness-20261002/area4-shares-combined-green.log`); that earlier checkpoint remains historical evidence below.

The combined candidate's exact source, migrations, Decision and two new controls were imported locally as `1ad6237`, retaining the earlier exact share import `8675c76`. `git diff 39f4221 -- src docs/DECISIONS.md tests/audit-share-migration.test.ts tests/audit-person-history-migration.test.ts tests/audit-share-controller-history.test.ts` is empty. Original reporter tests/report and the four private DB/port harness files were preserved; the reporter made no source adaptations. Root explicitly scoped this final replay to affected domain/history controls; the records reporter verifies the combined records UI, and the already-accepted share browser evidence below remains applicable.

Earlier full share candidate `5f2759c` acceptance, retained as actual evidence:

- **72/72 real-PostgreSQL cases across nine files**, 61.76 seconds: `npx vitest run tests/audit-historical-shares.test.ts tests/audit-share-migration.test.ts tests/m1-registers.test.ts tests/review-nsc2.test.ts tests/audit-register-race.test.ts tests/review-registers.test.ts tests/audit-records-fuzz.test.ts tests/audit-records-revalidation.test.ts tests/review-forms.test.ts`. This includes all thirteen original share cases, the upgrade control, company/class/currency guards, NSC1/NSC2 controls and public human-approval races. Log: `/private/tmp/harbourline-robustness-20261002/area4-shares-independent-green.log`.
- **4/4 browser cases**, 20.0 seconds: `npx playwright test e2e/audit-historical-shares.spec.ts`. EN/TC/SC fictional classes and companies at 375/768/1280/1440 show correct USD capital, historical 6/4 holdings and separate unapproved register previews. All 24 screenshots were individually inspected. No page errors or document horizontal overflow. Viewport resets to 1440×900. Log: `/private/tmp/harbourline-robustness-20261002/area4-shares-browser-final.log`.
- A subsequent mobile reachability assertion replay, `npx playwright test e2e/audit-historical-shares.spec.ts -g '375px'`: **1/1 passed**, 17.3 seconds. All three language cases actually scroll the internal capital/member tables to the issued/paid-up/holding/percentage columns and verify those cells in the viewport; three additional screenshots were inspected. Log: `/private/tmp/harbourline-robustness-20261002/area4-shares-browser-scroll.log`.
- Typecheck and scoped ESLint pass for the unit/migration/browser/fixture files. Automatic Next `next-env.d.ts` and `tsconfig.json` development changes were restored and portable project typechecking was also run. No local DB/port/storage/dist/node_modules changes are committed.

The identity sequence makes accepted same-date writes replay in their accepted order, independent of random IDs or tied clocks. The upgrade control preserves the old observable date/timestamp/ID ordering of existing rows and appends later identities. This does not claim to repair already-corrupted historical ledgers silently. Currency-aware class resolution preserves verified new USD classes, rejects mismatched or missing-new-class currency atomically, and retains known existing-class denomination for compatible legacy inputs. Foreign/nonexistent company class creation rejects; foreign capital class metadata is filtered.

Visual qualification: mobile tables intentionally use internal horizontal scrolling and the new reachability assertions verify access. The unchanged generic layout stretches the mobile topbar on short review pages; this run also had unavailable Google dev font downloads and displayed a serif fallback. These existing appearance observations were shared with the root auditor; no new share-data/approval defect is observed or hidden by the browser tests. Two preliminary browser runs stopped on test-harness selectors (row versus cells, `Sep` versus runtime `Sept`, and the actual `Update registers` button) and an incorrect fixture field, all corrected before the successful runs; they are not product red evidence.

Screenshot directory: `/private/tmp/harbourline-robustness-20261002/area4-shares/storage/robust-billing-e2e/shots`. Portable browser fixtures use supported public playbook publication, task progression and actual register approvals; they do not rewrite task step state and do not send client mail.

## Historical original-source red evidence

The remaining sections preserve the actual original-source failures at immutable baseline `560d42116be7c457cef52460c9ac01119f8a45cc`; these are historical and resolved in the candidate above.

## Actual evidence

`npx vitest run tests/audit-historical-shares.test.ts` against private PostgreSQL `harbourline_robust_verify`: **4 failed / 3 passed**, 2.54 seconds. Log: `/private/tmp/harbourline-robustness-20261002/area4-shares-initial.log`. Each failure is the business assertion described below, rather than fixture/import failure.

Published corrected two-class corpus replay: **4 failed / 3 passed**, 2.39 seconds, `/private/tmp/harbourline-robustness-20261002/area4-shares-published-red.log`. Expanded replay with `tests/m1-registers.test.ts tests/review-nsc2.test.ts tests/audit-register-race.test.ts`: **5 failed / 18 passed across 4 files**, 8.45 seconds, `/private/tmp/harbourline-robustness-20261002/area4-shares-expanded-red.log`. All five failures are the same four defects (S-01 now also reproduced through public human approval); five new share controls and thirteen legacy controls pass. `npx tsc --noEmit` and scoped ESLint both pass after the extension.

Bounded S-02 currency acceptance extension: `npx vitest run tests/audit-historical-shares.test.ts -t 'instruction against|no confirmed currency|legacy instruction'`: **2 failed / 1 passed / 10 skipped**, 1.76 seconds, `/private/tmp/harbourline-robustness-20261002/area4-shares-currency-red.log`. These additional failures were actually run on the original immutable source before candidate repair acceptance. Typecheck and scoped lint pass. The reporter file now contains thirteen cases; the extension is part of S-02 rather than a new area.

### S-01 — High: accepted same-day ledger movements become unreadable

Create an empty fictional company and Ordinary class. At the same fixed clock/effective date allot 10 shares to Chan with movement ID `shm_zzzzzzzzzzzz`, then transfer 4 to Lee with ID `shm_aaaaaaaaaaaa`. Both write calls succeed. `membersAsAt` subsequently throws “Transfer on 2026-09-29 of 4 exceeds the 0 held by the transferor.” The persisted reader sorts by date, timestamp, ID; insertion preflight sorts only date/timestamp and puts the candidate last. Production IDs are random, so a later dependent movement can sort before its allotment.

Expected: accepted valid movements stay readable and reconcile to 6/4 holdings, 10 issued and 1,000 cents capital; validation and stored replay must use consistent causal ordering. Relevant file: `src/domain/shares.ts`.

The second S-01 regression uses supported public task progression and two actual human `register_change` clicks: approved allotment ID `shm_yyyyyyyyyyyy`, then approved dependent transfer ID `shm_bbbbbbbbbbbb`, with the same clock/date. Both approvals succeed and write their history, but subsequent `membersAsAt` throws the same zero-holding error. This independently establishes the customer register workflow impact, beyond direct helper calls.

### S-02 — High: approved allotment silently changes currency

Publish a valid test-only playbook version using the seeded `allot_shares` effect and supported send/collect/manual verification/register/confirm steps. Start a task for an empty fictional company with a complete structured 15-share USD preference allotment, 1,500 cents paid. Staff complete delivery outside Harbourline and supporting-document verification, then click the actual `register_change` approval. No ledger writes or fake emails occur before that click. The resulting capital is **HKD 1,500**, despite the stated USD instruction.

Expected: class creation and approved capital preserve the confirmed currency, or block a mismatched/incomplete instruction for explicit review before any mutation. Current `classId` ignores movement currency and creates new classes with the HKD default. Relevant files: `src/domain/register-effects-structured.ts`, `src/domain/shares.ts`. The shortened configurable fixture isolates public register approval; it does not claim an actual CR filing or all NSC1/signing steps were performed.

Two bounded variants reproduce further consequences through actual public approval: (1) an existing USD preference class with 100 shares/10,000 cents accepts an instruction expressly naming HKD, adding 15 shares/1,500 cents to the USD ledger; (2) an entirely new class with omitted currency is approved and silently defaults to HKD. Both must block before any class/movement mutation, either with a useful preparation triage or atomic approval rejection. A positive compatibility control confirms that an instruction omitting repeated currency for an already-confirmed existing USD class retains that class's known denomination and reaches 115 shares/USD 11,500 cents.

### S-03 — High: share-class creation accepts foreign/nonexistent company pointers

Create a fictional company/class in a separate firm, then submit that foreign client ID to `createShareClass` using the first firm's context. The call resolves and creates an own-firm share-class row attached to the foreign company. The test also contains nonexistent/empty/Unicode IDs for subsequent rejection verification; the baseline stops at the first foreign-pointer failure.

Expected: validate that the client exists in the current firm and reject invalid pointers with class rows unchanged. This concerns domain isolation; no login/authentication/RLS feature is requested. Relevant file: `src/domain/shares.ts`.

### S-04 — Medium: as-at capital exposes another firm's class metadata

From the first firm's context, call `issuedAsAt` with the foreign firm's known company ID. The result reveals `Confidential foreign preference`, its share-class ID and USD currency (zero capital because movements are firm-filtered).

Expected: empty/not-found result without another firm's class metadata, matching the existing firm-scoped members/movement readers. Relevant file: `src/domain/shares.ts`.

## Positive controls and generated coverage

Two independent human register cards each propose transferring 2,000 shares from a 3,000-share member. A deterministic promise barrier releases both claimed approvals before either execution begins. Exactly one succeeds; one rejects; one movement is inserted; 1,000 shares remain with the seller and total issued/capital remain 10,000/1,000,000 cents. No message is sent implicitly.

Equivalent barrier controls for two independent 25-share allotment approvals and two independently verified capital-funded 2,000-share buybacks also pass. Each applies precisely one reviewed ledger change; allotment yields 10,025 shares/1,002,500 cents, buyback yields 8,000 shares/800,000 cents and 1,000 seller shares. Both preserve the pre-effective-date capital and send no implicit messages.

The bounded LCG corpus uses seed `0x4a4c2026`, 16 accepted allotment→transfer→explicit capital-funded buyback sequences (48 movement calls) in two classes/currencies, with distinct effective dates and advancing clock. Each date verifies class capital, holdings sum and owner balances; all 16 pre-incorporation backdated transfers reject with complete history unchanged. After the full sequence, all 16 historical holdings/capital snapshots are queried again and match exactly. Class selection uses upper LCG bits and explicitly asserts both classes were exercised. Wrong-company, foreign and nonexistent class pointers and nonexistent holder pointers reject without ledger mutation; a separate seeded company remains unchanged.

## Scope and handoff

The separate fixer reproduced and repaired the share defects; this original reporter independently accepts final combined immutable candidate `83196d7` after its affected share/history replay, retaining the earlier combined `39f4221` and full `5f2759c` acceptance. Root explicitly waived repeat share browsers because the history renderer is unchanged and the records reporter owns changed records UI. The bounded positive overlap/history corpus is complete; no Area 5 work authorized yet. Real providers, production login/RLS, actual statutory filings, legal verification and restoration of preexisting corrupt histories are outside this evidence.

Private harness changes (two DB references, Vitest config, Playwright port/storage config) and node_modules symlink are excluded from commits. Fictional data and fake providers only.

## Fixer share candidate

Own real-Postgres reproduction: original four business failures and three controls, **4 failed / 3 passed, 2.51s** (`fixer-area4-shares-red.log`). A persistent identity sequence now orders movements at the same effective date; candidate validation and stored replay agree independently of clock ties or random IDs. The migration retains existing observable date/created-at/ID order and assigns future writes a larger ordinal. It does not reconstruct missing insertion evidence or repair an already-corrupted historical ledger.

Structured allotment/transfer/buyback class selection retains explicitly confirmed currency, rejects conflicting denomination for an existing class, and requires a currency before creating a new class. Already-recorded currency may be reused for an existing class. Class creation checks the firm's company; dated class queries are firm scoped. No statutory thresholds or forms were added.

Initial repaired original corpus **7/7 green, 2.91s**. Migration-specific business regression 'adding persisted share order preserves the prior dated order of existing rows and gives later writes a larger sequence' was **1 expected failure, 0.89s** before ordering backfill, then green. The first combined attempt exposed a PostgreSQL migration restriction on updating GENERATED ALWAYS identity values; the migration temporarily uses BY DEFAULT inside its transaction for backfill, then restores ALWAYS. That setup failure is not counted as a business red.

Final `npx vitest run tests/audit-historical-shares.test.ts tests/audit-share-migration.test.ts tests/m1-registers.test.ts tests/review-nsc2.test.ts tests/audit-register-race.test.ts`: **24/24**, five files, 8.57s (`fixer-area4-share-relevant-green.log`). Typecheck and scoped ESLint exit0. The original share reporter's independent immutable replay and currency extension remain pending; this is a partial Area4 candidate, not Area4 CLEAR.
