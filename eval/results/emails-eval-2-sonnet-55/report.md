# Same ten emails with Sonnet 5.5, without Jev

**Sonnet performed better on consistency, service coverage and draft quality in this sample, but still made material routing mistakes.** It kept both stated director dates, captured the annual return Gemini omitted, and avoided GLM's phishing prospect and wrong Chinese-script classification. It still bypassed custom planning for bank assistance and labelled an existing shareholder as a new person. Three of six drafted replies need revision: two content defects and one minor language defect. This supports a larger trial, not unattended operation or an immediate production switch.

Run on 3 October 2026, branch `emails-eval`, with exact requested model **`anthropic/claude-sonnet-5.5`** and zero Jev calls. All returned responses report that same model ID. Same ten B01–B10 fictional emails, frozen expectations, demo state, clock, business prompts, original Zod validation, low reasoning request and temperature 0.2 as the previous runs. All nine original intake request objects equal the saved Gemini requests; downstream prompts differ where models choose different actions or facts.

There is one essential integration caveat: **the unchanged product intake schema did not work with Sonnet**. The first experiment ingested all ten emails but every model call was rejected before generation. The successful run uses a tested, explicit evaluation-only wire-schema specialization for these attachment-free fixtures. See [protocol](README.md), [raw results](results.json), [independent judgments and metrics](judgments.json), [latency](latency.json), [model catalogue](model-catalogue.json) and [preserved failed strict run](../emails-eval-2-sonnet-55-strict/README.md).

## Compatibility before accuracy

The strict run made **18 intake attempts, all HTTP 400**, across nine emails requiring a model. Providers rejected the 17 nullable/union parameters against their limit of 16. No model-generated JSON or drafts were returned, so reasoning accuracy, output-schema adherence and repeat consistency are unmeasurable for that run. Harbourline retained those emails as triage; the linked auditor was processed without a model. No prospects, jobs or external effects resulted. A successful script exit and null outcome.error reflect safe fallback, not successful inference. Anthropic documents the [16-union parameter limit](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).

The adjusted run specializes only intake `actions[].attachments[].personId` from string-or-null to `{type: "null"}` on the wire, bringing the count to 16. All ten fixtures are ingested with no attachments, and all 27 returned intake outputs have empty attachment arrays. For these cases the specialization excludes no valid attachment answer. Required fields, output shape, messages and all other schemas remain unchanged; outputs are validated against the original full Zod schemas, with no output rewriting. Original and wire schemas are both recorded. The adjustment applies to every original and repeated intake call, is opt-in, and is restricted to this model-only second batch. It does not alter the production adapter or schema.

This is not a drop-in compatibility result for attachment-bearing messages. Production adoption would need a general schema solution and tests for actual attachment-to-person attribution. The schema adjustment, provider/model change and lack of randomization also limit claims of strict experimental equivalence; unchanged business messages and full validation make the observed task-quality comparison useful, but not conclusive.

## Matched comparison

| Measure | Sonnet 5.5, no Jev, adjusted wire schema | Gemini, shadow Jev | GLM Flash, no Jev |
| --- | --- | --- | --- |
| Distinct requested services omitted | **0** | **1**, annual return | **0** |
| Frozen required intent/type checks unmatched | **1/8**, custom-plan bypass | **1/8**, omitted annual return | **1/8**, custom-plan bypass |
| Wrong original action routing | **2/14** | **1/13** | **2/12** |
| Wrong routing or extracted particulars | **3/14** | **2/13** | **4/12** |
| Wrong client identification | **0/10** | **0/10** | **1/10**, phishing prospect |
| Original intake language correct | **9/9** | **9/9** | **8/9** |
| Drafts needing revision | **3/6**, two content plus one language-only | **4/7**, content defects | **6/7**, five content plus one language-only |
| Returned outputs passing original schemas | **35/35**, no repairs | **37/37**, no repairs | **37/37**, no repairs |
| Core routing repeat agreement | **25/27 pairs, 92.6%** | **18/27, 66.7%** | **19/27, 70.4%** |
| Strict structured repeat agreement | **19/27 pairs, 70.4%** | **13/27, 48.1%** | **11/27, 40.7%** |
| Median ingestion | **11.25 s**, measured | **13.05 s** with Jev; **11.92 s** estimated without | **15.36 s**, measured |
| p95 ingestion | **15.01 s** | **26.27 s** with Jev; **25.81 s** estimated without | **41.36 s** |
| Returned usage cost, including repeats | **US$0.908248** | Not captured | **US$0.027078** |

