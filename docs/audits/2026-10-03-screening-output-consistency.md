# Area 7: schema-valid screening evidence

Root independent reporter. Accepted baseline `0c981fc`. Four tests run on real PostgreSQL `harbourline_test`, all providers fake and candidates fictional. Three business reds/one positive, 1.80 seconds overall (848 ms execution). Isolation guard succeeds. No live sanctions lookup or compliance conclusion.

The screening prompt requires one adjudication per candidate and an overall match if any verdict is likely_match, potential if possible, otherwise clear. Deterministic domain code must preserve those relationships even if the model returns contradictory yet schema-valid JSON.

Actual `screenPerson` persists `clear` for a provider candidate with score 0.8 when (1) its own adjudication says likely_match but the summary says clear, (2) the model supplies no adjudication, or (3) the only false_positive adjudication names an invented unrelated candidate. The normal complete low-score false_positive assessment still clears, protecting the supported existing path. Each failure could let the existing screening step follow its automatic-clear branch; these direct tests do not claim a completed register change or external filing.

The separate fixer must independently reproduce red, derive a conservative coherent result with complete candidate coverage, and replay relevant KYC/agent tests. Root then retests independently. Missing/invented/contradictory evidence must not become an automatic compliance clearance; this is a software evidence invariant, not a new regulatory score threshold.

## Fixer candidate

Own combined model/screening baseline reproduced nine expected failures and three controls in4.24s. Screening now compares the complete provider candidate-ID set with unique model assessments and derives the aggregate from those assessments. An actual likely-match remains a match even if the summary says clear; missing, invented or contradictory coverage remains potential for staff review. The existing high-score guard remains, and complete low-score false-positive clearance remains supported.

All four screening cases passed in the combined37-case run (10.53s); `e299a74` then passed139/139 relevant tests across12 files in332.49s, including m8-kyc and approval gates. Typecheck/scoped lint exited0. No new legal threshold or live sanctions decision is introduced. Original root replay remains pending.
