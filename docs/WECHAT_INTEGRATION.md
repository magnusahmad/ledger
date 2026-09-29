# WeChat integration: scope and spec

Status: draft, September 2026. Replaces the "paste-in only" position in `DECISIONS.md` #3 (see #18). Items marked **[verify]** are based on public documentation and third-party write-ups and must be confirmed in the feasibility spike (§9, W0) before we build on them.

## 1. Problem

Most client requests arrive on WeChat: text, photos of ID cards, PDFs, voice notes, often in client group chats. Today staff read them on their personal phones and retype what matters. The result:

- requests and documents live on staff phones, not in the firm's records;
- the tool only sees a message if someone remembers to paste it;
- when a staff member leaves, the client relationship and chat history leave with them;
- the firm can't show what was asked, sent and agreed, which matters for TCSP record-keeping.

Paste-in, screenshots and share extensions all depend on a person doing an extra step for every message. We want messages to reach the tool on their own, and replies drafted in the tool to go back into the chat with one click.

## 2. Requirement (owner, 25 September 2026)

Staff keep using their personal WeChat, and don't have to forward or paste anything. A gateway reads the WeChat messages through an official Tencent route.

**Status: no official Tencent route meets all three conditions as of September 2026.**
- WeCom's archive reads WeCom chats, not personal WeChat.
- The Weixin OpenClaw channel (§4.5) only carries messages between an account holder and their own bot. Its protocol has no call that reads the account's other conversations, and Tencent says the plugin doesn't access them.
- Every route that reads a personal account's chats (§4.4) is unofficial.

One condition has to give; see §10.

## 2a. Goals

1. **Inbound capture.** Every message and attachment exchanged with a client on WeChat lands in the tool, linked to the right contact and client, without anyone copying it.
2. **Suggested next step.** New inbound messages go through the same identify step as New request (spec §4.2) and show up as suggestions for staff to act on.
3. **One-click reply.** A reply drafted in the tool can be put into the WeChat conversation by staff without retyping, and the tool records that it was sent.
4. **Firm-owned relationships.** Client chats belong to the firm, survive staff changes, and form part of the client's record.

Non-goals for now: chatbots that answer clients on their own, bulk marketing, payments inside WeChat.

## 3. Constraints

- **Official Tencent channels only.** No bots, hooked or modified clients, iPad/web protocol emulators (Wechaty and similar) or reads of WeChat's local database. Tencent actively detects these and bans accounts. Losing a staff member's WeChat account would cut off their clients. This constraint is non-negotiable (`AGENTS.md`).
- **The AI suggests; staff approve.** Nothing goes to a client without a staff member choosing to send it.
- **Hong Kong data residency.** Messages we fetch are stored in our Hong Kong region. Note that Tencent also holds the messages on its own servers; we can't change that.
- **Consent and privacy.** Archiving a client's messages needs their agreement (WeCom enforces this, §4.1) and must be covered in the firm's PDPO notice. Mainland clients raise PIPL questions; get the privacy lawyer's view.
- **Clients stay on their own WeChat.** We can't ask clients to install anything new.

## 4. Options

### 4.1 WeCom (企业微信) with personal WeChat interconnect (archiving needs a mainland entity)

Staff use the WeCom app instead of personal WeChat for client work. Clients keep using their ordinary WeChat. They add the staff member's WeCom account once, and it appears in their contacts like any other WeChat friend, with the firm's name shown next to it. From then on:

- **Message archive (会话内容存档).** A server-side API returns every message in chats between staff and clients: one-to-one, client groups, text, images, files, voice. We poll it, decrypt with our own RSA key and store the messages in the tool.
  - Messages can only be fetched for **5 days**, so polling must be reliable and alert on gaps.
  - The SDK is a native C library for **Linux and Windows** only. It needs a small sidecar service, not a Node package.
  - It is a **paid, per-staff-seat** feature. **[verify]** the pricing for our entity.
  - **Clients must agree to archiving.** WeCom asks them and sends us "agree" / "disagree" events. If a client declines, we don't store their messages and fall back to paste-in for that contact.
