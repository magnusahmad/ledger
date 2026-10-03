# Same ten emails with GLM Flash, without Jev

**GLM was not an overall improvement in this run.** It captured the annual return that Gemini missed and correctly selected the existing shareholder, but dropped explicitly supplied dates, treated phishing as a new customer, consistently chose the wrong Chinese script for one email, and bypassed custom planning. Six of seven drafts needed revision. Valid JSON did not translate into reliable business decisions.

Run on 3 October 2026, branch `emails-eval`, using the requested literal ID `~z-ai/glm-flash-latest`. All responses resolved to **`z-ai/glm-5.3-flash`**. Same ten B01–B10 emails, predeclared expectations, demo state, Hong Kong clock, product prompts, low reasoning request and temperature 0.2 as the previous Gemini evaluation. All **nine initial intake requests were byte-for-byte equivalent as parsed request objects** to the saved Gemini requests. The auditor case bypassed intake in both runs. Downstream prompts naturally differ when models select different actions or facts.

**Zero Jev calls** were made, including outcome checks or repeats; the network guard rejected its endpoint. Jev had been observational in the Gemini run, so its removal does not remove a production safeguard that previously prevented these effects. No product workflow fixes or production configuration changes were made. Both prior result sets remain unchanged.

See [reproduction protocol](README.md), [raw inputs, outputs, effects, usage and timings](results.json), [independent judgments and statistics](judgments.json), [latency](latency.json), and [model catalogue snapshot](model-catalogue.json). The coding agent reviewed each case independently against the original email, frozen expectations, draft facts and database outcome. This is not a company secretary review of statutory rules or current bank requirements.

## Matched comparison

| Measure | GLM Flash, no Jev | Previous Gemini, shadow Jev |
| --- | --- | --- |
| Distinct requested services omitted | **0**; annual return captured | **1**; annual return omitted |
| Predeclared required intent/type checks unmatched | **1/8**; direct custom route instead of unsupported/planner | **1/8**; actual annual-return omission |
| Wrong original action routing | **2/12**; impersonator appointment and custom-plan bypass | **1/13**; impersonator appointment |
| Wrong routing or extracted particulars | **4/12**; also two dropped effective dates | **2/13**; also existing Lee labelled new |
| Wrong client identification | **1/10**; phishing sender labelled prospect | **0/10** |
| Original intake language correct | **8/9**; SC email labelled TC | **9/9** |
| Drafts needing revision | **6/7**: five content defects, one additional language-only defect | **4/7** content defects; one also had a language defect |
| Model schema compliance | **37/37**, no repair attempts | **37/37**, no repair attempts |
| Core routing repeat agreement | **19/27 pairs (70.4%)** | **18/27 pairs (66.7%)** |
| Strict structured repeat agreement | **11/27 pairs (40.7%)** | **13/27 pairs (48.1%)** |
| Median ingestion latency | **15.36 s**, measured without Jev | **13.05 s**, observed with inline Jev; **11.92 s** estimated without it |
| p95 ingestion latency | **41.36 s** | **26.27 s** observed; **25.81 s** estimated without Jev |
| Checker overhead | **0 ms** | Median **0.93 s** inline |

The small consistency difference does not establish superiority. Core comparisons include language, client kind/ID and action type/task/playbook sets, excluding dates and fields. Strict comparisons additionally include exact person references, dates and field strings, but exclude prose and self-reported confidence. Nine intake inputs were each submitted three times, giving 27 pairwise comparisons. Only the first response was ingested; these are not repeated executions of the full pipeline or measurements of draft consistency.

The intent/type mismatch in B10 is deliberately preserved rather than quietly changing the frozen rubric. GLM recognized the bank-assistance request, so it did not omit a distinct service; it used `start_request:hk.custom` instead of `unsupported_request`. That choice bypasses the planner and its dedicated custom-plan review, producing a generic task and fee. Gemini's unmatched annual-return intent was an actual service omission. Both score 1/8 under the strict preregistered keys, but they are different failures.

