# Weixin OpenClaw channel (iLink): direct integration without the OpenClaw runtime

Status: draft spec, 25 September 2026. It responds to the review doc "CSA Weixin Gateway: architecture and OpenClaw removal plan" (25 September 2026) and sits alongside `WECHAT_INTEGRATION.md`. Items marked **[verify]** must be confirmed in G0 (§8) before build.

## 1. Summary

- **Yes, we can skip OpenClaw entirely.** Tencent's plugin (`Tencent/openclaw-weixin`, MIT) is thin. The transport code (HTTP API client, QR login, cursor, media encryption, about 2,000 lines) has **no OpenClaw imports**. The server protocol is plain JSON over HTTPS. Only the glue that hands messages to OpenClaw's agent (`channel.ts`, `monitor.ts`, `messaging/*`, `auth/pairing.ts`) depends on OpenClaw. We write our own client for the protocol inside the tool. Phases 1, 2 and 4 of the review's plan go away.
- **But the channel is not what the review assumes.** The Weixin OpenClaw channel is a private chat between **one Weixin account holder and their own bot**. Clients can't add or message it. Groups aren't supported. It can't see the account holder's chats with anyone else. So it **cannot capture client conversations automatically**. It only receives what a staff member sends or forwards to their own bot.
- **What it is good for:** a mobile capture and assistant channel for staff. Staff forward a client's message, photo, file or voice note to their bot. The tool files it against the client, runs identify/extract, and replies in the bot chat with the draft reply and next steps. Staff copy the draft back into the client chat. Clients do nothing differently.
- **Hard gates:**
  - **Weixin accounts only.** It is reportedly available only to Weixin (mainland) accounts, not WeChat (international) accounts. Staff with +852-registered WeChat can't use it **[verify]**.
  - **Terms of use.** The in-app terms for the Weixin OpenClaw plugin haven't been read yet. Third-party write-ups say it isn't meant for commercial customer service or for sensitive personal data **[verify]**.
  - **Beta.** The feature is in grey (staged) release, and Tencent can change or withdraw it.

Automatic capture of client conversations through official channels is still only possible via WeCom (`WECHAT_INTEGRATION.md` §4.1). The Weixin OpenClaw channel is a faster, smaller complement to it, not a replacement.

## 2. Review of the proposal

### What it gets right

- Keep the transport narrow and all interpretation in the tool.
- Save the batch and its cursor atomically. Use idempotent ingestion with stable keys. One poller per account.
- Never let a model relay messages. Use explicit filtering rules.
- Admits that the published client code isn't a complete server contract.

### What it misses

