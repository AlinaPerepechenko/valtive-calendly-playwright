/**
 * Page Object: https://valtive.io/thank-you/?source=cal
 * After a successful Calendly booking the embed redirects the whole page here.
 */
export class ThankYouPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /Your call\s*is booked!/ });
    this.inviteMessage = page.getByText('Check your inbox for a calendar invite.');
  }

  async waitForUrl() {
    await this.page.waitForURL(/\/thank-you\//);
  }
}
