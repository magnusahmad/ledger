# Area 1: independent recovery UI and mail-adapter audit

Reporter: original intake flow reporter. Scope: interrupted staff approvals, uncertain
mail acknowledgement, captured approved content, and staff recovery visibility.
Baseline: snapshot `770a6b6`; isolated verification branch and fictional fixtures.
**Terminal status: CLEAR for the original Area 1 UI/mail-adapter reporter.**
All reproduced UI-REC-01/02/03 and MAIL-REC-01/02 failures passed independent retest.
The root agent separately owns database-recovery clearance and broader integration.

## Final independent acceptance

Source: immutable `fcbe232` + `9372046` + `94fdfdf` + `5e1fb53`, imported into the
verifier branch through `aebce62`. Mailbox absence is tied to its original Fake store;
signing recovery retains encrypted original document metadata and signer overrides.
No product implementation was written or edited by this reporter.

- `npx vitest run tests/robust-mail-adapter.test.ts`: **4/4 passed, 1.10s**.
- `npx playwright test e2e/robust-approval-recovery.spec.ts e2e/robust-signing-recovery.spec.ts`: **19/19 passed, 2.4m**.
- ESLint on the four reporter browser/fixture files: **exit 0**.

The 15 general browser checks prove Today visibility, no false approval completion
or redirect, exact original EN/TC/SC body/recipient/PDF name, durable unknown recovery
with no resend, authoritative non-delivery recovery once, foreign review-route 404,
and usable staff close/repreview. A second human approval sends changed fresh input
once under a new message and delivery journal while retaining the original uncertain
journal. Four signing checks prove original long email overrides, original Chinese
document titles despite later edits, confirmed versus uncertain invitation states,
redacted personal signing links, unchanged journals and no send from viewing review.

Visual inspection with `view_image`: EN/TC/SC uncertainty matrix at 375, 768, 1280
and 1440; all four final partial-signing screenshots. Original content and actions
are readable, long emails wrap, and no horizontal overflow or clipped content was
found. The built-in browser also inspected the final Traditional Chinese recovery
page. Browser viewports were reset to 1280 after checks.

Final command logs:
`/private/tmp/harbourline-robustness-20261002/verify-area1-final-browser.log` and
`/private/tmp/harbourline-robustness-20261002/verify-area1-final-adapter.log`.
Screenshots are preserved at
`/private/tmp/harbourline-robustness-20261002/evidence/area1-green/`.
Only fictional fixtures, real isolated Postgres and deterministic provider stubs were
used; simulated acceptance does not certify live-provider delivery. The historical
red runs and fixture corrections below remain for provenance. Area 2 is queued
until the root agent explicitly advances it.

## Reproduced failures

| ID | Severity | Actual behaviour | Intended business behaviour | Reproduction |
| --- | --- | --- | --- | --- |
| UI-REC-01 | High | A send paused before acknowledgement is shown as green “Approved”; Today hides the proposal. | A claimed but unfinished approval remains visible as in progress or needing review, with no completion redirect. | Actual domain approval paused at the fake transport, helper process exits; eight browser checks fail across 375, 768, 1280 and 1440 pixels. |
| UI-REC-02 | High | After simulated acceptance followed by a lost response, review offers fresh approval with a later unapproved body and changed recipient. | Show original captured staff-approved recipients/body/attachments and delivery uncertainty; checking delivery must not blindly resend. | Custom fixture transport records original acceptance then throws. Its provider identity differs from runtime Fake, so Fake absence cannot establish non-delivery. The 375px browser check fails because “Delivery needs review” is absent; screenshot shows the altered approval form. |
| MAIL-REC-01 | High | Gmail send rejects when optional metadata lookup fails after `messages.send` returned accepted provider identifiers. | Preserve known acceptance; metadata lookup failure cannot turn an acknowledged send into an ambiguous send error. | Stubbed Gmail SDK send returns accepted-fixture-42; subsequent metadata GET throws. |
| MAIL-REC-02 | Medium | Building the same approved delivery twice generates different actual MIME Message-ID headers. | A captured delivery correlation yields a stable Message-ID for provider reconciliation across interrupted attempts. | Build and parse MIME twice with the same approved correlation and compare actual headers. |