- **Customer contact API (客户联系).** Events when a client adds or removes a staff member, the client's profile, and the list of each staff member's clients. We use it to link WeCom contacts to our contacts.
- **Chat toolbar app (聊天工具栏).** A web page of ours that opens in a side panel inside WeCom's chat window. When a staff member opens a chat with a client, the panel shows that client, their open tasks, what they still owe us and any draft replies. "Insert" puts the draft into the chat through the JS-SDK `sendChatMessage` call, and the staff member presses send. **[verify]** that it works in one-to-one chats and client groups, and whether it needs extra confirmation.
- **Staff changes (在职/离职继承).** When someone leaves or clients are reassigned, their client contacts move to a colleague and the history stays with the firm.

Costs and risks:

- **Moving relationships.** Every client has to add a new contact once. Staff send the WeCom contact card from their personal WeChat, and the client taps add. This reverses the earlier assumption that staff "won't move off personal WeChat". It changes daily habits and needs the design partner's buy-in (§10).
- **Overseas entity support: message archiving is NOT available.** WeCom's own help centre (checked 25 September 2026) lists 会话内容存档 among the features unavailable to overseas-verified companies. The others are external payments, company pay, red packets and the third-party app marketplace. The same page says the overseas registration path needs a foreign phone number *excluding* Hong Kong, Macau and Taiwan. So a Hong Kong-only company can use WeCom and its chat toolbar, but **cannot capture messages automatically**. The only way to get archiving is a **mainland-registered entity** (for example a WFOE or mainland affiliate with a PRC business licence). Consequences:
  - the WeCom data sits with a mainland organisation under PRC law;
  - moving client data from there to our Hong Kong systems is an outbound transfer under PIPL;
  - a Hong Kong TCSP's client records would be held under a mainland entity.

  Only worth considering if the firm has a mainland operation anyway, and only with legal advice.
- **WeCom AI bots (智能机器人, docs updated August 2026) don't change this.** They receive only messages that WeCom members send to the bot: one-to-one, or @mentions in groups. The sender is always an internal `userid`, and images, files, voice and video arrive only in one-to-one chats. The CLI/MCP "messages" capability only sends as the bot and lists the bot's own last 20 conversations. Nothing reads staff members' chats with clients. At most, staff could forward client messages to a WeCom bot, which is the same forwarding pattern as the Weixin OpenClaw channel.
- **Registration friction (observed 25 September 2026).** The owner's free, unverified Hong Kong registration was suspended immediately. Probable causes are new-account risk controls on unverified organisations and mixed region signals (+852 numbers count as domestic). Plan for verification and an appeal, or use a certified WeCom partner to register. Don't make repeated fresh registrations.
- **Tencent developer setup.** Callbacks need a public HTTPS endpoint, and API calls must come from registered trusted IP addresses.

#### Moving to WeCom: what staff and clients experience

- **Staff:** install WeCom and use it for all client chats. Personal WeChat stays for everything else. Each staff member links their personal WeChat to their WeCom account. Then they add clients to WeCom from their WeChat friends list, or send clients their WeCom contact card or QR code.
- **Clients:** one tap to accept or add the staff member's WeCom contact. It appears in their normal WeChat with the staff member's real name, the firm's name and a verified badge. The first time, they're asked to agree to chat archiving. Nothing else changes for them.
- **History:** earlier chats stay in the staff member's personal WeChat and aren't moved. Existing client groups can reportedly be moved to WeCom in one step if the staff member owns the group, but this may be limited by industry **[verify]**.
- **Limits:** Tencent advises adding no more than about 200 contacts a day, and more if clients add you rather than the other way round. Unverified companies are capped at about 100–200 client contacts, so verification is required.
- **Staff leaving:** their clients are reassigned to a colleague. Clients may get a notice about the change **[verify]**.

