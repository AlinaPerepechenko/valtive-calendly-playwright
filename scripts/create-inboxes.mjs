/**
 * Creates test inboxes in MailSlurp (run once):
 *   npm run inboxes:create
 * Then copy the printed MAILSLURP_INBOX_IDS line into your .env file.
 */
import 'dotenv/config';
import { MailSlurp } from 'mailslurp-client';

const COUNT = Number(process.argv[2] || 3);
const apiKey = process.env.MAILSLURP_API_KEY;
if (!apiKey) {
  console.error('MAILSLURP_API_KEY is missing in .env');
  process.exit(1);
}

const mailslurp = new MailSlurp({ apiKey });
const ids = [];

for (let i = 1; i <= COUNT; i++) {
  const inbox = await mailslurp.createInbox(undefined, `valtive-test-${i}`);
  ids.push(inbox.id);
  console.log(`Inbox ${i}: ${inbox.emailAddress}`);
}

console.log('\nAdd this line to .env:\n');
console.log(`MAILSLURP_INBOX_IDS=${ids.join(',')}`);
