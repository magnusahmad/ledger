# Area 10 necessary mailbox consumer

Baseline: accepted `99e68ad`, source identical to `08865f4`. This single caller boundary follows the frozen provider-time chase tests; it adds no new broad fuzz corpus.

Before implementation: a manually confirmed request must link its actual mailbox reply to its task and restart that task's chase clock.

Actual public flow: save a fee-free office-change playbook, manually start work with confirmation, approve the genuine initial message, record a real FakeMail-threaded staff reply on September 29 with the context also September 29, then run chasing September 30. The current context intentionally eliminates the older-clock timestamp defect as an explanation.

Root original red: `tests/audit-temporal-manual-mailbox.test.ts`, one genuine business failure in 1.45 seconds. Routing to the original conversation passes and the one approved FakeMail delivery remains intact. Request conversation is null, no task mailbox-reply event is logged, and a premature pending chase is created. Four soft assertions fail for that one missing association. Log: `/private/tmp/harbourline-robustness-20261002/root-area10-manual-mailbox-red.log`.

No source changes or external messages. Separate fixer must reproduce and root, the original filer, must independently reaccept the final source.
