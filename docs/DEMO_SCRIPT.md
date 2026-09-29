# Investor demo script

Total time about 8 minutes. The founder drives Harbourline on the laptop, shared to the screen. The investor emails from their phone.

## Before the meeting (T-1 day)

1. `npm run demo:rehearse`: runs the whole loop against a scratch database with the live model and reports each stage with timings. All tasks should end `done`.
2. `npm run db:seed`: fresh demo data. Check **Settings**: Gmail (or AgentMail) Live, Airwallex Live, Xero Live, product AI Live.
3. Reconnect Gmail from Settings if the consent screen is in Testing mode (tokens last 7 days).
4. Send one test email yourself from the `DEMO_EXISTING_CLIENT_EMAIL` address, check it appears as Kowloon Bay Trading, then reset with `npm run db:seed`.
5. `npm run dev` and leave it running. Open `http://localhost:3000` on Today. Open `/demo` in a second tab.

## The demo

**1. The ask (30 s).** "Email this address with anything you'd ask your company secretary to do." Show the address. Suggestions if they're stuck: appoint a director, change the registered office, transfer shares, set up a new company.

**2. It arrives on its own (20 s).** Today shows "Reading a new email from …" and then a card: *Approve reply and invoice to …*. Point out that nobody pasted anything.

**3. What it understood (1 min).** Open the card:
- Right column: the investor's words, what Harbourline understood, and who the client is. An unknown sender is a **new prospect**, and the onboarding (take-over) task was added automatically. From the test address it's the existing client with KYC **on file**, so it doesn't ask for those documents again.
- The checklist per task: what's needed, what's on file, and what the email already answered.
- The invoice: playbook fees plus Companies Registry disbursements. Click the number or a price to edit it.
- The reply is drafted in the investor's language. Click 繁 or 简 to redraft it in Chinese.

**4. Approve and send (15 s).** Click **Approve and send with invoice**. The investor gets the email on their phone with the invoice PDF, bank details and a secure upload link. The invoice is created in Xero.

**5. Payment (30 s).** Demo panel → **Send deposit** (Airwallex sandbox, reference = invoice number). Back on Today, the task leaves *Awaiting payment*. On **Payments** the deposit shows as "matched" on invoice number and amount. In Xero, the payment is recorded.

**6. The client answers (1–2 min).** Ask the investor to reply to the email with the new director's details (or use the upload link on their phone to upload any photo as the ID copy). Harbourline files the details on the right task and drafts a reply listing only what's still missing. If they change their mind ("actually make it someone else"), show the checklist switching to the new person.

**7. Documents and signing (1 min).** Once the details are in, screening runs (sanctions list, with the agent adjudicating any hits). Documents are generated: board resolution, consent to act, and the **official ND2A filled in** (Specification No. 1/2023, with the PI-ND2A protected-information page). Open them from the task page. Approve **Send for signature**; the investor signs on their phone with an emailed 6-digit code.

**8. File, register, confirm (1 min).** Record the e-Registry reference (the Companies Registry has no filing API; staff submit on e-Registry). Approve the register update and show **Officers and controllers**, which is effective-dated: set "Register as at" to the day before the effective date to show the register reproduced as at any date. Approve the completion email. The task is **done**.

**9. Close (30 s).** Open **Time saved** and **Playbooks**: 43 configured playbooks across Hong Kong, Mainland China, Macau and Taiwan; supported official CR forms mapped and version-checked; batch start for the annual cycle. Approval timing is partial. Explain the modelled coordination saving and supported workflow limits in `REVIEW_LOG.md`; do not present it as measured whole-task productivity or verified execution of every playbook.

## Fallbacks

- **Gmail not delivering:** switch to AgentMail (`MAIL_PROVIDER=agentmail`) or use Demo panel → Deliver email and type the investor's request.
- **No Wi-Fi:** the product AI needs OpenRouter. Tether to a phone. As a last resort, run `npm run demo:rehearse` beforehand and show a completed task from a seeded run.
- **Airwallex sandbox down:** unset the Airwallex keys and restart; the demo bank behaves the same.
- **Something stuck:** Demo panel → Run worker tick. Every page updates live every 3 seconds.
