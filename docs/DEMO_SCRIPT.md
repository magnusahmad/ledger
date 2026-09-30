# Investor demo script

Total time about 8 minutes. The founder drives Harbourline on the laptop, shared to the screen. The investor emails from their phone.

## Before the meeting (T-1 day)

1. `npm run demo:rehearse`: runs the whole loop against a scratch database with the live model and reports each stage with timings. All tasks should end `done`.
2. `npm run db:seed`: fresh demo data. Check **Settings**: Email, Bank, Accounting and AI model all show Connected.
3. Reconnect Gmail from Settings if the consent screen is in Testing mode (tokens last 7 days).
4. Send one test email yourself from the `DEMO_EXISTING_CLIENT_EMAIL` address, check it appears as Kowloon Bay Trading, then reset with `npm run db:seed`.
5. `npm run dev` and leave it running. Open `http://localhost:3000` on Today. Open `/demo` in a second tab.

## The demo

**1. The ask (30 s).** "Email this address with anything you'd ask your company secretary to do." Show the address. Suggestions if they're stuck: appoint a director, change the registered office, transfer shares, set up a new company.

**2. It arrives on its own (20 s).** Today shows "New email from … · Reading it now" and then a card: *Approve reply and invoice to …*. Point out that nobody pasted anything.

**3. What it understood (1 min).** Open the card:
- Right column: the investor's words ("From the client"), what Harbourline understood, and who the client is. An unknown sender is a **new prospect**, and the onboarding (take-over) task was added automatically. From the test address it's the existing client with KYC **on file**, so it doesn't ask for those documents again.
- The checklist per task, with a one-line count: what's to request, what the email already gave, and what's on file.
- The invoice: playbook fees plus Companies Registry disbursements. Click the number or a price to edit it.
- The reply is drafted in the investor's language. Click 繁 or 简 to redraft it in Chinese.

**4. Approve and send (15 s).** Click **Approve and send with invoice**. The investor gets the email on their phone with the invoice PDF, bank details and a secure upload link. The invoice is created in Xero.

**5. Payment (30 s).** Demo panel → **Send deposit** (Airwallex sandbox, reference = invoice number). Back on Today, the task leaves *Awaiting payment*. On **Payments** the deposit shows as "matched" on invoice number and amount. In Xero, the payment is recorded.

**6. The client answers (1–2 min).** Ask the investor to reply to the email with the new director's details (or open the upload link on their phone: every outstanding item is on one form with a single Send button; any photo will do as the ID copy). Harbourline files the details on the right task and drafts a reply listing only what's still missing. If they change their mind ("actually make it someone else"), show the checklist switching to the new person.

**7. Documents and signing (1 min).** Once the details are in, screening runs (sanctions list, with the agent adjudicating any hits). Documents are generated: board resolution, consent to act, and the **official ND2A filled in** (Specification No. 1/2023, with the PI-ND2A protected-information page). Open them from the task page. Approve **Send for signature**; the investor signs on their phone with an emailed 6-digit code.

**8. File, register, confirm (1 min).** Record the e-Registry reference (the Companies Registry has no filing API; staff submit on e-Registry). Approve the register update and show **Officers and controllers**, which is effective-dated: set "Register as at" to the day before the effective date to show the register reproduced as at any date. Approve the completion email. The task is **done**.

**9. Close (30 s).** Open **Settings → Reports → Time saved** and **Playbooks**: 46 configured playbooks across Hong Kong, Mainland China, Macau and Taiwan; supported official CR forms mapped and version-checked; batch start for the annual cycle. Approval timing is partial. Explain the modelled coordination saving and supported workflow limits in `REVIEW_LOG.md`; do not present it as measured whole-task productivity or verified execution of every playbook.

## Fallbacks

- **Rehearsal stops at intake:** the command prints the stored provider/triage reason and exits unsuccessfully. For an OpenRouter 403 saying the model is unavailable in your region, check account/model availability; if it persists, choose a supported model with `LLM_MODEL=<model-id> npm run demo:rehearse`. This is a one-run override; put it in `.env` only after validating the replacement. A successful rehearsal requires every created task to reach Done with no pending approvals.
- **OpenRouter connection failed:** errors now include network codes such as `ETIMEDOUT` or `ENOTFOUND`. The live-model adapter raises Node's per-address connection-attempt window to at least 2 seconds (preserving longer settings), while retaining the 90-second request deadline and three transport attempts. This addresses the observed intermittent failure at Node 22's 250 ms default; persistent failures still require checking connectivity, DNS or proxy settings. An HTTP 403 is a separate provider rejection, not a connection timeout.
- **Rehearsal reports a superseded approval:** another task changed the company facts. The script returns to the fresh preparation/signing/approval pass; it never applies the rejected preview. Other approval failures still stop the rehearsal.
- **Gmail not delivering:** switch to AgentMail (`MAIL_PROVIDER=agentmail`) or use Demo panel → Deliver email and type the investor's request.
- **No Wi-Fi:** the product AI needs OpenRouter. Tether to a phone. As a last resort, run `npm run demo:rehearse` beforehand and show a completed task from a seeded run.
- **Airwallex sandbox down:** unset the Airwallex keys and restart; the demo bank behaves the same.
- **Something stuck:** Demo panel → Run worker tick. Every page updates live every 3 seconds.
