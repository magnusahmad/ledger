# Harbourline Desk

The operating platform for Caine Road Ventures' company secretarial firms: an AI intake agent that reads client email, playbook-driven tasks, invoices with bank matching, official Companies Registry forms, e-signature, KYC screening and effective-dated statutory registers, for Hong Kong, Mainland China, Macau and Taiwan. Start with `AGENTS.md`, then `docs/BUILD_SPEC.md` and `docs/MILESTONES.md`.

## Run it

Requirements: Node 22, Postgres 17 (`brew install postgresql@17 && brew services start postgresql@17`).

```
createdb harbourline && createdb harbourline_test
cp .env.example .env         # set or_api_key; everything else is optional
npm install
npm run db:seed              # migrates and loads the fictional demo firm and clients
npm run dev                  # web app on http://localhost:3000 plus the background worker
```

- `/demo`: the demo panel (deliver a test email, simulate a client payment, reset).
- `docs/DEMO_SCRIPT.md`: the investor demo, step by step.
- `docs/SETUP_INTEGRATIONS.md`: Gmail, AgentMail, Airwallex sandbox, Xero and OpenSanctions.
- `docs/REVIEW_LOG.md`: independent review, fixes, supported transaction shapes and evidence limits. Playbook configuration is not proof that every jurisdiction workflow has run end to end.

This remains a fictional-data demo. Authentication and database row-level security are deferred under decision #24; do not use real client data or add a second firm yet. Real mailbox, bank, accounting and screening accounts still require a credentialed smoke test.

## Test it

```
npm test                     # unit and integration tests against a real Postgres (no live AI)
npm run e2e                  # the demo loop in a browser (Playwright), scripted AI
npm run eval:llm             # live AI evaluation on realistic multilingual scenarios
npm run demo:rehearse        # the full demo end to end with the live AI, with timings
npm run forms:check          # compares our Companies Registry forms with cr.gov.hk
```
