# Fresh Gemini-only email holdout

Ten new fictional emails C01–C10 in `eval/email-cases-3.ts`, written with expectations before execution. English four (C01/C04/C07/C09), Traditional Chinese three (C02/C05/C08), Simplified Chinese three (C03/C06/C10).

Production baseline: `77547997aaf0e458657352380f9d02d7a4d74fc8` on `emails-eval`. This change only adds batch selection, fictional fixtures, tests and evidence. No production wiring or prompt change.

Run from the repository root:

```sh
npx tsx scripts/eval-emails.ts --batch 3 --model google/gemini-3.8-flash --no-jev --output-dir eval/results/emails-eval-3-gemini
```

The existing runner reads the configured OpenRouter key without persisting it, uses low reasoning and temperature 0.2, resets only `postgres://localhost/harbourline_emails_eval` before each message, seeds fictional trusted contacts, and exercises real `ingestMessage`/`processInbound`. Date is fixed to `2026-10-03T02:00:00Z`. Fake bank/accounting/screening, memory storage, no worker, no staff approvals, and mail sending is prohibited. Network guard only permits the model completion endpoint; no Jev. Cases have no attachments.

Each intake is sampled three times: the original plus two fresh completions of the identical request. Only the original is ingested; repeats do not execute effects or repeat drafting/review. There are 16 original workflow calls and 20 repeats. To preserve this evidence, use a new output directory for any subsequent run; the runner does not itself refuse every pre-existing custom directory.

`results.json` preserves complete raw model requests/responses, confidence, provider usage and original database outcomes. `latency.json` contains measured ingestion latency. `source-manifest.json` freezes source and prior artifact hashes plus the grading approach. `judgments.json` records Codex's independent review of all original and repeated responses; it overrides crude automatic action matching where supported extra questions are wrongly labeled. `report.md` distinguishes safety, completeness and response usefulness. `verification.json` records actual red/green tests and source preservation.

No external human/company secretary review was performed. All legal deadlines and fees are judged against this repository's supplied playbooks, not independently verified law or pricing. Prospect continuations, human approvals, external sends and downstream completion are outside the experiment.
