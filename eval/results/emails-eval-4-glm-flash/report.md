# Fourth email batch: matched GLM comparison

GLM was cheaper but did not improve this evaluation. It met the full expectations in **5/10 cases**, versus **7/10 for Gemini**, and three of five client drafts needed editing. Both models respected the tested approval boundaries and returned 34/34 schema-valid outputs. Median ingestion was 15.397 seconds for GLM versus 8.208 seconds for Gemini.

The requested alias `~z-ai/glm-flash-latest` resolved to `z-ai/glm-5.3-flash` in all 34 provider responses. This run reused the exact D01–D10 fictional emails, frozen expectations, seeded state, clock, production code, schemas, prompts, low reasoning request and temperature 0.2 from the Gemini run. All nine initial model-backed intake request objects were identical between runs. D09 bypassed the model in both. Only the model and artifact directory changed; downstream requests naturally differ when the models select different facts or actions. No Jev was used.

| Measure | Gemini | GLM Flash |
|---|---:|---:|
| Full initial plan/draft/disposition expectations | 7/10 | 5/10 |
| Correct original sender/client disposition | 10/10 | 10/10 |
| Safe initial boundaries | 10/10 | 10/10 |
| Client drafts needing revision | 2/5 | 3/5 |
| Schema-valid outputs | 34/34 | 34/34 |
| Original intake language correct | 9/9 | 9/9 |
| Core repeated agreement | 25/27 (92.6%) | 21/27 (77.8%) |
| Agreement including purpose/question topic | 25/27 (92.6%) | 21/27 (77.8%) |
| Strict structured agreement | 19/27 (70.4%) | 12/27 (44.4%) |
| Median initial ingestion | 8.208s | 15.397s |
| p95 initial ingestion | 17.900s | 35.977s |
| Draft regenerations | 0 | 1 |
| Template fallbacks after rejected drafts | 0 | 1 |
| Total reported model cost, including repeats | US$0.197196 | US$0.024626796 |

GLM's reported cost was approximately one eighth of Gemini's, but latency was approximately twice as long in this run. Its total comprises US$0.01288430 for 16 original ingestion calls and US$0.011742496 for 18 additional intake repeats. Provider usage was 206,478 input and 19,476 output tokens. These costs exclude earlier evaluations. Both latency samples include the same 2ms known-third-party route; among model-backed emails GLM's median was 15.855s. Provider timing was measured at different times, so this small experiment does not establish a universal speed or quality ranking.

## Review of every original ingestion

| Case | GLM result | Comparison with Gemini |
|---|---|---|
| D01: office preparation plus rename quote | Pass | Correct office task/address/date, 30-day credit, office invoice only, separate nonbinding rename quote. Quote shows signing alternatives and no resolution passed. GLM adds commentary to supplied values and stores an undecided approval route as a field; this requirement representation needs care, although no false completed resolution or rename work is asserted. |
| D02: director with phone only | Pass | Correct names/date/phone, asks only for email and genuinely missing KYC, no prepayment or share change. Comparable to Gemini. |
| D03: cancel director, revise office and ask status | Fail | Actual tasks/checklists/date/address are correct, but two draft attempts fail the block contract. Fallback includes internal `tsk_000194` and raw Evidence text. Gemini's final draft was acceptable. |
| D04: business-registration expiry and renewal | Fail | Wrong question topic selects task-status evidence; no facts are found, so a holding template answers neither question. Gemini supplied the correct expiry but omitted renewal status. |
| D05: annual tax-preparation quote | Fail | Extracts constraints into fields, but planner never sees them. Final quote loses 120 transactions, HKD-only, client-kept books and payroll exclusion, asks for volume again and labels the fee one-off rather than annual. Gemini retained 120/year and annual basis but also lost supplied constraints. |
| D06: prospect engages secretary takeover | Fail | Original prospect gate is correct; preparation is still misclassified as quote-only, as with Gemini. Two repeats switch to generic verification triage rather than new-customer engagement. |
| D07: incorporation quotation only | Fail | Original has two quote-purpose actions for the same service, one populated and one empty; stored continuation needs deduplication. Both repeats have one quote. Gemini produced one quote action. No actual duplicate work was created before confirmation. |
| D08: certificate marketing/phishing | Pass | Correct staff triage and no customer/work/reply or credential access, as with Gemini. |
| D09: known solicitor lease update | Pass | Same deterministic correspondence log on the office task, no model, unchanged missing lease. |
| D10: assistant forwards director signature | Pass | Correct trusted-channel verification triage, no trusted-client context, banking/register effects or disclosure. Repeat action labels vary but all remain safe. |

The primary coding agent checked the original response, final drafts, facts, tasks/checklists and proposals for each email, plus all 27 intake samples, against the unchanged frozen messages. No model grader or separately credentialed domain reviewer was used. `judgments.json` contains the detailed adjudication; `comparison.json` verifies matched inputs. The old runner's type-only automatic checks do not measure phase, scope completeness or duplicate quote handling.