## Actual commands and results before implementation

- `npx vitest run tests/robust-mail-adapter.test.ts`: 4 tests, **2 failed / 2 passed**, 1.27s. Failures are the optional metadata exception and unstable Message-ID. Controls verify a send failure without acknowledgement rejects, and a normal acknowledgement retains identifiers and exact EN/TC/SC MIME body.
- `npx playwright test e2e/robust-approval-recovery.spec.ts`: initial 8-test version, **8 failed**. Four direct reviews lack an in-progress/recovery state; four Today checks lack the interrupted approval cards. All failures occur at the intended product assertions, after fixture setup succeeds.
- `npx playwright test e2e/robust-approval-recovery.spec.ts --grep 'uncertain provider delivery.*375px'`: **1 failed**, 9.2s test duration. Uncertainty state is absent and the current unapproved draft is shown instead.
- `npx playwright test e2e/robust-approval-recovery.spec.ts --grep "another firm's"`: **1 passed**, 42.6s overall / 6.4s test. The foreign interrupted card is hidden from Today and its direct review route returns 404.
- `npx playwright test e2e/robust-approval-recovery.spec.ts --grep 'authoritative proof|uncertain provider delivery.*375px'`: **2 failed** at intended preview/recovery assertions. Unchanged-draft unknown control fails in 9.0s; unchanged-draft authoritative non-delivery control fails in 6.2s.
- `npx playwright test e2e/robust-approval-recovery.spec.ts --grep 'staff can close'`: **1 failed**, 9.0s test. The required staff resolution action is absent. Fixture setup succeeded; the failure occurs before any new journal-table query.

Tests were stated before writing. Source and provider SDK calls are not replaced to
make domain approvals pass; the fixture invokes real approval handlers and real
Postgres, replacing only external transport. Simulated acceptance is **not evidence
of a live provider delivery**.

## Verification corpus and planned green checks

`e2e/scripts/seed-approval-recovery.ts` creates three interrupted approvals and three
uncertain deliveries, one for each EN/TC/SC body. It changes the current body and
recipient after the staff approval snapshot to prove the recovery preview uses
captured input. One additional interrupted card belongs to a fictional foreign firm.
The browser suite checks all six cards at 375/768/1280/1440, overflow, page errors,
stable review routes, and the Check and resume action under unknown provider identity.
Another reporter owns wrong-firm direct recovery action checks against real Postgres.
Two additional unchanged-draft controls distinguish unknown-provider recovery from
authoritative Fake non-delivery; only the latter may resume exactly once. Changed
drafts intentionally block replay and require fresh review. Root requires a usable
withdraw/repreview path, with explicit staff evidence for uncertain delivery; that
policy/API now uses `resolveInterruptedProposal` with checked-mailbox acknowledgement
and required staff note. Its browser regression asserts the old card becomes
superseded, a new pending preview has the changed body/recipient, the uncertain
journal is retained, and no new send occurs. Green verification remains pending.

After the fix: rerun adapter and browser suites; inspect all language/width screenshots
visually, including uncertainty and post-check recovery; confirm exact approved
recipient/body and attachment names, no blind resend, and correct route isolation.
No live providers, credentials, or root databases are used. Harness-only database,
port and build-directory isolation changes are excluded from published test commits.

## Published tests

- `0fd5c82`: initial Gmail acknowledgement regression and controls.
- `63cf680`: actual interrupted-approval browser fixture, responsive checks, stable MIME ID regression.
- `7968a2b`: follow-up uncertainty and foreign-route tests, including actual captured attachment names.
- `76099ff`: unchanged-draft controls distinguish safe non-delivery recovery from unknown acknowledgement.
- `d250144`: staff close-and-repreview action with real-Postgres journal and pending-card assertions.

## Action synchronization correction