The 12-action denominator excludes the two unintended tasks the engine subsequently created for phishing; those are assessed as outcome defects. The unsupported-request *description* in that email correctly recommends verification and is accepted as a description of an incoming demand. Its accompanying `client.kind = new_prospect` is wrong and triggers the unwanted work. B09's unexecuted disclosure question is likewise accepted, using the same convention as the Gemini review; its actionable appointment recommendation is rejected. Routing and particulars are distinct from actual outcome safety.

Draft grading includes both factual/business defects and language requirements. Five GLM drafts need content changes; B06 additionally needs conversion from TC to SC. B03's wording about not processing the director appointment is an editorial/business judgment; accepting that wording would reduce the total to 5/7, without changing the dropped dates, phishing, wrong-language or custom-route findings. Six drafts are faithful to their supplied upstream facts, despite six needing end-to-end revision: bad upstream facts and routing can make a faithful draft wrong for the customer.

## Review of every original ingestion

| Email | Observed result | Comparison with Gemini |
| --- | --- | --- |
| **B01 — EN, hypothetical director enquiry** | Correct question; no appointment job or invoice. Faithful holding reply says it will check requirements/fee, rather than inventing an answer. It adds unrelated deadlines and does not actually answer the documents/price question. | Comparable limited but acceptable holding response. |
| **B02 — TC, director replacement** | Correct resignation/appointment types and existing Chan/Lee person IDs. **Both effective dates and associated fields are dropped on the ingested output**, despite being quoted in evidence/summary. Both tasks have null effective/due dates. Reply asks again for dates and replacement already supplied. Fresh repeats extract dates correctly. | Improves person identity; regresses on explicit dates and reply completeness. Gemini retained both dates. |
| **B03 — SC, office date correction** | Office date becomes 20 November, due 5 December; director date remains 15 October. Old extracted office date remains stale, as before. Review unnecessarily proposes swapping to the same playbook, creating a pending change proposal. Draft says it will not process the director appointment, rather than leave its instructions unchanged. | Same underlying stale-state issue, plus erroneous review proposal and misleading wording. No replacement/new task actually executed. |
| **B04 — EN, director contact details** | Correct contact update and outstanding ID/address. Review returns only contactInfo, despite requesting a full checklist; engine preserves other items. Equivalent formatted contact strings generate the same false conflict as before. Reply asks the recipient to reconfirm their own details rather than Wong's. | Inherited engine defect persists. All three intake structures agree. |
| **B05 — TC, ambiguous cancellation** | Original low-confidence 0.50 cancellation has no target and goes to staff triage. Both jobs remain open; no reply. One repeat nevertheless names the director task while saying the target is unknown. Its confidence remains 0.50, so triage would still apply. | Acceptable conservative alternative to Gemini's clarification reply; avoids inventing a Chinese name because no reply is drafted. Repeat target is unstable. |
| **B06 — SC, takeover plus annual return** | Prospect and both required tasks created; all three samples include both services. No incorporation, invented anniversary or deadline. Invoice is HK$1,927 from the generated facts. **All three intakes incorrectly choose TC**, so the entire initial reply is Traditional Chinese. | Improves missing-service coverage, worsens language adherence. Gemini used SC but omitted annual-return work. |
| **B07 — EN, supplier phishing** | Model spots phishing and recommends no payment, but classifies sender as a prospect. Engine creates a bogus Accounts Receivable prospect, takeover plus fraud-verification tasks, HK$2,022 invoice and draft reply to the suspicious sender. Fresh repeats classify it `unclear` and would stop at triage. | **Major regression.** Gemini created only triage, no prospect/work/reply. Nothing was sent, paid or changed in a bank. |
| **B08 — SC, known auditor** | Deterministic third-party event on linked office task. No model, prospect, new job, reply or false proof receipt. | Same correct deterministic route. |
| **B09 — EN, impersonation** | Correct unclear client identity; actual ingestion stops at triage. Still recommends an appointment and wrongly assigns Tai Man's email to Lee. Descriptive disclosure question says verification is required. No customer data released, new work or reply. | Same inappropriate appointment recommendation with safe identity guard; additional incorrect person email. |
| **B10 — TC, custom bank assistance** | Direct `start_request:hk.custom` skips the planner and custom-plan approval. Creates a generic task with empty params and default HK$800 invoice. Draft acknowledges bank discretion and says scope/quote will follow, while also presenting the invoice and saying work has begun. No bank opening occurs. | Regresses on custom-plan routing/review. Gemini proposed a plan and HK$1,800 fee, though its reply also prematurely claimed started work. Neither is an acceptable final response without revision. |

