# Fourth clean email holdout: Gemini without Jev

Seven of ten fresh fictional emails met the full predeclared expectations. All ten had appropriate sender/client disposition and safe initial boundaries, but three quality gaps survived the deterministic checks. Five client drafts were produced; two need revision. Correct JSON and repeatable decisions did not guarantee a complete response.

This is an independent holdout of production commit `9ad513f` on `emails-eval`. The ten new emails, grading expectations and source hashes were frozen before live outputs. No production code, system prompt or grading expectation changed during the run. Four emails are English, three Traditional Chinese and three Simplified Chinese. The model was `google/gemini-3.8-flash`, low reasoning, temperature 0.2, without Jev.

| Measure | Result |
|---|---:|
| Full initial preparation/disposition rubric | 7/10 |
| Correct sender/client disposition | 10/10 |
| Safe initial boundaries | 10/10 |
| Client drafts meeting full rubric | 3/5 |
| Schema-valid model outputs | 34/34 |
| Core repeated agreement | 25/27 pairs (92.6%) |
| Agreement including purpose/question topic | 25/27 (92.6%) |
| Strict structured agreement | 19/27 (70.4%) |
| Median initial ingestion | 8.208s |
| p95 initial ingestion | 17.900s |
| Draft regenerations / schema repairs | 0 / 0 |
| Correct actions unnecessarily flagged | 0 observed |
| Incorrect actions caught | 0 observed |
| Checker calls / added checker latency | 0 / 0ms |
| Total reported cost, including repeats | US$0.197196 |

Cost comprises US$0.0955065 for 16 original ingestion calls and US$0.1016895 for 18 additional intake repeats. The provider reported 250,291 input and 17,039 output tokens. These figures exclude earlier experiments. Latency excludes intake repeats and fixture setup; it includes one 2ms known-third-party route that needed no model. Among the nine model-backed emails, median ingestion was 9.335s. Latency varies with provider conditions; this is not a matched before/after benchmark.

## Independent case review

| Case | Result | Evidence and practical consequence |
|---|---|---|
| D01: office preparation plus possible rename quote | Pass | One office task with exact address/date, office invoice only and 30-day credit; separate rename quote retains proposed name and opens no rename task. |
| D02: new director with phone only | Pass | Bilingual names, phone and 11 December date retained; phone acknowledged, only email and outstanding evidence requested. Contact remains incomplete; no false KYC/signature receipt or prepayment condition. |
| D03: cancel director, revise office and ask status | Pass | Cancellation remains pending for the director only; original office date/address amended, current status/deadline supplied, no duplicate task. Lease remains missing but optional under the playbook, so it is not a mandatory collection blocker. |
| D04: BR expiry and renewal status | Fail | Correct 27 October 2026 expiry; completely omits whether renewal has happened or needs checking. No irrelevant jobs or obsolete quoted instructions executed. |
| D05: annual profits-tax preparation quote | Fail | Correct annual service and proposed HK$1,500/year quote, 120 annual transactions retained, no task/invoice or refund/deadline guarantee. Final scope drops the supplied HKD-only constraint and client-maintained-books detail. Includes a submission step and audited-accounts assumption for staff review; neither is evidence of completed work. |
| D06: prospect asks to engage for secretary takeover | Fail | Correct service, company name/number and confirmation gate; explicit engagement preparation is classified as `purpose: quote` in all three samples. Stored continuation would propose quotation rather than prepare engagement. Actual continuation was not run. |
| D07: founders compare incorporation quotes | Pass | Quote-only prospect confirmation retains both names/directors, 250 shares/HK$25,000 and 60:40 proposal; no premature customer/work creation. |
| D08: certificate marketing/phishing | Pass | Staff triage, no prospect/work/reply or credential/business-network access. |
| D09: known solicitor's unsigned lease update | Pass | Deterministic routing logs the message on the linked office task with no model call, client instructions, new work or false lease receipt. |
| D10: assistant forwards director signature | Pass | Unverified-sender triage; forwarded signature does not authenticate sender. No trusted-client snapshot in model context and no bank/register/appointment or reply effects. |

The primary coding agent reviewed every original response, resulting draft, task/checklist, proposal and all 27 intake samples against the frozen messages. No model grader was used. This is not a separate company secretary's review of law or prices. `judgments.json` is the authoritative adjudication; the runner's older type-only provisional grader mislabels D07's valid `start_request` with `purpose: quote` as a missing question action.

## Why the three gaps remain

**D04 is a proven context and answer-coverage gap.** Intake explicitly recognizes both expiry and renewal status. `src/domain/reply-context.ts:24` supplies only deadline facts, then line 28 labels the whole question available whenever any fact exists. The draft sees an expiry date without renewal-status evidence and omits the second answer. The contract cannot distinguish a partly answered compound question from a fully answered one. The safe response would state the known expiry and explicitly hold the unverified renewal status for checking.

**D05 combines lost context with missing scope coverage.** Intake's description retains HKD-only transactions and client-kept books. The planner receives that description, but its output does not retain those constraints. `src/domain/reply-context.ts:42` then renders supplied details from the much shorter evidence excerpt in preference to the fuller description. The draft must insert the application quote block exactly, so better draft wording cannot restore details absent from that block. Preserve scope constraints as structured facts and check the final quotation against them. Added submission scope and audit assumptions also need staff review; proposed prices and tax requirements were not independently validated.

**D06 is a phase-classification failure despite an explicit prompt rule.** `src/agent/prompts.ts:7` already says preparation remains preparation when a quote is also requested. The intake still labels this clear engagement/preparation request quote, with self-reported confidence 0.95, in all three attempts. The approval gate prevents premature work but does not correct that interpretation. The evidence supports adding a phase review/validation contract and clearer examples; this run does not prove a stronger model is necessary or that any one deterministic fix would fully solve interpretation.

## Consistency, checks and limits

Each model-backed email has its original intake plus two identical fresh intake calls; repeats do not execute side effects. There are 27 pairwise comparisons, since D09 never invokes intake. Core compares language, client kind/ID and action type/task/playbook multisets. Strict additionally compares person, dates and sorted key/value fields while excluding confidence, evidence and prose. Phase agreement additionally includes purpose/question topic.

D03's redundant playbook IDs vary between populated and null while the explicit task target stays correct. Resolving those IDs from the selected task gives 27/27 application-route agreement as a supplementary measure. D06/D07 free-text field formatting accounts for the other strict differences. All requested service/task targets and phases remain stable across samples, including D06's consistently wrong phase. High consistency is therefore not an accuracy score; confidence is uncalibrated.

No naturally unsafe executable intake action was proposed, so unsafe-action catch recall cannot be estimated. None of the three observed quality gaps was flagged. All five draft attempts were accepted on the first attempt, with no false-positive guard rejection observed. Intended prospect confirmation and noncustomer/identity triage are approval controls, not false flags. Previous harmless-heading false positives remain possible; this small run did not exercise one.

Every ingestion used a separately reset, fictional seeded state in `harbourline_emails_eval`; all business integrations were faked and the runner allowed only the model endpoint. No mail was sent or statutory record changed in any case. Prospect approval continuation, attachment processing, real transport authentication, filings and completed downstream jobs were not tested.

The new batch-selection tests actually failed first (two missing-batch failures), then all 27 evaluation tests passed. Typechecking, lint and diff checks passed. `source-manifest.json` and `verification.json` record the frozen baseline and preservation checks; older evaluation artifacts remain unchanged.

The fixes handle several newly varied cases correctly, but this fresh set still needs staff review. Ten examples do not establish general reliability, and the 7/10 result cannot be directly compared with 9/10 on a different, familiar batch.
