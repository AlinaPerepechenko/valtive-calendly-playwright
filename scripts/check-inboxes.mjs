/**
 * Shows the state of the test inboxes: created / expires / number of emails.
 *   npm run inboxes:check
 */
import 'dotenv/config';
import { MailSlurp } from 'mailslurp-client';

const mailslurp = new MailSlurp({ apiKey: process.env.MAILSLURP_API_KEY });
const ids = (process.env.MAILSLURP_INBOX_IDS || '').split(',').map((s) => s.trim());

for (const [i, id] of ids.entries()) {
  try {
    const inbox = await mailslurp.getInbox(id);
    const emails = await mailslurp.getEmails(id);
    const last = emails.map((e) => e.createdAt).sort().pop();
    console.log(
      `Inbox ${i + 1}: created ${inbox.createdAt} | expires ${inbox.expiresAt || 'never'} | ` +
        `emails ${emails.length} | last email ${last || '-'}`
    );
  } catch (e) {
    console.log(`Inbox ${i + 1}: NOT AVAILABLE (${e.message || e})`);
  }
}