The most serious new issue is B07. Natural-language warnings inside an action description do not neutralize a wrong structured classification. Harbourline trusts that classification to create a prospect, automatically adds onboarding for a new prospect, plans the unsupported request, and drafts an invoice/reply. This is an interaction between model error and permissive engine behavior, rather than proof that the model literally ordered a payment. Human send approval and fake business integrations prevented external effects in the experiment.

## Repeats, latency and usage

Core routing varies in B03 (redundant playbook ID versus null), B05 (unknown target versus director target), B07 (prospect versus unclear), and B09 (question versus unsupported disclosure demand). B06 is consistently wrong about the Chinese script. B10 consistently bypasses planning. Consistency alone does not imply correctness. B02 preserves both service routes across repeats, but only the two fresh responses extract the stated dates; that material inconsistency appears in the stricter metric.

All **37/37** chat HTTP requests succeeded, all responses passed their applicable Zod schema, and no provider/parse errors or schema-repair attempts were recorded. There were 19 original outputs: nine intakes, seven drafts, two reviews and one plan; the plan was for the incorrectly onboarded phishing sender, not the intended bank-assistance case. Eighteen fresh intake repeats bring the total to 37. Network records confirm **zero Jev attempts** and checker overhead of zero.

Measured median ingestion is **15,355.5 ms**, p95 **41,355 ms**, across ten cases including the near-instant auditor route. Median for the nine model-routed cases is **15,665 ms**. The slowest ingestion is phishing, where the wrong classification adds a planner and draft. Returned usage reports a total cost of **US$0.027077558746**, including all intake repeats. Gemini's existing adapter did not expose cost in its prior artifacts, so no measured cost comparison is claimed.

Latency comparisons are descriptive: the runs happened at different times, provider load/cache/network conditions differ, and action choices change downstream work. Gemini without Jev is an estimate obtained by subtracting inline checker time, not a fresh timed model-only control. GLM was slower in this sample even with Jev absent, but this is not a controlled model-speed benchmark.

## Recommendation and verification

Do not switch production orchestration to this alias on the strength of this evaluation. Better annual-return coverage is useful, but the phishing prospect, lost dates, wrong language and skipped custom-plan review outweigh that improvement here. Preserve staff approval and strengthen deterministic boundaries: distinguish genuine service enquiries from non-customer correspondence before prospect creation, route every custom request through plan review regardless of the model's action label, normalize field values, and validate that explicit dates and message language survive into structured fields and reply facts. These are follow-up fixes, not changes made during the experiment.

Nothing was sent externally and no statutory appointment, controller, share movement or filing record changed in any of the ten cases. No worker or staff approval ran. Only fictional data and the isolated evaluation database were used. Working-tree production configuration and the two earlier result sets are unchanged.

Verification: the first missing-module test run could not exercise assertions; a minimal stub then produced **four expected behavior failures and one passing default test**. After implementation, focused tests passed **19/19**, and the complete relevant fixture/database suite passed **73/73 across eleven files**. TypeScript, lint and diff whitespace checks passed. Tests never call live models. All ten live ingestions and independent reviews completed.
