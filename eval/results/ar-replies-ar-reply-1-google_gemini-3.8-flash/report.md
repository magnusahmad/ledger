# Reply reader: frozen set, ar-reply-1, google/gemini-3.8-flash

Run 2026-11-19T12:10:51.517Z. Reasoning effort low. Fictional replies only (eval/ar-reply-cases.ts); expectations were fixed before the run.

- Cases: 38; fully correct: 35; no usable reading: 0
- Missed (in the reply, not reported): 0
- Extra (reported, not in the reply): 2
- Wrong value: 1
- Time per reply: median 4.2 s, slowest 15.7 s

| Case | Language | Result | Problems |
|---|---|---|---|
| en-plain-none | en | pass |  |
| en-correct-no-charges-answer | en | pass |  |
| en-has-charges-statement | en | pass |  |
| en-buried-resignation | en | pass |  |
| en-new-director | en | pass |  |
| en-office-move | en | pass |  |
| en-director-address | en | fail | extra: change member_particulars (CHAN Tai Man) |
| en-share-transfer | en | pass |  |
| en-other-topic | en | pass |  |
| en-question-about-return | en | pass |  |
| en-signed-attached | en | pass |  |
| en-quoted-old-text | en | pass |  |
| en-confirms-existing | en | pass |  |
| en-attachment-shows-change | en | pass |  |
| en-second-message | en | pass |  |
| en-name-change | en | pass |  |
| en-unsigned-draft-back | en | pass |  |
| en-allotment | en | pass |  |
| en-word-attachment | en | pass |  |
| en-two-changes | en | pass |  |
| tc-plain-none | tc | pass |  |
| tc-director-resigned | tc | pass |  |
| tc-has-charges | tc | pass |  |
| tc-office-move | tc | pass |  |
| tc-correct-no-charges-answer | tc | pass |  |
| tc-other-topic | tc | pass |  |
| tc-signed-no-attachment | tc | pass |  |
| tc-director-address | tc | pass |  |
| tc-share-transfer | tc | pass |  |
| tc-director-died | tc | pass |  |
| sc-plain-none | sc | pass |  |
| sc-has-charges-partial | sc | pass |  |
| sc-new-director | sc | pass |  |
| sc-office-signed | sc | pass |  |
| sc-fee-question | sc | pass |  |
| sc-mixed-language | sc | fail | wrong: date of director_ceased: expected 2026-10-31, read none |
| sc-other-topic | sc | pass |  |
| sc-member-address | sc | fail | extra: change member_particulars (LEE Siu Ming (李小明)) |
