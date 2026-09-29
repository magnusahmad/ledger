# Setting up the integrations

Harbourline runs without any of these: each has a built-in demo adapter (demo mailbox, demo bank, demo ledger, local sanctions list). Add keys to `.env` when you have them, restart `npm run dev`, and check **Settings**, where each integration shows Live or Demo. Nothing here costs money. Every credential is stored in `.env` or, for OAuth tokens, encrypted in the database. None is ever shown in the app.

## 1. Gmail (primary mailbox), about 10 minutes

Use a dedicated demo address, e.g. `desk.caineroad.demo@gmail.com`, so investors email that address.

1. Create the Gmail account, and sign in to <https://console.cloud.google.com> with it.
2. Create a project (e.g. "Harbourline demo").
3. **APIs & Services → Library**: enable **Gmail API**.
4. **APIs & Services → OAuth consent screen**: choose External and Testing mode. Add the Gmail address under **Test users**. The scopes are requested by the app, so you don't need to add them here.
5. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorised redirect URI: `http://localhost:3000/api/integrations/gmail/callback`
6. Copy the client ID and secret into `.env`:
   ```
   GOOGLE_CLIENT_ID=…
   GOOGLE_CLIENT_SECRET=…
   GMAIL_ADDRESS=desk.caineroad.demo@gmail.com
   ```
7. Restart `npm run dev` and open **Settings → Connect Gmail**. Sign in with the demo account and allow access. You land back on Settings with "Gmail connected".
8. Send a test email to the address; it appears on **Today** within about 20 seconds.

Notes:
- Testing-mode refresh tokens expire after 7 days. Reconnect from Settings the day before a meeting, or publish the consent screen.
- On first connection Harbourline starts from "now" and doesn't import old mail.

## 2. AgentMail (fallback mailbox), about 3 minutes

1. Sign up at <https://agentmail.to> (free tier) and create an API key.
2. Create an inbox (console or `agentmail inboxes create`), e.g. `caineroad@agentmail.to`.
3. `.env`:
   ```
   AGENTMAIL_API_KEY=…
   AGENTMAIL_INBOX=caineroad@agentmail.to
   ```
4. With both Gmail and AgentMail configured, Gmail wins. Force AgentMail with `MAIL_PROVIDER=agentmail`.

The free tier adds a "Sent via AgentMail" footer to outgoing mail.

## 3. Airwallex sandbox (client payments), about 10 minutes

1. Sign up for a sandbox account at <https://demo.airwallex.com> (or through the developer portal).
2. **Settings → Developer → API keys**: copy the **Client ID** and create an **API key**.
3. Open a **Global Account** in HKD in the sandbox (Wallet → Global Accounts), and copy its ID (visible in the URL, or via `GET /api/v1/global_accounts`).
4. `.env`:
   ```
   AIRWALLEX_CLIENT_ID=…
   AIRWALLEX_API_KEY=…
   AIRWALLEX_GLOBAL_ACCOUNT_ID=…
   AIRWALLEX_BASE_URL=https://api-demo.airwallex.com
   ```
   If authentication fails, Airwallex may have moved the sandbox host. Try `https://api.sandbox.airwallex.com`.
5. Invoices now show the Global Account's real bank details. **Demo panel → Send deposit** calls `POST /api/v1/simulation/deposit/create` with the invoice number as the reference. The worker polls deposits every 5 seconds and matches them on invoice number and amount.

## 4. Xero (accounting) via the official Xero MCP server, about 10 minutes

1. Sign in at <https://developer.xero.com> and open the **Demo Company** (My Apps → Try the Demo Company).
2. **New app → Custom connection** (this is how the Xero MCP server authenticates). Select scopes `accounting.transactions`, `accounting.contacts` and `accounting.settings`, and authorise it against the Demo Company. Custom connections are free on the Demo Company.
3. `.env`:
   ```
   XERO_CLIENT_ID=…
   XERO_CLIENT_SECRET=…
   XERO_SALES_ACCOUNT_CODE=200   # revenue account for fees
   XERO_BANK_ACCOUNT_CODE=090    # bank account that receives Airwallex deposits
   ```
   Check the two account codes in the Demo Company's chart of accounts and adjust them.
4. Harbourline starts `npx -y @xeroapi/xero-mcp-server@0.0.17` as an MCP client when it first needs Xero. When an invoice is sent, it creates the contact and invoice through the MCP server, then approves the invoice with one direct API call (the MCP server can't, see DECISIONS.md #32). When a payment is matched, it records the payment through the MCP server.

## 5. OpenSanctions (screening)

- Without a key, Harbourline uses the free consolidated sanctions list (`npm run screening:update` downloads about 74 MB to `storage/opensanctions`; the bulk data licence is non-commercial).
- For PEPs as well as sanctions, get an API key at <https://www.opensanctions.org/api/> and set `OPENSANCTIONS_API_KEY=…`.

## 6. The existing-client test address

Set `DEMO_EXISTING_CLIENT_EMAIL=you@yourdomain.com`, then run `npm run db:seed`. Emails from that address are recognised as CHAN Tai Man, director of Kowloon Bay Trading Limited (7 years of history, KYC on file, filings, paid invoices, earlier correspondence).
