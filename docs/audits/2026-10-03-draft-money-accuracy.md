# Area 7: schema-valid draft money accuracy

Root independent reporter. Baseline accepted source `0c981fc` (product `1f4110c`). Fictional data; real PostgreSQL `harbourline_test`; scripted LLM and FakeMail. No live model or delivery.

Expected business rule from BUILD_SPEC §agent discipline: an invoice draft must state its reviewed total exactly. A numeric substring or matching whole dollars does not preserve cents, currency or the total.

Before repair, `tests/audit-draft-money-accuracy.test.ts` runs five cases: four expected business failures and one control, 2.07 seconds overall (990 ms test execution). Isolation guard passes before the run. Three direct production-validator cases admit HK$123.99, US$123.45 and HK$1123.45 for reviewed HK$123.45. Actual `draftEmail` admits the schema-valid altered-cents answer as an agent draft instead of repairing then falling back to the correct template. Exact HK$123.45 in EN/TC/SC prose passes.

One root cause: `draftProblems` strips HK$ and fractional cents, then tests unbounded substring presence. This does not establish a sent wrong invoice, changed ledger or staff approval bypass; it establishes an incorrect model draft falsely passing the product's exact-total validator. The fixer must reproduce red, repair minimally, and replay relevant agent/invoice tests; this reporter then independently retests.

## Fixer candidate

Own baseline replay reproduced four expected failures and one positive in2.03s. The production validator now recognizes a complete currency-and-amount token and compares safely parsed cents; it cannot accept a larger numeric substring, altered fractional cents or another currency. Correct grouped/ungrouped amounts, spaces after the currency and equivalent trailing-zero formatting remain supported. A formatting acceptance case makes that behavior explicit.

All six money cases passed in the combined37-case regression run (10.53s). The immutable candidate `e299a74` also passed139/139 relevant intake/review/manual/billing/lifecycle tests in332.49s. Typecheck and scoped lint exited0. This checks exact total presence and fallback behavior, not arbitrary financial semantics in free prose. Root's original independent replay remains the final clearance for this contribution.
