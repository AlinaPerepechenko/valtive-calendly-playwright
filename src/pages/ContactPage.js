/**
 * Page Object: https://valtive.io/contact/ (old /contact-valtive/ redirects here)
 * Left side  – Calendly scheduler embedded as an <iframe>.
 * Right side – contact form (protected by hCaptcha).
 */
export class ContactPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Book a free discovery call' });

    // Contact form fields (we check them, but do NOT submit the form:
    // it is protected by hCaptcha and is not part of the booking flow)
    this.nameInput = page.locator('form input[name="name"]');
    this.emailInput = page.locator('form input[name="email"]');
    this.messageInput = page.locator('form [name="message"]');

    // Everything inside Calendly lives in another document (iframe),
    // so we need a FrameLocator to reach it.
    this.calendlyIframe = page.locator('iframe[src*="calendly.com"]');
    this.calendlyFrame = page.frameLocator('iframe[src*="calendly.com"]');
  }

  async open() {
    await this.page.goto('/contact/');
    await this.unpinHeader();
    await this.calendlyIframe.scrollIntoViewIfNeeded();
  }

  /**
   * The site header is `position: fixed` (73px) and sits ON TOP of the Calendly iframe
   * when the page is scrolled. Playwright checks overlapping elements only inside the
   * iframe, so a click on Calendly's "Next" button could land on the header's
   * "Services" link instead. For the test we let the header scroll away with the page.
   * Calendly itself is not changed.
   */
  async unpinHeader() {
    await this.page.addStyleTag({
      content: 'header.fixed { position: absolute !important; }',
    });
  }
}
