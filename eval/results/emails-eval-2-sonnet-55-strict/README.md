# Sonnet 5.5 without Jev: same second email batch

Protocol fixed before live execution, 3 October 2026, branch `emails-eval`. Evaluate the same ten fictional B01–B10 emails and predeclared expectations from `eval/email-cases-2.ts`, with unchanged demo data, Harbourline prompts, schema validation, temperature 0.2 and low reasoning request. Use `anthropic/claude-sonnet-5.5`, verified in OpenRouter's public model catalogue; retain the catalogue snapshot and actual returned model identifiers. No product, prompt or runner changes precede the experiment.

```sh
npx tsx scripts/eval-emails.ts --batch 2 --model anthropic/claude-sonnet-5.5 --no-jev --output-dir eval/results/emails-eval-2-sonnet-55-strict
```

The existing tested model-only runner permits only OpenRouter chat-completion POST requests. No Jev output, disposition or repeated-check call executes. No model substitution is configured. Each email is persisted and processed once in the isolated `postgres://localhost/harbourline_emails_eval` database, reset between cases. Fake business integrations and memory storage are used; mail sending throws; no worker or human approval runs. Statutory appointment/controller/share-movement/filing state is checked for changes. All prior artifacts are preserved.

Submit each successful original intake request twice more without ingesting repeats. Compare the same core routing and strict structured signatures used for Gemini and GLM. This tests intake consistency, not three full pipeline executions or draft consistency. Preserve provider errors, invalid schemas, repair attempts and partial outcomes. Original ingestion outputs alone determine business correctness. The known auditor is expected to bypass the LLM.

Review each original response independently against its source email, frozen expected outcomes, draft facts and recorded effects, using the same grading as prior reports. Separate wrong actions, incorrect sender/language identification, missing service intents or route-type mismatches, extracted field defects, source fidelity and end-to-end reply quality. In particular retain the distinctions between an unexecuted disclosure description and authority to disclose, and a direct hk.custom action versus the expected unsupported-request/planner route. This is coding-agent review, not company secretary verification of statutory/bank requirements.

Measure ingestion latency without checker overhead and retain returned usage/cost reports. Comparisons with other runs are descriptive: provider/network/cache conditions and downstream action counts differ. Gemini's time without Jev is an estimate from subtracting its shadow checks, not a fresh randomized control. Ten fictional examples cannot establish production reliability or statistical superiority.

The unchanged runner writes `results.json` and `latency.json`; `judgments.json` and `report.md` describe the frozen observed run and must be reviewed anew if rerun. Prior harness verification was 73/73 relevant fixture/database tests, typecheck and lint; this run adds evaluation data rather than implementation code.

## Observed strict-schema failure

All ten emails were ingested. Nine required intake; each made two failed intake attempts, all **18 HTTP 400** responses. No model-generated JSON or drafts were returned. Providers rejected the 17 union parameters against their limit of 16 before inference. Accuracy, output-schema adherence and repeated-call consistency are therefore **not measurable** for this run. This is an integration failure, not evidence of bad reasoning or invalid generated JSON. Harbourline retained the nine emails as staff triage; the known auditor bypassed the model and was logged correctly. No prospects, new jobs, mail sends or statutory changes occurred. The process exiting successfully and its outcome.error field being null reflect the safe triage fallback, not successful model calls. Raw call errors remain in results.json.

The controlled follow-up is [the attachment-free schema evaluation](../emails-eval-2-sonnet-55/README.md). This changes only the intake wire schema for the fixture-inapplicable attachment person field; full original Zod validation is retained. Anthropic documents a [16-union schema parameter limit](https://platform.claude.com/docs/en/build-with-claude/structured-outputs). No production schema was changed.
