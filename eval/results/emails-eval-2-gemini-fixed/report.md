# Gemini alone after the wiring and prompt fixes

**The rerun is substantially better.** All five generated replies were acceptable on independent review, all 35 model outputs passed schema validation, and the ten initial ingestions produced an appropriate proposed response or staff-review disposition. This supports the diagnosis that much of the earlier failure came from Harbourline's wiring, facts and prompts. It does not establish reliable automation: these are ten familiar fictional cases, three unsafe/ambiguous inputs appropriately wait for staff, and the genuine prospect has an additional confirmation step that was not exercised live.

## Changes assessed

- Custom jobs are removed from the standard intake catalogue. Both unsupported actions and direct custom starts now invoke planning. Sending and recording delivery are blocked until the plan is approved; the review page explains and enforces this.
- Unknown prospective customers require an explicit staff confirmation before customer, task, invoice or reply creation. Supplier/legal/auditor mail is distinguished from genuine service enquiries in the prompt. Trusted instructing sender records supply client context; company-name claims and reply headers do not. Forged headers cannot expose prior private thread correspondence to intake.
- The appointment catalogue now permits an existing person, instead of suggesting every appointment needs a new person. The prompt explicitly reuses known shareholders and preserves each action's date.
- Accepted date corrections synchronize the checklist, extracted date, authoritative effective date and computed deadline. Full ISO/Chinese dates quoted in evidence receive deterministic consistency checks and inconsistent/missing structured dates go to review.
- Requirement review consistently specifies a checklist delta. Equivalent email/phone formatting is not a conflict; a suggested swap to the same playbook is ignored.
- Reply facts distinguish proposed/approval status from payment terms. Simplified Chinese terms are supplied as Simplified Chinese, and financial details are inserted by the application at the model's invoice placeholder. Started-work claims receive an additional pattern check. Question replies are told to omit irrelevant task/deadline material.
- The production intake wire schema uses a `mode:none` person object rather than an extra nullable-object union, retaining all real person and attachment references while fitting the 16-union limit observed with Sonnet. Gemini uses that same production schema here, without the earlier Sonnet-only attachment specialization.

These changes mitigate the identified problems; semantic completeness, correct reference resolution and faithful prose remain model judgments. The date check deliberately does not interpret every relative or ambiguous date. The started-work pattern check is not a general semantic verifier. Legacy valid drafting responses without a placeholder remain accepted for compatibility; the live financial replies used the placeholder.

## Matched results

| Measure | Fixed Gemini, no Jev | Earlier Gemini, shadow Jev | Earlier Sonnet, no Jev |
| --- | --- | --- | --- |
| Original intake routing/particulars judged wrong | **0/10 actions** under the revised policy | **2/13** | **3/14** |
| Generated replies needing revision | **0/5** | **4/7** | **3/6** |
| Schema-valid model outputs | **35/35** | **37/37** | **35/35** |
| Intake language correct | **9/9** | **9/9** | **9/9** |
| Core routing repeat agreement | **25/27 pairs, 92.6%** | **18/27, 66.7%** | **25/27, 92.6%** |
| Strict structured repeat agreement | **23/27 pairs, 85.2%** | **13/27, 48.1%** | **19/27, 70.4%** |
| Median ingestion | **6.218 s** | **13.054 s** measured; **11.917 s** estimated without inline Jev | **11.250 s** |
| p95 ingestion | **17.533 s** | **26.270 s** measured; **25.810 s** estimated without inline Jev | **15.008 s** |
| Checker calls/overhead | **0 / 0 ms** | Shadow checks | **0 / 0 ms** |

The denominators changed because prospect confirmation suppresses downstream work/drafting and the prompt combines quotation questions. Five good replies should not be presented as ten completed customer workflows. The runs also occurred at different times, with different downstream call counts; lower latency is not an isolated model-speed result. Returned usage reports **US$0.19668075** for all 35 calls, including intake repeats; the earlier Sonnet run reported US$0.908248 for its 35 calls.

There were **zero naturally incorrect original actions to catch**, so catch recall is undefined. No Jev or replacement evidence model ran. The deterministic evidence-date guard did not fire on these original emails because Gemini supplied consistent dates. There were no observed unnecessary evidence flags. The low-confidence ambiguous cancellation was appropriately held, and the genuine prospect deliberately incurs one extra staff-confirmation step; neither is counted as a false positive. Separate recorded-response tests exercise the previously observed bad outputs, including prospect misclassification, dropped dates, custom-start bypass and false contact conflict.

The frozen required intent/type check remains **2/8 unmatched**, both in B06: neither `start_request:hk.transferIn` nor `start_request:hk.annualReturn` was returned in the original response. Unlike the previous actual annual-return omission, both service names are present in the new summary and combined quotation question. Semantic service omission is therefore **0**, but two separately executable services were **not** prepared. This is a changed quote-first/confirmation policy and a workflow coverage limitation, not a clean 8/8 pass.