Action denominators vary because optional questions and conservative abstention differ. Sonnet and GLM produced no reply for ambiguous B05, whereas Gemini drafted a clarification; draft denominators are therefore not identical. Sonnet's six drafts are all broadly faithful to their supplied upstream facts, but three are wrong or need revision against the original message and language requirement. Faithfulness to bad upstream facts is not sufficient for a correct customer response.

The B10 intent/type mismatch remains under the original rubric: `start_request:hk.custom` instead of `unsupported_request` recognizes the requested service but bypasses the planner and dedicated custom-plan review. It counts as one unmatched required key and one wrong action route, not a distinct-service omission. B09's appointment recommendation is graded wrong as in the previous reviews, although Sonnet gives it lower confidence and explicitly says verification must precede action. Its unsupported disclosure description is accepted because it prohibits release and records an incoming demand rather than granting authority.

There is no Jev catch rate or false-flag rate in this run: no checker exists here. Of the two wrong original routing recommendations, the identity guard stops B09; the custom-plan bypass in B10 reaches a generic task and draft invoice. The B02 new-person representation error is corrected by the engine's name resolution. The B04 false conflict originates in contact-string normalization/merging. These are different safeguards and defects, not evidence-checker judgments.

## Independent review of every original ingestion

The coding agent inspected each original email, frozen expectations, output, generated reply facts and recorded database effects independently. Repeats count only toward consistency and schema statistics. No external reviewer or company secretary verified statutory/bank requirements.

| Email | Observed result and judgment |
| --- | --- |
| **B01 — EN, hypothetical director enquiry** | Correct question; no appointment task or invoice. Faithful holding reply says it will check documents/fee and includes unrelated stored deadlines. It does not answer the substantive enquiry yet, but does not invent an answer; accepted under the same holding-reply convention as prior runs. |
| **B02 — TC, director replacement** | Correct resignation and appointment, distinct 31 October/1 November dates, replacement and unchanged shares. Existing Lee is incorrectly represented as `person.mode = new`; engine resolves her name to existing `per_p2`, reuses KYC and avoids duplication. Both task dates and deadlines survive. Correct source-faithful HK$1,400 reply, unlike GLM's requests for dates already supplied. |
| **B03 — SC, office date correction** | Correct existing office task; authoritative date becomes 20 November, deadline 5 December; director stays 15 October. Review keeps the playbook, no duplicate task/change proposal. Correct SC reply requests missing address. Inherited engine defect leaves `extracted.effDate` at 1 November despite corrected checklist/effectiveDate. Strict overall state judgment remains defective, as before. |
| **B04 — EN, director contact details** | Correct Wong task, email/mobile and unchanged date; ID/address still outstanding. Review returns only the contact item although asked for full checklist; merge preserves other items. Equivalent slash versus labelled/semicolon contact strings create a false conflict, as before. Draft faithfully repeats unnecessary reconfirmation and asks for the recipient's contact details rather than Wong's. Reply and outcome need correction. |
| **B05 — TC, ambiguous cancellation** | All three intakes use low-confidence cancellation without a target: 0.35, 0.35, 0.40. Staff triage only, both tasks remain open, no cancellation proposal or reply. Correct conservative abstention; unlike one GLM repeat, never guesses a task target. |
| **B06 — SC, takeover and annual return** | Correct genuine prospect and both required service tasks in all three samples; no incorporation, invented anniversary/deadline or completion. HK$1,927 upfront invoice and useful materials list. Intake correctly chooses SC, unlike GLM. Reply is SC except the copied Traditional Chinese payment-terms line. Minor language-only defect inherited from supplied fixed text; draft otherwise acceptable. |
| **B07 — EN, supplier phishing** | All three intakes choose unclear client and explicitly identify fraud indicators. Only triage; no prospect, jobs, invoice, planner, reply, bank change or payment. Correct handling, avoiding GLM's bogus customer and work. Notes the claimed attachment was not actually supplied. |
| **B08 — SC, known auditor** | Deterministic logging on linked office task, no model. No prospect, new work, reply, altered particulars or false proof receipt. Same correct route in all runs. |
| **B09 — EN, impersonator** | Correct unverified client identity and disclosure warning, so actual ingestion stops at triage. Still structures an appointment recommendation in all three samples, confidence 0.60/0.60/0.70. Count as wrong raw routing under the frozen rubric; lower confidence and explicit verification caveat improve caution, but do not change the action type. No data disclosure, prospect, appointment task or reply. |
| **B10 — TC, custom bank assistance** | Original direct `start_request:hk.custom` bypasses planning and its review, creates generic task with empty params and default HK$800 invoice. Supplied taskScope preserves intended bank assistance and quote-first request. Reply nevertheless offers fixed fee, says work has started and nothing more is needed; content follows upstream facts but is wrong end to end. Both fresh repeats use the correct unsupported/planner route. No bank opening or external send occurs. |

