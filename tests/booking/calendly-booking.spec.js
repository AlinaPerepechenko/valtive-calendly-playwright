import { test, expect } from '../../src/fixtures/fixtures';
import { buildBookingData } from '../../src/utils/bookingData';
import { SlotLedger } from '../../src/utils/SlotLedger';
import { TestInbox } from '../../src/utils/TestInbox';
import { waitForAny } from '../../src/utils/waitForAny';

// How many bookings to make: 1 by default, 40 for the final run (BOOKING_COUNT=40)
const BOOKING_COUNT = Number(process.env.BOOKING_COUNT || 1);
// First booking number: lets a run continue numbering, e.g. BOOKING_START=26 BOOKING_COUNT=15 → #26..#40
const BOOKING_START = Number(process.env.BOOKING_START || 1);

test.describe('Calendly booking via valtive.io contact page', () => {
  // booking + waiting for 2 emails (code and invitation) takes longer than 90s
  test.describe.configure({ timeout: 300_000 });
  for (let n = BOOKING_START; n < BOOKING_START + BOOKING_COUNT; n++) {
    const id = String(n).padStart(2, '0');

    test(`Booking #${id}: schedule a free 30-minute slot`, async ({
      page,
      contactPage,
      calendly,
      thankYouPage,
      bookingCleanup,
    }) => {
      const booker = await buildBookingData(n);

      await test.step('Open contact page', async () => {
        await contactPage.open();
      });

      const slot = await test.step('Pick a free slot not booked earlier in this run', async () => {
        return calendly.selectFreeSlot((s) => SlotLedger.has(s));
      });
      test.info().annotations.push({ type: 'slot', description: slot });

      await test.step(`Fill booking details (${booker.email})`, async () => {
        await calendly.fillDetails(booker);
      });

      // emails older than this moment are ignored when we read the inbox
      const scheduledAt = new Date(Date.now() - 5_000);

      await test.step('Schedule the event', async () => {
        await calendly.schedule();
      });
      // remember the booking → the cleanup fixture cancels it after the test
      if (booker.inboxId) bookingCleanup.track({ inboxId: booker.inboxId, since: scheduledAt });

      // After "Schedule Event" Calendly shows one of:
      //  - "Verify your email" (6-digit code)  - security block  - success
      await waitForAny([
        calendly.verifyEmailHeading,
        calendly.bookingBlocked,
        calendly.scheduledHeading,
        thankYouPage.heading,
      ]);

      await expect(
        calendly.bookingBlocked,
        'Calendly security check blocked the booking ("This booking cannot be completed")'
      ).toBeHidden();

      if (await calendly.verifyEmailHeading.isVisible()) {
        await test.step('Verify email with the code from the test inbox', async () => {
          expect(booker.inboxId, 'Email verification needs a MailSlurp inbox').toBeTruthy();
          const code = await TestInbox.waitForVerificationCode(booker.inboxId, scheduledAt);
          await calendly.enterVerificationCode(code);
        });
      }

      await test.step('Verify confirmation', async () => {
        // Valtive redirects to its own thank-you page after a booking.
        // Calendly's own texts ("You are scheduled", "A calendar invitation has been
        // sent to your email address.") are checked when Calendly shows them instead.
        await waitForAny([thankYouPage.heading, calendly.scheduledHeading]);

        if (page.url().includes('/thank-you/')) {
          await expect(thankYouPage.heading).toBeVisible();
          await expect(thankYouPage.inviteMessage).toBeVisible();
        } else {
          await expect(calendly.scheduledHeading).toBeVisible();
          await expect(calendly.invitationMessage).toBeVisible();
        }
      });

      SlotLedger.add(slot);

      if (booker.inboxId) {
        await test.step('Verify the calendar invitation email arrived', async () => {
          const email = await TestInbox.waitForInvitation(booker.inboxId, scheduledAt);
          expect(email.subject).toContain(`${booker.firstName} ${booker.lastName} and Valtive`);
        });
      }
    });
  }
});
