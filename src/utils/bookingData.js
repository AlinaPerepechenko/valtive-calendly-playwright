import { TestInbox } from './TestInbox';

/**
 * Builds booker data for booking number `n`.
 * - With MailSlurp configured: uses one of the test inboxes (round robin).
 * - Otherwise: Gmail alias "name+valtive-<runId>-<n>@gmail.com".
 */
const runId = Date.now().toString(36);

export async function buildBookingData(n) {
  const base = {
    firstName: process.env.BOOKER_FIRST_NAME || 'QA',
    lastName: `${process.env.BOOKER_LAST_NAME || 'Automation'} ${n}`,
    notes: `Automated Playwright test booking #${n} (run ${runId}).`,
  };

  if (TestInbox.isEnabled()) {
    const inbox = await TestInbox.forBooking(n);
    return { ...base, email: inbox.email, inboxId: inbox.id };
  }

  const [user, domain] = (process.env.BOOKER_EMAIL || 'qa.automation@example.com').split('@');
  return { ...base, email: `${user}+valtive-${runId}-${n}@${domain}`, inboxId: null };
}