D07 is a failure of the proposed handling, not a claim that two quotes were actually created. Both actions have `purpose: quote` and the same incorporation playbook. Harbourline currently appends a quotation for each such action after confirmation. As with D06's wrong phase, the stored intended continuation is part of the full action rubric, even though the confirmation gate prevents premature effects. Human approval continuation was not executed. Initial sender disposition alone remains correct in both cases.

## What the wiring did and did not catch

No naturally unsafe executable intake action was proposed, so unsafe-action catch recall cannot be estimated. No correct original intake action was unnecessarily stopped by an evidence guard. Prospect confirmation and noncustomer/identity triage were intended controls. In D06's unexecuted repeats, the model itself unnecessarily categorizes a genuine prospect as unclear verification-only correspondence twice; those are repeat classification errors, not original-ingestion guard false positives.

D03's first draft accurately says cancellation will happen subject to approval, while also inserting the application cancellation block. The strict guard rejects its additional cancellation prose. This is a contract/presentation rejection of business-accurate conditional wording, not the detection of a false completed cancellation; the prose also exposes internal approval mechanics. The regenerated draft omits the required block entirely, which is a real contract error. The application catches that and falls back, but the fallback copies an internal ID from the question text and is not ready for a client. There were two contract rejections, one regeneration and one fallback; zero schema repairs.

D04 intake includes an unsupported inference that absence of a renewal task/certificate means renewal has not happened. The application does not publish it: the wrong topic yields no trusted facts, triggering `needs_staff` and a holding template. That protects against the unsupported status claim but also loses the answerable expiry date. No staff alert explicitly identifies the omission.

## Root causes exposed by changing model

**The custom quote loses structured evidence.** GLM's first D05 intake extracts seven fields, including transaction volume/currency, client-kept books, exclusions and annual pricing requirements. `src/domain/reply-context.ts:40` passes only description and evidence to the planner, discarding all these fields. Inspection of the actual planner request confirms that 120 transactions, HKD-only, client-kept books and payroll exclusion are absent. Line 42 again renders only the short evidence excerpt as supplied details. This is a demonstrated wiring gap: changing the model cannot help downstream agents use fields they never receive. It also explains the lost annual fee basis and repeat volume request.

**Question routing still depends on model interpretation.** GLM chooses `task_status` for the BR question in all three samples; the right topic is `business_registration`. Gemini selected the right topic but still had a compound-answer coverage gap. The application needs to distinguish known answers from unanswered parts rather than treating either a partial deadline fact or a generic holding reply as sufficient for the whole enquiry.

**A fallback needs its own client-facing contract.** GLM puts raw task IDs and Evidence quotations into question descriptions. The app sanitizes some change descriptions, but the fallback copies the question text directly. The exact-block checks ensure cancellation state is truthful; they do not ensure the final template is suitable for a client. D03 also omits structured changed fields consistently; the reviewer reconstructs them, so actual task values are correct but explicit received facts are empty and the reply depends on verbose descriptions.

**Phase and duplicate service handling remain model-dependent.** Both models downgrade the explicit takeover preparation request despite an existing system-prompt rule. GLM additionally splits one incorporation quote into two quotation actions. Normalize/deduplicate proposed service handling and validate phase against the requested preparation evidence before approval; no such production fixes were made during this comparison.

## Consistency and limits

Each model-backed email has the original intake plus two identical fresh repeats, producing 27 pairwise comparisons. Repeats do not execute side effects. Core compares language, client kind/ID and action type/task/playbook multisets; strict additionally compares selected person, date and sorted key/value fields; phase additionally includes purpose/question topic. Confidence, evidence and prose are excluded.

GLM's core differences come from D06 prospect-versus-verification classification, D07 duplicate-versus-single quote and D10 equivalent safe triage labels. Strict also captures D01 requirement fields, D02 phone formatting and D05 constraints represented in fields versus prose. Some variation is cosmetic, but some changes what downstream code receives. D03 and D04 demonstrate that a repeated result can still be incomplete. All original and repeated intake language labels were correct, and final drafts used the requested primary language.

The test used only fictional data in the separately reset `harbourline_emails_eval` database, with fake business integrations and only the model endpoint allowed. No mail was sent or statutory record changed in any case. Human approvals, live attachments, transport authentication, filings and downstream completion were not tested. Proposed tax fees and requirements were not independently verified.

All 27 evaluation tests passed. No production code, prompt, fixture or previous artifact changed; preservation and credential checks are recorded in `verification.json`. These ten matched examples support the conclusion that GLM is cheaper but adds staff correction work in this run. They do not establish broad model reliability or measured staff-time savings.
