#!/bin/bash
# Fresh demo data for a recording take (separate database, port 3200).
set -e
cd "$(dirname "$0")/../.."
export DATABASE_URL=postgres://localhost/harbourline_rec MAIL_PROVIDER=fake STORAGE_DIR=storage/rec APP_URL=http://localhost:3200 DEMO_EXISTING_CLIENT_EMAIL=
rm -rf storage/rec/fake storage/rec/documents storage/rec/mail
npx tsx --env-file-if-exists=.env scripts/seed.ts
# Demo 1 shows the payment gate, so Kowloon Bay pays upfront in the recording.
psql -q harbourline_rec -c "update client set payment_terms_days = 0 where id = 'cli_c1'"
