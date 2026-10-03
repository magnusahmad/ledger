# Area 9 exact-cent output guard

Root's necessary consumer guard for the new inclusive maximum-safe quote control. This extends the already reported exact-cent boundary, using one fictional staff-saved playbook and actual PostgreSQL/invoice generation; no new live call or input corpus.

Named assertion: a supported maximum-safe saved quote keeps its exact final cent in displayed money and the actual invoice PDF. A real manual request with confirmation recorded in person stores `9007199254740991` cents exactly. The existing `money` formatter and saved PDF nevertheless both display `HK$90,071,992,547,409.90`, whereas the exact amount is `HK$90,071,992,547,409.91`. Standard Poppler text extraction reads the rendered invoice line and total, rather than database document metadata. No outbound mail occurs.

Actual guarded red: `npx vitest run tests/audit-quote-output-precision.test.ts --testTimeout=120000`, **one named test failed with both expected business assertions, 3.28 seconds**, exit 1. Log `/private/tmp/harbourline-robustness-20261002/root-area9-output-cent-red.log`. Source is interim quote repair `3b1b6e2`; it is not final Area 9 acceptance. The separate fixer must reproduce before any formatter edit and preserve normal whole, fractional and negative cent output. Root will independently retest the same regression; the original financial reporter also receives it for full-consumer acceptance.

## Separate fixer reproduction and exact-cent repair

Own guarded red reproduced the saved maximum-safe invoice and PDF mismatch: **one expected business failure / one ordinary-format control passed in 3.78 seconds**, `area9-output-cent-red.log`. The ordinary control checks whole and fractional HKD, one-cent and negative values, and existing USD/CNY labels.

The formatter now splits supported safe integer cents into an exact integer whole amount and remainder before formatting; it does not divide the whole amount into a floating-point currency value. The existing non-integer display path is retained. Actual saved invoice/PDF precision plus ordinary output and quote aggregate/recalculation controls passed **5/5 across two files in 4.01 seconds**, `area9-output-cent-focused-green.log`. Typecheck, scoped lint and diff checks exited 0.

The first five-file broad replay completed 39 checks, but five financial cases hit the 30-second test limit under concurrent PDF rendering (412.88 seconds total). No business assertion failed; that run is excluded as full green. Its workers exited before the next database reset. A sequential replay with a bounded 120-second test allowance remains required before overall Area 9 clearance. Original reporters and root must independently accept the immutable formatter source. No live provider/model calls, private harness changes or generated artifacts are committed.

## Final separate fixer consumer replay

The sequential guarded run on immutable `08865f4` passed **44/44 across five files in 146.16 seconds**, exit 0: `audit-quote-output-precision`, `audit-quote-cent-guards`, all 13 `audit-playbook-costs`, the 15 generated-output checks and `m5-billing`. Log: `/private/tmp/harbourline-robustness-20261002/area9-output-cent-sequential-green.log`. The earlier timeout run is not reused as green. Final typecheck, scoped implementation/portable-fixture lint and diff checks all exited 0. Root independently passed the five exact-cent/ordinary/aggregate/recalculation controls in 4.22 seconds on exact source. Financial original-reporter terminal acceptance is still pending; no Area 10 claim.
