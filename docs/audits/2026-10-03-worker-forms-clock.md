# Area 10 necessary worker-checkpoint consumer

Source baseline: `6d60fb701a1898ec4c89604cf157f36812383423`. This extends the same frozen D07 actual worker-loop checkpoint boundary, with no network or broad new corpus.

Expected assertions before source implementation: a failed weekly Registry form check, either thrown or returned as an incomplete `errors` result, stays due for retry on the next tick. Only a successful check records the seven-day cadence. A pending forms check keeps polling active without launching duplicate checks.

Actual root replay of four temporal files: two genuine weekly-check failures and thirteen date controls pass in 6.57 seconds. The repaired annual/AGM/CDD/provider-time/manual-thread/hourly-checkpoint paths pass. Both weekly failures record the old successful timestamp and suppress retry. They fail four soft assertions each for that one cadence defect.

The final worker-only freeze includes the two original worker cases, those two necessary weekly consumers and the nonblocking single-flight preservation control. All providers/runtime/forms are fake or stubbed while PostgreSQL and the actual worker loop remain real. Controlled pending verification is always released before fixture cleanup. Actual log: `/private/tmp/harbourline-robustness-20261002/root-area10-worker-forms-final-red.log`.

No source changes by root. A separate fixer must reproduce before changing weekly handling, preserving background polling, and root as original filer must independently reaccept.

## Separate fixer replay

Original portable2f02e3d on own isolated fixes PostgreSQL:2 genuine weekly-check failures/3controls,3.03s. Both rejected checks and fulfilled results with errors incorrectly wrote a successful seven-day checkpoint. Minimum worker repair keeps one background check in flight, leaves mailbox/bank ticks active, logs failed/incomplete verification and writes the cadence only after complete success. Guarded worker/deadline/mailbox/manual temporal replay:16/16green across4files,6.86s. Typecheck/scoped lint/diff exit0. Logsarea10-fixer-weekly-{red,green}.log. This checkpoint awaits original reacceptance and is not Area10 clearance.
