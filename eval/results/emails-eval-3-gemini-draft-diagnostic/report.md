# Why the three drafts failed

The evidence points to context/state wiring and conflicting task contracts, rather than establishing a Gemini capability ceiling. A context-only diagnostic replay resolved the three specific defects with the same recorded system prompts, model, schema and temperature. One sample per case is evidence for the diagnosis, not proof of production reliability.

## C01: resolution date omitted — information lost before drafting

Intake understood the proposed 4 November 2026 resolution date and recorded it in its action description/evidence. It returned only newName as a structured field. The name-change playbook has newName/approvalRoute requirements and an event deadline, but no mapped resolution-date requirement. newRequestFacts builds the reply from checklist statuses and task due date; it does not carry the original action description/evidence or message into the draft. Consequently the draft never sees the resolution date.

This is an intake-schema/playbook/context-preservation gap. Asking written-resolution versus meeting route is legitimate because the email did not specify that route. A scheduled resolution must remain a proposed fact, not be mistaken for a passed resolution or effective name change.

Diagnostic change: add a note to the name-change reply facts with the planned date and explicit proposed/certificate status. Same prompt/model now includes all those distinctions. No statutory rule was changed or independently verified.

## C03: cancellation reported complete — approval state omitted

proposeCancel correctly creates a pending cancel_task proposal. However facts.cancellations contains only title and note. composeReply only sets workStatus when there are new requests; this mixed amendment/cancellation has none. The draft sees a cancellation entry with no pending/completed state, and writes that it has already happened. The generic never-promise instruction is insufficient to recover an unavailable state distinction.

Diagnostic change: add awaiting_staff_approval and actualTaskStatus:open to that cancellation, with a note that the client requested it but it has not been completed. Same prompt/model now explicitly acknowledges a pending request. Wording about internal approval could still be polished for clients. Per-action state is needed: the director date amendment has already been applied internally while the cancellation remains proposed, so one global pending/completed flag would be inaccurate.

There is also an unequivocal application bug in this case. The requirement-review model correctly marks contactInfo needed because the phone is absent. applyChange then sets an item received whenever an incoming field has a value, overriding the review's completeness judgment. This is not a reasoning failure by that review model. The diagnostic draft replay does not fix this checklist behavior.

## C04: unrelated deadlines presented as advice — wrong context, conflicting instructions

Intake correctly identifies the dormancy-advice question. answerFacts receives clientId but not the question, so it cannot retrieve question-specific material. It returns every open task and upcoming deadline. Those dates are placed under the question's facts despite providing no substantive answer.

The drafting prompt says to cover every item in FACTS, answer only from facts, omit irrelevant upcoming deadlines and check/revert when facts do not answer the question. It also says unconditionally that a supplied statutory deadline should be mentioned. This mixes a relevance instruction with a broad coverage/deadline instruction and gives the model irrelevant material labeled as answer facts. Gemini could have rejected that material, so there is a prompt-adherence failure too; the input and contract made it avoidable.

Diagnostic change: replace unrelated deadlines with explicit missing-answer status and check/revert instructions. Same prompt/model produces a short holding reply with no deadline dump. This resolves the misleading draft, not the underlying question: substantive advice requires approved relevant knowledge or a staff answer. The current answer-only-from-facts contract prevents the drafter from freely using general domain knowledge.

## The other two failed cases are upstream of drafting

C05 bookkeeping and C07 incorporation were understood, but routed as ask_question. Bookkeeping bypassed the custom planner entirely; incorporation lost preparation fields (roles/shares/capital) before customer confirmation. No missing quote or absent incorporation draft could be repaired by the draft writer itself.

The intake contract conflates identifying a requested service, preparing scope/quote or documents, and permission to commence actual work. Its quote-first instruction favors ask_question, while catalogue/custom rules favor start_request or unsupported_request. C07 explicitly instructs preparation, then asks for quotation approval, so these priorities compete. Repeat calls demonstrate both routes are available to the same model. Use distinct service, requested phase, supplied facts and authorization fields, with deterministic planning/approval transitions. This is a proposed repair, not implemented or evaluated by this diagnostic.

## Cross-cutting acceptance gap

DraftZ only requires subject/body strings. draftProblems checks invoice number/total, upload link, empty body and a bounded started-work pattern when workStatus exists. It does not validate requested-fact coverage, cancellation state or question relevance. All original defects passed. Schema adherence therefore explains successful shape validation, not semantic correctness.

The practical repair is to preserve source facts/constraints, provide explicit per-action state and answer availability, route quote preparation separately from execution permission, and build replies from those typed decisions. Application-controlled text is suitable for consequential status/financial claims; prose synthesis can remain with Gemini. Raw email can be included as untrusted source evidence, with trusted state kept separate, rather than used as authority. More prompt text alone cannot supply facts absent from the input.

## Diagnostic protocol

Only draft user context was changed. The three saved requests retain the original recorded system prompt, schema and temperature, and use google/gemini-3.8-flash with low reasoning. Original and repaired requests/responses, predeclared target expectations, schema validity, latency, returned usage and independent judgments are in results.json. No production code/prompt changes, database ingestion, approval, bank/accounting access, external send or register change took place. One replay per case; no repeated reliability test.

The three successful diagnostic calls cost US$0.00607125 in reported usage. All three responses passed DraftZ. Initial scratch-script startup errors (module format and dependency entry point) occurred before any live call; they are not model failures.