#### Costs (Tencent list prices, September 2026; **[verify]** for an overseas entity)

- **Verification:** RMB 700 for an overseas entity (RMB 300 a year for mainland). Check whether it renews each year.
- **Message archive:** list price from 22 January 2026. The "service" edition (text, images, files; no audio or video calls) is RMB 900 per staff member per year. The edition with calls is RMB 1,800. Minimum 5 seats.
- **Client contacts:** a free allowance, then about RMB 0.1 per contact per year. Negligible at our scale.
- **Example:** 10 client-facing staff on the service edition ≈ RMB 9,000 (about HK$9,700) a year, plus verification.
- **Our side:** a small Linux service for archive fetching, and roughly 6–9 engineering weeks across W0–W2 (§9).

### 4.2 WeChat Customer Service (微信客服), handled in WeCom (supplementary)

A customer-service entry point that clients reach from a link or QR code, without adding anyone. We receive messages over an API. Replies are only allowed **within 48 hours of the client's last message, up to 5 messages**. It feels like a helpdesk, not an ongoing relationship with the firm. Useful later as the front door for prospective clients (e.g. from the firm's website). Not the core channel.

### 4.3 Service Account (服務號), and possibly a Mini Program (supplementary)

A Hong Kong company can apply for an overseas Service Account using its Business Registration. It can send notifications and host web pages inside WeChat. Customer-service messages have the same 48-hour window. Good for later:

- deadline and payment reminders the client has opted into;
- hosting the secure upload and identity-check page inside WeChat.

**[verify]** that an overseas entity can use Mini Programs. Some sources say it can't.

### 4.4 Unofficial personal WeChat automation (rejected)

Wechaty-style bots, iPad/Mac protocol emulators, hooked desktop clients and reading WeChat's local database all break Tencent's terms. Tencent detects them and bans accounts, and the maintained tools change hands or stop working often. A ban would cut the firm off from its clients. Rejected.

### 4.5 Weixin OpenClaw channel (iLink), used directly without the OpenClaw runtime (staff capture channel)

Tencent's official Weixin OpenClaw channel plugin gives each Weixin account a private bot, reachable over a documented HTTPS protocol. We can use it directly, with no OpenClaw. It is official, but the bot only talks to its own account holder. Clients can't reach it and it can't see other chats. So it works as a **staff capture and assistant channel**: staff forward client messages to it and get drafts back. It doesn't capture client conversations automatically. Reportedly it works for Weixin accounts only, not WeChat. Full spec and a review of the gateway proposal: `WEIXIN_GATEWAY.md`.

### 4.6 WhatsApp Business app + Cloud API coexistence (not WeChat, but likely the bigger channel in Hong Kong)

About 75% of Hong Kong people use WhatsApp; about 49% use WeChat (Statista, Q2 2025). WeChat matters most for mainland-linked clients. Meta's "coexistence" (generally available since late 2025) lets one WhatsApp Business number work in the normal WhatsApp Business app **and** the official Cloud API at the same time:
- incoming messages arrive by webhook, and messages staff send from the app are echoed to us (`smb_message_echoes`);
- up to 180 days of history can be imported on connection;
- messages sent from the app aren't subject to the 24-hour window.

Limits:
- group chats are not synced;
- disappearing and view-once messages are turned off for one-to-one chats, and broadcast lists are disabled;
- the WhatsApp for Windows companion app is unsupported.

**Numbers are the main decision.**
- **Staff keep their existing number.** They convert it to the Business app, so clients notice nothing, but every one-to-one chat on that number is synced, including family. That's only acceptable if staff use a separate number for personal life.
- **The firm issues a business number per staff member.** It's clean and firm-owned, but clients have to save a new number.

**[verify]** availability for Hong Kong numbers, and pricing through a Business Solution Provider or direct.

### 4.7 Paste-in, screenshots, share extension (fallback)