1. **Who is on the other end.** The review never says whose messages arrive. `getupdates` only returns messages between the account holder and their bot: `message_type` 1 is the user, 2 is the bot. The plugin declares `chatTypes: ["direct"]`, and Tencent's own guidance says other people can't add your bot. So a "Weixin → CSA gateway" doesn't receive client messages. The review's design makes sense only if that premise holds, and it doesn't. This is the central gap.
2. **Account eligibility.** The Weixin OpenClaw channel is reportedly limited to Weixin (mainland) accounts, and "WeChat users are not supported yet". Hong Kong staff registered with +852 numbers usually have WeChat. For the design partner, this could rule it out entirely.
3. **Terms and legitimacy.** The MIT licence covers the plugin *code*. It gives no rights to use Tencent's *service*. The service is governed by the plugin's terms, plus the Weixin licence and account rules. The review mentions only "the upstream licence". Tencent-affiliated write-ups frame ClawBot as for personal use with a self-deployed AI. Some say it is unsuitable for commercial or customer-data use. We need the actual terms, read by a person and checked by counsel, before building on it. Using the protocol without OpenClaw also needs a view on whether the terms allow clients other than OpenClaw.
4. **Honest client identification.** Requests carry `iLink-App-Id`, `iLink-App-ClientVersion` (from the plugin's version) and `bot_agent`. A direct client must identify itself truthfully (its own `bot_agent`) and not pose as the OpenClaw plugin. The server may reject clients or versions it doesn't recognise. That's a compatibility risk, not something to work around.
5. **Outbound limits.** Replies need the inbound `context_token`. The bot can reply only within about **24 hours** of the user's last message and can never start a conversation. The review's "separate outbound interface" doesn't mention this. It also doesn't say that outbound only ever reaches the staff member, never the client.
6. **Operational lifecycle.** The protocol includes `msg/notifystart` and `msg/notifystop`. Error `-14` pauses the session for an hour. Re-login needs the staff member to scan a QR code with their phone, so our app needs a login screen, expiry alerts and re-link prompts. One Weixin account allows **one** connected bot, so a staff member already using the Weixin OpenClaw plugin personally would clash.
7. **Media details.** Media is AES-128-ECB encrypted on Tencent's CDN. Voice arrives as SILK audio, which needs converting, and sometimes includes Tencent's transcript in `voice_item.text`. Voice, file or video items without a key are skipped. Quoted replies carry `ref_msg`. Edits and recalls come as `update_time_ms` / `delete_time_ms`. Whether forwarded "chat history" bundles (合并转发) arrive at all is unknown **[verify]**.
8. **Data flows and privacy.** Forwarded client ID documents go through Tencent's `ilinkai.weixin.qq.com` and its CDN (mainland infrastructure) under a staff member's personal account. That needs PIPL/PDPO advice and counts against our Hong Kong residency default. Tencent also says it runs content-security review on traffic.
9. **Firm ownership.** The link is tied to a staff member's personal Weixin account. When they leave, the firm must revoke the token. The history already lives in the tool, which is a plus.
10. **The spool and gateway service are there because of OpenClaw.** When the gateway is a separate process in front of OpenClaw, an HTTPS hop, a durable spool and acks make sense. When we own the poller, it can write messages and the new cursor **in one Postgres transaction**. That removes the spool, delivery retries and the gateway service. Keep a clean adapter boundary in code instead.
11. **Staged migration isn't needed.** There's no OpenClaw install to migrate from, so the cursor handover, rollback deployment and parity windows in Phases 2–4 are unnecessary. Validation comes from recorded protocol fixtures and a G0 test account, not from running stock OpenClaw. Running an autonomous agent runtime next to client ID documents, even briefly, is itself a risk, and authorities have issued warnings about OpenClaw (SCMP, see sources).

## 3. What we are building

A **staff capture and assistant channel** in Weixin:

1. A staff member links their Weixin OpenClaw bot to the tool by scanning a QR code shown on their profile page in the tool.
2. In any client chat they forward a message, photo, document or voice note to their bot. They can also type or speak a note to it (e.g. "Kowloon Bay wants to appoint Mr Chan as director").
3. The tool files what arrives as an `inbound_message` from that staff member and works out which client it concerns. If it's unsure, it asks in the bot chat ("Which client? 1 Kowloon Bay Trading, 2 Lotus Peak Technology") and the staff member replies with a number.
4. It runs the same identify step as New request, then replies in the bot chat. For example: "Looks like appoint a director for Kowloon Bay Trading. Draft reply below; open in Ledger: <link>", followed by the draft in the client's language. Or: "Added the ID copy to *Appoint a director* for Kowloon Bay Trading. Still waiting on address proof."
5. The staff member long-presses, copies the draft and pastes it into the client chat. Nothing reaches the client unless the staff member sends it.

This follows "the AI suggests; staff approve" by design: the bot can only talk to the staff member.

## 4. Architecture

```
Staff Weixin ──(forward)──▶ OpenClaw bot ◀──── iLink HTTPS (ilinkai.weixin.qq.com, CDN)
                                              ▲
                                              │ long-poll / send / media
                                   ┌──────────┴───────────┐
                                   │ WeixinIlinkAdapter    │  worker process, 1 poller per linked staff account
                                   │  (our TypeScript,     │
                                   │   no OpenClaw)        │
                                   └──────────┬───────────┘
                                              │ same DB transaction: messages + cursor
                                         Postgres (HK) ──▶ identify/extract jobs ──▶ bot replies (outbound queue)
```

- **Module `channels/weixin-ilink`** in our codebase, behind the `ChannelAdapter` interface from `WECHAT_INTEGRATION.md` §8. Parts:
  - `api-client`: `getupdates`, `sendmessage`, `getuploadurl`, `getconfig`, `sendtyping`, `msg/notifystart`, `msg/notifystop`, with headers per `docs/protocol.md`. Schemas validated with zod.
  - `login`: `get_bot_qrcode` and `get_qrcode_status`, driven from our web UI rather than a terminal. Handles `need_verifycode`, `verify_code_blocked` and `expired`.
  - `media`: CDN download and upload, AES-128-ECB with PKCS#7, SILK to Opus/WAV conversion.
  - `poller`: one per linked account, with a Postgres advisory lock so there's only ever one owner. Honours `longpolling_timeout_ms`, backs off on errors, pauses on `-14`, and sends notifystart/stop.
- **Code reuse:** port the transport modules from the Tencent plugin with the MIT notice kept in `THIRD_PARTY_NOTICES`. Re-write rather than vendor, so we own the tests and remove the `~/.openclaw` file-state assumptions. Pin the protocol version we tested against and watch the upstream repo for protocol changes.
- **Pollers** run in the background-job worker (same deployment, HK region), not a separate service.

## 5. Behaviour rules (each becomes a test)

Ingestion:
- A batch's messages and its new `get_updates_buf` are committed in one transaction. On failure neither is saved, and the same batch is fetched again.
- An empty `get_updates_buf` in a response never overwrites the saved cursor.
- `message_id` (per linked account) is the idempotency key. Replaying a batch creates no duplicates.
- Messages whose `from_user_id` isn't the linked account's `ilink_user_id` are dropped and logged. So are bot-type messages (`message_type` 2).
- An edit (`update_time_ms`) updates the stored message and keeps history. A recall (`delete_time_ms`) marks it recalled but keeps it for the record. A task created from it isn't undone automatically.
- Media is downloaded, decrypted and stored in HK object storage before the message is marked ready. If it fails, the message stays pending with a visible "attachment couldn't be retrieved" state and retries.

Linking and suggestions:
- A message never creates a task, ticks a checklist item, changes a register or issues an invoice without the staff member confirming, in the bot chat or in the tool.
- The client is suggested, not assumed. When confidence is low, the bot asks.
- An inbound attachment matching an outstanding checklist item is offered to that task and marked received only on confirmation.

Outbound (bot → staff):
- Every bot reply uses the latest `context_token` for that staff member. If none is newer than 24 hours, the reply stays in the tool and the tool shows a notice instead.
- The bot never sends to any `to_user_id` other than the linked staff account.
- Drafts sent to staff are logged as `outbound_message` with channel `weixin_ilink_staff` and are clearly not "sent to client".

Account lifecycle:
- `bot_token` is stored in the secrets vault, never in the database or logs. Redact tokens, `context_token` and media keys in logs.
- Error `-14` pauses that poller for an hour and shows "Weixin link paused" on the staff member's profile.
- An expired or rejected token marks the link "needs re-linking" and prompts the staff member in the tool.
- Deactivating a staff user revokes their link and stops their poller within one polling cycle.

## 6. Data model additions

- `weixin_link`: user, `ilink_bot_id`, `ilink_user_id`, base URL, vault reference for token, status (`linked`, `paused`, `needs_relink`, `revoked`), linked at, last poll at.
- `weixin_cursor`: link, `get_updates_buf`, updated at.
- `weixin_context`: link, latest `context_token`, received at (drives the 24-hour rule).
- `inbound_message`: source `weixin_ilink`, external message ID, raw items (encrypted), `ref_msg`, edit/recall timestamps, suggested and confirmed client.

## 7. UI

- **Profile → Weixin**: link button showing the QR code, status, last message received, unlink. Explains in plain words what the link can and can't do ("Forward client messages to your Ledger bot. The bot can't see your other chats and can't message clients.").
- **Inbox on Today**: forwarded items appear with the same suggested actions as `WECHAT_INTEGRATION.md` §6.2.
- **Bot replies**: short, in the staff member's UI language, with the client draft in the client's language as its own message so it's easy to copy.

## 8. Plan

- **G0, feasibility (about a week; mostly not engineering).**
  1. Ask the design partner which staff use Weixin (+86) and which use WeChat (+852). If none have Weixin, stop here.
  2. A person enables the Weixin OpenClaw plugin on a test Weixin account and saves the full in-app terms. Counsel reviews them for commercial use, client personal data and non-OpenClaw clients.
  3. Build a throwaway script with our own `bot_agent` to test login, `getupdates` and `sendmessage`.
  4. Record fixtures for: text, image, file, video and voice (with and without transcript), a single forward from a client chat, a forward from a group, a multi-select one-by-one forward, a merged chat-history forward, a quoted reply, an edit and a recall.
  5. Note what the fixtures show about the original sender of forwarded items.
  - **Output:** go / no-go and fixtures committed under `test/fixtures/weixin-ilink/` (demo content only).
- **G1, build (2–3 weeks after the core milestone's New request flow exists):** adapter, poller, linking UI, inbox integration, bot replies. Test-first against the fixtures.
- **G2:** voice note transcription through our speech-to-text (if Tencent's transcript isn't good enough for Cantonese), the numbered client-choice reply, and a weekly "link health" summary for managers.

## 9. First failing tests (red/green, G1)

Write these first, against a fake iLink server and G0 fixtures:

1. `commits messages and cursor together; a failed insert leaves the cursor unchanged`
2. `does not overwrite the saved cursor when the server returns an empty get_updates_buf`
3. `replaying the same getupdates batch creates no duplicate inbound messages`
4. `drops messages not sent by the linked staff account`
5. `a forwarded ID copy is offered to the open task but not marked received until confirmed`
6. `no bot reply is sent when the latest context token is older than 24 hours`
7. `the bot never sends to anyone other than the linked staff account`
8. `error -14 pauses only that staff member's poller for one hour`
9. `deactivating a staff user revokes their Weixin link and stops polling`
10. `bot tokens, context tokens and media keys never appear in logs`
11. `decrypts an AES-128-ECB image from fixture and stores it in document storage`

## 10. Open decisions for the owner

1. **Is a staff-side capture channel worth it**, given that clients can't reach the bot? It removes retyping and puts documents in the record, but staff still forward each message. Only WeCom removes that step.
2. **Staff accounts:** Weixin or WeChat at the design partner?
3. **Counsel's view** on the plugin's terms and on forwarding client ID documents through it.
4. **Order of work:** Weixin OpenClaw channel (small, fast, limited) before, after or instead of the WeCom path?

## Sources

- Tencent/openclaw-weixin repository and README: https://github.com/Tencent/openclaw-weixin
- Weixin backend protocol: https://github.com/Tencent/openclaw-weixin/blob/main/docs/protocol.md
- Plugin source reviewed 25 September 2026 (v2.4.9): `src/api/api.ts`, `src/api/types.ts`, `src/channel.ts` (`chatTypes: ["direct"]`), `src/storage/sync-buf.ts`
- Tencent News on the Weixin plugin, launched as "ClawBot" (Weixin-only, one bot per account, no access to other chats, 24-hour reply window): https://news.qq.com/rain/a/20260324A00EBC00
- Weixin plugin FAQ, from when it was called ClawBot (third party): https://jimo.studio/blog/wechat-clawbot-faq-everything-you-need-to-know/
- OpeniLink background (24-hour window, context token): https://openilink.com/docs/guide/background
- Direct, OpenClaw-free implementation exists (third party, evidence of feasibility only): https://github.com/SiverKing/weixin-ClawBot-API
- SCMP on privacy warnings: https://www.scmp.com/tech/article/3347590/tencent-adds-clawbot-plug-wechat-amid-openclaw-boom-and-privacy-warnings