## Independent case review

| Email | Observed result | Judgment |
| --- | --- | --- |
| B01, EN: hypothetical director advice | Question only; no job/invoice. Brief holding reply without invented fees or unrelated deadlines. | Appropriate; staff still must answer the substantive quote/documents question. |
| B02, TC: director replacement | Separate Chan resignation on 31 October and existing shareholder Lee appointment on 1 November. No duplicate Lee or share transfer; both dates and deadlines survive. | Correct proposed work and reply. |
| B03, SC: office date correction | Only office task changes to 20 November. Extracted/checklist/effective dates agree; due date becomes 5 December. Director remains 15 October. | Correct state and reply; previous stale extracted date fixed. |
| B04, EN: Wong contact details | Email/mobile reach Wong's existing task. No false conflict; missing identity/address evidence remains missing. | Correct state and reply. |
| B05, TC: unnamed cancellation | Untargeted cancellation at confidence 0.5 produces triage only. Neither task is cancelled. | Correct abstention; staff clarification required. |
| B06, SC: prospective takeover and annual return | Both services recognized in a combined quotation question; confirmation card only. No customer, jobs, invoice or draft before approval. | Safe initial handling. Two structured service starts absent; approval and subsequent quote not evaluated live. |
| B07, EN: supplier phishing | `unclear`/general correspondence; staff triage. No prospect, work, reply, bank change or payment. | Correct. |
| B08, SC: known auditor | Deterministically logged on the linked task; no intake call or false evidence receipt. | Correct. |
| B09, EN: impersonation | Unclear identity and a verification question; no appointment recommendation or disclosure. | Correct. |
| B10, TC: bank assistance | Unsupported request goes to planner, proposed HK$1,800 scope and separate plan approval; sending blocked while unapproved. Reply says work begins after scope/quote confirmation. | Correct proposed handling. Bank requirements/fee remain staff-reviewable assumptions. |

All ten cases retained the no-mail and unchanged-statutory-record invariants. There were 17 original model outputs: nine intake, five draft, two review and one plan; 18 fresh intake repetitions bring the total to 35. No provider/parse errors, schema-repair calls or draft regeneration were needed.

Core routing includes language, client kind/ID and action type/task/playbook sets. Strict agreement additionally includes exact person references, dates and field values, but excludes prose and confidence. B04's contact formatting varies under strict comparison. B06 returns one combined quotation question twice and quotation plus two service starts once; this is a real material inconsistency, contained at the confirmation gate.

## What this establishes

Keep Gemini as the usual model with these guards. The observed improvement comes from clearer contracts and safer business boundaries, without Jev. It is encouraging for a supervised workflow, but a fresh holdout set is needed before generalizing: we deliberately fixed against these same cases, and repeat agreement is still below 100%. Model confidence is recorded, not calibrated as a probability that work is safe. This experiment cannot put a defensible percentage on wiring versus model intelligence.

Remaining scope: the live eval ends before approvals; B06 does not prove complete downstream two-service preparation; the custom-plan fee/requirements are proposals; no bank policy or statutory legal verification was performed. A single safe unknown-sender disposition can hide an unhelpful service interpretation, so future coverage should measure end-to-end quotation/approval outcomes separately from safe triage.

## Verification

Regression verification and the actual red/green runs are recorded in `verification.json`. The new business-rule tests cover customer confirmation, idempotent continuation, changed-source rejection, foreign-firm approval rejection, authority/context isolation, custom routing and delivery gates, date consistency, retained missing requirements, contact formatting, financial rendering, Chinese terms, work-status claims and the production schema. Existing email/third-party tests now explicitly approve prospective-customer creation; the Cantonese recorded fixture's evidence quote was corrected to its actual source wording rather than bypassing validation.

The broad run covered **874 tests in 115 files: 867 passed and seven failed** because older fixtures supplied date quotes absent from their source message or relied on an email `clientId` without a trusted sender record. Those fixture messages and sender setup were corrected while retaining their business assertions; no production guard was relaxed. The final relevant reruns passed **205/205 tests across 23 files**, including all seven failures, the new guards, engine, manual requests, approval, registers, intake and model transport. TypeScript passed. Repository-wide source lint passed with five existing unused-variable warnings, using an explicit ignore for alternate generated Next build directories; unqualified lint also scanned those generated files and failed on generated code.

Visual review: five fictional review screens at 375, 768, 1280 and 1440 pixels, 20 screenshots inspected, HTTP 200 throughout, no horizontal overflow or browser errors, confirmation CTA visible and custom sending disabled at every size. Viewport reset to 1280. Screenshots remain in gitignored `test-results/email-wiring-ui/`; machine-readable checks are included in `verification.json`.

All 27 prior result files were checked by SHA-256 and preserved unchanged. No production model configuration, deployment, worker execution or external correspondence was changed.
