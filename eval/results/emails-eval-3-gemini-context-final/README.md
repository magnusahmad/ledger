# Gemini verification of context and drafting fixes

Same ten fictional C01–C10 emails as the fresh holdout, google/gemini-3.8-flash, low reasoning, temperature 0.2, production schemas, no Jev. Real `ingestMessage`/`processInbound` in the isolated `harbourline_emails_eval` database; fixed clock, fake business integrations and storage, no worker/approvals/sending. The original intake plus two fresh intake completions are recorded per case; repeated intakes do not execute effects.

The ten-email run was completed with the second implementation, followed by a final contact-facts and draft false-positive polish. `source-manifest.json` freezes the ten-email implementation; `snapshot-verification.json` confirms those sources and all older artifacts matched at completion. `final-source-manifest.json` freezes the final production code. These are familiar regression cases, not a new holdout or production reliability estimate.

`results.json` and `latency.json` retain the complete ten-email raw results. `contact-polish-results.json` records the first focused contact-facts check; `contact-polish-final-results.json` records the final three live drafts through production ingestion, holding recorded C03 intake/review fixed. Those targeted checks measure drafting/context, not fresh intake interpretation. `judgments.json` and `report.md` distinguish every stage. No source results are overwritten.

To run the final source again, preserve this evidence and choose a new output directory:

```sh
npx tsx scripts/eval-emails.ts --batch 3 --model google/gemini-3.8-flash --no-jev --output-dir eval/results/emails-eval-3-gemini-next-check
```

Do not grade automatic action-type matching as business correctness: quote/advice/preparation are now explicit phases and different type labels can lead to the same correct outcome. Primary Codex review is independent of Gemini, but no external human/company secretary assessed legal rules, fees or advice. Prospect continuation, real sends, attachments, external delivery and downstream statutory completion are outside this live experiment; fixture integration tests separately cover confirmation and approved quote delivery.
