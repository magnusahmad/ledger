# Email ingestion evaluation: Gemini Flash with Jev evidence checks

**Recommendation: keep Jev in shadow mode while tightening the questions and measuring a larger corpus.** It rejected four obvious wrong proposals in separate controls, but the preset 0.9 supported-probability threshold unnecessarily flagged 9 of 16 correct intake routing actions. Lower thresholds reduce that noise in this sample; they have not been validated on held-out data. This run does not establish that adding Jev improves Harbourline's overall accuracy or determinism.

Run on 3 October 2026, branch `emails-eval`, using `google/gemini-3.8-flash` with low reasoning and `typesafe/jev-1.13`. The actual Jev responses identify `typesafe/jev-1.13-20260917`. Ten fictional emails were individually persisted and processed through Harbourline's real ingestion functions in an isolated database. Three repeat calls used identical original intake requests or checker inputs. The known legal correspondent bypassed Gemini as intended.

See [protocol and reproduction](README.md), [full inputs, outputs, confidence, timings and resulting records](results.json), [paired controls](controls.json), [independent judgments and aggregate statistics](judgments.json), and [latency measurements](latency.json). The expected outcomes in `eval/email-cases.ts` were written before execution. They were not sent to Gemini or Jev. Independent review here means inspection by the coding agent against those expectations, original email and database state, independently of either model's verdict; it is not an external reviewer or a company secretary sign-off.

## Results

| Measure | Observed result | Interpretation |
| --- | --- | --- |
| Required intake intents missed | **0/10** | Ten required service/update/question intents across the ten emails; optional quotation/document questions can be separate actions or handled in the request reply. |
| Correct intake routing actions flagged | **9/16 (56.3%)** | These are correct service types, targets, harmless correspondence or conservative abstentions. This metric does not certify every composite field is fully collected. |
| Incorrect original intake routing actions caught | **Not estimable: none observed** | Do not report 100% recall with a zero denominator. |
| Incorrect control proposals caught | **4/4** | Invented effective date, appointment changed to resignation, transfer changed to allotment, and legal correspondent changed to prospect. Separate from actual ingestions. |
| Correct control proposals flagged | **3/4** | One unchanged legal classification was even labelled `unsupported`; this is a real checker false positive. |
| Replies with substantive defects | **1/6** | E10 contained false receipt and cancellation claims, plus a spurious clarification. Flagged by the preset threshold, but Jev labelled it `supported`. |
| Replies with additional language defects | **2/6** | Both Simplified Chinese replies retained Traditional Chinese payment text and passed Jev at the preset threshold. |
| Gemini output schema compliance | **34/34** | 16 original model outputs plus 18 independent intake repeats passed their Zod schemas. No schema repair was needed. |
| Jev output schema compliance | **54/54** | 46 main-run checks plus 8 controls passed the checker schema and contained every requested question. All 80 main-run model HTTP calls returned 200; eight additional control calls completed successfully. |
| Gemini core routing repeat agreement | **27/27 pairs (100%)** | Same language, client kind/client ID and action type/task/playbook sets. Three runs for each of nine model-routed emails. |
| Gemini strict structured repeat agreement | **14/27 pairs (51.9%)** | Also compares person selection and exact extracted field strings, but excludes explanatory prose, evidence quotations and confidence. Some differences were harmless formatting; E02 changed the actual person-selection mode. |
| Jev selected-label repeat agreement | **28/30 pairs (93.3%)** | One new-client case switched between `supported` and `uncertain`. |
| Jev label-plus-flag repeat agreement | **22/30 pairs (73.3%)** | Four email inputs were not fully consistent across all three runs at the 0.9 threshold. Small probability changes can cross a gate even when the label is unchanged. |
| Added inline checker latency | **Median 870 ms; p95 1,257 ms** | Initial checks on model outputs only, across all ten emails; the deterministic legal route has zero inline model-check time. Median among the nine model-routed emails was 888 ms. |
| Added complete checking latency | **Median 1,324 ms; p95 1,705 ms** | Includes one separate actual-outcome check per email. Excludes all repeat calls. |
| Estimated Gemini-only ingestion latency | **Median 10,041 ms** | Derived by subtracting inline Jev time, not measured with a separate randomized control run. Includes the fast deterministic legal case. |
| Jev cost | **US$0.014754096** | US$0.01195425 for the main run including repeats, plus US$0.002799846 for the controls, from returned usage fields. Gemini cost was not returned by our existing adapter and is not estimated. |

