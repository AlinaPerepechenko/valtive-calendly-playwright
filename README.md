# Valtive · Calendly booking automation (Playwright + AI agents)

End-to-end tests that open the **valtive.io contact page**, book free 30-minute slots
in the embedded **Calendly** scheduler (**40 different slots** in the final run) and verify
the confirmation. Results are uploaded to **Qase TMS**; tests run on **GitHub Actions**.

## What one booking test does

1. Opens `https://valtive.io/contact/` and picks the first free slot in the Calendly iframe
   (slots already booked in this run are skipped → every booking gets a different slot).
2. Fills the form with a **MailSlurp test inbox** email.
3. Calendly asks to verify the email → the test reads the **6-digit code** from the inbox and enters it.
4. Verifies the confirmation page **"Your call is booked!"** / "Check your inbox for a calendar invite."
   (Calendly's own "You are scheduled" / "A calendar invitation has been sent to your email address."
   is checked when Calendly shows it instead.)
5. Verifies the **calendar invitation email** arrived for this booker.
6. **Cleanup fixture**: cancels the booking via the cancellation link from the invitation
   (`CANCEL_AFTER_TEST=false` keeps the bookings).

## Tech stack

| What | Tool |
|---|---|
| Test framework | [Playwright Test](https://playwright.dev) (JavaScript) |
| AI agents | [Playwright Test Agents](https://playwright.dev/docs/test-agents): planner · generator · healer |
| Design | Page Object Model + custom fixtures |
| Test inboxes | [MailSlurp](https://www.mailslurp.com) (verification code + invitation) |
| Test management | [Qase](https://qase.io) via `playwright-qase-reporter` |
| CI | GitHub Actions |

## Project structure

```
.github/
  agents/                    # AI agent definitions (npm run agents:init)
  workflows/playwright.yml   # CI
specs/                       # Markdown test plans written by the planner agent
scripts/
  create-inboxes.mjs         # creates 3 MailSlurp inboxes
  list-emails.mjs            # shows emails in a test inbox
src/
  pages/
    ContactPage.js           # valtive.io/contact (form + Calendly iframe)
    CalendlyWidget.js        # calendar → time → details → verification code
    ThankYouPage.js          # valtive.io/thank-you ("Your call is booked!")
    CancellationPage.js      # calendly.com/cancellations/<id>
  fixtures/fixtures.js       # contactPage, calendly, thankYouPage, bookingCleanup
  utils/
    TestInbox.js             # MailSlurp: inbox per booking, code, invitation, cancel link
    bookingData.js           # booker data (name + test inbox email)
    SlotLedger.js            # slots booked in this run → 40 different slots
    waitForAny.js            # wait for one of several elements (main page + iframe)
tests/
  seed.spec.js               # starting point for the AI agents
  contact-page.spec.js       # smoke checks, no bookings
  booking/calendly-booking.spec.js   # N bookings (BOOKING_COUNT)
  cleanup/cancel-active-bookings.spec.js   # on demand: cancel all active test bookings
```

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env          # fill in MailSlurp and Qase values
npm run inboxes:create        # creates 3 test inboxes → paste MAILSLURP_INBOX_IDS into .env
npm run agents:init           # AI agents for VS Code Copilot
```

## Running

```bash
npx playwright test tests/contact-page.spec.js   # smoke, no bookings
npx playwright test tests/booking --headed       # BOOKING_COUNT bookings from .env
npm run test:40                                  # 40 bookings
npm run bookings:cancel                          # cancel all active test bookings
npm run inboxes:list                             # emails in test inbox 1
npm run report                                   # open the HTML report
```

## CI (GitHub Actions)

- **push / pull request** → smoke tests only (no real bookings).
- **Actions → Playwright Tests → Run workflow** → set `booking_count` (e.g. `1` or `40`).

Repository secrets: `MAILSLURP_API_KEY`, `MAILSLURP_INBOX_IDS`,
`QASE_TESTOPS_API_TOKEN`, `QASE_TESTOPS_PROJECT`.

## Findings during development

- **Calendly anti-bot (Stytch)**: some automated sessions are rejected —
  `POST /api/booking/invitees` → 400 `stytch_block_verdict: true`. Other sessions get an
  **email verification code** step, handled via MailSlurp.
- **Fixed site header over the iframe**: Playwright checks overlapping elements only inside
  the iframe, so a click on Calendly's "Next" landed on the header's "Services" link.
  The test unpins the header (`ContactPage.unpinHeader`).
- The 6 code "boxes" are **one input** `name="verification_code"`.
- The invitation is sent by Valtive's calendar ("Test Squad"), not by Calendly.
- Bookings run **sequentially** (`workers: 1`) so tests don't compete for the same slot.
