import { test as base, expect } from '@playwright/test';
import { ContactPage } from '../pages/ContactPage';
import { CalendlyWidget } from '../pages/CalendlyWidget';
import { ThankYouPage } from '../pages/ThankYouPage';
import { CancellationPage } from '../pages/CancellationPage';
import { TestInbox } from '../utils/TestInbox';

/**
 * Custom fixtures: tests ask for `contactPage` / `calendly` by name
 * and receive ready-made Page Objects — no `new ...Page(page)` in tests.
 */
export const test = base.extend({
  contactPage: async ({ page }, use) => {
    await use(new ContactPage(page));
  },

  calendly: async ({ contactPage }, use) => {
    await use(new CalendlyWidget(contactPage.calendlyFrame));
  },

  thankYouPage: async ({ page }, use) => {
    await use(new ThankYouPage(page));
  },

  /**
   * Cleanup fixture ("after hook"): the test registers every booking it makes,
   * and AFTER the test (even a failed one) we cancel those bookings
   * using the cancellation link from the invitation email.
   * Disable with CANCEL_AFTER_TEST=false in .env.
   */
  bookingCleanup: async ({ context }, use) => {
    const bookings = [];
    await use({ track: (booking) => bookings.push(booking) });

    if (process.env.CANCEL_AFTER_TEST === 'false') return;

    for (const { inboxId, since } of bookings) {
      await test.step('Cleanup: cancel the booking', async () => {
        const invitation = await TestInbox.waitForInvitation(inboxId, since);
        const url = TestInbox.cancelLink(invitation);
        if (!url) throw new Error(`No cancellation link in "${invitation.subject}"`);

        const page = await context.newPage();
        await new CancellationPage(page).cancel(url);
        await page.close();
      });
    }
  },
});

export { expect };
