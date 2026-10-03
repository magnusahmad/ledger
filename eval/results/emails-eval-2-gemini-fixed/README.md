# Gemini after email orchestration and prompt fixes

Run on 3 October 2026 on `emails-eval`, with `google/gemini-3.8-flash`, low reasoning, temperature 0.2 and **no Jev**. The exact same ten fictional B01–B10 emails and original expectations in `eval/email-cases-2.ts` are retained. The underlying prompts, catalogue and business guards intentionally changed. This evaluates the combined fixes, not model intelligence in isolation.

```sh
npx tsx scripts/eval-emails.ts --batch 2 --model google/gemini-3.8-flash --no-jev --output-dir eval/results/emails-eval-2-gemini-fixed
```

Use a new output directory to preserve this frozen run. The runner invokes the real ingestion functions in `postgres://localhost/harbourline_emails_eval`, resets the fictional seed between emails, runs no worker or staff approvals and prohibits outbound mail. Bank, accounting and screening are fakes; storage is in memory. Network access is restricted to model completions. Only model configuration and the OpenRouter credential are read from `.env`; credentials are not recorded.

Each of nine intake requests is submitted three times; only the first is ingested. B08 is a deterministic auditor route with no model call. Repeat statistics measure intake decisions, not draft repeatability or repeated executions of the whole workflow. All raw prompts, responses, model confidence, usage, resulting tasks, drafts, proposals and safety checks are in `results.json`.

The frozen original intent/type score is reported unchanged. The revised prospect-confirmation and quote-first policy is assessed separately: B06 must wait for staff confirmation and may describe both services in a quotation question rather than start jobs. A safe confirmation card does not prove that both services will subsequently be prepared. No B06 approval was executed in the live eval. Recorded-response database tests exercise the approval continuation separately.

The coding agent independently reviewed every source email, original expected behavior, raw model response, supplied draft facts, rendered reply and database effects. No separate human/company secretary reviewer was involved. Neither statutory rules in the playbooks nor current HSBC requirements are certified by this experiment. Twenty local browser checks cover the changed review UI at 375, 768, 1280 and 1440 pixels, with English, Traditional and Simplified Chinese enquiry text and English/Traditional Chinese custom review cards.

See `report.md`, `judgments.json`, `latency.json` and `source-manifest.json`. The source manifest records preservation of all 27 prior result artifacts and the final source. A forged-thread history guard received an additional isolated red/green check after the live run; it does not change any recorded B01–B10 request because these inputs contain no prior thread history.
