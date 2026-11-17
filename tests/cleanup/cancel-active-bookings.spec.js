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
  test.setTimeout(300_000);
  const client = TestInbox.client();
  const ids = process.env.MAILSLURP_INBOX_IDS.split(',').map((s) => s.trim());
  let cancelled = 0;

  for (const inboxId of ids) {
    const emails = await client.getEmails(inboxId);
    const active = emails.filter((inv) => {
      if (!/^Invitation:/.test(inv.subject || '')) return false;
      const event = inv.subject.replace(/^Invitation: /, '');
      return !emails.some(
        (e) =>
          e.subject === `Updated invitation: Canceled: ${event}` &&
          new Date(e.createdAt) > new Date(inv.createdAt)
      );
    });

    for (const preview of active) {
      await test.step(`Cancel "${preview.subject.slice(0, 70)}..."`, async () => {
        const url = TestInbox.cancelLink(await client.getEmail(preview.id));
        expect(url, 'cancellation link in the invitation').toBeTruthy();
        await new CancellationPage(page).cancel(url);
        cancelled++;
      });
    }
  }
  console.log(`Cancelled bookings: ${cancelled}`);
});