Under the conservative overall-state grading, **6/10 outcomes are acceptable and 4 need correction**: B03 stale duplicate date state, B04 false contact conflict/reply, B06 mixed-script terms, B10 plan bypass/invoice/reply. These differ greatly in severity and should not be treated as four equally harmful failures. B02's raw person error and B09's wrong raw appointment route are separately counted even though deterministic guards preserve safe actual outcomes.

## Repeats, latency and cost

Nine intake inputs were each submitted three times, yielding 27 pairwise comparisons. Only the initial response was ingested. Core signatures retain language, client kind/ID and action type/task/playbook sets; strict signatures additionally retain exact person references, dates and field strings, excluding prose/evidence/confidence. This measures intake repeatability, not draft repeatability or three full pipeline executions.

Core routing is identical across all three samples for **8/9 inputs**. Only B10 changes materially between a direct custom task and the correct planning route. Strict differences also occur in B02's replacement/full-name fields, B04's Chinese person-name field and B06's company-number formatting. Eight of 27 strict pairs differ, some because equivalent field text varies rather than a wrong business decision. B09 is consistently the same inappropriate raw appointment route; repeatability alone does not establish correctness.

All **35/35 HTTP requests succeeded** in the adjusted run. Seventeen original outputs comprise nine intakes, six drafts and two reviews; eighteen fresh intake repeats bring the total to 35. Every output passes its original Zod schema; no provider/parse errors or schema repair calls were recorded. No planner ran: the bank request bypassed it and the suspicious sender was correctly triaged. Jev attempts and checker overhead are zero.

Median ingestion across ten cases, including the near-instant auditor route, is **11,249.5 ms**; p95 is **15,008 ms**. Median for the nine model-routed emails is **11,269 ms**. Intake repeats occur after the measured ingestion and are excluded from ingestion time. With ten cases the reported nearest-rank p95 is simply the maximum.

Returned usage reports **US$0.908248** for all 35 responses, including repeats, about **33.5 times** GLM's total for its 37-response experiment. These are observed charges for this workload, not a normalized price benchmark; token use, routing, caching and downstream calls differ. No cost was returned in the failed strict run's artifacts. Gemini's saved adapter did not capture cost. Latency runs are sequential, not randomized; provider load, cache/network conditions and differing downstream work confound comparisons. Gemini without Jev is a subtraction estimate, not a fresh measured control.

## Recommendation and verification

Sonnet is the more promising candidate than GLM from these cases: it captures all distinct services, preserves dates, classifies language correctly, avoids the phishing prospect and repeats core routing more reliably. It has not demonstrated a clean improvement in every dimension over Gemini: both Sonnet and GLM bypass the custom planner, while Gemini uses it. Sonnet also requires schema integration work and costs more than GLM in this workload.

Keep staff approval and run a larger held-out set after fixing deterministic boundaries and reply facts: force all custom work through planner review, enforce quote-first handling, normalize contact values, synchronize stored date representations and localize fixed payment terms. Test real attachments and person attribution before adopting Sonnet. These are follow-up recommendations; no production fixes or model configuration changes were made during this experiment.

Tests: before implementation the schema stub produced **two expected assertion failures and one pass**; the new opt-in-profile test separately failed because its returned flag was absent. After implementation, focused evaluation tests passed **20/20** and the full relevant fixture/database regression suite passed **89/89 across twelve files**, covering work engine, email ingestion, third parties, human approval, draft money and model transport. TypeScript, changed-file lint and diff whitespace checks passed. Tests use recorded/fixture responses, never a live model.

All ten live cases and independent reviews completed. No mail was sent and no statutory appointment, controller, share movement or filing changed. Only fictional data and the isolated local evaluation database were used; fake business integrations, no worker or staff approvals. Prior Gemini and GLM artifacts were verified unchanged by hash. The failed strict run's results, latency and catalogue were preserved unchanged; its README adds the failure explanation and corrected reproduction path.
