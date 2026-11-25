import { MailSlurp } from 'mailslurp-client';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const runId = Date.now().toString(36);

/**
 * Test inboxes for bookings. One class, two providers – tests don't know which one is used:
 *   EMAIL_PROVIDER=testmail  → testmail.app: {namespace}.{tag}@inbox.testmail.app
 *                              (unlimited addresses, a tag per booking)
 *   EMAIL_PROVIDER=mailslurp → MailSlurp inboxes from MAILSLURP_INBOX_IDS (round robin)
 * Every email is normalised to { id, subject, from, createdAt, body }.
 */
export class TestInbox {
  static provider() {
    if (process.env.EMAIL_PROVIDER) return process.env.EMAIL_PROVIDER;
    if (process.env.MAILSLURP_API_KEY && process.env.MAILSLURP_INBOX_IDS) return 'mailslurp';
    return null;
  }

  static isEnabled() {
    return TestInbox.provider() !== null;
  }

  // ---------- provider: MailSlurp ----------
  static client() {
    return new MailSlurp({ apiKey: process.env.MAILSLURP_API_KEY });
  }

  static mailslurpIds() {
    return process.env.MAILSLURP_INBOX_IDS.split(',').map((s) => s.trim());
  }

  // ---------- provider: testmail.app ----------
  static async testmailQuery(params = {}) {
    const url = new URL('https://api.testmail.app/api/json');
    url.search = new URLSearchParams({
      apikey: process.env.TESTMAIL_API_KEY,
      namespace: process.env.TESTMAIL_NAMESPACE,
      limit: '100',
      ...params,
    }).toString();
    const res = await fetch(url);
    const data = await res.json();
    if (data.result !== 'success') throw new Error(`testmail.app: ${data.message || res.status}`);
    return data.emails.map((e) => ({
      id: e.id || e.oid || `${e.timestamp}-${e.subject}`,
      subject: e.subject || '',
      from: typeof e.from === 'string' ? e.from : e.from_parsed?.[0]?.address || '',
      createdAt: new Date(e.timestamp || e.date),
      body: e.html || e.text || '',
    }));
  }

  // ---------- common API used by tests ----------

  /** Pre-flight check before the run (globalSetup). Throws a clear error if the inbox is unusable. */
  static async preflight() {
    if (TestInbox.provider() === 'testmail') {
      await TestInbox.testmailQuery({ limit: '1' });
      return;
    }
    for (const id of TestInbox.mailslurpIds()) {
      try {
        await TestInbox.client().getInbox(id);
      } catch {
        throw new Error(
          `MailSlurp inbox ${id} is not available (expired or deleted).\n` +
            'Create new inboxes: npm run inboxes:create, then update MAILSLURP_INBOX_IDS in .env.'
        );
      }
    }
  }

  /** Address for booking number n. `id` identifies the inbox for later reads. */
  static async forBooking(n) {
    if (TestInbox.provider() === 'testmail') {
      const tag = `booking${n}-${runId}`;
      return { id: tag, email: `${process.env.TESTMAIL_NAMESPACE}.${tag}@inbox.testmail.app` };
    }
    const ids = TestInbox.mailslurpIds();
    const inbox = await TestInbox.client().getInbox(ids[(n - 1) % ids.length]);
    return { id: inbox.id, email: inbox.emailAddress };
  }

  /** All emails of one inbox (or of all test inboxes when inboxId is null), with bodies. */
  static async listEmails(inboxId = null, since = null) {
    if (TestInbox.provider() === 'testmail') {
      const params = {};
      if (inboxId) params.tag = inboxId;
      if (since) params.timestamp_from = String(since.getTime());
      return TestInbox.testmailQuery(params);
    }
    const client = TestInbox.client();
    const ids = inboxId ? [inboxId] : TestInbox.mailslurpIds();
    const result = [];
    for (const id of ids) {
      for (const p of await client.getEmails(id)) {
        if (since && new Date(p.createdAt) < since) continue;
        const full = await client.getEmail(p.id);
        result.push({
          id: p.id,
          subject: p.subject || '',
          from: p.from || '',
          createdAt: new Date(p.createdAt),
          body: full.body || '',
        });
      }
    }
    return result;
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
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const emails = await TestInbox.listEmails(inboxId, since);
      const match = emails.find((e) => e.createdAt >= since && predicate(e));
      if (match) return match;
      await sleep(3000);
    }
    throw new Error(`No matching email in inbox ${inboxId} within ${timeoutMs / 1000}s`);
  }

  /** Waits for the Calendly verification email and returns the 6-digit code. */
  static async waitForVerificationCode(inboxId, since) {
    const email = await TestInbox.waitForNewEmail(inboxId, since, (e) =>
      /verification code/i.test(e.subject) && /\b\d{6}\b/.test(TestInbox.text(e))
    );
    return TestInbox.text(email).match(/\b\d{6}\b/)[0];
  }

  /**
   * Waits for the calendar invitation. It is sent by Valtive's calendar
   * (sender "Test Squad"), not by Calendly:
   * "Invitation: QA Automation 1 and Valtive @ Wed Nov 18, 2026 9am - 9:30am (CET)"
   */
  static async waitForInvitation(inboxId, since) {
    return TestInbox.waitForNewEmail(inboxId, since, (e) => /^Invitation:/.test(e.subject));
  }

  /** Finds the Calendly cancellation link in an email (null if there is none). */
  static cancelLink(email) {
    const m = (email.body || '').match(/https:\/\/calendly\.com\/cancellations\/[\w-]+/);
    return m ? m[0] : null;
  }
}
