import { test, expect } from '../../src/fixtures/fixtures';
import { CancellationPage } from '../../src/pages/CancellationPage';
import { TestInbox } from '../../src/utils/TestInbox';

/**
 * Manual cleanup: cancels every still-active booking in all test inboxes.
 * Run: npm run bookings:cancel
 *
 * An invitation is "active" if there is no LATER email
 * "Updated invitation: Canceled: <same event>".
 * Time matters: the same slot can be booked and cancelled several times,
 * so subjects of old and new emails can be identical.
 */
test('Cancel all active test bookings', async ({ page }) => {
  test.setTimeout(600_000);
  const emails = await TestInbox.listEmails(); // all test inboxes
  let cancelled = 0;

  const active = emails.filter((inv) => {
    if (!/^Invitation:/.test(inv.subject)) return false;
    const event = inv.subject.replace(/^Invitation: /, '');
    return !emails.some(
      (e) => e.subject === `Updated invitation: Canceled: ${event}` && e.createdAt > inv.createdAt
    );
  });

  for (const invitation of active) {
    await test.step(`Cancel "${invitation.subject.slice(0, 70)}..."`, async () => {
      const url = TestInbox.cancelLink(invitation);
      expect(url, 'cancellation link in the invitation').toBeTruthy();
      await new CancellationPage(page).cancel(url);
      cancelled++;
    });
  }
  console.log(`Cancelled bookings: ${cancelled}`);
});
