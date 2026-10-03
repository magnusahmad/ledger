# Ten-email Gemini + Jev evaluation

Run on 3 October 2026 on branch `emails-eval`. All messages, people, companies, addresses, financial information and sender identities are fictional. This is an evaluation of the current product orchestration, not a production model change.

## Reproduce

From the repository root, run `npx tsx scripts/eval-emails.ts`. The runner reads only the OpenRouter key, model and reasoning setting from `.env`; it does not load other service credentials. It creates/migrates `postgres://localhost/harbourline_emails_eval`, and resets **only that database** before each email. Each email is persisted with the actual `ingestMessage` entry point and processed by `processInbound`; the final case remains in that database. Per-case inputs, outputs and resulting business records are retained in `results.json`. No worker runs; no approval is clicked. Mail sending is explicitly prohibited, other business integrations are fakes and object storage is in memory. The runtime database is untouched.

The runner overwrites `results.json` and `latency.json` on a new run, so preserve them first when comparing runs. The report, independent judgments and separately executed paired controls describe this frozen run and are not automatically regraded by the runner. Each control retains its full state, question and result in `controls.json` for exact replay through `JevEvidence.check`. The main runner permits at most 180 model HTTP attempts, and only the OpenRouter chat-completion and Decisions endpoints. Model and checker requests use bounded timeouts.

## Protocol

`eval/email-cases.ts` contains the ten messages and expected outcomes written before execution: four English, four Traditional Chinese/Cantonese, two Simplified Chinese. Cases cover an existing client appointment, two simultaneous requests, share transfer, a new incorporation, taking over an existing company, advertising, known and unknown legal correspondents, an impersonator with prompt injection, and a reply combining cancellation, information and a status question. This samples the requested categories; ten emails cannot cover every playbook or language/category combination.

The product uses its configured Gemini Flash model and existing strict-schema, Zod, repair and domain guards. Jev `typesafe/jev-1.13` runs in shadow mode after each model output: client resolution, each intake action, completeness, later review outputs and reply grounding. A separate check evaluates the resulting database outcome, including deterministic routes that bypass Gemini. Neither model sees the independent expected outcomes or grading rationale. Draft grounding checks compare a reply to its supplied facts; they do not independently establish the truth of those upstream facts.

The preset flag rule is a label other than `supported`, missing evidence, or `probabilities.supported < 0.9`. Raw `confidence` and full label probabilities are recorded unchanged. They are different statistics, and neither is a guarantee of correctness. This threshold is an evaluation hypothesis, not a calibrated deployment policy.

The first intake response is the one actually processed. Two additional Gemini calls use exactly its original request without ingesting again. Jev also receives the identical first intake proposal three times. The known legal correspondent deliberately bypasses Gemini, so it has no Gemini repeats; its actual deterministic outcome is checked three times by Jev. Repeat tests measure both selected labels and threshold flag decisions. Exact structured agreement excludes summary, explanations, evidence quotations and self-reported confidence; it still counts different field string representations, so independent review distinguishes material changes from harmless wording/translation variation.

Added latency is the measured wall time of initial Jev checks per email, excluding repeat calls. An estimated Gemini-only ingestion time subtracts the inline checker time from the measured ingestion duration. This is not a separate randomized control run. The outcome check is post-ingestion and is included in full checking latency; inline-only and outcome-only times can be reconstructed from the recorded calls.

`results.json` retains provisional intent/target counts as a debugging aid. Final judgments and statistics are based on independent inspection of the original email, model outputs, facts sent to drafting and actual records, not on Gemini or Jev grading themselves. Correctness of statutory rules is outside this evaluation; the current playbook rules still require company secretary verification.

## Validation

The initial red run reached six expected unimplemented-behavior failures and one malformed-response rejection pass. After implementation, the checker suite passed 8/8. An initial relevant suite passed 38/38, including real-database ingestion, approval and intake guard regressions. TypeScript and changed-file lint passed. Subsequent verification and final empirical findings are recorded in the report.