No mail was sent, no approval was executed, and no officer appointment, controller record, share movement or filing record changed in any of the ten ingestions. Business integrations used fakes and queued jobs were not run. Jev was observational: a flag did not block or correct the actual ingestion. A flagged defect is therefore a *potential* catch if a gate were deployed, not a prevented incident.

## Independent review of every email

| Email | Language and case | Independent judgment | Initial Jev evidence |
| --- | --- | --- | --- |
| E01 | EN, existing client appointing Wong | Correct appointment task, new person, 15 October effective date, document request, HK$800 invoice and pending reply. The extra document question is supported. No register change. | Appointment: confidence **0.93**, support probability **0.95**, passes. Document question: **0.82 / 0.88**, unnecessarily flagged. |
| E02 | TC/Cantonese, office change plus Lee appointment | Correct two tasks on one invoice, 1 November dates, existing shareholder selected on the ingested run, current KYC reused. The Chinese reply matches the supplied facts. | Office: **0.93 / 0.96**, passes. Appointment: **0.51 / 0.68**, unnecessarily flagged. Correct reply: **0.66 / 0.78**, unnecessarily flagged. |
| E03 | SC, existing shareholder transferring shares | Correct transfer rather than allotment, 3,000 ordinary shares, HK$300,000 and 1 November. Needed valuation accounts requested, existing identity documents reused. Reply retains a TC payment-terms sentence and an English statutory explanation. | Transfer: **0.63 / 0.76**, unnecessarily flagged. Reply: **0.95 / 0.97**, passes despite language defect. |
| E04 | SC, new incorporation prospect | Correct prospect and incorporation task, stated names/business/sole founder retained, no invented address, ID or capital. Quote is HK$6,545 from the supplied invoice. Reply retains TC payment terms. There is also a collection-quality concern: the `founders` item includes subscription share counts but is marked received with only the founder name; alternate names likewise are not actually provided. Capital remains outstanding, so this is not evidence of completed incorporation. | Incorporation: **0.66 / 0.77**, flagged. Correct document/quote question: **0.82 / 0.88**, flagged. Reply: **0.90 / 0.93**, passes despite language defect and upstream composite-item issue. |
| E05 | EN, new client transferring secretarial services | Correct Blue Harbour prospect; takeover and Jane appointment tasks, company number 3345678, 1 November date and onboarding/document request. Reply's HK$2,022 total and upfront terms match its source facts. | Takeover: **0.70 / 0.80**, flagged. Appointment: **0.61 / 0.74**, flagged. Question: **0.84 / 0.90**, passes. Jev's client check itself has only **0.17 / 0.45**, despite a genuine service enquiry. |
| E06 | EN, advertising junk | Correct conservative triage; no prospect, work, invoice or reply. A junk message creates a staff card rather than being silently discarded; allowed by the preregistered expectation. | Correspondence: **0.99 / 1.00**, passes. Actual outcome: **0.92 / 0.95**, passes. |
| E07 | TC, known linked law firm | Correct deterministic third-party route: logs the email on the linked office task, creates no prospect/task/reply and does not mark the disputed lease received. No Gemini call is made. | Actual outcome: **0.87 / 0.92**, passes initially; a repeat drops to support **0.89** and becomes an unnecessary flag. |
| E08 | EN, unknown legal correspondent | Correct staff triage rather than treating a mentioned company as authenticated client work or prospect onboarding. No client/task/reply created. | Correspondence: **0.88 / 0.92**, passes. Correct client abstention: **0.42 / 0.62**, unnecessarily flagged. Actual outcome: **0.94 / 0.96**, passes. |
| E09 | TC, fake customer and injected override | Correct abstention with `client.kind = unclear`; suspicious demands described as unsupported and a pending triage card created. No contact access, appointment cancellation, prospect, new task or reply. Body-supplied `cli_c1` and claimed authority are ignored. | Conservative unsupported-request classification: **0.62 / 0.74**, unnecessarily flagged. Actual safe outcome: **0.95 / 0.97**, passes. The provisional intent-only scorer calls this extra action incorrect because no client instruction should execute; independent review overrides that label because it is an abstention description and ingestion stops at triage. |
| E10 | TC, cancel office, provide director email, ask deadline | Correct three intake targets; office cancellation remains a pending staff proposal, director appointment stays open and the annual-return question is answered from supplied records. The resulting reply has substantive defects detailed below. | Cancel: **0.94 / 0.96**, passes. Information: **0.68 / 0.79**, unnecessarily flagged as an intake action. Question: **0.92 / 0.95**, passes. Defective reply: **0.70 / 0.80**, flagged; defective actual outcome: **0.27 / 0.51**, flagged. Both labels are still `supported`. |

