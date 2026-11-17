import { MailSlurp } from 'mailslurp-client';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wrapper around MailSlurp test inboxes.
 * Enabled when MAILSLURP_API_KEY and MAILSLURP_INBOX_IDS are set in .env.
 */
export class TestInbox {
  static isEnabled() {
    return !!(process.env.MAILSLURP_API_KEY && process.env.MAILSLURP_INBOX_IDS);
  }

  static client() {
    return new MailSlurp({ apiKey: process.env.MAILSLURP_API_KEY });
  }

  /** Booking #1 → inbox 1, #2 → inbox 2, #3 → inbox 3, #4 → inbox 1 ... */
  static async forBooking(n) {
    const ids = process.env.MAILSLURP_INBOX_IDS.split(',').map((s) => s.trim());
    const inbox = await TestInbox.client().getInbox(ids[(n - 1) % ids.length]);
    return { id: inbox.id, email: inbox.emailAddress };
  }

  /** Email text without HTML tags/styles – safer for searching a code. */
  static text(email) {
    const body = (email.body || '')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
    return `${email.subject || ''} ${body}`;
  }

  /**
   * Polls the inbox for an email received AFTER `since` that matches `predicate`.
   * Old emails (e.g. from previous runs) are ignored.
   */
  static async waitForNewEmail(inboxId, since, predicate = () => true, timeoutMs = 120_000) {
    const client = TestInbox.client();
    const deadline = Date.now() + timeoutMs;
    const checked = new Set();

    while (Date.now() < deadline) {
      const previews = await client.getEmails(inboxId);
      for (const p of previews) {
        if (checked.has(p.id) || new Date(p.createdAt) < since) continue;
        checked.add(p.id);
        const email = await client.getEmail(p.id);
        if (predicate(email)) return email;
      }
      await sleep(3000);
    }
    throw new Error(`No matching email in inbox ${inboxId} within ${timeoutMs / 1000}s`);
  }

  /** Waits for the Calendly verification email and returns the 6-digit code. */
  static async waitForVerificationCode(inboxId, since) {
    const email = await TestInbox.waitForNewEmail(inboxId, since, (e) =>
      /\b\d{6}\b/.test(TestInbox.text(e))
    );
    return TestInbox.text(email).match(/\b\d{6}\b/)[0];
  }

  /** Finds the Calendly cancellation link in an email (null if there is none). */
  static cancelLink(email) {
    const m = (email.body || '').match(/https:\/\/calendly\.com\/cancellations\/[\w-]+/);
    return m ? m[0] : null;
  }

  /**
   * Waits for the calendar invitation. It is sent by Valtive's calendar
   * (sender "Test Squad"), not by Calendly:
   * "Invitation: QA Automation 1 and Valtive @ Wed Nov 18, 2026 9am - 9:30am (CET)"
   */
  static async waitForInvitation(inboxId, since) {
    return TestInbox.waitForNewEmail(inboxId, since, (e) => /^Invitation:/.test(e.subject || ''));
  }
}
