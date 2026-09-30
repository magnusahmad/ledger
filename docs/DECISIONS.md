# Decisions log

Decisions made during the claude.ai design phase (September 2026), newest last.

1. ~~**Build in-house, then sell as SaaS.**~~ Superseded by #17. The founding firm is customer zero. Migration from existing systems (CSA Expert, spreadsheets) must be close to seamless.
2. **Modernise, don't clone CSA.** Organise around work (tasks driven by playbooks) and clients, not just records. Registers update as a consequence of completed tasks.
3. ~~**Personal WeChat stays.**~~ Superseded by #18. No WeCom migration, no unofficial automation. WeChat is descoped to paste-in for v1; the app handles "what to do next", staff handle "what did the client mean", with AI suggestions they can override.
4. **Multi-select requests.** One client message can produce several tasks with one combined reply and one invoice.
5. **Invoice first by default.** The invoice goes out with the information request; work starts on payment.
6. **Credit terms are allowed.** Per client (usual terms) and per request. On credit, the payment step is skipped and the invoice is tracked for ageing, overdue flags and reminders.
7. **Bank integration.** Airwallex and HSBC, checking automatically and matching by invoice number and amount; manual override retained.
8. **Editable invoices at the prepare stage.** Invoice number and prices are inline-editable with live message updates. Post-send changes will need an explicit, logged "Revise invoice" (not built).
9. **"Matters" renamed "Tasks".**
10. **Two centres of gravity.** Today (my work) and Clients (find a client, act for them). New request is launched from the client page.
11. **Staff assignment.** Each client has a staff member in charge; tasks default to them and can be reassigned. Today shows only the signed-in user's work.
12. **Client page tabs** modelled on CSA's Client Master File but modernised: Overview, Company, Shares and members, Officers and controllers, Records and filings, Contacts, Billing.
13. **Reminders go to the billing contact in their language.**
14. **Credentials are vault-held and never displayed** (CSA shows the CR e-Registry password in plain text; we won't).
15. **Visual design.** Neutral light palette, low clutter, IBM Plex Sans + Noto CJK, red seal stamp only for deadlines within 30 days.
16. **Playbooks need an owner.** Keeping forms and rules current as the Companies Registry changes them is a permanent role, not a one-off build task.

## September 2026, repo phase

17. **Internal tool, not SaaS.** *Framing superseded by #20; the not-SaaS part still stands.* This is an internal company secretarial automation tool for a future Hong Kong secretarial services company. Phase 1 is an experiment with a design partner, an existing Hong Kong company secretarial firm. No multi-tenant onboarding, per-firm branding or platform billing. *Proposed, needs owner confirmation:* run one deployment (and database) per firm rather than row-level multi-tenancy, so the design partner's data stays physically separate and can be exported or deleted when the experiment ends.
18. **WeChat integration is back in scope, through official channels.** Paste-in, screenshots and share extensions aren't enough. Real integration will be scoped in `docs/WECHAT_INTEGRATION.md`. Unofficial automation of personal WeChat remains ruled out.
19. **No OpenClaw.** *Proposed.* If we use Tencent's Weixin OpenClaw channel, we call its protocol directly from our own code and never install or host OpenClaw. The channel only connects a staff member to their own bot, so it is a staff capture tool, not client-conversation capture. See `WEIXIN_GATEWAY.md`.

## 27 September 2026

20. **Ledger is CRV's roll-up platform.** Confirmed by owner: CRV acquires Hong Kong co-sec (and accounting, payroll, tax) firms and does AI transformation in a roll-up strategy. The design partner is one potential target running a pre-acquisition trial, not necessarily a firm CRV will own. Still not SaaS: no outside customers or platform billing.

    *Architecture, confirmed by owner 27 September 2026:*
    - **One platform for all owned firms.** Every row carries a `firm_id`, isolated at the database layer (Postgres row-level security). Each owned firm is its own legal entity and TCSP licensee, with its own clients, staff, letterhead and invoice sequence, bank accounts, fees and message sign-offs. Staff see only their firm; CRV group roles see across firms for reporting.
    - **Shared playbook library, owned by CRV, with per-firm overrides** (fees, templates, sign-off).
    - **Pre-acquisition trial firms run in their own isolated deployment**, with export and delete as a unit. On acquisition, their data migrates into the shared platform as a new firm.
    - **Hours-saved measurement is a product requirement.** Per-step timings are needed before heads of terms and to prove margin uplift after acquisition.

    This replaces #17's "one deployment per firm" proposal.

## 29 September 2026, build requirements session (owner)

21. **Build the end-to-end investor demo and close the CSA parity gaps.** Scope and plan in `docs/BUILD_SPEC.md` and `docs/MILESTONES.md`.
22. **Product LLM runs on OpenRouter, `google/gemini-3.8-flash`, for now.** Used only by the product at runtime (intent, extraction, translation, drafting). The build, coding agents and reviewer agents never use OpenRouter. Replaces `PRODUCT_SPEC.md` §8's Anthropic API default for this phase.
23. **Client intent is understood only by the LLM.** No keyword rules or classic NLP for "what the client means"; the prototype's `triggerKeywords` are replaced by a natural-language `whenToUse` per playbook. The playbook flow that follows can be rule-based, but the agent re-reviews requirements whenever task data changes (spec §4.2).
24. **Single tenant, single user for this build.** Every table keeps `firm_id`, but RLS policies, login and roles are deferred. This is a deliberate, temporary exception to the `AGENTS.md` non-negotiable; RLS must land before any second firm or design-partner data. Residency and PDPO also deferred.
25. **Email: Gmail API (OAuth) primary, AgentMail fallback,** behind one mail interface; Outlook (Graph) later.
26. **Runs on the founder's laptop.** Next.js, worker and Postgres (Homebrew) locally; inbound email and bank deposits are polled, so no public URL.
27. **Airwallex: bank-transfer deposits to the Global Account, matched on invoice number and amount.** The demo uses the sandbox deposit simulation.
28. **Xero through the official Xero MCP server,** with Harbourline as MCP client doing deterministic invoice and payment sync. The LLM doesn't decide accounting writes.
29. **Unknown senders become prospects** with the onboarding playbook added to their request.
30. **In-house e-signature** (email OTP, stamped PDF, audit certificate) behind a provider interface.
31. **Jurisdictions: Mainland China, Macau and Taiwan get records plus core playbooks;** offshore (BVI, Cayman, Seychelles) later. Companies Registry forms are the official fillable PDFs filled in. Screening via OpenSanctions. Demo firm identity: Caine Road Corporate Services Limited (fictional). Automation: internal steps run automatically; every client-facing send, register change and filing record needs a human click.
32. **Xero invoices are approved with one direct API call.** The official Xero MCP server (v0.0.17) creates invoices as DRAFT and has no tool to approve them, but Xero only accepts payments against AUTHORISED invoices. Harbourline therefore uses the MCP server for contacts, invoices, lookups and payments, and calls the Xero API directly only to set an invoice to AUTHORISED, with the same credentials. Revisit if the MCP server adds invoice status updates.
33. **Product model runs with reasoning effort "low".** At the default, Gemini 3.8 Flash spent up to 7,000 reasoning tokens on some intake calls (up to 166 s). At "low", the 13-scenario live eval is 13/13 with a median of 11 s per message end to end (intake plus draft). Configurable with `LLM_REASONING`.
34. **Staff screens show only what the team needs to do the work.** Demo and measurement instruments stay out of the working screens: no time-saved panel on tasks (the Time saved report lives under Settings → Reports), no "Live" or "mail checked" indicators (pages update silently and only show "Reconnecting…"), no manual "check mail/bank now" buttons (the worker polls), and no Demo panel link (it stays at `/demo`). Stored codes (`tc`, `HK`, `sent`, `seed`, ISO dates) are always shown as words and dates. The client upload link is one form with a single Send button, not a save button per item. A prospect first known only by the sender is named after them (flagged as provisional) rather than "(new prospect)"; onboarding tasks are not titled with the instructing person checked for KYC.
35. **Requests can be started manually.** New request has two modes: "From a message" (pasted text, read by the product model) and "Start manually" for instructions taken in a meeting or on a call. Staff choose playbooks and enter what they already know (person, effective date, details); Harbourline creates the same tasks and invoice as the email path. By default it drafts a confirmation ("thank you for meeting with us…") with the invoice and upload link for approval. If staff choose not to send one, the send step is recorded as agreed in person and the invoice is issued for them to hand over; nothing goes to the client. Manual requests are logged as taken in person by staff, never as client messages. Opened from a client record, the client is fixed. One-off (custom) requests still go through the message path, which plans them.
