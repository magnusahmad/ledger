# GLM Flash without Jev: same second email batch

Predeclared protocol, 3 October 2026, branch `emails-eval`. Rerun the same ten fictional B01–B10 emails and expectations from `eval/email-cases-2.ts`, the same demo records, Hong Kong clock, Harbourline prompts, temperature (0.2), low reasoning setting, schema validation and real ingestion functions. Only the LLM model and absence of the observational Jev checker differ. No product workflow fixes are made before running. Compare against the saved second Gemini batch, not a different set of emails.

The requested literal OpenRouter model ID is `~z-ai/glm-flash-latest`, including its leading tilde. It was verified in OpenRouter's public [model catalogue](https://openrouter.ai/api/v1/models) before the experiment. It is a moving alias; returned model identifiers and usage fields are saved with each request. No silent substitution or model fallback is permitted by the evaluation configuration.

Run from the repository root:

```sh
npx tsx scripts/eval-emails.ts --batch 2 --model '~z-ai/glm-flash-latest' --no-jev --output-dir eval/results/emails-eval-2-glm-flash
```

No Jev instance, evidence-check calls, disposition model checks or checker repeats execute. The evaluation network guard permits only POST requests to OpenRouter's chat-completions endpoint. Absent checker verdicts/flags are recorded as null/absent, never fabricated successes. Returned token/cost usage is captured from provider responses without storing credentials.

Each email is persisted and processed once in `postgres://localhost/harbourline_emails_eval`, reset between cases. Only the first successful intake response drives ingestion; its identical request is submitted twice more to measure model consistency without duplicate effects. This measures intake repeat consistency, not three complete end-to-end executions or draft repeat consistency. Model/schema errors, repair attempts and incomplete ingestions are retained rather than hidden. The known auditor should bypass the LLM entirely.

Mail sending throws, bank/accounting/screening services are fakes, storage is memory, no worker is started and no staff approval is executed. Statutory appointments, controllers, share movements and filings are checked for changes per case. Prior result directories are preserved. This experiment uses fictional client/person data only.

Independent review will inspect all original outputs against the frozen expectations, source emails, draft facts and stored state. Routing, person/field defects, missed requests, reply source fidelity and end-to-end usefulness are separate judgments. Apply the same grading conventions as the second Gemini report, including accepting unexecuted descriptions of an unknown sender's request while rejecting actionable unauthenticated work. This is coding-agent review, not company secretary verification of statutory or bank requirements.

Report schema-valid model outputs separately from parsing/provider errors and any repair attempts. Routing consistency uses the same language/client and action type/task/playbook comparisons as the Gemini report; strict comparisons additionally include person objects, effective dates and exact field strings. Record measured ingestion latency with zero checker overhead. Gemini's previously saved latency without Jev is a subtraction estimate, not a fresh randomized control, so speed comparisons are descriptive. This is a small matched sample, not statistical proof of superiority or production reliability.

The runner writes `results.json` and `latency.json`. `report.md` and `judgments.json` describe the frozen observed run and require renewed review after rerunning.
