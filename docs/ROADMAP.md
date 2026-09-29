# Roadmap

## Phases

1. **Core records and migration.** Data model (effective-dated), client page with all tabs, registers, share ledger, deadline calendar, document templates, CSA/Excel migration tool. Goal: the design partner runs its trial on the new system, with hours saved measured.
2. **Work engine.** Playbooks as editable config, tasks, New request (paste-in → identify → prepare → create), Today, Tasks, invoices with upfront/credit terms, reminders, bank matching (Airwallex first), real LLM extraction. Email ingestion.
3. **Client-facing.** Secure upload portal, eKYC and screening, e-signature, voice-note transcription. WeChat integration is phased separately: see `docs/WECHAT_INTEGRATION.md`.
4. **Roll-up readiness.** Multi-firm operation for CRV-owned firms (per-firm branding, invoice sequences, bank connections, group reporting), an onboarding runbook for each newly acquired firm (migration from CSA and Excel, playbook overrides, staff setup), permissions, security review, HSBC and accounting integrations. Plus data handover or deletion for trial firms that aren't acquired.

## First milestone for this repo

Aim: a working vertical slice on real infrastructure with seed data.

1. Confirm the stack (see `PRODUCT_SPEC.md` §9) and scaffold the repo: app, database, migrations, auth with firm and user (row-level isolation by firm from day one), audit log.
2. Implement the effective-dated schema for clients, people, appointments, share classes, holdings, movements, significant controllers, contacts, filings.
3. Load `seed/playbooks.json`, `seed/requirement-items.json` and `seed/demo-clients.json`.
4. Build the client list and client page (all tabs) against the database.
5. Build Today and Tasks with assignment.
6. Build New request with a real LLM call for intent detection and a deterministic message builder using the trilingual templates.
7. Build the task view with step progression, checklist, reply extraction (LLM), document generation from one .docx template (ND2A appointment resolution), and activity log.
8. Invoices: create with the request, upfront/credit, manual mark-paid, reminders. Bank integration comes next.

Use the prototype (`prototype/harbourline-desk-demo.html`) and walkthrough video as the UX reference throughout.

## Open questions for the owner

- Current system and client volume (drives the migration tool's first connector and scale assumptions).
- Overdue invoice escalation policy.
- Real fee schedule per playbook.
- E-signature and KYC vendor preferences.
- Whether the firm name/product name "Harbourline" (a placeholder) should change.
