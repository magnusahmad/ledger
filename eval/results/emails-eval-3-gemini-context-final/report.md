# Context fixes: Gemini verification

The wiring fixes materially improved this familiar ten-email set. The original holdout required substantive rework in five cases; the second implementation required it in one. That last contact-reply gap was corrected and all three focused live draft samples then acknowledged the supplied email, asked only for the missing mobile and kept cancellation pending.

This is a regression check on known cases, not proof of general reliability. No stronger model or Jev was added.

| Measure | Original holdout | Matched check before final polish |
|---|---:|---:|
| Acceptable initial preparation/disposition | 5/10 | 9/10 |
| Replies needing revision | 3/5 | 1/5 (C03) |
| Safe initial boundaries | 10/10 | 10/10 |
| Schema-valid model outputs | 36/36 | 38/38 |
| Core routing agreement | 24/30 (80%) | 28/30 (93.3%) |
| Strict structured agreement | 20/30 (66.7%) | 23/30 (76.7%) |
| Median ingestion | 6.605s | 5.107s |
| p95 ingestion | 13.875s | 19.573s |
| Reported cost including intake repeats | US$0.2130165 | US$0.218264625 |

Core agreement compares language, client kind/ID and action type/task/playbook multisets. Strict additionally includes selected person, dates and normalized field values, ignoring wording/evidence/confidence. Including the new purpose/question-topic fields in core agreement yields 26/30 pairs (86.7%); harmless metadata changes can reduce this score. Quotation and incorporation preparation routes were consistent in all three C05/C07 samples; supplied-field formatting still varies.

The added custom planning and conservative draft retries affect latency. There is no isolated latency estimate for each individual wiring change. No checker calls or checker overhead occurred. Confidence remains uncalibrated.

## Per-case independent review

| Case | Judgment |
|---|---|
|C01|Correct tasks and proposed resolution date acknowledged without claiming it passed; office date/address/deadline and invoice retained.|
|C02|Correct existing shareholder and date, no duplicate person/share/resignation change; reply retains 30-day credit without requiring prepayment.|
|C03|Correct pending cancellation, date amendment and needed contact status. Remaining reply gap: supplied email is absent from facts and generic email/mobile label causes an unnecessary email request. Corrected afterward by contact-facts polish.|
|C04|Appropriate localized holding reply, no unrelated deadlines or invented advice; substantive advice still needs staff.|
|C05|Proposed monthly bookkeeping quote now prices the actual service (HK$1,800/month), retains 80 transactions/currencies/exclusions and requirements, opens no task/invoice. The fee and new caveats require staff judgment, not an accepted firm price. Correct raw drafts were unnecessarily rejected because the rendered source quotation contained the words claim work started, despite being a prohibition. Corrected afterward by scoping claim checks to model prose.|
|C06|Two separate quotes and supplied new name retained on prospect confirmation; no client/work before approval. Continuation not measured.|
|C07|Explicit incorporation preparation and name, sole director/shareholder, 100 ordinary shares/HK$100 retained in confirmation. Continuation not measured.|
|C08|Correct marketing triage.|
|C09|Correct adverse-party legal triage without authority/disclosure.|
|C10|Correct unverified-sender triage without trusted-client context or work.|

## Final polish and checks

The ten-email C03 facts still omitted the actual supplied email and labeled both email/mobile outstanding. Final facts now carry reviewed supplied values separately from missing components; an email must appear in the draft, and the application fallback preserves it too. The requirement remains needed until both channels are known. Cancellation text is rendered from current firm-scoped task status, including on redraft after staff approval.

The focused checks run real ingestion with recorded C03 intake/review and three fresh Gemini drafts each. Both checks achieved 3/3 correct final samples. The final check used six schema-valid draft calls (one regeneration each), cost US$0.013734, and sent no mail or changed statutory records. Some benign cancellation-heading variants still trigger the conservative block-only guard; its bounded heading allowance fixes the specific tested forms but does not recognize arbitrary prose. The final sampled drafts were acceptable, not necessarily their first attempts.

The quote guard originally misread a client's quoted prohibition against saying work started as a model work-start claim. Final claim checks inspect model prose before application blocks are rendered, while exact amounts, dates and links are checked after rendering. A regression verifies correct quoted instructions no longer cause regeneration, and separate false completion/price/prepayment tests remain in force. A schema-valid response can still be wrong outside these bounded guards.

No naturally unauthorized intake action was proposed in the matched ten-email run, so unsafe-action catch recall cannot be estimated. Intended prospect confirmation and noncustomer/identity triage are not false flags. Before polish, a harmless C03 heading and two correct C05 draft attempts were rejected for presentation/source-text reasons; C03's contact gap nevertheless survived the accepted draft. Scripted regressions exercise false cancellation claims in all three languages, invented extra quote prices, partial contact completion and improper prepayment conditions without depending on a live model.

All new live verification together cost **US$0.466703025**: two matched ten-email runs plus two focused three-draft checks, 88 completion calls. This excludes the earlier holdout/diagnostic. Custom fees, caveats and advisory answers still require staff review; no company secretary independently verified the laws or pricing.

See `verification.json` for actual red/green runs and final source/artifact preservation, and `judgments.json` for machine-readable case reviews and statistics.