Stays in the product as the fallback for clients who decline archiving, for staff still on personal WeChat during migration, and for other channels. No further investment beyond paste-in.

## 5. Recommendation (revised 25 September 2026)

WeCom archiving isn't available to a Hong Kong-verified company (§4.1). That removes the recommended core for a Hong Kong-only firm.

- **Design partner experiment:** staff stay on personal WeChat. Capture by fast paste-in, optionally the one-click desktop capture helper (screen-only, never touches WeChat; counsel to decide), and optionally a Service Account for document uploads and reminders.
- **CRV-owned firms after acquisition, WeChat clients:** WeCom with archiving only if we set up a mainland entity for other reasons and counsel is comfortable (§4.1). Otherwise WeChat clients stay on paste-in / capture helper.
- **CRV-owned firms after acquisition, WhatsApp clients (likely the majority in Hong Kong):** WhatsApp Business app with Cloud API coexistence (§4.6) is official and captures one-to-one chats automatically while staff keep using the app. Evaluate this first.

## 6. Functional spec (WeCom path)

### 6.1 Linking identities

- Each WeCom client contact (`external_userid`) links to one `contact` in our tool. Links are suggested by name, phone and remark, and **confirmed by staff**. We never link them silently.
- A contact can belong to several clients. So a message is linked to a contact first, and a **client is suggested per message** (from the text, the people mentioned and the contact's open tasks). Staff confirm it when they act on the message.
- Client group chats link to one client. Staff set this once per group.
- Each staff user links to their WeCom user ID.

### 6.2 Inbound

1. The archive sidecar polls every few minutes, decrypts and writes raw messages to encrypted storage in Hong Kong, then queues them for the app.
2. The app stores an `inbound_message` (text, attachments, sender, chat, time) and downloads media into the document store.
3. The identify step runs as in New request: detect request types, people on file, fields and attachments that fulfil outstanding checklist items.
4. The result appears in a new **Inbox** section on Today (the staff member's own clients). Each message offers suggested actions: "Start a request", "Attach to an open task" (e.g. the ID copy the client was asked for) or "No action". Nothing changes a task, register or invoice until staff click.
5. The client page gets a **Messages** tab with the full conversation, linked to tasks.
6. Voice notes are stored as-is. Transcription comes later (spec §8, speech-to-text).

### 6.3 Outbound

1. Drafts come from the existing flows (New request reply, chase, confirmation, payment reminder), in the contact's language.
2. In the tool: "Send in WeCom" queues the draft for that chat. In WeCom's chat toolbar panel, the draft appears ready to **insert**. The staff member reviews it, inserts it, and presses send in WeCom.
3. When the archive shows the sent message, the tool marks the `outbound_message` as **sent** and logs it on the task. If it doesn't show within a set time, the draft stays "not yet sent".
4. Copy to clipboard stays available everywhere.

### 6.4 Consent and notices

- Enable archiving only for staff seats doing client work.
- Consent notice in EN / 繁 / 简, agreed with the design partner and the privacy lawyer.
- For a contact who declines, show "Not archived" on the contact and the client. Their messages are never stored, and the tool prompts paste-in instead.

### 6.5 Security and retention

- Archive secret, RSA private key and API secrets live in the secrets vault. Every access is logged.
- Stored messages are encrypted at rest and follow the CDD record-keeping period (at least 5 years after the relationship ends), then are deleted under the firm's retention policy.
- ID documents received as attachments are classed as protected information (spec §7).

## 7. Data model additions

- `wecom_user`: staff user ↔ WeCom user ID, archive seat enabled.
- `wecom_contact`: `external_userid`, profile snapshot, linked `contact` (nullable until confirmed), archive consent status and date.
- `chat`: one-to-one or group, WeCom chat ID, linked client (groups), members.
- `inbound_message` (extends the spec §5 entity): source (`wecom_archive`, `paste`, `email`...), archive sequence number (for no-gap polling), chat, sender, suggested client, confirmed client, detected intents, handled state.
- `outbound_message`: add channel, chat, status (`draft`, `queued`, `sent`, `not_sent`), matched archive message.
- `archive_cursor`: last sequence fetched, last success time (drives the gap alert).

## 8. Architecture

- **Archive sidecar**: small Linux service wrapping the WeCom C SDK. Only fetches, decrypts and forwards. Runs in the Hong Kong region.
- **Callback endpoint**: public HTTPS route for customer-contact and consent events. Verifies Tencent's signature and decrypts.
- **Chat toolbar app**: a route in the main web app, authenticated through WeCom's OAuth for the staff member, using the WeCom JS-SDK.
- **Channel adapter interface** in the app (`ChannelAdapter`: fetch, resolve contact, queue outbound, confirm sent). Implementations: `WeComAdapter`, `PasteAdapter`, later email. Tests use a fake adapter.

## 9. Phasing

- **W0, feasibility spike (1–2 weeks, before any build).** Register and verify WeCom for the right entity (§10). Confirm: interconnect with clients on WeChat and Weixin, archiving on an overseas-verified account, consent flow, chat toolbar panel and `sendChatMessage` in one-to-one and group chats, seat pricing. Build a throwaway sidecar that pulls and decrypts a few test messages. Output: go / no-go, with notes added to this doc.
- **W1, inbound.** Sidecar, contact linking, `inbound_message`, Inbox on Today, Messages tab, attach to task.
- **W2, outbound.** Chat toolbar panel, insert draft, sent confirmation from the archive.
- **W3, extras.** Client group chats, voice transcription, staff-change handover, Service Account notifications.

W1 comes after the core roadmap milestone (records, tasks, New request). Paste-in covers WeChat until then.

## 10. Open decisions for the owner

1. **Whose WeCom organisation?** During the experiment, clients belong to the design partner. Their clients would add *the design partner's* WeCom accounts, and the archive belongs to the design partner. After an acquisition, each CRV-owned firm keeps (or sets up) its own WeCom organisation, and the client relationships stay with that firm. Is that right?
2. **Will the design partner's staff and clients switch?** This needs a conversation with the design partner before W0. Consider piloting with one staff member and a handful of clients.
3. **Does the design partner already use WeCom?** If so, W0 is much shorter.
4. **Budget** for archive seats and verification.
5. **Privacy advice** on archiving under PDPO, plus PIPL for mainland clients, before W1.

## 11. Testing (per `AGENTS.md`)

Test against a fake `ChannelAdapter` and recorded archive payloads, never live Tencent APIs. Business-rule tests to include, for example:

- a message from a contact who declined archiving is never stored;
- a new inbound message never creates a task, changes a register or issues an invoice until staff act on it;
- an inbound ID copy offered for an open task's checklist is only ticked "received" after staff confirm;
- a drafted reply is marked sent only once a matching sent message appears in the archive;
- a polling gap longer than the alert threshold (well inside Tencent's 5-day limit) raises an alert;
- a WeCom contact is never linked to a contact without staff confirmation;
- replaying the same archive batch doesn't create duplicate messages.

## Sources

- WeCom message archive overview: https://developer.work.weixin.qq.com/document/path/91360
- WeCom archive data fetch (5-day limit, SDK platforms, consent events): https://developer.work.weixin.qq.com/document/path/91774
- WeCom JS-SDK `sendChatMessage`: https://developer.work.weixin.qq.com/document/path/94354
- WeChat Customer Service API (48-hour, 5-message rule): https://developer.work.weixin.qq.com/document/path/94677
- Overseas WeCom registration (third-party guide): https://qpsoftware.net/blog/guide-wecom-registration-and-verification
- Service Account and overseas limits (third-party guide): https://www.imbee.io/resource/wechat-weixin-complete-guide
- Wechaty / pad-protocol ban risk: https://wechaty.js.org/docs/puppet-providers/padlocal
