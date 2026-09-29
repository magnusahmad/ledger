# Ledger: company secretarial platform (product working name: Harbourline Desk)

Read this first, then `docs/PRODUCT_SPEC.md`. Everything under `docs/`, `seed/` and `prototype/` comes from a design and prototyping phase done in claude.ai; this repo is where the real build starts.

## What we're building

The **internal operating platform for Caine Road Ventures (CRV)**. CRV is a holdco running a roll-up strategy: it acquires Hong Kong firms providing company secretarial (co-sec), accounting, payroll and tax services to SMEs, then transforms them with AI. Each acquired firm is a licensed trust or company service provider ("TCSP"). Ledger is how their work moves onto one platform.

It is **not a SaaS product**: there are no outside customers and no platform billing. It must, however, run **several CRV-owned firms side by side**, each a separate legal entity with its own clients, staff, invoices and licence obligations (see `docs/DECISIONS.md` #20). Co-sec comes first; bookkeeping, payroll and profits-tax work follow. It combines:

1. **Statutory records** for each client company: registers of directors, secretaries, members and significant controllers, share capital and movements, filings, charges. This replaces legacy desktop tools like P&L Software's CSA Expert.
2. **A work engine** that turns client requests into tasks driven by configurable playbooks (steps, required information, documents, deadlines, fees).
3. **CRM-style request handling**: staff paste in what a client sent (WeChat message, voice-note transcript, email), the app identifies the request(s), drafts the reply in the client's language, prepares the invoice, and creates tracked tasks.
4. **Billing and payments**: invoice with the request, upfront or on credit terms, with automatic payment matching from bank feeds (Airwallex, HSBC).

**Phase 1 is a pre-acquisition workflow trial with a design partner**: one potential acquisition target (not necessarily the one CRV buys) that runs real work on the tool so we can measure hours saved. Until an acquisition closes, their client data is theirs. It lives in an isolated deployment that can be exported or deleted as a unit if no deal happens (see `docs/DECISIONS.md` #20). Company-level context (thesis, targets, market research) lives in the CRV knowledge base, `github.com/magnusahmad/crv-kb`.

## Non-negotiables

- **The AI suggests; staff approve.** Nothing is sent to a client, filed with the Companies Registry, or changed in a statutory register without a human clicking. This matters for accuracy and for the firm's licence obligations.
- **WeChat integration goes through official Tencent channels only.** Real integration is in scope (not just paste-in, screenshots or share sheets), but it must not use bots, hooked or modified clients, iPad/web protocol emulators or reads of WeChat's local database. These break Tencent's terms and risk bans that would destroy client relationships. See `docs/WECHAT_INTEGRATION.md`.
- **Never store or display credentials in plain text.** Companies Registry e-accounts, bank API keys, etc. go in a secrets vault with access logging.
- **Statutory registers are effective-dated.** Every officer appointment, shareholding and controller entry has from/to dates and a full history. Registers must be reproducible as at any date. Design this in from the start; it's very hard to retrofit.
- **Each firm's data is isolated.** Every row carries `firm_id`, enforced by Postgres row-level security. Staff see only their own firm; only CRV group roles see across firms. Pre-acquisition trial firms run in their own deployment. Like effective dating, this is hard to retrofit, so it's built in from the first migration (`docs/DECISIONS.md` #20).
- **Playbooks are data, not code.** Company secretaries must be able to review and edit them. Seed data lives in `seed/playbooks.json`.
- **Three languages throughout**: English, Traditional Chinese (繁體中文, Hong Kong clients), Simplified Chinese (简体中文, mainland clients). Per client and per contact.
- **Hong Kong data residency** for client data by default.

## Engineering workflow rules

### Everything is testable

- Every new feature or piece of functionality ships with tests. No exceptions for "just UI", "just config" or "just a migration".
- Tests must explicitly verify the **intended business logic**, not only that code runs. Name tests after the rule they protect, e.g. "a task on credit terms skips the payment step", "a register queried as at 2025-03-01 excludes a director who resigned on 2025-02-28", "a custom invoice number does not consume the auto sequence".
- Where a rule comes from `docs/PRODUCT_SPEC.md`, `docs/DECISIONS.md` or playbook data, the test should make that rule legible to a reader who hasn't seen the spec.
- Keep external systems (LLM, banks, e-signature, KYC, object storage, clock) behind interfaces so they can be faked deterministically in tests. LLM-backed features get tests against recorded or fixture responses; never depend on a live model call for a test to pass.
- Data separation between firms, effective dating, the human-approval gate and credential handling are high-risk areas: cover them with integration tests against a real database, not only unit tests.

### Red/green TDD

1. **Before implementing**, state the failing tests you expect to write or run (test names plus the behaviour each asserts). Put this in your plan or message before touching implementation code.
2. Write those tests and run them. Confirm they fail, and fail for the expected reason (not a typo or import error).
3. Write the minimum implementation to make them pass. Run them again and confirm green.
4. Refactor with the suite green. Run the full relevant suite before calling the work done.

Report the actual red and green runs; don't claim a test passed without running it.

### UI changes

- **Verify every UI change visually** with the browser (the built-in browser pane by default): load the page, confirm the intended change is actually present, and check for obvious visual regressions. Where performance is relevant (large lists, registers, heavy pages), check for jank, slow loads or console errors as well.
- **Always check the major breakpoints**: mobile (375px), tablet (768px), laptop (1280px) and wide desktop (1440px+). Look for horizontal overflow, clipped content (e.g. the deadline stamp), broken navigation and unreadable tables. Reset the viewport afterwards.
- Check both English and Chinese content where the change affects text, since CJK strings change widths and line breaks.
- **Use kicker lines sparingly.** Do not add a kicker (the small label above a heading) to every heading. Only use one when it tells the reader something the heading does not already say.

## Design language (from the prototype)

Neutral light theme, low clutter, clear visual precedence. IBM Plex Sans with Noto Sans TC/SC for Chinese. Primary buttons near-black (#16181D) on white; greys for structure; amber for "waiting", red only for overdue or due within 30 days. Deadlines within 30 days use a small red seal-style stamp (限 for due, 逾 for overdue), which is the one decorative signature element. Prose-style captions, sentence case, no jargon in UI copy.

## Repo layout

- `docs/PRODUCT_SPEC.md`: full product spec, data model, flows, integrations, compliance notes.
- `docs/DECISIONS.md`: decisions made so far and why. Append new decisions here.
- `docs/ROADMAP.md`: phased plan and the first milestone for this repo.
- `docs/PLAYBOOKS.md`: human-readable playbook library for company secretary review.
- `docs/WECHAT_INTEGRATION.md`: scope and spec for WeChat integration (draft, open decisions listed at the end).
- `docs/TIME_SAVED_VS_CSA.md`: stack rank of capabilities by estimated time saved vs CSA Expert, and gaps where we are behind it.
- `docs/WEIXIN_GATEWAY.md`: spec for a direct Weixin OpenClaw channel (iLink protocol) without OpenClaw, plus a review of the earlier gateway proposal.
- Company-level knowledge (thesis, market research, service workflows, meetings) lives in the separate CRV knowledge base, not in this repo. See "CRV knowledge base" below.
- `seed/playbooks.json`: 12 draft playbooks (steps, requirements, documents, deadlines, fees, notes, trigger keywords).
- `seed/requirement-items.json`: 35 reusable requirement items with trilingual labels and extraction hints.
- `seed/message-templates.json`: trilingual message building blocks (request, chase, confirmation, invoice lines, payment reminder). Stored as JS function source from the prototype; port to a proper template format (never `eval` it).
- `seed/demo-clients.json`: five fictional client companies, people and three staff users for dev and demos. Uses the prototype's short keys (`cr`, `inc`, `fye`, `sc`, `dr`...); map them to the target data model in `PRODUCT_SPEC.md` §5 when loading.
- `prototype/harbourline-desk-demo.html`: the single-file clickable prototype. **Reference only, not a starting codebase.** Use it for UX, copy and behaviour. It is desktop-only; don't copy its narrow-width layout.
- `prototype/harbourline-desk-walkthrough.mp4`: 3-minute walkthrough of the prototype.

## CRV knowledge base

Company-level context lives in the CRV knowledge base (private repo `github.com/magnusahmad/crv-kb`), checked out inside this folder at `crv-kb/` (its own git repo). It is plain markdown; start at its `index.md` and follow its own `AGENTS.md` when editing it. `CLAUDE.md` loads `crv-kb/WORKSPACE.md`, and in Claude Code `.claude/settings.json` pulls it at session start; other agents should run `git -C crv-kb pull --rebase --autostash` before relying on it. If `crv-kb/` is missing, ask the owner before cloning it.

**Read it** before work that depends on why Ledger exists or who it serves: the roll-up thesis, acquisition targets and the pre-deal trial, the services co-sec firms sell and how their staff work (`research/hk-co-sec-services.md`), market and competition, fundraise commitments (`fundraise/`), and company decisions (`shared/decisions/index.md`). Product detail stays in this repo's `docs/`; the KB links here rather than duplicating it.

**Write to it** only for company-level knowledge a future session would need that doesn't belong in this repo: a company decision, a research finding, a meeting outcome, a new fact about a target or the market. Code, specs, playbooks and product decisions stay here (`docs/DECISIONS.md` for product decisions).

**How to write:**
- Commit straight to its `main` in small, focused commits with changelog-style messages. Run `git pull --rebase` before pushing. Undo unwanted changes with `git revert`.
- Follow its page standard: Owner, Last reviewed, Sources and Related at the top of every page; dense prose; concept folders only (`product/`, `fundraise/`, `meetings/`, `research/`, `shared/`). Add new pages to the folder's `index.md`.
- Acquisition targets may be named. Never write client data, personal data from a target or owned firm, or credentials: reverting a commit does not remove it from git history.
- Tell the user what you changed in the KB and link the commit.

## Working conventions

- TypeScript throughout. Stack recommendation is in `docs/PRODUCT_SPEC.md` §9; **confirm with the owner before scaffolding.**
- Statutory rules (deadlines, form requirements) are marked as needing company secretary verification. Don't hard-code them outside playbook data.
- Fictional demo data only in seeds. Never commit real client data.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