The fixer provisionally ran all 15 browser checks against its unpublished worktree:
12 passed and 3 failed. Two unknown checks began while the previous check's action
was still processing because an old recovery banner satisfied the assertion before
the POST completed. The third check read a not-yet-created Fake outbox file while
polling for the first send. This is the fixer's result, not independent clearance.

The reporter now awaits the exact review action POST and its finished response;
unknown recovery additionally checks the persisted firm-scoped proposal status and
uncertain delivery journal, then waits for the resume button to be enabled. A
missing outbox is read as zero sends until the expected first send appears. Exact
body, recipient, attachment, no-resend and staff close/repreview assertions remain.
`npx playwright test e2e/robust-approval-recovery.spec.ts --list` successfully lists
all 15 tests. Independent execution awaits an immutable implementation commit.

Red mobile/wide screenshots are preserved outside resettable E2E storage at
`/private/tmp/harbourline-robustness-20261002/evidence/area1-red/`.
The reporter inspected the false green Approved banner with `view_image`; a built-in
browser tab also loaded the isolated local app. Final green visual inspection remains
pending, including the full EN/TC/SC matrix and usable resolution actions.

## Independent implementation retest and bounded signing gap

Immutable prerequisite `fcbe232` and core `9372046` were applied without manual
source changes (local `7d176e5` and `0f2a1a6`). Independent adapter checks passed
**4/4 in 1.51s**. The first browser attempt stopped at fixture setup: its fake
acceptance evidence serialized raw PDF buffers into a 312 MB JSON file. `c3f5f73`
keeps original recipients/body plus attachment names and hashes in that fixture
ledger, retains full domain encrypted payloads, and exposes pre-transport errors.
Corrected standalone fixture: **exit 0, 32.61s**, evidence file 1.4 KB. Verifier-only
DB inspection confirmed five processing and four recovery proposals as intended.

Second independent browser attempt: **14 passed / 1 failed, 2.0m**. The last check
successfully proved a fresh human approval sent changed body/recipient once with
a new message/journal namespace while retaining the original uncertain journal.
Its final transient Approved-banner assertion missed the expected Today redirect,
confirmed by screenshot and accessibility snapshot. The corrected check targets
Today and absence of the completed card, retaining all send/PG assertions.

**UI-REC-03 (High): partial signing recovery has no approved signing context.**
One real signing pack is approved with two email overrides: first invitation is
acknowledged and second acknowledgement is lost. Real journal states are `sent`
and `uncertain`. After changing current document titles, all four browser checks
fail because the original approved document titles are absent from recovery review.
The page also needs original approved recipients with their per-invitation states,
and must redact personal signing links. Implicated files: recovery branch in
`src/app/(desk)/review/[id]/page.tsx` and captured `ApprovedInput` in
`src/domain/approval-execution.ts`.

Command: `npx playwright test e2e/robust-signing-recovery.spec.ts` on the immutable
core in the verifier E2E database: **4 failed**, one at each 375/768/1280/1440 width,
at intended missing-original-title assertions after fixture and journal checks pass.
No UI implementation has been edited by this reporter. Area 1 remains open.

Fixer candidate for UI-REC-03: capture original document IDs, titles and hashes in the encrypted approval input; display captured signer names and approved email overrides alongside each durable invitation's confirmed/uncertain/not-yet-sent state. Never render the personal invitation bodies or tokens. `npx playwright test e2e/robust-signing-recovery.spec.ts`: **4 passed, 25.7 seconds**, all four widths; screenshots were visually inspected with English, Traditional/Simplified Chinese titles and long addresses. No overflow or personal links were present, and the fixture proves viewing does not send or change journals. `npx vitest run tests/audit-recovery.test.ts -t REC04`: **1 passed, 10 skipped, 4.93 seconds**. Existing `tests/m7-signing.test.ts`: **5 passed, 28.10 seconds**. TypeScript and scoped ESLint exit 0. Logs: `fixer-signing-preview-green.log`, `fixer-signing-recovery-domain.log`, `fixer-signing-relevant-green.log`. Independent original-browser revalidation remains required before UI clearance.
