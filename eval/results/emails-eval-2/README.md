# Second ten-email evaluation

This is a second batch of ten different fictional emails, run on 3 October 2026 on `emails-eval`. The first batch's six result artifacts are preserved unchanged. Expectations in `eval/email-cases-2.ts` were written before live execution and are not included in model requests.

Run `npx tsx scripts/eval-emails.ts --batch 2` from the repository root. It uses the same `google/gemini-3.8-flash` configuration, Jev `typesafe/jev-1.13`, checker questions, three-call repeat protocol and fixed 0.9 supported-label probability gate as batch one. This is a new sample under the same settings, not a retuned checker. It writes only this batch's `results.json` and `latency.json`. The independent report and judgments describe the frozen run and must be reviewed again after rerunning.

The runner resets only `postgres://localhost/harbourline_emails_eval` between cases and invokes Harbourline's actual `ingestMessage` and `processInbound` functions. Each case's model requests/responses, raw Jev confidence/probabilities, timings and resulting tasks, clients, drafts, proposals and relevant events are retained in `results.json`. The last case remains in the isolated database. No worker or human approval is executed; mail sending is prohibited; bank, accounting, screening and mail integrations are fakes; storage is in memory. Only the OpenRouter model endpoints are permitted, with 180 HTTP attempts maximum. Credentials are kept out of artifacts.

Batch two contains four English, three Traditional Chinese/Cantonese and three Simplified Chinese messages: hypothetical advice, director replacement, date correction, supplied contact details, ambiguous cancellation, new-client annual return, supplier phishing, a known auditor, subtle impersonation and a custom bank-assistance request. The auditor exercises the deterministic third-party route and intentionally makes no Gemini call.

Jev checks run in shadow mode. Flags never alter or block business effects. A flag means a non-supported label or a supported-label probability below 0.9; it is not equivalent to an explicit `unsupported` verdict. Confidence is recorded separately and is not substituted for that probability. Missing or unavailable checker results are recorded as errors rather than called successful catches.

Each original intake request is submitted to Gemini three times. Only the first is ingested; repeated responses do not create duplicate business effects. Jev's three repeat judgments use the identical first proposal, not the different Gemini repeat outputs. Core routing agreement is assessed separately from exact person/field representation agreement. This protocol measures model and checker consistency separately, not three executions of the combined pipeline.

Initial inline checker latency is summed from model-output checks only. Full checking latency adds one post-ingestion outcome check per email. Repeats are excluded. Gemini-only ingestion time is an estimate made by subtracting inline Jev latency from observed ingestion time, not a randomized baseline run.

Judgments distinguish incorrect routing, wrong/unsupported extracted particulars, missing client requests, inappropriate actual outcomes and reply defects. Correctness is assessed independently by the coding agent against the prewritten expectations, original email, draft source facts and recorded database outcome. This is not a company secretary review. Statutory correctness of the underlying playbooks is outside the experiment.

Batch-selection tests were observed red (3/3 expected failures) and then green. Verification and the complete empirical comparison with batch one are in `report.md` and `judgments.json`.