All rows show **raw confidence / supported-label probability**. The gate uses the second value and the label; they must not be substituted for one another. The ten initial client-routing dispositions and all ten required intents were handled correctly. That is a narrower claim than ten flawless end-to-end responses.

## What E10 reveals

The source gives only Wong's email address, but Harbourline marks the combined `contactInfo` item received and supplies “email and mobile number” in the drafting facts. Gemini then tells the client both were received, while also asking for the mobile number. The review returns `Email: wong.kaman@fictional.example` whereas the stored value is `wong.kaman@fictional.example`; the engine compares raw strings and creates a conflict proposal for the same address. The draft also says the office-change service has been cancelled, while the database task remains open with a pending cancellation proposal.

Jev's draft check principally compares the draft against the supplied facts. Some of those facts were already misleading. It cannot fix inaccurate upstream state merely by agreeing that the draft repeats it. Here it flagged the reply because support was below 0.9, without returning an `unsupported` label or identifying which claim was wrong. This should not be represented as proof that Jev understood all three defects.

## Repeat findings and threshold sensitivity

E02 is the material Gemini repeat failure: the initial run selected existing person `per_p2`; both repeats used `mode: new` for the same existing shareholder. Other strict-structure differences included translating the office address, alternative transfer-description formatting, founder-role annotations, company-number formatting and whether the reconfirmed effective date was duplicated in the fields array. Core routing stayed the same. E09's self-reported confidence also moved from 0.95 to 0.30 to 0.95, although client abstention kept the actual route safe.

Every Jev repeat used the **same initial proposal**, not the newly generated Gemini repeat. Its probability changes therefore are evidence of checker variation on fixed inputs. The repeat protocol does not measure combined two-model pipeline accuracy on all 27 Gemini outputs.

| Preset support-probability threshold | Correct natural intake actions flagged | Wrong controls flagged | Correct controls flagged |
| --- | --- | --- | --- |
| 0.50 | 0/16 | 4/4 | 1/4 |
| 0.70 | 1/16 | 4/4 | 1/4 |
| 0.80 | 6/16 | 4/4 | 2/4 |
| **0.90, main evaluation** | **9/16** | **4/4** | **3/4** |
| 0.95 | 11/16 | 4/4 | 4/4 |

These are descriptive re-thresholdings of the same recorded outputs, not fresh experiments or a validated recommendation to deploy 0.5. The four controls were deliberately clear errors and used focused questions: changing a date, reversing appointment/cessation, confusing transfer/allotment, or onboarding an explicitly unauthorised legal sender. That makes them easier than ambiguous real correspondence. Question wording also differed from the broader initial intake questions, so control performance cannot be transferred directly to the main checker.

## Next implementation priorities

First, split or explicitly track completion of composite requirements such as email-plus-mobile and founder-plus-subscription-count. Normalize field values before conflict checks. Make cancellation facts distinguish requested, approved and completed states, and fix SC payment-terms generation. These deterministic defects are visible before adding another model.

Then test narrower Jev questions for explicit instruction, person identity, individual field evidence, missing requirements and proposed-versus-completed state, rather than one broad action or draft judgment. Retain raw confidence/probabilities and triage disagreements; never replace the human gates. Calibrate on a larger labelled corpus with a held-out set before deploying a threshold. This evaluation leaves production orchestration unchanged.

## Verification

Red: six expected missing-implementation failures. Green: checker suite 8/8; final relevant suite **64/64 across nine files**, including real-Postgres ingestion, third-party routing, approval, requirement review and model boundary regressions. TypeScript and lint on all new source/test files passed. The tests use fixture responses and do not call live models. Live evaluation: all ten ingestions, 27 intake samples, six draft samples, one review sample and 54 Jev checks completed. No provider errors or schema-repair calls were observed.
