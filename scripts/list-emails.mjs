/**
 * Shows emails in a test inbox (newest first):
 *   npm run inboxes:list        -> inbox 1
 *   npm run inboxes:list -- 2   -> inbox 2
 */
import 'dotenv/config';
import { MailSlurp } from 'mailslurp-client';

const n = Number(process.argv[2] || 1);
const ids = (process.env.MAILSLURP_INBOX_IDS || '').split(',').map((s) => s.trim());
const mailslurp = new MailSlurp({ apiKey: process.env.MAILSLURP_API_KEY });

const emails = await mailslurp.getEmails(ids[n - 1]);
const sorted = emails.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
sorted.forEach((e) => console.log(`${e.createdAt} | from: ${e.from} | ${e.subject}`));

// show the cancellation link from the newest invitation (to check cleanup works)
const invitation = sorted.find((e) => /^Invitation:/.test(e.subject || ''));
if (invitation) {
  const full = await mailslurp.getEmail(invitation.id);
  const link = (full.body || '').match(/https:\/\/calendly\.com\/cancellations\/[\w-]+/);
  console.log(`\nCancel link in "${invitation.subject}":\n${link ? link[0] : 'NOT FOUND'}`);
}
